@echo off
REM EL PABELLON - lanzador para Windows
REM Arranca un servidor local y abre el juego en el navegador.
cd /d "%~dp0"

set PORT=8666

where py >nul 2>nul
if %errorlevel%==0 (
    start "" http://localhost:%PORT%
    py -m http.server %PORT%
    goto :eof
)

where python >nul 2>nul
if %errorlevel%==0 (
    start "" http://localhost:%PORT%
    python -m http.server %PORT%
    goto :eof
)

echo No se encontro Python. Instalalo desde https://www.python.org/downloads/
echo (marca la casilla "Add Python to PATH" durante la instalacion)
echo.
echo Alternativa: usa cualquier servidor estatico, por ejemplo:
echo    npx serve .
pause
