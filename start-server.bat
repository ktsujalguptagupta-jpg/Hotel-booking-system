@echo off
cd /d "C:\Users\Sujal\Downloads\hotel"
start /b node backend/server.js > server.log 2>&1
timeout /t 3 /nobreak >nul
echo Server started
exit