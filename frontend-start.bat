@echo off
setlocal

pushd "%~dp0frontend"
if errorlevel 1 (
    echo Hiba: a frontend mappaja nem talalhato.
    pause
    exit /b 1
)

if not exist node_modules (
    call pnpm install
    if errorlevel 1 (
        echo Hiba: a frontend fuggosegei nem telepithetoek.
        pause
        exit /b 1
    )
)

call pnpm run dev
pause
