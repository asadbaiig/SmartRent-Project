// Dynamic import for mongoose
let mongoose: any;

const DEFAULT_MONGODB_DATABASE = 'smartrent';

export function resolveMongoDBUri(): string {
  const atlasUri = process.env.MONGODB_SRV_URL;
  const localUri = process.env.MONGODB_URI;
  const selectedUri = atlasUri || localUri || `mongodb://localhost:27017/${DEFAULT_MONGODB_DATABASE}`;

  return ensureDatabaseName(selectedUri, process.env.MONGODB_DATABASE || DEFAULT_MONGODB_DATABASE);
}

function ensureDatabaseName(uri: string, databaseName: string): string {
  const parsedUri = new URL(uri);

  if (!parsedUri.pathname || parsedUri.pathname === '/') {
    parsedUri.pathname = `/${databaseName}`;
  }

  return parsedUri.toString();
}

const MONGODB_URI = resolveMongoDBUri();

let isConnected = false;
let connectionAttempted = false;
let mongooseConnection: any;
let isDisconnecting = false; // Flag to prevent duplicate disconnect logs

async function getMongoose() {
  if (!mongoose) {
    mongoose = (await import('mongoose')).default;
  }
  return mongoose;
}

export async function connectMongoDB(): Promise<boolean> {
  if (isConnected) {
    console.log('[MongoDB] Already connected');
    return true;
  }

  if (connectionAttempted) {
    return false;
  }

  connectionAttempted = true;

  try {
    const mongooseInstance = await getMongoose();
    console.log('[MongoDB] Connecting to:', MONGODB_URI.replace(/\/\/.*@/, '//***:***@'));
    await mongooseInstance.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    mongooseConnection = mongooseInstance.connection;
    isConnected = true;
    setupEventHandlers();
    console.log('[MongoDB] ✅ Connected successfully to:', MONGODB_URI.replace(/\/\/.*@/, '//***:***@'));
    console.log('[MongoDB] Database:', mongooseConnection.name);
    return true;
  } catch (error: any) {
    isConnected = false;
    console.error('[MongoDB] ❌ Connection failed:', error.message);
    console.warn('[MongoDB] The app will continue without MongoDB. Properties will use fallback data.');
    if (error.message.includes('ECONNREFUSED')) {
      console.warn('[MongoDB] MongoDB service might not be running.');
      console.warn('[MongoDB] Try: Start-Service MongoDB (as Administrator)');
    }
    return false;
  }
}

export function isMongoDBConnected(): boolean {
  return isConnected;
}

export async function disconnectMongoDB(): Promise<void> {
  if (!isConnected || !mongoose || isDisconnecting) {
    return;
  }

  isDisconnecting = true;
  try {
    const mongooseInstance = await getMongoose();
    await mongooseInstance.disconnect();
    isConnected = false;
    mongooseConnection = null;
    console.log('[MongoDB] Disconnected');
  } catch (error) {
    console.error('[MongoDB] Disconnection error:', error);
    isDisconnecting = false;
    throw error;
  } finally {
    // Reset flag after a short delay to allow event handlers to process
    setTimeout(() => {
      isDisconnecting = false;
    }, 100);
  }
}

// Setup connection event handlers
function setupEventHandlers() {
  if (mongooseConnection) {
    mongooseConnection.on('error', (err: any) => {
      console.error('[MongoDB] Connection error:', err);
      isConnected = false;
    });

    mongooseConnection.on('disconnected', () => {
      // Only log if we're not explicitly disconnecting (to avoid duplicate messages)
      if (!isDisconnecting) {
        console.log('[MongoDB] Disconnected');
      }
      isConnected = false;
    });

    mongooseConnection.on('reconnected', () => {
      console.log('[MongoDB] Reconnected');
      isConnected = true;
    });
  }
}
