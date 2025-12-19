# Blockchain Setup Guide

This guide will help you set up and deploy the smart contracts for the SmartRent project.

## Prerequisites

1. Node.js and npm installed
2. All dependencies installed (`npm install` from project root)
3. Basic understanding of Ethereum and smart contracts

## Step 1: Compile Contracts

Compile the Solidity smart contracts:

```bash
cd blockchain
npx hardhat compile
```

This will generate the contract artifacts in `blockchain/artifacts/`.

## Step 2: Start Local Blockchain (Development)

For local development, start a Hardhat node:

```bash
npm run hardhat:node
# or from blockchain folder:
npx hardhat node
```

This will:
- Start a local Ethereum network at `http://127.0.0.1:8545`
- Provide 20 test accounts with 10,000 ETH each
- Display the private keys for testing

Keep this terminal running.

## Step 3: Configure Environment Variables

1. Copy the example environment file:
```bash
cp blockchain/.env.example .env
```

2. Update the `.env` file in your project root:
```bash
# Add these blockchain variables:
BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545
BLOCKCHAIN_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
BLOCKCHAIN_ENABLED=true
RENTAL_CONTRACT_ADDRESS=  # Will be set after deployment
```

**Note:** The private key above is the first default Hardhat account. Never use it in production!

## Step 4: Deploy Contract

Deploy the RentalContract to your local blockchain:

```bash
cd blockchain
npx hardhat run scripts/deploy.ts --network localhost
```

You should see output like:
```
Deploying RentalContract...
RentalContract deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3

Save this address to your .env file:
RENTAL_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
```

## Step 5: Update Environment Variables

Copy the deployed contract address and add it to your `.env` file:

```bash
RENTAL_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
```

## Step 6: Verify Deployment

Verify the contract is working:

```bash
cd blockchain
npx hardhat run scripts/verify-contract.ts --network localhost
```

## Step 7: Start Your Application

Now start your SmartRent server:

```bash
npm run dev
```

The server will automatically connect to the blockchain and enable blockchain features.

## How It Works

### Contract Creation Flow

1. **User creates a contract in the frontend**
   - Fills out the rental contract form
   - Submits to `/api/contracts`

2. **Server processes the request**
   - Validates the contract data
   - Saves to MongoDB/Firebase
   - Automatically stores on blockchain via `blockchainService`

3. **Blockchain storage**
   - Contract data is hashed and stored
   - Transaction hash is saved as `blockchainHash` in database
   - Immutable record is created on blockchain

4. **Verification**
   - Anyone can verify contract authenticity
   - Blockchain ensures data hasn't been tampered with

### Contract Status Mapping

The smart contract uses numeric status codes:
- `0`: Draft
- `1`: Active
- `2`: Expired
- `3`: Terminated

These map to your database status enum.

## Testing on Testnets

### Ethereum Sepolia

1. Get testnet ETH from [Sepolia Faucet](https://sepoliafaucet.com/)
2. Update `.env`:
```bash
BLOCKCHAIN_RPC_URL=https://rpc.sepolia.org
BLOCKCHAIN_PRIVATE_KEY=your_testnet_private_key
```
3. Deploy: `npx hardhat run scripts/deploy.ts --network sepolia`

### Polygon Mumbai

1. Get testnet MATIC from [Mumbai Faucet](https://faucet.polygon.technology/)
2. Update `.env`:
```bash
BLOCKCHAIN_RPC_URL=https://rpc.ankr.com/polygon_mumbai
BLOCKCHAIN_PRIVATE_KEY=your_testnet_private_key
```
3. Add network to `hardhat.config.cjs`:
```javascript
mumbai: {
  url: "https://rpc.ankr.com/polygon_mumbai",
  accounts: [process.env.BLOCKCHAIN_PRIVATE_KEY]
}
```
4. Deploy: `npx hardhat run scripts/deploy.ts --network mumbai`

## Production Deployment

For production:

1. **Use a secure key management solution** (AWS KMS, Azure Key Vault, etc.)
2. **Never commit private keys** to version control
3. **Use environment-specific configurations**
4. **Consider multi-sig wallets** for contract ownership
5. **Audit your contracts** before deploying to mainnet
6. **Use a reliable RPC provider** (Infura, Alchemy, QuickNode)

## Troubleshooting

### Contract not found error
- Make sure you've compiled: `npx hardhat compile`
- Check that `artifacts/` folder exists

### Connection refused
- Ensure Hardhat node is running: `npx hardhat node`
- Check the RPC URL in `.env`

### Transaction failed
- Check you have enough ETH for gas
- Verify the contract address is correct
- Check network is correct (localhost, sepolia, etc.)

### Blockchain features disabled
- Check `BLOCKCHAIN_ENABLED=true` in `.env`
- Verify all environment variables are set
- Check server logs for initialization errors

## Security Notes

⚠️ **Important Security Considerations:**

1. **Private Keys**: Never share or commit private keys
2. **Smart Contract Security**: Contracts are immutable once deployed
3. **Gas Costs**: Every blockchain transaction costs gas (ETH)
4. **Data Privacy**: Blockchain data is public and permanent
5. **Testing**: Always test on testnets before mainnet

## Advanced Features

### Adding User Wallet Integration

To let users interact with their own wallets:

1. Add MetaMask integration to frontend
2. Store user wallet addresses in database
3. Update `blockchainService` to use user addresses
4. Implement signature requests for transactions

### IPFS Integration

Store full contract documents on IPFS:

1. Install IPFS client: `npm install ipfs-http-client`
2. Upload PDF/documents to IPFS
3. Store IPFS hash in `termsHash` field
4. Retrieve documents using the hash

### Payment Smart Contracts

Extend functionality with payment contracts:

1. Create `PaymentContract.sol`
2. Implement escrow functionality
3. Add automated rent collection
4. Handle security deposits

## Support

For issues or questions:
- Check Hardhat documentation: https://hardhat.org/
- Review Ethereum docs: https://ethereum.org/en/developers/
- See example tests in `hardhat-tests/` (create your own)

## Next Steps

1. ✅ Compile contracts
2. ✅ Start local blockchain
3. ✅ Deploy contracts
4. ✅ Test with your application
5. 🚀 Deploy to testnet
6. 🎉 Go to production (with proper security audit!)


