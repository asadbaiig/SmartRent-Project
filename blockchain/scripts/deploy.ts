const hre = require("hardhat");

async function main() {
  const { ethers } = hre;
  console.log("Deploying RentalContract...");

  // Get the contract factory
  const RentalContract = await ethers.getContractFactory("RentalContract");
  
  // Deploy the contract
  const rentalContract = await RentalContract.deploy();
  
  await rentalContract.waitForDeployment();
  
  const address = await rentalContract.getAddress();
  
  console.log(`RentalContract deployed to: ${address}`);
  console.log("\nSave this address to your .env file:");
  console.log(`RENTAL_CONTRACT_ADDRESS=${address}`);
  
  // Verify deployment
  const owner = await rentalContract.owner();
  console.log(`Contract owner: ${owner}`);
  
  return address;
}

main()
  .then((address) => {
    console.log("\nDeployment successful!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exitCode = 1;
  });

