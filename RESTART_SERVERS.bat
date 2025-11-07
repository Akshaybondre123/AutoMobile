@echo off
echo.
echo ========================================
echo   SERVICE DASHBOARD - RESTART SCRIPT
echo ========================================
echo.

echo [1/4] Stopping existing servers...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 >nul

echo [2/4] Clearing Next.js cache...
cd /d "C:\Users\Akshay\Downloads\Automobile\shubh-hyundai-dashboard"
if exist ".next" (
    rmdir /s /q ".next"
    echo       Cache cleared!
)

echo [3/4] Opening Backend terminal...
start "Backend Server" cmd /k "cd /d C:\Users\Akshay\Downloads\Automobile\AutoBackend && echo Starting Backend... && npm start"

timeout /t 3 >nul

echo [4/4] Opening Frontend terminal...
start "Frontend Server" cmd /k "cd /d C:\Users\Akshay\Downloads\Automobile\shubh-hyundai-dashboard && echo Starting Frontend... && npm run dev"

echo.
echo ========================================
echo   SERVERS STARTING...
echo ========================================
echo.
echo Wait for both terminals to show "Ready"
echo Then open: http://localhost:3000/login
echo Press Ctrl+Shift+R to hard refresh
echo.
echo Login: sm.pune@shubh.com / password
echo.
pause
