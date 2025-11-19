# Installing MongoDB Server on Windows

You have MongoDB Compass (the GUI), but you also need the MongoDB Server. Here's how to install it:

## Quick Installation Steps:

### Option 1: Using MongoDB Installer (Recommended)

1. **Download MongoDB Community Server**
   - Go to: https://www.mongodb.com/try/download/community
   - Select:
     - Version: Latest (7.0 or 6.0)
     - Platform: Windows
     - Package: MSI
   - Click "Download"

2. **Run the Installer**
   - Double-click the downloaded `.msi` file
   - Click "Next" through the setup wizard
   - Choose "Complete" installation
   - **IMPORTANT**: Check "Install MongoDB as a Service"
   - Check "Run service as Network Service user"
   - Check "Install MongoDB Compass" (you already have it, but it's fine)
   - Click "Install"

3. **MongoDB will start automatically**
   - The installer will start MongoDB as a Windows Service
   - It will run on `mongodb://localhost:27017` by default

4. **Verify Installation**
   - Open MongoDB Compass
   - Connect to: `mongodb://localhost:27017`
   - You should see the connection succeed!

### Option 2: Using Chocolatey (If you have it)

```powershell
choco install mongodb
```

### Option 3: Manual Installation

1. Download the ZIP version from MongoDB website
2. Extract to `C:\Program Files\MongoDB\Server\7.0\`
3. Create data directory: `C:\data\db`
4. Run: `mongod.exe --dbpath C:\data\db`

## After Installation:

1. **Test the connection:**
   ```powershell
   # Check if MongoDB service is running
   Get-Service MongoDB
   ```

2. **Start MongoDB (if not running):**
   ```powershell
   # Run as Administrator
   net start MongoDB
   ```

3. **Connect with Compass:**
   - Open MongoDB Compass
   - Connection string: `mongodb://localhost:27017`
   - Click "Connect"

4. **Your SmartRent app will automatically connect!**
   - No need to set MONGODB_URI (defaults to localhost:27017)
   - Just restart your server: `npm run dev`

## Troubleshooting:

**If MongoDB service won't start:**
- Run Command Prompt as Administrator
- Navigate to MongoDB bin folder (usually `C:\Program Files\MongoDB\Server\7.0\bin`)
- Run: `mongod --install --serviceName MongoDB`
- Then: `net start MongoDB`

**If port 27017 is already in use:**
- Check what's using it: `netstat -ano | findstr :27017`
- Or change MongoDB port in config file

**Firewall issues:**
- Windows Firewall may block MongoDB
- Allow MongoDB through firewall or disable temporarily for testing

## Quick Test:

Once installed, test in PowerShell:
```powershell
# Should show MongoDB service running
Get-Service MongoDB

# Or test connection directly
mongosh mongodb://localhost:27017
```

Your SmartRent app is already configured to connect to `mongodb://localhost:27017/smartrent` by default!



