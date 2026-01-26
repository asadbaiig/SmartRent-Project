const hre = require("hardhat");

async function main() {
  const { ethers } = hre;
  
  // Get contract address from command line or use default
  const contractAddress = process.env.RENTAL_CONTRACT_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const contractId = process.argv[2]; // Get contract ID from command line

  console.log("=".repeat(60));
  console.log("🔍 BLOCKCHAIN CONTRACT VERIFICATION");
  console.log("=".repeat(60));
  console.log();

  // Connect to the contract
  const RentalContract = await ethers.getContractAt("RentalContract", contractAddress);
  
  console.log(`📍 Contract Address: ${contractAddress}`);
  console.log(`👤 Contract Owner: ${await RentalContract.owner()}`);
  console.log();

  // Get total contracts
  const totalContracts = await RentalContract.getTotalContracts();
  console.log(`📊 Total Contracts on Blockchain: ${totalContracts}`);
  console.log();

  // If contract ID provided, show details
  if (contractId) {
    console.log("=".repeat(60));
    console.log(`📄 CONTRACT DETAILS: ${contractId}`);
    console.log("=".repeat(60));
    console.log();

    try {
      const contractData = await RentalContract.getContract(contractId);
      
      console.log(`🏠 Property ID: ${contractData[0]}`);
      console.log(`👨 Landlord: ${contractData[1]}`);
      console.log(`👤 Tenant: ${contractData[2]}`);
      console.log(`💰 Monthly Rent: ${ethers.formatEther(contractData[3])} ETH`);
      console.log(`🔒 Security Deposit: ${ethers.formatEther(contractData[4])} ETH`);
      console.log(`📅 Start Date: ${new Date(Number(contractData[5]) * 1000).toLocaleDateString()}`);
      console.log(`📅 End Date: ${new Date(Number(contractData[6]) * 1000).toLocaleDateString()}`);
      console.log(`📝 Terms Hash: ${contractData[7]}`);
      
      const statusMap = ["Draft", "Active", "Expired", "Terminated"];
      console.log(`📊 Status: ${statusMap[Number(contractData[8])]}`);
      console.log(`⏰ Created At: ${new Date(Number(contractData[9]) * 1000).toLocaleString()}`);
      console.log();

      // Verify contract authenticity
      console.log("=".repeat(60));
      console.log("✅ VERIFICATION");
      console.log("=".repeat(60));
      
      const isValid = await RentalContract.verifyContract(
        contractId,
        contractData[1], // landlord
        contractData[2], // tenant
        contractData[3]  // monthly rent
      );
      
      console.log(`🔐 Contract Authenticity: ${isValid ? "✅ VERIFIED" : "❌ FAILED"}`);
      console.log();
      
    } catch (error) {
      console.error("❌ Contract not found or error:", error.message);
      console.log();
    }
  }

  // Show recent contracts
  if (totalContracts > 0 && !contractId) {
    console.log("=".repeat(60));
    console.log("📋 USAGE");
    console.log("=".repeat(60));
    console.log();
    console.log("To verify a specific contract, run:");
    console.log(`node scripts/verify-rental-contract.cjs <CONTRACT_ID>`);
    console.log();
    console.log("Example:");
    console.log(`node scripts/verify-rental-contract.cjs 69440771d393ec897736e5b5`);
    console.log();
  }

  console.log("=".repeat(60));
  console.log("✅ Verification Complete!");
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });















