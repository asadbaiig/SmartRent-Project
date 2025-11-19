# Quick MongoDB Connection Check Script
Write-Host "Checking MongoDB installation..." -ForegroundColor Cyan

# Check if MongoDB service exists
$service = Get-Service -Name MongoDB -ErrorAction SilentlyContinue
if ($service) {
    Write-Host "✓ MongoDB service found" -ForegroundColor Green
    if ($service.Status -eq 'Running') {
        Write-Host "✓ MongoDB service is RUNNING" -ForegroundColor Green
    } else {
        Write-Host "✗ MongoDB service is STOPPED" -ForegroundColor Red
        Write-Host "  Starting MongoDB service..." -ForegroundColor Yellow
        Start-Service MongoDB
        Start-Sleep -Seconds 2
        if ((Get-Service MongoDB).Status -eq 'Running') {
            Write-Host "✓ MongoDB service started successfully!" -ForegroundColor Green
        }
    }
} else {
    Write-Host "✗ MongoDB service not found" -ForegroundColor Red
    Write-Host "  Please install MongoDB Community Server first" -ForegroundColor Yellow
    Write-Host "  Download from: https://www.mongodb.com/try/download/community" -ForegroundColor Yellow
    exit 1
}

# Check if mongod.exe exists
$mongodPath = Get-Command mongod -ErrorAction SilentlyContinue
if ($mongodPath) {
    Write-Host "✓ MongoDB server executable found at: $($mongodPath.Source)" -ForegroundColor Green
} else {
    Write-Host "✗ MongoDB server executable not found in PATH" -ForegroundColor Yellow
}

# Test connection
Write-Host "`nTesting connection to mongodb://localhost:27017..." -ForegroundColor Cyan
try {
    $connection = Test-NetConnection -ComputerName localhost -Port 27017 -WarningAction SilentlyContinue
    if ($connection.TcpTestSucceeded) {
        Write-Host "✓ Port 27017 is open and accepting connections!" -ForegroundColor Green
        Write-Host "`n✓ MongoDB is ready to use!" -ForegroundColor Green
        Write-Host "  Your SmartRent app should connect automatically." -ForegroundColor Cyan
    } else {
        Write-Host "✗ Port 27017 is not accessible" -ForegroundColor Red
        Write-Host "  MongoDB might not be running or firewall is blocking it" -ForegroundColor Yellow
    }
} catch {
    Write-Host "✗ Could not test connection: $_" -ForegroundColor Red
}

Write-Host "`nTo test in MongoDB Compass:" -ForegroundColor Cyan
Write-Host "  Connection String: mongodb://localhost:27017" -ForegroundColor White



