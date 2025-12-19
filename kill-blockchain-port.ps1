# Kill process running on port 8545
Write-Host "🔍 Finding process on port 8545..." -ForegroundColor Yellow

try {
    $connection = Get-NetTCPConnection -LocalPort 8545 -ErrorAction Stop
    $processId = $connection.OwningProcess
    $process = Get-Process -Id $processId
    
    Write-Host "Found process: $($process.ProcessName) (PID: $processId)" -ForegroundColor Cyan
    Write-Host "Killing process..." -ForegroundColor Yellow
    
    Stop-Process -Id $processId -Force
    Start-Sleep -Seconds 1
    
    Write-Host "✅ Process killed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "You can now run: npm run hardhat:node" -ForegroundColor Green
}
catch {
    Write-Host "❌ No process found on port 8545" -ForegroundColor Red
    Write-Host "Port 8545 is available. You can run: npm run hardhat:node" -ForegroundColor Green
}




