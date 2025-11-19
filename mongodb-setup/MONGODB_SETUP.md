# MongoDB Setup Guide

Your SmartRent application now uses MongoDB to store properties and documents. Here are two ways to set it up:

## Option 1: MongoDB Atlas (Cloud - Recommended) 🌟

MongoDB Atlas offers a free tier that's perfect for development:

1. **Sign up for MongoDB Atlas**
   - Go to https://www.mongodb.com/cloud/atlas/register
   - Create a free account (M0 Free Tier)

2. **Create a Cluster**
   - Choose a cloud provider and region
   - Select "M0 Free" tier
   - Give your cluster a name (e.g., "SmartRent")

3. **Create a Database User**
   - Go to "Database Access" → "Add New Database User"
   - Choose "Password" authentication
   - Create a username and password (save these!)

4. **Whitelist Your IP**
   - Go to "Network Access" → "Add IP Address"
   - Click "Allow Access from Anywhere" (for development) or add your IP

5. **Get Connection String**
   - Go to "Database" → "Connect" → "Connect your application"
   - Copy the connection string (looks like: `mongodb+srv://username:password@cluster.mongodb.net/`)
   - Replace `<password>` with your actual password
   - Add database name: `mongodb+srv://username:password@cluster.mongodb.net/smartrent`

6. **Set Environment Variable**
   - Create a `.env` file in your project root (if it doesn't exist)
   - Add: `MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/smartrent`
   - Or set it in your system environment variables

## Option 2: Local MongoDB Installation

### Windows:

1. **Download MongoDB Community Server**
   - Go to https://www.mongodb.com/try/download/community
   - Select Windows, MSI package
   - Download and run the installer

2. **Install MongoDB**
   - Run the installer
   - Choose "Complete" installation
   - Install as a Windows Service (recommended)
   - Install MongoDB Compass (GUI tool - optional but helpful)

3. **Start MongoDB**
   - MongoDB should start automatically as a service
   - Or run: `net start MongoDB` in Command Prompt (as Administrator)

4. **Verify Installation**
   - MongoDB runs on `mongodb://localhost:27017` by default
   - Your app will connect automatically

### macOS:

```bash
# Using Homebrew
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

### Linux:

```bash
# Ubuntu/Debian
sudo apt-get install -y mongodb
sudo systemctl start mongodb
sudo systemctl enable mongodb
```

## Testing the Connection

Once MongoDB is set up, restart your server:

```bash
npm run dev
```

You should see:
```
[MongoDB] Connected successfully to: mongodb://...
```

If you see connection errors, check:
- MongoDB is running (for local installation)
- Connection string is correct (for Atlas)
- Network/firewall allows connections
- Credentials are correct

## Environment Variables

Create a `.env` file in your project root:

```env
MONGODB_URI=mongodb://localhost:27017/smartrent
# OR for Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/smartrent
```

## Fallback Behavior

If MongoDB is not available, the app will:
- Continue running without crashing
- Use dataset/CSV files for property listings
- Show warnings in the console
- Allow you to develop without MongoDB

However, **new properties and documents will only be saved when MongoDB is connected**.

## Need Help?

- MongoDB Atlas Docs: https://docs.atlas.mongodb.com/
- Local MongoDB Docs: https://docs.mongodb.com/manual/installation/
- Connection String Format: https://docs.mongodb.com/manual/reference/connection-string/

