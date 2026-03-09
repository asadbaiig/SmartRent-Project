const hre = require("hardhat");

async function main() {
  // Replace with your deployed contract address
  const contractAddress = "0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82";
  const RentalContract = await hre.ethers.getContractAt("RentalContract", contractAddress);

  const filter = RentalContract.filters.ContractModified();
  const events = await RentalContract.queryFilter(filter);

  events.forEach(event => {
    console.log(`Contract ${event.args.contractId} modified by ${event.args.modifiedBy} at ${new Date(event.args.timestamp * 1000).toLocaleString()}`);
  });
}

main().catch(console.error);
