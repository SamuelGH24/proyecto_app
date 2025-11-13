@echo off
title Iniciando servidor UANFilms
echo ==============================
echo Iniciando servidor Node.js...
echo ==============================
cd backend
start "" cmd /c "node server.js"
timeout /t 3 >nul
start "" "http://localhost:3000"
exit

SS