// IMPORTANT: Load .env FIRST before importing blockchain-service
// because blockchain-service initializes in its constructor
import * as path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

// Get the directory of the current file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file from project root (two levels up from server/scripts/)
const envPath = path.resolve(__dirname, '../../.env');
config({ path: envPath });

console.log(`[Backfill] Loading .env from: ${envPath}`);
console.log(`[Backfill] BLOCKCHAIN_ENABLED: ${process.env.BLOCKCHAIN_ENABLED}`);
console.log(`[Backfill] RENTAL_CONTRACT_ADDRESS: ${process.env.RENTAL_CONTRACT_ADDRESS ? 'SET' : 'NOT SET'}\n`);

// Now import services AFTER .env is loaded
import { mongoDBStorage } from '../mongodb-storage.js';
import { firebaseStorage } from '../firebase-storage.js';
import { blockchainService } from '../blockchain-service.js';
import { connectMongoDB, isMongoDBConnected, disconnectMongoDB } from '../mongodb.js';

async function backfillContracts() {
  console.log('🔄 Starting contract backfill to blockchain...\n');

  if (!blockchainService.isEnabled()) {
    console.error('❌ Blockchain service is not enabled!');
    console.log('Please check your .env file has:');
    console.log('  - BLOCKCHAIN_ENABLED=true');
    console.log('  - BLOCKCHAIN_PRIVATE_KEY=...');
    console.log('  - RENTAL_CONTRACT_ADDRESS=...');
    process.exit(1);
  }

  // Connect to MongoDB first
  console.log('📦 Connecting to MongoDB...');
  const mongoConnected = await connectMongoDB();
  console.log(`📦 MongoDB connected: ${mongoConnected}\n`);

  try {
    let contracts: any[] = [];
    
    let mongoContracts: any[] = [];
    let firebaseContracts: any[] = [];
    
    if (mongoConnected) {
      try {
        console.log('📦 Fetching ALL contracts from MongoDB (no filters)...');
        // Get all contracts without filters
        mongoContracts = await mongoDBStorage.getContracts({});
        console.log(`✅ Found ${mongoContracts.length} contracts in MongoDB`);
      } catch (mongoError: any) {
        console.log(`⚠️  MongoDB error: ${mongoError.message}`);
        console.log(`   This might be normal if MongoDB isn't fully connected`);
      }
    } else {
      console.log('ℹ️  MongoDB not connected, skipping MongoDB fetch');
    }
    
    try {
      console.log('📦 Fetching ALL contracts from Firebase (no filters)...');
      // Get all contracts without filters
      firebaseContracts = await firebaseStorage.getContracts({});
      console.log(`✅ Found ${firebaseContracts.length} contracts in Firebase`);
    } catch (firebaseError: any) {
      console.log(`⚠️  Firebase error: ${firebaseError.message}`);
    }
    
    // Combine contracts from both sources, removing duplicates
    const allContractIds = new Set<string>();
    contracts = [];
    
    for (const contract of [...mongoContracts, ...firebaseContracts]) {
      if (!allContractIds.has(contract.id)) {
        allContractIds.add(contract.id);
        contracts.push(contract);
      }
    }
    
    console.log(`\n📊 Total unique contracts found: ${contracts.length}\n`);

    if (contracts.length === 0) {
      console.log('ℹ️  No contracts found to backfill.\n');
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    // Check if contract factory is deployed first
    try {
      const isDeployed = await blockchainService.isContractDeployed();
      if (!isDeployed) {
        console.error("\n❌ RentalContract factory is not deployed!");
        console.error("   Please deploy the contract first:");
        console.error("   npm run blockchain:deploy\n");
        process.exit(1);
      }
    } catch (error) {
      console.error("\n❌ Error checking contract deployment:", error);
      process.exit(1);
    }

    for (const contract of contracts) {
      // Check if contract actually exists on blockchain
      let shouldSkip = false;
      if (contract.blockchainHash) {
        try {
          // Try to verify the contract exists on blockchain
          const blockchainContract = await blockchainService.getContract(contract.id);
          if (blockchainContract) {
            console.log(`⏭️  Skipping ${contract.id} - already verified on blockchain`);
            shouldSkip = true;
          } else {
            console.log(`⚠️  Contract ${contract.id} has hash but not found on blockchain - will re-backfill`);
          }
        } catch (error: any) {
          // If error is about factory not being deployed, exit
          if (error.message?.includes("not deployed")) {
            console.error(`\n❌ ${error.message}`);
            process.exit(1);
          }
          // Contract doesn't exist on blockchain, re-backfill it
          console.log(`⚠️  Contract ${contract.id} has hash but not found on blockchain - will re-backfill`);
        }
      }
      
      if (shouldSkip) {
        continue;
      }

      try {
        console.log(`📝 Processing contract ${contract.id}...`);

        const landlordAddress = contract.landlordId || "0x0000000000000000000000000000000000000001";
        const tenantAddress = contract.tenantId || "0x0000000000000000000000000000000000000002";

        // Add small delay to avoid nonce issues
        await new Promise(resolve => setTimeout(resolve, 500));

        const blockchainHash = await blockchainService.createContract({
          contractId: contract.id,
          propertyId: contract.propertyId,
          landlordAddress,
          tenantAddress,
          monthlyRent: contract.monthlyRent.toString(),
          securityDeposit: contract.securityDeposit.toString(),
          startDate: new Date(contract.startDate),
          endDate: new Date(contract.endDate),
          terms: contract.terms || {},
          status: contract.status === 'draft' ? 0 : 
                  contract.status === 'active' ? 1 :
                  contract.status === 'expired' ? 2 : 3
        });

        if (blockchainHash) {
          // Update contract with blockchain hash
          if (await isMongoDBConnected()) {
            await mongoDBStorage.updateContract(contract.id, { blockchainHash });
          } else {
            await firebaseStorage.updateContract(contract.id, { blockchainHash });
          }
          
          console.log(`✅ Contract ${contract.id} saved to blockchain: ${blockchainHash}`);
          successCount++;
        } else {
          console.log(`⚠️  Contract ${contract.id} - blockchain service returned null`);
          errorCount++;
        }
      } catch (error: any) {
        console.error(`❌ Error processing contract ${contract.id}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Successfully backfilled: ${successCount} contracts`);
    if (errorCount > 0) {
      console.log(`❌ Failed: ${errorCount} contracts`);
    }
    console.log('='.repeat(60) + '\n');

  } catch (error: any) {
    console.error('❌ Backfill failed:', error);
    throw error;
  } finally {
    // Always disconnect MongoDB before exiting
    if (await isMongoDBConnected()) {
      await disconnectMongoDB();
    }
    // Cleanup blockchain service connections
    try {
      await blockchainService.cleanup();
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
  }
}

backfillContracts()
  .then(() => {
    // Small delay to ensure cleanup completes, then exit
    setTimeout(() => {
      process.exit(0);
    }, 300);
  })
  .catch((error) => {
    console.error(error);
    // Small delay to ensure cleanup completes, then exit
    setTimeout(() => {
      process.exit(1);
    }, 300);
  });

