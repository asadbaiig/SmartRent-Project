# 🚀 Quick Start - Blockchain Integration

Get your blockchain integration up and running in 5 minutes!

## Step 1: Compile Contracts (30 seconds)

```bash
cd blockchain
npx hardhat compile
```

✅ You should see: `Compiled 1 Solidity file successfully`

## Step 2: Start Local Blockchain (Keep Running)

Open a **new terminal** and run:

```bash
npm run hardhat:node
```

Or from the blockchain folder:

```bash
cd blockchain
npx hardhat node
```

✅ You should see a list of 20 accounts with their private keys. Keep this terminal running!

## Step 3: Deploy Contract (1 minute)

In your **main terminal**, run:

```bash
cd blockchain
npx hardhat run scripts/deploy.cjs --network hardhat
```

Or to deploy to a running local node:

```bash
npx hardhat run scripts/deploy.cjs --network localhost
```

✅ You should see output like:
```
Deploying RentalContract...
RentalContract deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
Save this address to your .env file:
RENTAL_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
```

**Copy the contract address!**

## Step 4: Configure Environment Variables (30 seconds)

Add these to your `.env` file in the project root:

```bash
# Blockchain Configuration
BLOCKCHAIN_ENABLED=true
BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545
BLOCKCHAIN_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
RENTAL_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
```

⚠️ **Replace `RENTAL_CONTRACT_ADDRESS` with your deployed address from Step 3!**

## Step 5: Start Your Application (1 minute)

```bash
npm run dev
```

✅ Check the console for:
```
[Blockchain] Service initialized successfully
[Blockchain] Connected to: http://127.0.0.1:8545
[Blockchain] Contract address: 0x5FbDB2315678afecb367f032d93F642f64180aa3
```

## Step 6: Test It! 🎉

1. Open your application: `http://localhost:5002`
2. Login as a landlord
3. Create a new rental contract
4. Check the server console for blockchain logs:
   ```
   [Blockchain] Creating contract contract-xxx...
   [Blockchain] Transaction sent: 0xabc123...
   [Blockchain] Contract created in block: 2
   [MongoDB] Contract xxx stored on blockchain: 0xabc123...
   ```

## ✅ Success!

Your contracts are now being stored on the blockchain! 🎊

## What Happens Now?

- **Every contract you create** is automatically stored on the blockchain
- **Transaction hash** is saved in the `blockchainHash` field in your database
- **Immutable record** ensures contract data can't be tampered with
- **Verification** anyone can verify the contract authenticity

## Common Issues

### ❌ "Contract not found"
**Solution:** Make sure you compiled: `npx hardhat compile`

### ❌ "Connection refused" or "Service not enabled"
**Solution:** 
1. Check Hardhat node is running in separate terminal
2. Verify `BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545` in .env
3. Make sure `RENTAL_CONTRACT_ADDRESS` is set

### ❌ "Blockchain features disabled"
**Solution:** 
1. Set `BLOCKCHAIN_ENABLED=true` in .env
2. Make sure all blockchain env variables are set
3. Restart your server

### ❌ Contract ABI not found
**Solution:** Run `npx hardhat compile` from blockchain folder

## Next Steps

### Run Tests
```bash
cd blockchain
npx hardhat test
```

### Verify Contract
```bash
cd blockchain
npx hardhat run scripts/verify-contract.ts --network localhost
```

### Check Contract on Blockchain
```bash
cd blockchain
npx hardhat console --network localhost
```

Then in the console:
```javascript
const contract = await ethers.getContractAt("RentalContract", "YOUR_CONTRACT_ADDRESS");
await contract.getTotalContracts(); // See how many contracts are stored
```

## Production Deployment

For production, see `blockchain/SETUP.md` for detailed instructions on:
- Deploying to testnets (Sepolia, Mumbai)
- Deploying to mainnet
- Security best practices
- Managing private keys securely

## Need Help?

- Check `blockchain/SETUP.md` for detailed documentation
- Review `blockchain/README.md` for project structure
- Check Hardhat docs: https://hardhat.org/

---

**Happy Building! 🚀**

