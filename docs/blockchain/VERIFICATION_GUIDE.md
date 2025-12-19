# 🔍 Contract Verification Guide

## How to Verify Your Blockchain Contracts

### Method 1: Verification Script (Easiest)

```bash
cd blockchain

# Check blockchain stats
node scripts/verify-rental-contract.cjs

# Verify specific contract
node scripts/verify-rental-contract.cjs <CONTRACT_ID>
```

**Example:**
```bash
node scripts/verify-rental-contract.cjs 69440771d393ec897736e5b5
```

**Output:**
```
============================================================
🔍 BLOCKCHAIN CONTRACT VERIFICATION
============================================================

📍 Contract Address: 0x5FbDB2315678afecb367f032d93F642f64180aa3
👤 Contract Owner: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

📊 Total Contracts on Blockchain: 1

============================================================
📄 CONTRACT DETAILS: 69440771d393ec897736e5b5
============================================================

🏠 Property ID: property-123
👨 Landlord: 0xba3ca2e03ad2d9db155aa4a992afcbc89936d68a
👤 Tenant: 0xc313e40754781abaa021fc00ccb52c9e5a2a3cdb
💰 Monthly Rent: 0.00005 ETH
🔒 Security Deposit: 0.0001 ETH
📅 Start Date: 12/18/2024
📅 End Date: 12/18/2025
📝 Terms Hash: abc123...
📊 Status: Draft
⏰ Created At: 12/18/2024, 6:53:53 PM

============================================================
✅ VERIFICATION
============================================================
🔐 Contract Authenticity: ✅ VERIFIED
============================================================
```

---

### Method 2: Hardhat Console

```bash
cd blockchain
npx hardhat console --network hardhat
```

In the console:

```javascript
// Connect to contract
const contract = await ethers.getContractAt(
  "RentalContract", 
  "0x5FbDB2315678afecb367f032d93F642f64180aa3"
);

// Get total contracts
await contract.getTotalContracts();

// Get contract details
await contract.getContract("69440771d393ec897736e5b5");

// Get contracts by landlord
await contract.getContractsByLandlord("0xba3ca2e03ad2d9db155aa4a992afcbc89936d68a");

// Get contracts by tenant
await contract.getContractsByTenant("0xc313e40754781abaa021fc00ccb52c9e5a2a3cdb");

// Verify contract
await contract.verifyContract(
  "69440771d393ec897736e5b5",
  "0xba3ca2e03ad2d9db155aa4a992afcbc89936d68a", // landlord
  "0xc313e40754781abaa021fc00ccb52c9e5a2a3cdb", // tenant
  "50000000000000000" // monthly rent in wei
);
```

---

### Method 3: Via API (If you add the endpoints)

**Check blockchain stats:**
```bash
curl http://localhost:5002/api/blockchain/stats
```

**Verify specific contract:**
```bash
curl http://localhost:5002/api/blockchain/verify/69440771d393ec897736e5b5
```

**Verify authenticity:**
```bash
curl -X POST http://localhost:5002/api/blockchain/verify-authenticity \
  -H "Content-Type: application/json" \
  -d '{
    "contractId": "69440771d393ec897736e5b5",
    "landlordAddress": "0xba3ca2e03ad2d9db155aa4a992afcbc89936d68a",
    "tenantAddress": "0xc313e40754781abaa021fc00ccb52c9e5a2a3cdb",
    "monthlyRent": "50000"
  }'
```

---

### Method 4: Check Transaction Hash

Every contract has a transaction hash stored in MongoDB's `blockchainHash` field.

You can look up this transaction on blockchain explorers (when using testnets/mainnet):
- **Etherscan** (Ethereum): https://etherscan.io/tx/0x...
- **Polygonscan** (Polygon): https://polygonscan.com/tx/0x...
- **Sepolia Testnet**: https://sepolia.etherscan.io/tx/0x...

---

### Method 5: MongoDB Check

Check if contract has blockchain hash:

```javascript
// In MongoDB
db.contracts.find({ blockchainHash: { $exists: true } })

// You'll see:
{
  _id: "69440771d393ec897736e5b5",
  propertyId: "...",
  landlordId: "...",
  tenantId: "...",
  blockchainHash: "0x71b2188316b06539635bbc50af260693a46b6f461653b6e2b069e4cd7f770675",
  // ... other fields
}
```

If `blockchainHash` exists, the contract is on blockchain!

---

## What Can You Verify?

✅ **Contract Exists** - Is the contract on blockchain?  
✅ **Contract Details** - Property ID, parties, amounts, dates  
✅ **Authenticity** - Does the data match what's on blockchain?  
✅ **Immutability** - Contract can't be changed once stored  
✅ **Timestamp** - When was it created?  
✅ **Status** - Draft, Active, Expired, or Terminated  

---

## Quick Examples

### Verify your recent contract:
```bash
cd blockchain
node scripts/verify-rental-contract.cjs 69440771d393ec897736e5b5
```

### Check total contracts:
```bash
cd blockchain
node scripts/verify-rental-contract.cjs
```

### Interactive verification:
```bash
cd blockchain
npx hardhat console --network hardhat
```
Then:
```javascript
const c = await ethers.getContractAt("RentalContract", process.env.RENTAL_CONTRACT_ADDRESS);
await c.getTotalContracts();
```

---

## Benefits of Verification

🔒 **Security** - Prove contract hasn't been tampered with  
📜 **Transparency** - Anyone can verify  
⏰ **Timestamp** - Blockchain timestamp is immutable  
🌐 **Decentralized** - No single point of control  
✅ **Trust** - Cryptographically verified  

---

## Troubleshooting

**"Contract not found"**
- Make sure blockchain node is running
- Check contract address is correct
- Verify contract ID exists

**"Service not available"**
- Check `.env` has `BLOCKCHAIN_ENABLED=true`
- Ensure Hardhat node is running
- Verify contract is deployed

---

Need help? Check the other documentation files or run:
```bash
npx hardhat --help
```


