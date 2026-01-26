const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const hre = require("hardhat");

async function main() {
  const { ethers } = hre;
  
  console.log("🔍 Quick Blockchain Test\n");

  // Check connection
  try {
    const blockNumber = await ethers.provider.getBlockNumber();
    console.log(`✅ Connected! Current block: ${blockNumber}\n`);
  } catch (error) {
    console.log("❌ Can't connect to blockchain!");
    console.log("   Make sure Hardhat node is running: npm run hardhat:node\n");
    return;
  }

  // Check contract address
  const contractAddress = process.env.RENTAL_CONTRACT_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  console.log(`📍 Checking address: ${contractAddress}\n`);

  // Check if there's code at this address
  const code = await ethers.provider.getCode(contractAddress);
  
  if (code === "0x") {
    console.log("❌ NO CONTRACT at this address!");
    console.log("   You need to deploy the contract.\n");
    console.log("   Run: npx hardhat run scripts/deploy.cjs --network localhost\n");
  } else {
    console.log(`✅ Contract found! Code length: ${code.length} bytes\n`);
    
    // Try to interact
    try {
      const contract = await ethers.getContractAt("RentalContract", contractAddress);
      const owner = await contract.owner();
      const total = await contract.getTotalContracts();
      
      console.log(`✅ Contract is working!`);
      console.log(`   Owner: ${owner}`);
      console.log(`   Total Contracts: ${total}\n`);
    } catch (error) {
      console.log("⚠️  Contract exists but can't interact:");
      console.log(`   ${error.message}\n`);
    }
  } finally {
    // Close the provider connection to prevent assertion errors
    try {
      if (hre.ethers && hre.ethers.provider) {
        await hre.ethers.provider.destroy();
      }
    } catch (err) {
      // Ignore errors during cleanup
    }
  }
}

main()
  .then(() => {
    // Give a small delay to ensure cleanup completes
    setTimeout(() => process.exit(0), 100);
  })
  .catch((error) => {
    console.error(error);
    setTimeout(() => {
      process.exitCode = 1;
      process.exit(1);
    }, 100);
  });

