# PowerShell script to run tests with coverage report
# For Windows users

Write-Host "Running tests with coverage..." -ForegroundColor Cyan
Write-Host ""

$env:NODE_ENV = "test"
node --experimental-vm-modules node_modules/jest/bin/jest.js --coverage --coverageReporters=text --coverageReporters=text-summary

Write-Host ""
Write-Host "Coverage report generated in 'coverage' directory" -ForegroundColor Green
Write-Host "HTML report available at: coverage/index.html" -ForegroundColor Green
























