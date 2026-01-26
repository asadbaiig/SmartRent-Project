const hre = require("hardhat");
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

async function main() {
  const { ethers } = hre;
  
  console.log("🔍 Checking RentalContract deployment...\n");
  
  // Check connection
  try {
    const blockNumber = await ethers.provider.getBlockNumber();
    console.log(`✅ Connected to blockchain! Current block: ${blockNumber}`);
  } catch (error) {
    console.log("❌ Can't connect to blockchain!");
    console.log("   Make sure Hardhat node is running: npm run hardhat:node\n");
    process.exit(1);
  }
  
  const contractAddress = process.env.RENTAL_CONTRACT_ADDRESS;
  
  if (!contractAddress) {
    console.log("⚠️  RENTAL_CONTRACT_ADDRESS not set in .env file!");
    console.log("   Deploying new contract...\n");
  } else {
    console.log(`📍 Checking contract at: ${contractAddress}`);
    
    // Check if contract exists at this address
    const code = await ethers.provider.getCode(contractAddress);
    
    if (code === "0x") {
      console.log("❌ No contract code found at this address!");
      console.log("   The Hardhat node was likely reset. Redeploying...\n");
    } else {
      try {
        // Try to connect and call owner()
        const contract = await ethers.getContractAt("RentalContract", contractAddress);
        const owner = await contract.owner();
        const totalContracts = await contract.getTotalContracts();
        
        console.log(`✅ Contract is deployed and working!`);
        console.log(`   Owner: ${owner}`);
        console.log(`   Total Contracts: ${totalContracts.toString()}\n`);
        console.log("✅ No deployment needed. Contract is ready to use!\n");
        return;
      } catch (error) {
        console.log(`❌ Contract exists but has errors: ${error.message}`);
        console.log("   Redeploying...\n");
      }
    }
  }
  
  // Deploy new contract
  console.log("🚀 Deploying RentalContract...\n");
  
  const RentalContract = await ethers.getContractFactory("RentalContract");
  const rentalContract = await RentalContract.deploy();
  await rentalContract.waitForDeployment();
  
  const address = await rentalContract.getAddress();
  const owner = await rentalContract.owner();
  
  console.log("=".repeat(60));
  console.log("✅ Deployment successful!");
  console.log("=".repeat(60));
  console.log(`📍 Contract Address: ${address}`);
  console.log(`👤 Contract Owner: ${owner}`);
  console.log("\n⚠️  IMPORTANT: Update your .env file with:");
  console.log(`RENTAL_CONTRACT_ADDRESS=${address}`);
  console.log("=".repeat(60) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exitCode = 1;
  });

