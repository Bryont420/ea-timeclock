:: Navigate to the project directory
cd /d "C:\Users\Jim Kay\Desktop\Time Clock"

:: Activate the virtual environment
call .\Server\Scripts\activate.bat

:: Run the Python management command
call python .\myproject\manage.py reset_employee_hours

:: Deactivate the virtual environment
call .\Server\Scripts\deactivate.bat

:: Exit the batch script
exit /b 0