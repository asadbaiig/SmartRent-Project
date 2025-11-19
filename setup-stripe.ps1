# Stripe Environment Setup Script
Write-Host "`n=== Stripe Payment Setup ===" -ForegroundColor Cyan
Write-Host ""

# Check if .env file exists
$envExists = Test-Path ".env"
$envContent = ""

if ($envExists) {
    Write-Host "⚠ .env file already exists!" -ForegroundColor Yellow
    $overwrite = Read-Host "Do you want to add Stripe keys to it? (y/n)"
    if ($overwrite -eq "y") {
        $envContent = Get-Content ".env" -Raw
    } else {
        Write-Host "Setup cancelled." -ForegroundColor Red
        exit
    }
} else {
    # Create basic .env content
    $envContent = @"
# Server Configuration
PORT=5002
NODE_ENV=development

# MongoDB Atlas Connection String (optional)
# MONGODB_URI=your_mongodb_connection_string_here

"@
}

Write-Host ""
Write-Host "To get your Stripe API keys:" -ForegroundColor Cyan
Write-Host "1. Go to https://dashboard.stripe.com" -ForegroundColor White
Write-Host "2. Click 'Developers' -> 'API keys'" -ForegroundColor White
Write-Host "3. Copy your Publishable key (starts with pk_test_)" -ForegroundColor White
Write-Host "4. Click 'Reveal test key' to see your Secret key (starts with sk_test_)" -ForegroundColor White
Write-Host ""
Write-Host "For testing, you can use test keys. They start with:" -ForegroundColor Yellow
Write-Host "  - Publishable: pk_test_..." -ForegroundColor Yellow
Write-Host "  - Secret: sk_test_..." -ForegroundColor Yellow
Write-Host ""

$stripeSecretKey = Read-Host "Enter your Stripe Secret Key (sk_test_...)"
if ([string]::IsNullOrWhiteSpace($stripeSecretKey)) {
    Write-Host "⚠ Warning: Secret key is empty. Stripe payments won't work." -ForegroundColor Yellow
}

$stripePublishableKey = Read-Host "Enter your Stripe Publishable Key (pk_test_...)"
if ([string]::IsNullOrWhiteSpace($stripePublishableKey)) {
    Write-Host "⚠ Warning: Publishable key is empty. Payment form won't load." -ForegroundColor Yellow
}

# Add Stripe keys to env content
if (-not ($envContent -match "STRIPE_SECRET_KEY")) {
    $envContent += "`n# Stripe Configuration`n"
    $envContent += "STRIPE_SECRET_KEY=$stripeSecretKey`n"
    $envContent += "VITE_STRIPE_PUBLISHABLE_KEY=$stripePublishableKey`n"
} else {
    # Replace existing keys
    $envContent = $envContent -replace "STRIPE_SECRET_KEY=.*", "STRIPE_SECRET_KEY=$stripeSecretKey"
    $envContent = $envContent -replace "VITE_STRIPE_PUBLISHABLE_KEY=.*", "VITE_STRIPE_PUBLISHABLE_KEY=$stripePublishableKey"
}

# Write to .env file
$envContent | Out-File -FilePath ".env" -Encoding utf8 -NoNewline

Write-Host ""
Write-Host "✅ .env file updated successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Restart your server: npm run dev" -ForegroundColor White
Write-Host "2. The Stripe error should be gone" -ForegroundColor White
Write-Host ""
Write-Host "To test payments, use Stripe test card: 4242 4242 4242 4242" -ForegroundColor Cyan
Write-Host ""

