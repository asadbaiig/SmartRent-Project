import 'dotenv/config';
import { MongoClient, type CollectionInfo, type IndexDescription } from 'mongodb';

const DEFAULT_DATABASE = 'smartrent';
const BATCH_SIZE = Number.parseInt(process.env.MONGODB_MIGRATION_BATCH_SIZE || '500', 10);

function ensureDatabaseName(uri: string, databaseName: string): string {
  const parsedUri = new URL(uri);

  if (!parsedUri.pathname || parsedUri.pathname === '/') {
    parsedUri.pathname = `/${databaseName}`;
  }

  return parsedUri.toString();
}

function redactUri(uri: string): string {
  return uri.replace(/\/\/.*@/, '//***:***@');
}

function getDatabaseName(uri: string): string {
  const parsedUri = new URL(uri);
  return parsedUri.pathname.replace(/^\//, '') || DEFAULT_DATABASE;
}

async function copyIndexes(sourceCollection: any, targetCollection: any) {
  const indexes = (await sourceCollection.indexes()) as IndexDescription[];
  const customIndexes = indexes.filter((index) => index.name !== '_id_');

  if (customIndexes.length === 0) {
    return;
  }

  await targetCollection.createIndexes(customIndexes);
}

async function copyCollection(sourceCollection: any, targetCollection: any) {
  let copied = 0;
  const cursor = sourceCollection.find({});
  let batch: any[] = [];

  for await (const document of cursor) {
    batch.push({
      replaceOne: {
        filter: { _id: document._id },
        replacement: document,
        upsert: true,
      },
    });

    if (batch.length >= BATCH_SIZE) {
      await targetCollection.bulkWrite(batch, { ordered: false });
      copied += batch.length;
      batch = [];
    }
  }

  if (batch.length > 0) {
    await targetCollection.bulkWrite(batch, { ordered: false });
    copied += batch.length;
  }

  return copied;
}

async function migrateLocalMongoDBToAtlas() {
  const databaseName = process.env.MONGODB_DATABASE || DEFAULT_DATABASE;
  const sourceUri = ensureDatabaseName(
    process.env.MONGODB_URI || `mongodb://localhost:27017/${databaseName}`,
    databaseName,
  );
  const targetUri = process.env.MONGODB_SRV_URL
    ? ensureDatabaseName(process.env.MONGODB_SRV_URL, databaseName)
    : undefined;

  if (!targetUri) {
    throw new Error('MONGODB_SRV_URL is required in .env to migrate data to Atlas.');
  }

  const sourceDatabaseName = getDatabaseName(sourceUri);
  const targetDatabaseName = getDatabaseName(targetUri);

  console.log('[MongoDB Migration] Source:', redactUri(sourceUri));
  console.log('[MongoDB Migration] Target:', redactUri(targetUri));

  const sourceClient = new MongoClient(sourceUri);
  const targetClient = new MongoClient(targetUri);

  try {
    await sourceClient.connect();
    await targetClient.connect();

    const sourceDb = sourceClient.db(sourceDatabaseName);
    const targetDb = targetClient.db(targetDatabaseName);
    const collections = (await sourceDb.listCollections().toArray()) as CollectionInfo[];

    if (collections.length === 0) {
      console.log('[MongoDB Migration] No collections found in local database.');
      return;
    }

    for (const collection of collections) {
      const sourceCollection = sourceDb.collection(collection.name);
      const targetCollection = targetDb.collection(collection.name);

      console.log(`[MongoDB Migration] Copying ${collection.name}...`);
      await copyIndexes(sourceCollection, targetCollection);
      const copied = await copyCollection(sourceCollection, targetCollection);
      console.log(`[MongoDB Migration] ${collection.name}: ${copied} documents copied.`);
    }

    console.log('[MongoDB Migration] Done. Atlas now has the local MongoDB data.');
  } finally {
    await sourceClient.close();
    await targetClient.close();
  }
}

migrateLocalMongoDBToAtlas().catch((error) => {
  console.error('[MongoDB Migration] Failed:', error.message);
  process.exit(1);
});
