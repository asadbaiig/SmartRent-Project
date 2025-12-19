const hre = require("hardhat");

async function main() {
  const { ethers } = hre;
  const contractAddress = process.env.RENTAL_CONTRACT_ADDRESS;
  
  if (!contractAddress) {
    throw new Error("Please set RENTAL_CONTRACT_ADDRESS in .env file");
  }

  console.log(`Verifying contract at: ${contractAddress}`);

  // Get the contract
  const RentalContract = await ethers.getContractAt("RentalContract", contractAddress);
  
  // Get owner
  const owner = await RentalContract.owner();
  console.log(`Contract owner: ${owner}`);
  
  // Get total contracts
  const totalContracts = await RentalContract.getTotalContracts();
  console.log(`Total contracts: ${totalContracts}`);
  
  console.log("\nContract is verified and working!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });

