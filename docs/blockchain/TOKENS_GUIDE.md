# 💰 Tokens in Hardhat Guide

## What Tokens Does Hardhat Have?

### ETH (Ether) - Native Token

Hardhat Network comes with **test ETH** automatically:

| Feature | Details |
|---------|---------|
| **Accounts** | 20 test accounts |
| **Balance Each** | 10,000 ETH |
| **Total Available** | 200,000 ETH |
| **Cost** | FREE (test tokens) |
| **Value** | $0 (not real money) |
| **Resets** | Every time you restart |

---

## Your Test Accounts

When you start Hardhat node (`npm run hardhat:node`), you get:

```
Account #0: 0xf39Fd...266 (10000 ETH) ← You're using this one!
Account #1: 0x70997...C8 (10000 ETH)
Account #2: 0x3C44C...BC (10000 ETH)
...
Account #19: 0x8626...4c (10000 ETH)
```

**Your private key** in `.env` is for Account #0.

---

## Check Your Balance

```bash
cd blockchain
node scripts/check-balance.cjs
```

Output:
```
💰 HARDHAT ACCOUNT BALANCES
============================================================

📍 Account Address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
💰 Balance: 10000.0 ETH

============================================================
📋 ALL TEST ACCOUNTS (First 10)
============================================================

Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
   Balance: 9999.9959 ETH  ← Slightly less (used for gas)

Account #1: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
   Balance: 10000.0 ETH
...
```

---

## How Gas/Tokens Work

### Every blockchain operation costs gas (paid in ETH):

| Operation | Gas Cost | ETH Cost |
|-----------|----------|----------|
| Deploy Contract | ~1,646,369 gas | ~0.0016 ETH |
| Create Contract | ~410,853 gas | ~0.0004 ETH |
| Update Status | ~53,393 gas | ~0.00005 ETH |

With 10,000 ETH, you can create **~24,000 contracts**!

---

## Using Different Accounts

Want to use a different test account?

**Update `.env`:**
```bash
# Account #0 (default)
BLOCKCHAIN_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Account #1 (alternative)
BLOCKCHAIN_PRIVATE_KEY=0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d

# Account #2 (another option)
BLOCKCHAIN_PRIVATE_KEY=0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a
```

Each has 10,000 ETH!

---

## Creating Custom Tokens (ERC-20)

Want to create your own tokens like USDT or USDC?

### Create `contracts/CustomToken.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract CustomToken {
    string public name = "SmartRent Token";
    string public symbol = "SRT";
    uint8 public decimals = 18;
    uint256 public totalSupply;
    
    mapping(address => uint256) public balanceOf;
    
    constructor(uint256 _initialSupply) {
        totalSupply = _initialSupply;
        balanceOf[msg.sender] = _initialSupply;
    }
    
    function transfer(address _to, uint256 _value) public returns (bool) {
        require(balanceOf[msg.sender] >= _value, "Insufficient balance");
        balanceOf[msg.sender] -= _value;
        balanceOf[_to] += _value;
        return true;
    }
}
```

Then deploy it just like the RentalContract!

---

## Token vs Real Money

### Test Tokens (Hardhat):
- ✅ FREE
- ✅ Unlimited
- ✅ Perfect for testing
- ❌ Not real money
- ❌ Can't transfer to real networks

### Real Tokens (Mainnet):
- 💰 Cost real money
- 💸 Pay real gas fees
- 🌐 On public blockchain
- ✅ Have actual value
- ⚠️ Be very careful!

---

## FAQs

**Q: Do test tokens have value?**  
A: No, they're worth $0. They're just for testing.

**Q: Can I get more tokens?**  
A: Yes! Just restart Hardhat node and you get 10,000 ETH again.

**Q: What if I run out?**  
A: Restart the node or use a different account (you have 20!).

**Q: Can I transfer these to real Ethereum?**  
A: No, they only exist on your local Hardhat network.

**Q: How much ETH do I need for production?**  
A: On Ethereum mainnet, keep 0.1-1 ETH (~$200-2000) for gas fees.  
   On Polygon, 10 MATIC (~$10) is enough.

---

## For Production (Real Tokens)

When you're ready to deploy to real networks:

### Testnets (Free Test Tokens):
- **Sepolia ETH**: https://sepoliafaucet.com/
- **Mumbai MATIC**: https://faucet.polygon.technology/
- **Goerli ETH**: https://goerlifaucet.com/

### Mainnets (Buy Real Tokens):
- **Ethereum**: Buy ETH on exchanges (Coinbase, Binance)
- **Polygon**: Buy MATIC on exchanges
- **Costs**: $5-50 per transaction on Ethereum, $0.01-0.10 on Polygon

---

## Quick Commands

```bash
# Check your balance
cd blockchain && node scripts/check-balance.cjs

# See all accounts
npm run hardhat:node
# (Look at the output - shows all 20 accounts)

# Use in Hardhat console
npx hardhat console --network hardhat
> const [signer] = await ethers.getSigners();
> await ethers.provider.getBalance(signer.address);
```

---

## Summary

✅ Hardhat gives you 20 accounts with 10,000 ETH each  
✅ These are test tokens (not real money)  
✅ Perfect for development and testing  
✅ Unlimited - just restart to reset  
✅ Can create custom tokens if needed  

For production, you'll need to:
1. Get real ETH/MATIC from exchanges or faucets
2. Use your own wallet (MetaMask)
3. Deploy to testnets first, then mainnet

**You're all set for development!** 🚀


