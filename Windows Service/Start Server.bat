:: Navigate to the project directory
cd /d "C:\Users\Jim Kay\Desktop\Time Clock"

:: Activate the virtual environment
call .\Server\Scripts\activate.bat
where python
call .\myproject\manage.py runserver 0.0.0.0:8000