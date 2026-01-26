# 🔗 How Your Blockchain System Works

## Overview

Your SmartRent system uses **Ethereum blockchain** (via Hardhat local network) to create **immutable, tamper-proof records** of rental contracts. This ensures contract authenticity and prevents fraud.

---

## 🏗️ Architecture Overview

```
┌─────────────────┐
│   Frontend      │
│  (React App)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Backend API   │
│  (Express.js)   │
└────────┬────────┘
         │
    ┌────┴────┐
    │        │
    ▼        ▼
┌────────┐ ┌──────────────────┐
│ MongoDB│ │ BlockchainService│
│/Firebase│ │   (TypeScript)   │
└────────┘ └────────┬─────────┘
                    │
                    ▼
            ┌───────────────┐
            │ Smart Contract│
            │ (Solidity)    │
            │ on Hardhat    │
            └───────────────┘
```

---

## 📋 Step-by-Step Flow

### 1. **Contract Creation Flow**

When a landlord creates a rental contract:

```
1. Frontend → POST /api/contracts
   ↓
2. Backend validates data
   ↓
3. Save to MongoDB/Firebase (primary storage)
   ↓
4. BlockchainService.createContract() called
   ↓
5. Convert data for blockchain:
   - PKR → Wei (ETH units)
   - User IDs → Ethereum addresses
   - Terms → SHA256 hash
   ↓
6. Call smart contract: createContract()
   ↓
7. Transaction sent to Hardhat node
   ↓
8. Transaction hash saved to database
   ↓
9. Contract now exists in BOTH:
   - Database (full details)
   - Blockchain (immutable record)
```

### 2. **Data Transformation**

#### **Currency Conversion (PKR → Wei)**
```typescript
// Example: 50,000 PKR monthly rent
PKR: 50000
↓
Conversion: 50000 × 0.000001 = 0.05 ETH
↓
Wei: 50000000000000000 (0.05 ETH in wei)
```

#### **User ID → Blockchain Address**
```typescript
// User ID: "I5kr2nWBrEP2XZsEElEBYyI8ZQ92"
↓
SHA256 hash of user ID
↓
Take first 40 hex characters
↓
Blockchain Address: "0xba3ca2e03ad2d9db155aa4a992afcbc89936d68a"
```

**Important:** This is **deterministic** - same user ID always generates the same address!

#### **Contract Terms → Hash**
```typescript
// Terms object: { clauses: [...], conditions: [...] }
↓
JSON.stringify(terms)
↓
SHA256 hash
↓
Terms Hash: "18f9f06554a4285b054b28d4d6047c4a071dc52e3ed0c5663ead9e5f38885cae"
```

---

## 🔐 Smart Contract Structure

### **RentalContract.sol**

The smart contract stores contracts in a mapping:

```solidity
mapping(string => Contract) public contracts;
```

Each contract contains:
- `contractId` - Links to your database ID
- `propertyId` - Property reference
- `landlord` - Blockchain address
- `tenant` - Blockchain address
- `monthlyRent` - Amount in wei
- `securityDeposit` - Amount in wei
- `startDate` / `endDate` - Unix timestamps
- `termsHash` - SHA256 hash of contract terms
- `status` - 0: draft, 1: active, 2: expired, 3: terminated
- `createdAt` - Block timestamp

### **Key Functions**

1. **`createContract()`** - Creates new contract on blockchain
2. **`updateContractStatus()`** - Changes contract status
3. **`terminateContract()`** - Marks contract as terminated
4. **`getContract()`** - Retrieves contract details
5. **`verifyContract()`** - Verifies contract authenticity
6. **`getContractsByLandlord()`** - Gets all contracts for a landlord
7. **`getContractsByTenant()`** - Gets all contracts for a tenant

### **Access Control**

- **Only contract parties** (landlord/tenant) or **contract owner** can modify contracts
- **Anyone** can read contract data (transparency)
- **Events** are emitted for all state changes (audit trail)

---

## 🔄 Integration Points

### **1. Automatic Blockchain Storage**

When a contract is created via API:

```typescript
// In mongodb-storage.ts or firebase-storage.ts
async createContract(contractData) {
  // 1. Save to database
  const contract = await saveToDatabase(contractData);
  
  // 2. Automatically store on blockchain
  if (blockchainService.isEnabled()) {
    const hash = await blockchainService.createContract({
      contractId: contract.id,
      // ... other data
    });
    
    // 3. Save transaction hash back to database
    contract.blockchainHash = hash;
    await updateContract(contract.id, { blockchainHash: hash });
  }
}
```

### **2. Backfill Script**

For existing contracts created before blockchain was enabled:

```bash
npm run blockchain:backfill
```

This script:
- Fetches all contracts from MongoDB/Firebase
- Checks if they exist on blockchain
- Creates missing contracts on blockchain
- Updates database with transaction hashes

---

## 🔍 Verification & Querying

### **Verify Contract Authenticity**

