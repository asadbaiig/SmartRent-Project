const hre = require("hardhat");

async function main() {
  const { ethers } = hre;
  
  console.log("=".repeat(60));
  console.log("💰 HARDHAT ACCOUNT BALANCES");
  console.log("=".repeat(60));
  console.log();

  // Get the signer (your account)
  const [signer] = await ethers.getSigners();
  
  console.log(`📍 Account Address: ${signer.address}`);
  
  // Get balance
  const balance = await ethers.provider.getBalance(signer.address);
  const balanceInEth = ethers.formatEther(balance);
  
  console.log(`💰 Balance: ${balanceInEth} ETH`);
  console.log();

  // Show all 20 accounts
  console.log("=".repeat(60));
  console.log("📋 ALL TEST ACCOUNTS (First 10)");
  console.log("=".repeat(60));
  console.log();

  const signers = await ethers.getSigners();
  
  for (let i = 0; i < Math.min(10, signers.length); i++) {
    const balance = await ethers.provider.getBalance(signers[i].address);
    const balanceInEth = ethers.formatEther(balance);
    console.log(`Account #${i}: ${signers[i].address}`);
    console.log(`   Balance: ${balanceInEth} ETH`);
    console.log();
  }

  console.log("=".repeat(60));
  console.log(`💡 TIP: You have ${signers.length} test accounts available!`);
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });




