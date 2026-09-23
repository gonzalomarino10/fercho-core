@echo off
setlocal
cd /d "%~dp0"
set "LOG=%~dp0fercho-log.txt"
echo === Fercho Core === > "%LOG%"
echo Carpeta: %cd% >> "%LOG%"
echo Fecha: %date% %time% >> "%LOG%"

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] No encontre Node.js. Instalalo desde https://nodejs.org ^(version LTS^) y volve a correr este archivo.
  echo [ERROR] Node.js no instalado >> "%LOG%"
  echo.
  pause
  exit /b 1
)

for /f "delims=" %%v in ('node --version') do echo Node %%v >> "%LOG%"

if not exist "node_modules" (
  echo Instalando dependencias por primera vez... esto tarda 1-2 minutos.
  echo --- npm install --- >> "%LOG%"
  call npm install >> "%LOG%" 2>&1
  if errorlevel 1 (
    echo.
    echo [ERROR] Fallo la instalacion. Abri fercho-log.txt y pasamelo.
    echo [ERROR] npm install fallo >> "%LOG%"
    pause
    exit /b 1
  )
)

echo.
echo Arrancando Fercho Core... si queda abierto, esta funcionando.
echo (Para frenarlo: cerra esta ventana)
echo --- npm run dev --- >> "%LOG%"
call npm run dev >> "%LOG%" 2>&1

echo.
echo Fercho se detuvo o fallo al arrancar. Abri fercho-log.txt y pasamelo.
pause
