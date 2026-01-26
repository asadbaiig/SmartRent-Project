// Script to check MongoDB contracts and their blockchain sync status
import * as path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

// Get the directory of the current file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file from project root
const envPath = path.resolve(__dirname, '../../.env');
config({ path: envPath });

import { mongoDBStorage } from '../mongodb-storage.js';
import { blockchainService } from '../blockchain-service.js';
import { connectMongoDB, isMongoDBConnected, disconnectMongoDB } from '../mongodb.js';

async function checkMongoDBBlockchainSync() {
  console.log('🔍 Checking MongoDB contracts blockchain sync status...\n');

  // Check blockchain service
  if (!blockchainService.isEnabled()) {
    console.error('❌ Blockchain service is not enabled!');
    console.log('Please check your .env file has:');
    console.log('  - BLOCKCHAIN_ENABLED=true (optional, defaults to enabled if other vars are set)');
    console.log('  - BLOCKCHAIN_PRIVATE_KEY=...');
    console.log('  - RENTAL_CONTRACT_ADDRESS=...');
    console.log('  - BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545 (optional)');
    process.exit(1);
  }

  // Connect to MongoDB
  console.log('📦 Connecting to MongoDB...');
  const mongoConnected = await connectMongoDB();
  
  if (!mongoConnected) {
    console.error('❌ Failed to connect to MongoDB!');
    console.log('Please make sure MongoDB is running.');
    process.exit(1);
  }
  
  console.log('✅ MongoDB connected\n');

  try {
    // Get all contracts from MongoDB
    console.log('📦 Fetching contracts from MongoDB...');
    const contracts = await mongoDBStorage.getContracts({});
    console.log(`✅ Found ${contracts.length} contract(s) in MongoDB\n`);

    if (contracts.length === 0) {
      console.log('ℹ️  No contracts found in MongoDB.');
      return;
    }

    console.log('='.repeat(60));
    console.log('📊 Contract Blockchain Sync Status:');
    console.log('='.repeat(60) + '\n');

    let syncedCount = 0;
    let notSyncedCount = 0;
    let errorCount = 0;

    for (const contract of contracts) {
      const hasHash = !!contract.blockchainHash;
      let onBlockchain = false;
      let error = null;

      if (hasHash) {
        // Verify it actually exists on blockchain
        try {
          const blockchainContract = await blockchainService.getContract(contract.id);
          onBlockchain = !!blockchainContract;
        } catch (err: any) {
          error = err.message;
          onBlockchain = false;
        }
      }

      const status = hasHash && onBlockchain ? '✅ SYNCED' : 
                     hasHash && !onBlockchain ? '⚠️  HASH BUT NOT ON BLOCKCHAIN' :
                     '❌ NOT SYNCED';

      console.log(`📄 Contract: ${contract.id}`);
      console.log(`   Status: ${status}`);
      if (hasHash) {
        console.log(`   Blockchain Hash: ${contract.blockchainHash}`);
      }
      if (error) {
        console.log(`   Error: ${error}`);
      }
      console.log(`   Property ID: ${contract.propertyId || 'N/A'}`);
      console.log(`   Monthly Rent: ${contract.monthlyRent}`);
      console.log('');

      if (hasHash && onBlockchain) {
        syncedCount++;
      } else if (hasHash && !onBlockchain) {
        errorCount++;
      } else {
        notSyncedCount++;
      }
    }

    console.log('='.repeat(60));
    console.log('📊 Summary:');
    console.log(`   ✅ Synced: ${syncedCount}`);
    console.log(`   ❌ Not Synced: ${notSyncedCount}`);
    console.log(`   ⚠️  Hash but not on blockchain: ${errorCount}`);
    console.log('='.repeat(60));

    if (notSyncedCount > 0 || errorCount > 0) {
      console.log('\n💡 To sync contracts to blockchain, run:');
      console.log('   npm run blockchain:backfill\n');
    }

  } catch (error: any) {
    console.error('❌ Error checking contracts:', error);
    throw error;
  } finally {
    // Disconnect MongoDB
    if (await isMongoDBConnected()) {
      await disconnectMongoDB();
    }
    // Cleanup blockchain service
    try {
      await blockchainService.cleanup();
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
  }
}

checkMongoDBBlockchainSync()
  .then(() => {
    setTimeout(() => {
      process.exit(0);
    }, 300);
  })
  .catch((error) => {
    console.error(error);
    setTimeout(() => {
      process.exit(1);
    }, 300);
  });

