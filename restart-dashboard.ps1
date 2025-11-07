# Restart Dashboard Script
Write-Host "🔄 Restarting Service Dashboard..." -ForegroundColor Cyan
Write-Host ""

# Stop any running processes on ports 3000 and 5000
Write-Host "⏹️  Stopping existing servers..." -ForegroundColor Yellow
$port3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
$port5000 = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue

if ($port3000) {
    Stop-Process -Id $port3000.OwningProcess -Force -ErrorAction SilentlyContinue
    Write-Host "   Stopped process on port 3000" -ForegroundColor Green
}

if ($port5000) {
    Stop-Process -Id $port5000.OwningProcess -Force -ErrorAction SilentlyContinue
    Write-Host "   Stopped process on port 5000" -ForegroundColor Green
}

Start-Sleep -Seconds 2

# Clear Next.js cache
Write-Host ""
Write-Host "🗑️  Clearing Next.js cache..." -ForegroundColor Yellow
$nextFolder = "C:\Users\Akshay\Downloads\Automobile\shubh-hyundai-dashboard\.next"
if (Test-Path $nextFolder) {
    Remove-Item -Recurse -Force $nextFolder
    Write-Host "   Cleared .next folder" -ForegroundColor Green
}

# Clear node_modules cache
$cacheFolder = "C:\Users\Akshay\Downloads\Automobile\shubh-hyundai-dashboard\node_modules\.cache"
if (Test-Path $cacheFolder) {
    Remove-Item -Recurse -Force $cacheFolder
    Write-Host "   Cleared node_modules cache" -ForegroundColor Green
}

Write-Host ""
Write-Host "✅ Cleanup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Open TWO PowerShell windows" -ForegroundColor White
Write-Host ""
Write-Host "   Window 1 - Backend:" -ForegroundColor Yellow
Write-Host "      cd C:\Users\Akshay\Downloads\Automobile\AutoBackend" -ForegroundColor Gray
Write-Host "      npm start" -ForegroundColor Gray
Write-Host ""
Write-Host "   Window 2 - Frontend:" -ForegroundColor Yellow
Write-Host "      cd C:\Users\Akshay\Downloads\Automobile\shubh-hyundai-dashboard" -ForegroundColor Gray
Write-Host "      npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "   3. Open browser: http://localhost:3000/login" -ForegroundColor Yellow
Write-Host "   4. Press Ctrl+Shift+R to hard refresh" -ForegroundColor Yellow
Write-Host ""
Write-Host "🎉 You should now see the NEW dashboard!" -ForegroundColor Green
