@echo off
cd /d C:\Users\Ziv\Desktop\Serveup

echo פתיחת שרת...
start /b cmd /c "timeout /t 6 /nobreak >nul && start http://localhost:3000"

call npm run dev

pause
