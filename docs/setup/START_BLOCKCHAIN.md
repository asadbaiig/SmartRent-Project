# Start Blockchain for Development

## Quick Start

### Terminal 1: Start Blockchain Node
```bash
npm run hardhat:node
```

**Keep this running!** This is your local blockchain.

You should see:
```
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/

Accounts
========
Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
...
```

### Terminal 2: Deploy Contract
```bash
cd blockchain
npx hardhat run scripts/deploy.cjs --network localhost
```

Copy the contract address from output.

### Terminal 3: Update .env and Start App

Update `.env` with the new contract address:
```bash
RENTAL_CONTRACT_ADDRESS=<paste_new_address_here>
```

Start your app:
```bash
npm run dev
```

## Now Create Contracts!

Go to your app and create a contract. You'll see:
```
[Blockchain] Creating contract contract-xxx...
[Blockchain] Transaction sent: 0xabc123...
[Blockchain] Contract created in block: 2
```

✅ Success!

## Notes

- **Terminal 1** must stay running (the blockchain)
- If you close it, you'll need to redeploy the contract
- The blockchain resets when you restart
- For production, use testnets or mainnet


