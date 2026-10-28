@echo off
setlocal

set "APP_DIR=%~dp0"
set "BACKEND_DIR=%APP_DIR%backend"
set "FRONTEND_DIR=%APP_DIR%frontend"
set "VENV_DIR=%BACKEND_DIR%\venv"

if not exist "%VENV_DIR%\Scripts\activate.bat" (
    echo Hiba: a backend virtualis kornyezete nem talalhato itt:
    echo %VENV_DIR%
    echo Hozd letre a backend\venv kornyezetet, majd inditsd ujra ezt a fajlt.
    pause
    exit /b 1
)

where pnpm >nul 2>nul
if errorlevel 1 (
    echo Hiba: a pnpm nem talalhato a PATH-ban.
    echo Telepitsd a pnpm-et, majd inditsd ujra ezt a fajlt.
    pause
    exit /b 1
)

start "Visual Workspace - Backend" "%ComSpec%" /k call "%APP_DIR%backend-start.bat"
start "Visual Workspace - Frontend" "%ComSpec%" /k call "%APP_DIR%frontend-start.bat"

start "" http://localhost:5173

echo A Visual Workspace elindult.
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:8000
echo A szerverek kulon ablakokban futnak; leallitasukhoz zard be az ablakokat.
exit /b 0
