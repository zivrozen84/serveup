@echo off

:: 1. מעבר לתיקייה המבוקשת
cd /d "C:\Users\Ziv\Desktop\Serveup"

:: 2. המתנה של 3 שניות (לפני הרצת הפקודה)
timeout /t 3 /nobreak >nul

:: 3. סנכרון סכמה ל-DB + עדכון Prisma Client (לפני הפעלת השרת)
echo Syncing schema to database...
call npx prisma db push
echo Generating Prisma client...
call npx prisma generate
if errorlevel 1 (
  echo.
  echo [אזהרה]  כבר יש לך טרמינל רץ יאידיוט
  echo.
)

:: 4. הרצת השרת
echo Starting development server...
npm run dev

:: 5. השהייה בסיום (יוצג רק אם השרת ייעצר)
echo.
pause


