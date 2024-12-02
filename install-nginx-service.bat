@echo off
echo Installing Nginx Service...

REM Download NSSM
powershell -Command "& {Invoke-WebRequest -Uri 'https://nssm.cc/release/nssm-2.24.zip' -OutFile 'nssm.zip'}"
powershell -Command "& {Expand-Archive -Path 'nssm.zip' -DestinationPath '.' -Force}"

REM Install Nginx service
.\nssm-2.24\win64\nssm.exe install nginx "C:\nginx-1.27.2\nginx.exe"
.\nssm-2.24\win64\nssm.exe set nginx AppDirectory "C:\nginx-1.27.2"
.\nssm-2.24\win64\nssm.exe set nginx DisplayName "Nginx Time Clock"
.\nssm-2.24\win64\nssm.exe set nginx Description "Nginx web server for Time Clock application"
.\nssm-2.24\win64\nssm.exe set nginx Start SERVICE_AUTO_START
.\nssm-2.24\win64\nssm.exe set nginx ObjectName LocalSystem

REM Start the service
net start nginx

echo Cleaning up...
del /f /q nssm.zip
rd /s /q nssm-2.24

echo Nginx service has been installed and started!
pause