```typescript
const isValid = await blockchainService.verifyContract(
  contractId,
  landlordAddress,
  tenantAddress,
  monthlyRent
);
// Returns: true if contract matches blockchain data
```

### **Query Contracts**

```typescript
// Get contract from blockchain
const contract = await blockchainService.getContract(contractId);

// Get all contracts by landlord
const contracts = await blockchainService.getContractsByLandlord(address);

// Get total contracts
const total = await blockchainService.getTotalContracts();
```

### **List All Contracts**

```bash
npm run blockchain:list
```

Shows all contracts stored on blockchain with full details.

---

## 🛡️ Security Features

### **1. Immutability**
- Once stored on blockchain, contract data **cannot be changed**
- Only status updates are allowed (with proper permissions)

### **2. Tamper-Proof**
- Contract terms are hashed (SHA256)
- Any modification to terms would produce different hash
- Easy to detect tampering

### **3. Access Control**
- Only authorized parties can modify contracts
- Read access is public (transparency)

### **4. Event Logging**
- All contract operations emit events
- Full audit trail on blockchain
- Events are permanent and searchable

---

## 💾 Data Storage Strategy

### **Hybrid Approach**

Your system uses a **hybrid storage model**:

1. **Database (MongoDB/Firebase)**
   - Full contract details
   - Searchable, queryable
   - Fast access
   - Can be updated/modified

2. **Blockchain (Hardhat/Ethereum)**
   - Immutable record
   - Key contract data
   - Transaction hash for verification
   - Cannot be tampered with

### **Why Both?**

- **Database**: Fast queries, full data, user-friendly
- **Blockchain**: Immutability, verification, trust

The `blockchainHash` field links them together!

---

## 🔧 Configuration

### **Environment Variables**

```env
BLOCKCHAIN_ENABLED=true
BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545
BLOCKCHAIN_PRIVATE_KEY=your_private_key
RENTAL_CONTRACT_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
```

### **Network Setup**

1. **Hardhat Node** (Local blockchain)
   ```bash
   npm run hardhat:node
   ```

2. **Deploy Contract**
   ```bash
   npm run blockchain:deploy
   ```

3. **Verify Connection**
   ```bash
   npm run blockchain:check
   ```

---

## 📊 Example Transaction Flow

### **Creating a Contract**

```
1. User creates contract via API
   Contract ID: "6947f63f5d1ed15ddbce2ea7"
   
2. Backend saves to MongoDB
   ✅ Saved with ID: 6947f63f5d1ed15ddbce2ea7
   
3. BlockchainService processes:
   - Landlord ID → 0xba3ca2e03ad2d9db155aa4a992afcbc89936d68a
   - Tenant ID → 0xc313e40754781abaa021fc00ccb52c9e5a2a3cdb
   - 50,000 PKR → 0.05 ETH (50000000000000000 wei)
   - Terms → SHA256 hash
   
4. Smart contract call:
   createContract(
     "6947f63f5d1ed15ddbce2ea7",
     "6918acc768c72501810ba1b9",
     0xba3ca2e03ad2d9db155aa4a992afcbc89936d68a,
     0xc313e40754781abaa021fc00ccb52c9e5a2a3cdb,
     50000000000000000,
     100000000000000000,
     1734739200,
     1806336000,
     "18f9f06554a4285b054b28d4d6047c4a071dc52e3ed0c5663ead9e5f38885cae"
   )
   
5. Transaction sent:
   Hash: 0x1390b9e2c47bac0e69dfdee8d87ec3e82e0872264f79265fc89c01f0c56f158e
   Block: 3
   
6. Database updated:
   blockchainHash: "0x1390b9e2c47bac0e69dfdee8d87ec3e82e0872264f79265fc89c01f0c56f158e"
   
✅ Contract now exists in both database AND blockchain!
```

---

## 🎯 Key Benefits

1. **Trust & Transparency**
   - Anyone can verify contract authenticity
   - Immutable record prevents disputes

2. **Fraud Prevention**
   - Cannot modify contract terms after creation
   - Status changes are tracked and logged

3. **Audit Trail**
   - All operations emit events
   - Permanent record of all changes

4. **Decentralization**
   - Not dependent on single database
   - Data replicated across blockchain network

5. **Future-Proof**
   - Can migrate to public blockchain (Ethereum mainnet)
   - Standard Ethereum-compatible contracts

---

## 🚀 Future Enhancements

Potential improvements:
- **IPFS Integration**: Store full contract documents on IPFS
- **Token Payments**: Use ERC-20 tokens for rent payments
- **Smart Escrow**: Automatic deposit/rent handling
- **Dispute Resolution**: On-chain dispute handling
- **Public Network**: Deploy to Ethereum mainnet/testnet

---

## 📝 Summary

Your blockchain system provides:
- ✅ **Immutable contract storage**
- ✅ **Automatic blockchain integration**
- ✅ **Hybrid database + blockchain approach**
- ✅ **User-friendly address generation**
- ✅ **Full verification capabilities**
- ✅ **Complete audit trail**

The system is designed to be **production-ready** while remaining **developer-friendly** for local development!

