# MongoDB Atlas Environment Setup Script
Write-Host "`n=== MongoDB Atlas Environment Setup ===" -ForegroundColor Cyan
Write-Host ""

# Check if .env file exists
if (Test-Path ".env") {
    Write-Host "⚠ .env file already exists!" -ForegroundColor Yellow
    $overwrite = Read-Host "Do you want to overwrite it? (y/n)"
    if ($overwrite -ne "y") {
        Write-Host "Setup cancelled." -ForegroundColor Red
        exit
    }
}

Write-Host "Please provide your MongoDB Atlas connection string." -ForegroundColor White
Write-Host ""
Write-Host "To get your connection string:" -ForegroundColor Cyan
Write-Host "1. Go to MongoDB Atlas Dashboard" -ForegroundColor White
Write-Host "2. Click 'Database' -> 'Connect'" -ForegroundColor White
Write-Host "3. Choose 'Connect your application'" -ForegroundColor White
Write-Host "4. Copy the connection string" -ForegroundColor White
Write-Host ""
Write-Host "Format: mongodb+srv://username:password@cluster.mongodb.net/smartrent" -ForegroundColor Yellow
Write-Host ""

$connectionString = Read-Host "Enter your MongoDB Atlas connection string"

if ([string]::IsNullOrWhiteSpace($connectionString)) {
    Write-Host "❌ Connection string cannot be empty!" -ForegroundColor Red
    exit 1
}

# Validate connection string format
if ($connectionString -notmatch "^mongodb\+srv://") {
    Write-Host "⚠ Warning: Connection string should start with 'mongodb+srv://'" -ForegroundColor Yellow
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y") {
        exit
    }
}

# Create .env file
$envContent = @"
# MongoDB Atlas Connection String
MONGODB_URI=$connectionString

# Server Configuration
PORT=5002
NODE_ENV=development
"@

$envContent | Out-File -FilePath ".env" -Encoding utf8

Write-Host ""
Write-Host "✅ .env file created successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Your MongoDB connection string has been saved." -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Restart your server: npm run dev" -ForegroundColor White
Write-Host "2. You should see: [MongoDB] Connected successfully" -ForegroundColor White
Write-Host ""



