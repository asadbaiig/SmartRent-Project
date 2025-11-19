# ✅ MongoDB Installed - Next Steps

## Step 1: Start MongoDB (if not running)

### Check if MongoDB is running:
```powershell
Get-Service MongoDB
```

### If it's not running, start it:
```powershell
# Run PowerShell as Administrator
Start-Service MongoDB
```

### Or start it manually:
1. Open **Services** (Win + R, type `services.msc`)
2. Find **"MongoDB"** service
3. Right-click → **Start**

## Step 2: Test Connection in MongoDB Compass

1. **Open MongoDB Compass** (you already have it installed)

2. **Connect to MongoDB:**
   - Connection String: `mongodb://localhost:27017`
   - Or just click "Connect" (it uses localhost by default)
   - Click **"Connect"** button

3. **If it connects successfully:**
   - ✅ You'll see the MongoDB interface
   - ✅ You're ready to go!

4. **If connection fails:**
   - MongoDB service might not be running
   - Follow Step 1 above to start it

## Step 3: Test Your SmartRent App

Your app is already configured to connect to `mongodb://localhost:27017/smartrent`

1. **Restart your server:**
   ```bash
   npm run dev
   ```

2. **Look for this message:**
   ```
   [MongoDB] Connected successfully to: mongodb://localhost:27017/smartrent
   ```

3. **If you see that message:**
   - ✅ Everything is working!
   - Your properties and documents will be stored in MongoDB
   - You can see them in MongoDB Compass under the `smartrent` database

## Step 4: Verify in MongoDB Compass

After your app runs and creates some data:

1. Open MongoDB Compass
2. Connect to `mongodb://localhost:27017`
3. You should see a database called **`smartrent`**
4. Inside, you'll see collections:
   - `properties` - Your property listings
   - `documents` - Uploaded documents

## Troubleshooting

### MongoDB service won't start:
```powershell
# Run as Administrator
net start MongoDB
```

### Port 27017 is in use:
- Something else might be using the port
- Check: `netstat -ano | findstr :27017`

### Connection refused:
- Make sure MongoDB service is running
- Check Windows Firewall isn't blocking it

## Quick Test Commands

```powershell
# Check service status
Get-Service MongoDB

# Start service (as Admin)
Start-Service MongoDB

# Test connection
Test-NetConnection localhost -Port 27017
```

---

**You're almost there!** Just start MongoDB and test the connection. Let me know if you see any errors!



