# MongoDB Atlas Setup - Step by Step Guide

## ✅ Step 1: Sign Up (I've opened the page for you)

1. The registration page should be open in your browser
2. Sign up with:
   - Email, OR
   - Google/GitHub account (faster)
3. Complete the registration

## ✅ Step 2: Create Free Cluster

After signup, you'll see the Atlas dashboard:

1. Click **"Build a Database"** button
2. Choose **"FREE" (M0)** tier (it's free forever!)
3. **Cloud Provider**: Choose AWS (recommended)
4. **Region**: Choose closest to you (e.g., `us-east-1` for US)
5. Click **"Create"** button
   - ⏳ Wait 1-3 minutes for cluster to be created

## ✅ Step 3: Create Database User

1. In the left sidebar, click **"Database Access"**
2. Click **"Add New Database User"** button
3. **Authentication Method**: Choose "Password"
4. **Username**: Enter `smartrent` (or any username you like)
5. **Password**: 
   - Click "Autogenerate Secure Password" OR create your own
   - **⚠️ SAVE THIS PASSWORD!** You'll need it for the connection string
   - Copy it somewhere safe
6. **Database User Privileges**: Select "Atlas admin" (or "Read and write to any database")
7. Click **"Add User"** button

## ✅ Step 4: Whitelist Your IP Address

1. In the left sidebar, click **"Network Access"**
2. Click **"Add IP Address"** button
3. For development, click **"Allow Access from Anywhere"**
   - This adds `0.0.0.0/0` (allows all IPs)
   - ⚠️ Only for development! For production, add specific IPs
4. Click **"Confirm"** button

## ✅ Step 5: Get Your Connection String

1. In the left sidebar, click **"Database"**
2. You'll see your cluster. Click **"Connect"** button
3. Choose **"Connect your application"**
4. **Driver**: Select "Node.js"
5. **Version**: Select latest (4.1 or higher)
6. You'll see a connection string like:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/
   ```
7. **Copy this connection string**

## ✅ Step 6: Update Connection String

Replace the placeholders in your connection string:

1. Replace `<username>` with your database username (e.g., `smartrent`)
2. Replace `<password>` with your database password
3. Add `/smartrent` at the end (database name)

**Example:**
```
mongodb+srv://smartrent:MyPassword123@cluster0.abc123.mongodb.net/smartrent
```

## ✅ Step 7: Configure Your App

I'll help you set this up in the next step. Just copy your connection string and we'll add it to your project!

---

## Quick Checklist:

- [ ] Signed up for Atlas account
- [ ] Created free M0 cluster
- [ ] Created database user (username + password saved)
- [ ] Whitelisted IP (Allow from Anywhere)
- [ ] Got connection string
- [ ] Ready to configure in app

Once you have your connection string, let me know and I'll help you add it to your project!



