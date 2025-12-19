const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const hre = require("hardhat");

async function main() {
  const { ethers } = hre;
  
  // Get contract ID from command line arguments
  const contractId = process.argv[2];
  
  if (!contractId) {
    console.log("❌ Please provide a contract ID!");
    console.log("\nUsage: node scripts/get-contract.cjs <CONTRACT_ID>\n");
    console.log("Example: node scripts/get-contract.cjs 694406c5e3507dc54a9248b2\n");
    return;
  }

  console.log(`🔍 Looking up contract: ${contractId}\n`);
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
    // Connect to the contract
    const contract = await ethers.getContractAt("RentalContract", contractAddress);
    
    // Get the contract details
    const result = await contract.getContract(contractId);
    
    console.log("✅ Contract Found!\n");
    console.log("=".repeat(60));
    console.log(`Contract ID:      ${contractId}`);
    console.log(`Property ID:      ${result.propertyId}`);
    console.log(`Landlord:         ${result.landlord}`);
    console.log(`Tenant:           ${result.tenant}`);
    console.log(`Monthly Rent:     ${ethers.formatEther(result.monthlyRent)} ETH`);
    console.log(`Security Deposit: ${ethers.formatEther(result.securityDeposit)} ETH`);
    console.log(`Start Date:       ${new Date(Number(result.startDate) * 1000).toLocaleDateString()}`);
    console.log(`End Date:         ${new Date(Number(result.endDate) * 1000).toLocaleDateString()}`);
    console.log(`Terms Hash:       ${result.termsHash}`);
    
    const statusMap = ["Draft", "Active", "Expired", "Terminated"];
    console.log(`Status:           ${statusMap[Number(result.status)] || "Unknown"}`);
    console.log(`Created At:       ${new Date(Number(result.createdAt) * 1000).toLocaleString()}`);
    console.log("=".repeat(60) + "\n");

  } catch (error) {
    if (error.message.includes("Contract does not exist")) {
      console.log(`❌ Contract "${contractId}" not found on blockchain!\n`);
      console.log("Possible reasons:");
      console.log("1. The contract ID is incorrect");
      console.log("2. The contract was never created on blockchain");
      console.log("3. You're connected to a different blockchain network\n");
    } else {
      console.error("\n❌ Error reading contract:", error.message);
      console.log("\nTroubleshooting:");
      console.log("1. Make sure the contract is deployed");
      console.log("2. Check that RENTAL_CONTRACT_ADDRESS in .env is correct");
      console.log("3. Ensure Hardhat node is running\n");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });



