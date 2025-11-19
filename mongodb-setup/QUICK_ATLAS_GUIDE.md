# 🚀 Quick MongoDB Atlas Setup Guide

## Step-by-Step Instructions:

### 1️⃣ Sign Up & Create Cluster
1. Go to: https://www.mongodb.com/cloud/atlas/register (I've opened this for you)
2. Sign up with email or Google/GitHub
3. Click **"Build a Database"**
4. Choose **FREE (M0)** tier
5. Select **AWS** as provider
6. Choose a region close to you
7. Click **"Create"** (wait 1-3 minutes)

### 2️⃣ Create Database User
1. Click **"Database Access"** in left menu
2. Click **"Add New Database User"**
3. Choose **"Password"** authentication
4. Enter username: `smartrent` (or any name)
5. Click **"Autogenerate Secure Password"** OR create your own
6. **⚠️ COPY THE PASSWORD!** You'll need it
7. Select **"Atlas admin"** privileges
8. Click **"Add User"**

### 3️⃣ Whitelist IP Address
1. Click **"Network Access"** in left menu
2. Click **"Add IP Address"**
3. Click **"Allow Access from Anywhere"** (for development)
4. Click **"Confirm"**

### 4️⃣ Get Connection String
1. Click **"Database"** in left menu
2. Click **"Connect"** button on your cluster
3. Choose **"Connect your application"**
4. Select **"Node.js"** driver
5. Copy the connection string (looks like):
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/
   ```

### 5️⃣ Update Connection String
Replace the placeholders:
- Replace `<username>` with your username (e.g., `smartrent`)
- Replace `<password>` with your password
- Add `/smartrent` at the end

**Example:**
```
mongodb+srv://smartrent:MyPassword123@cluster0.abc123.mongodb.net/smartrent
```

### 6️⃣ Configure Your App

**Option A: Use the Setup Script (Easiest)**
```powershell
.\setup-env.ps1
```
Follow the prompts and paste your connection string.

**Option B: Manual Setup**
1. Create a file named `.env` in your project root
2. Add this line (replace with your actual connection string):
   ```
   MONGODB_URI=mongodb+srv://smartrent:yourpassword@cluster0.xxxxx.mongodb.net/smartrent
   ```

### 7️⃣ Test Connection
```bash
npm run dev
```

You should see:
```
[MongoDB] Connected successfully to: mongodb+srv://...
```

## ✅ Done!

Your properties and documents will now be stored in MongoDB Atlas!

## Troubleshooting

**Connection timeout:**
- Make sure you whitelisted your IP in Network Access
- Try "Allow Access from Anywhere" for testing

**Authentication failed:**
- Double-check username and password in connection string
- Make sure you replaced `<username>` and `<password>`

**Can't find cluster:**
- Wait a few minutes for cluster creation
- Refresh the Atlas dashboard



