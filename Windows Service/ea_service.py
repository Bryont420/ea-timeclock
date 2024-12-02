import os
import subprocess
import win32serviceutil
import win32service
import win32event
import servicemanager
import psutil
import datetime
import threading
import time

class DjangoService(win32serviceutil.ServiceFramework):
    _svc_name_ = "EaTimeClockSvc"
    _svc_display_name_ = "EA Promos Time Clock Server"
    _svc_description_ = "This service runs the Django server for EA Promos Time Clock."

    def __init__(self, args):
        win32serviceutil.ServiceFramework.__init__(self, args)
        self.hWaitStop = win32event.CreateEvent(None, 0, 0, None)
        self.process = None
        # Removed logging file path definitions
        self.stop_event = threading.Event()

    def SvcStop(self):
        self.ReportServiceStatus(win32service.SERVICE_STOP_PENDING)
        self.stop_event.set()
    
        # Try to terminate the process
        if self.process:
            try:
                p = psutil.Process(self.process.pid)
                # Terminate child processes
                for child in p.children(recursive=True):
                    child.terminate()
                # Terminate the main process
                p.terminate()
            except psutil.NoSuchProcess:
                pass  # The process may have already been terminated
    
        win32event.SetEvent(self.hWaitStop)
        self.ReportServiceStatus(win32service.SERVICE_STOPPED)


    def SvcDoRun(self):
        # Path to your batch file
        batch_file_path = r'C:\Users\Jim Kay\Desktop\Time Clock\Windows Service\Start Server.bat'
        
        # Start the process without logging
        self.process = subprocess.Popen([batch_file_path], shell=True)
        
        win32event.WaitForSingleObject(self.hWaitStop, win32event.INFINITE)

if __name__ == '__main__':
    win32serviceutil.HandleCommandLine(DjangoService)
