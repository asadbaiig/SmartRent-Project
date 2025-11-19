# Install MongoDB Server Locally on Windows

## Quick Installation:

1. **Download MongoDB Community Server**
   - Go to: https://www.mongodb.com/try/download/community
   - Version: Latest (7.0 or 6.0)
   - Platform: Windows
   - Package: MSI
   - Click "Download"

2. **Run the Installer**
   - Double-click the downloaded `.msi` file
   - Click "Next" through setup
   - Choose **"Complete"** installation
   - **CRITICAL**: Check ✅ **"Install MongoDB as a Service"**
   - Check ✅ **"Run service as Network Service user"**
   - Check ✅ **"Install MongoDB Compass"** (optional, you have it)
   - Click "Install"

3. **MongoDB Starts Automatically**
   - The installer will start MongoDB as a Windows Service
   - It runs on `mongodb://localhost:27017` by default

4. **Verify Installation**
   ```powershell
   # Check if service is running
   Get-Service MongoDB
   
   # Should show: Status = Running
   ```

5. **Test in Compass**
   - Open MongoDB Compass
   - Connect to: `mongodb://localhost:27017`
   - Should connect successfully!

6. **Restart Your SmartRent Server**
   ```bash
   npm run dev
   ```
   - Should see: `[MongoDB] Connected successfully`

## If MongoDB Service Won't Start:

Run PowerShell as Administrator:

```powershell
# Find MongoDB installation
$mongodPath = "C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe"
# Adjust version number if different

# Install as service
& $mongodPath --install --serviceName MongoDB --serviceDisplayName "MongoDB Server"

# Start service
Start-Service MongoDB

# Verify
Get-Service MongoDB
```

## Troubleshooting:

**Port 27017 already in use:**
```powershell
# Check what's using the port
netstat -ano | findstr :27017
```

**Service exists but won't start:**
- Check Windows Event Viewer for errors
- Make sure data directory exists: `C:\data\db`
- Run MongoDB manually to see error messages

**Firewall blocking:**
- Allow MongoDB through Windows Firewall
- Or temporarily disable firewall for testing

## Your App Configuration:

Your SmartRent app is already configured to use:
- Default: `mongodb://localhost:27017/smartrent`
- No environment variable needed for local setup!



