@echo off

:: 1. מעבר לתיקייה המבוקשת
cd /d "C:\Users\Ziv\Desktop\Serveup"

:: 2. המתנה של 3 שניות (לפני הרצת הפקודה)
timeout /t 3 /nobreak >nul

:: 3. הרצת הפקודה
echo Starting development server...
npm run dev

:: 4. השהייה בסיום (יוצג רק אם השרת ייעצר)
echo.
pause


