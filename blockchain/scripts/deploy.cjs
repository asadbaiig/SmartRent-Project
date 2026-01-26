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
  .then(async (address) => {
    console.log("\nDeployment successful!");
    await cleanup();
    // Small delay to ensure cleanup completes, then exit
    setTimeout(() => {
      process.exit(0);
    }, 200);
  })
  .catch(async (error) => {
    console.error("Deployment failed:", error);
    await cleanup();
    // Small delay to ensure cleanup completes, then exit
    setTimeout(() => {
      process.exit(1);
    }, 200);
  });

