require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ path: "../.env" });

const getAccounts = () => {
  const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY;
  if (!privateKey) return [];
  return [privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`];
};

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 1337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      timeout: 60000,
    },
    sepolia: {
      url: process.env.BLOCKCHAIN_RPC_URL || "",
      accounts: getAccounts(),
      timeout: 60000,
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./hardhat-tests",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};
