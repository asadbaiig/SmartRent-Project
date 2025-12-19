# Blockchain / Smart Contracts

This folder contains all blockchain-related files for the SmartRent project.

## 🚀 Quick Start

**Want to get started fast?** See [QUICK_START.md](./QUICK_START.md) (5 minutes)

**Need detailed setup?** See [SETUP.md](./SETUP.md)

**What's implemented?** See [INTEGRATION_SUMMARY.md](./INTEGRATION_SUMMARY.md)

## Structure

```
blockchain/
├── contracts/          # Solidity smart contracts
├── scripts/            # Deployment and utility scripts
├── hardhat-tests/      # Hardhat test files
├── artifacts/          # Compiled contract artifacts (auto-generated)
├── cache/              # Hardhat cache (auto-generated)
├── hardhat.config.cjs  # Hardhat configuration
└── README.md           # This file
```

## Getting Started

### Prerequisites
- Node.js installed
- Hardhat and dependencies installed (run `npm install` from project root)

### Compile Contracts
```bash
npm run hardhat:compile
# or
cd blockchain && npx hardhat compile
```

### Run Tests
```bash
npm run hardhat:test
# or
cd blockchain && npx hardhat test
```

### Start Local Hardhat Node
```bash
npm run hardhat:node
# or
cd blockchain && npx hardhat node
```

### Clean Artifacts
```bash
npm run hardhat:clean
# or
cd blockchain && npx hardhat clean
```

## Available Scripts

All Hardhat scripts are available via npm from the project root:
- `npm run hardhat:compile` - Compile all contracts
- `npm run hardhat:test` - Run Hardhat tests
- `npm run hardhat:node` - Start local Hardhat network
- `npm run hardhat:clean` - Clean artifacts and cache

## Configuration

The Hardhat configuration is in `hardhat.config.cjs`. It's set up with:
- Solidity version: 0.8.28
- Optimizer enabled (200 runs)
- Local Hardhat network (chainId: 1337)
- Localhost network support

## Networks

- **Hardhat Network**: Local development network (chainId: 1337)
- **Localhost**: Connect to local node at http://127.0.0.1:8545

## Notes

- All paths in `hardhat.config.cjs` are relative to this folder
- Artifacts and cache are generated in this folder
- The project uses ESM, so the config file uses `.cjs` extension

