# Quick MongoDB Atlas Setup (5 minutes)

## Step 1: Create Free Account
1. Go to: https://www.mongodb.com/cloud/atlas/register
2. Sign up with email (or use Google/GitHub)

## Step 2: Create Free Cluster
1. After signup, click "Build a Database"
2. Choose **FREE** (M0) tier
3. Select a cloud provider (AWS recommended)
4. Choose a region closest to you
5. Click "Create" (takes 1-3 minutes)

## Step 3: Create Database User
1. Click "Database Access" in left menu
2. Click "Add New Database User"
3. Choose "Password" authentication
4. Create username (e.g., `smartrent`)
5. Create password (SAVE THIS!)
6. Set privileges: "Atlas admin" or "Read and write to any database"
7. Click "Add User"

## Step 4: Whitelist Your IP
1. Click "Network Access" in left menu
2. Click "Add IP Address"
3. Click "Allow Access from Anywhere" (for development)
   - Or click "Add Current IP Address"
4. Click "Confirm"

## Step 5: Get Connection String
1. Click "Database" in left menu
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Copy the connection string (looks like):
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/
   ```
5. Replace `<username>` and `<password>` with your actual credentials
6. Add database name at the end:
   ```
   mongodb+srv://smartrent:yourpassword@cluster0.xxxxx.mongodb.net/smartrent
   ```

## Step 6: Set Environment Variable

### Option A: Create .env file (Recommended)
Create a file named `.env` in your project root:

```env
MONGODB_URI=mongodb+srv://smartrent:yourpassword@cluster0.xxxxx.mongodb.net/smartrent
```

### Option B: Set in PowerShell (Temporary)
```powershell
$env:MONGODB_URI="mongodb+srv://smartrent:yourpassword@cluster0.xxxxx.mongodb.net/smartrent"
```

## Step 7: Test Connection
1. Open MongoDB Compass
2. Paste your connection string
3. Click "Connect"
4. If it connects, you're ready!

## Step 8: Restart Your Server
```bash
npm run dev
```

You should see:
```
[MongoDB] Connected successfully to: mongodb+srv://...
```

## Troubleshooting

**Connection timeout:**
- Make sure you whitelisted your IP in Network Access
- Try "Allow Access from Anywhere" for testing

**Authentication failed:**
- Double-check username and password
- Make sure you replaced `<username>` and `<password>` in the connection string

**Can't find cluster:**
- Wait a few minutes for cluster to finish creating
- Refresh the Atlas dashboard



