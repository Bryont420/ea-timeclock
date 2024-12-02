@echo off

:: Navigate to the project directory
cd /d "C:\Users\Jim Kay\Desktop\Time Clock"

:: Activate the virtual environment
call .\Server\Scripts\activate.bat

:: Run the Python management command
call python .\myproject\manage.py rotate_jwt_key

:: Restart the Django server (kill and restart)
taskkill /F /IM python.exe
timeout /t 2
start /B cmd /c "python .\myproject\manage.py runserver 0.0.0.0:8000"

:: Deactivate the virtual environment
call .\Server\Scripts\deactivate.bat

:: Exit the batch script
exit /b 0
