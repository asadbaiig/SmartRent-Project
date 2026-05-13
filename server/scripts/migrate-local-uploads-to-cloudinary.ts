import 'dotenv/config';
import { existsSync } from 'fs';
import path from 'path';
import { MongoClient } from 'mongodb';
import { v2 as cloudinary } from 'cloudinary';

const DEFAULT_DATABASE = 'smartrent';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dwpkax3ma',
  api_key: process.env.CLOUDINARY_API_KEY || '921133431241869',
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function ensureDatabaseName(uri: string, databaseName: string): string {
  const parsedUri = new URL(uri);

  if (!parsedUri.pathname || parsedUri.pathname === '/') {
    parsedUri.pathname = `/${databaseName}`;
  }

  return parsedUri.toString();
}

function getDatabaseName(uri: string): string {
  const parsedUri = new URL(uri);
  return parsedUri.pathname.replace(/^\//, '') || DEFAULT_DATABASE;
}

function localUploadPath(value: unknown): string | null {
  if (typeof value !== 'string' || value.startsWith('http://') || value.startsWith('https://')) {
    return null;
  }

  const normalized = value.replace(/^\/+/, '').replaceAll('/', path.sep);
  if (!normalized.startsWith(`uploads${path.sep}`)) {
    return null;
  }

  const fullPath = path.resolve(process.cwd(), normalized);
  return existsSync(fullPath) ? fullPath : null;
}

async function uploadLocalReference(value: unknown, folder: string): Promise<string | null> {
  const filePath = localUploadPath(value);

  if (!filePath) {
    return typeof value === 'string' ? value : null;
  }

  const result = await cloudinary.uploader.upload(filePath, {
    folder,
    resource_type: 'auto',
    use_filename: true,
    unique_filename: true,
  });

  return result.secure_url;
}

async function migratePropertyImages(db: any) {
  const properties = db.collection('properties');
  const cursor = properties.find({ images: { $type: 'array' } });
  let updated = 0;

  for await (const property of cursor) {
    const migratedImages = await Promise.all(
      property.images.map((image: unknown) => uploadLocalReference(image, 'smartrent/properties')),
    );
    const changed = migratedImages.some((image: string | null, index: number) => image !== property.images[index]);

    if (changed) {
      await properties.updateOne({ _id: property._id }, { $set: { images: migratedImages.filter(Boolean) } });
      updated++;
    }
  }

  console.log(`[Cloudinary Migration] properties updated: ${updated}`);
}

async function migrateDocuments(db: any) {
  const documents = db.collection('documents');
  const cursor = documents.find({ filePath: { $type: 'string' } });
  let updated = 0;

  for await (const document of cursor) {
    const migratedPath = await uploadLocalReference(document.filePath, 'smartrent/documents');

    if (migratedPath && migratedPath !== document.filePath) {
      await documents.updateOne({ _id: document._id }, { $set: { filePath: migratedPath } });
      updated++;
    }
  }

  console.log(`[Cloudinary Migration] documents updated: ${updated}`);
}

async function migrateDisputes(db: any) {
  const disputes = db.collection('disputes');
  const cursor = disputes.find({});
  let updated = 0;

  for await (const dispute of cursor) {
    let changed = false;
    const evidence = Array.isArray(dispute.evidence) ? [...dispute.evidence] : [];
    const messages = Array.isArray(dispute.messages) ? [...dispute.messages] : [];

    for (const item of evidence) {
      const migratedPath = await uploadLocalReference(item.filePath, 'smartrent/disputes/evidence');
      if (migratedPath && migratedPath !== item.filePath) {
        item.filePath = migratedPath;
        changed = true;
      }
    }

    for (const message of messages) {
      if (!Array.isArray(message.attachments)) continue;

      for (const attachment of message.attachments) {
        const migratedPath = await uploadLocalReference(attachment.filePath, 'smartrent/disputes/messages');
        if (migratedPath && migratedPath !== attachment.filePath) {
          attachment.filePath = migratedPath;
          changed = true;
        }
      }
    }

    if (changed) {
      await disputes.updateOne({ _id: dispute._id }, { $set: { evidence, messages } });
      updated++;
    }
  }

  console.log(`[Cloudinary Migration] disputes updated: ${updated}`);
}

async function migrateLocalUploadsToCloudinary() {
  if (!process.env.CLOUDINARY_API_SECRET || process.env.CLOUDINARY_API_SECRET === '<your_api_secret>') {
    throw new Error('Set CLOUDINARY_API_SECRET in .env before migrating uploads.');
  }

  const databaseName = process.env.MONGODB_DATABASE || DEFAULT_DATABASE;
  const mongoUri = ensureDatabaseName(
    process.env.MONGODB_SRV_URL || process.env.MONGODB_URI || `mongodb://localhost:27017/${databaseName}`,
    databaseName,
  );
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    const db = client.db(getDatabaseName(mongoUri));

    await migratePropertyImages(db);
    await migrateDocuments(db);
    await migrateDisputes(db);

    console.log('[Cloudinary Migration] Done.');
  } finally {
    await client.close();
  }
}

migrateLocalUploadsToCloudinary().catch((error) => {
  console.error('[Cloudinary Migration] Failed:', error.message);
  process.exit(1);
});
