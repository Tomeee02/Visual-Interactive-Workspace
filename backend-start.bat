@echo off
setlocal

set "BACKEND_DIR=%~dp0backend"
cd /d "%BACKEND_DIR%"
call "venv\Scripts\activate.bat"
python -m pip install -r requirements.txt --disable-pip-version-check
if errorlevel 1 (
	echo Hiba: a backend fuggosegei nem telepithetoek.
	pause
	exit /b 1
)
python manage.py makemigrations --noinput
python manage.py migrate --noinput
if errorlevel 1 (
	echo Hiba: a backend adatbazis-migracioja sikertelen.
	pause
	exit /b 1
)
python manage.py runserver 0.0.0.0:8000
pause
