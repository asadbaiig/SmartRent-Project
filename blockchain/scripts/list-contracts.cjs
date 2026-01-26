const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const hre = require("hardhat");

async function main() {
  const { ethers } = hre;
  
  console.log("📋 Listing All Blockchain Contracts\n");
  console.log("=".repeat(60));

  // Check connection
  try {
    const blockNumber = await ethers.provider.getBlockNumber();
    console.log(`✅ Connected! Current block: ${blockNumber}`);
  } catch (error) {
    console.log("❌ Can't connect to blockchain!");
    console.log("   Make sure Hardhat node is running: npm run hardhat:node\n");
    return;
  }

  // Get contract address
  const contractAddress = process.env.RENTAL_CONTRACT_ADDRESS;
  
  if (!contractAddress) {
    console.log("❌ RENTAL_CONTRACT_ADDRESS not set in .env file!");
    return;
  }

  console.log(`📍 Contract Address: ${contractAddress}`);
  console.log("=".repeat(60) + "\n");

  try {
    // Check if contract code exists at this address
    const code = await ethers.provider.getCode(contractAddress);
    if (code === "0x") {
      console.log("❌ No contract code found at this address!");
      console.log("   The Hardhat node was likely reset.");
      console.log("   Please redeploy the contract:");
      console.log("   npm run blockchain:deploy\n");
      return;
    }
    
    // Connect to the contract
    const contract = await ethers.getContractAt("RentalContract", contractAddress);
    
    // Get basic contract info
    const owner = await contract.owner();
    const totalContracts = await contract.getTotalContracts();
    
    console.log(`👤 Contract Owner: ${owner}`);
    console.log(`📊 Total Contracts: ${totalContracts.toString()}\n`);

    if (totalContracts.toString() === "0") {
      console.log("ℹ️  No contracts created yet.");
      console.log("   Create a contract through your app to see it here!\n");
      return;
    }

    console.log("=".repeat(60));
    console.log("📜 Contract Details:\n");

    // Listen to past events to get contract IDs
    const filter = contract.filters.ContractCreated();
    const events = await contract.queryFilter(filter);

    if (events.length === 0) {
      console.log("ℹ️  No contract creation events found.");
      return;
    }

    // Display each contract
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const args = event.args;
      
      // Decode contractId from transaction input data
      // Indexed strings are hashed in events, so we need to decode from the transaction
      let contractId;
      try {
        const tx = await ethers.provider.getTransaction(event.transactionHash);
        if (!tx || !tx.data) {
          throw new Error("Transaction data not available");
        }
        const iface = contract.interface;
        const decoded = iface.decodeFunctionData("createContract", tx.data);
        contractId = decoded[0]; // First parameter is contractId (string)
        
        // Validate it's a string
        if (typeof contractId !== 'string') {
          throw new Error("ContractId is not a string");
        }
      } catch (e) {
        // If decoding fails, we can't recover the contractId from the event
        // because indexed strings are hashed. We'll show what we can from the event.
        console.log(`\n⚠️  Contract #${i + 1} - Could not decode contractId from transaction`);
        console.log(`   Transaction: ${event.transactionHash}`);
        console.log(`   Landlord: ${args.landlord}`);
        console.log(`   Tenant: ${args.tenant}`);
        console.log(`   Monthly Rent: ${ethers.formatEther(args.monthlyRent)} ETH`);
        console.log(`   Start Date: ${new Date(Number(args.startDate) * 1000).toLocaleDateString()}`);
        continue; // Skip to next contract
      }
      
      try {
        // Get full contract details from blockchain
        const contractData = await contract.getContract(contractId);
        
        console.log(`\n📄 Contract #${i + 1}`);
        console.log("-".repeat(60));
        console.log(`Contract ID:      ${contractId}`);
        console.log(`Property ID:      ${contractData.propertyId || 'N/A'}`);
        console.log(`Landlord:         ${contractData.landlord}`);
        console.log(`Tenant:           ${contractData.tenant}`);
        console.log(`Monthly Rent:     ${ethers.formatEther(contractData.monthlyRent)} ETH`);
        console.log(`Security Deposit: ${ethers.formatEther(contractData.securityDeposit)} ETH`);
        console.log(`Start Date:       ${new Date(Number(contractData.startDate) * 1000).toLocaleDateString()}`);
        console.log(`End Date:         ${new Date(Number(contractData.endDate) * 1000).toLocaleDateString()}`);
        console.log(`Terms Hash:       ${contractData.termsHash || 'N/A'}`);
        
        const statusMap = ["Draft", "Active", "Expired", "Terminated"];
        console.log(`Status:           ${statusMap[Number(contractData.status)] || "Unknown"}`);
        console.log(`Created At:       ${new Date(Number(contractData.createdAt) * 1000).toLocaleString()}`);
        console.log(`Block Number:     ${event.blockNumber}`);
        console.log(`Transaction:      ${event.transactionHash}`);
      } catch (error) {
        // Fallback to event data if getContract fails
        console.log(`\n📄 Contract #${i + 1}`);
        console.log("-".repeat(60));
        console.log(`Contract ID:      ${contractId}`);
        console.log(`Landlord:         ${args.landlord}`);
        console.log(`Tenant:           ${args.tenant}`);
        console.log(`Monthly Rent:     ${ethers.formatEther(args.monthlyRent)} ETH`);
        console.log(`Start Date:       ${new Date(Number(args.startDate) * 1000).toLocaleDateString()}`);
        console.log(`Block Number:     ${event.blockNumber}`);
        console.log(`Transaction:      ${event.transactionHash}`);
        console.log(`⚠️  Could not fetch full details: ${error.message}`);
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log(`\n✅ Found ${events.length} contract(s) on blockchain\n`);

  } catch (error) {
    console.error("\n❌ Error reading contracts:", error.message);
    console.log("\nTroubleshooting:");
    console.log("1. Make sure the contract is deployed");
    console.log("2. Check that RENTAL_CONTRACT_ADDRESS in .env is correct");
    console.log("3. Ensure Hardhat node is running\n");
  }
}

async function cleanup() {
  try {
    const { ethers } = hre;
    if (ethers && ethers.provider) {
      // Remove all listeners to prevent hanging connections
      if (ethers.provider.removeAllListeners) {
        ethers.provider.removeAllListeners();
      }
      // Destroy provider if method exists
      if (ethers.provider.destroy && typeof ethers.provider.destroy === 'function') {
        await ethers.provider.destroy();
      }
    }
  } catch (cleanupError) {
    // Ignore cleanup errors
  }
}

main()
  .then(async () => {
    await cleanup();
    // Small delay to ensure cleanup completes, then exit
    setTimeout(() => {
      process.exit(0);
    }, 200);
  })
  .catch(async (error) => {
    console.error(error);
    await cleanup();
    // Small delay to ensure cleanup completes, then exit
    setTimeout(() => {
      process.exit(1);
    }, 200);
  });


