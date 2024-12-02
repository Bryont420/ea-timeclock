import os
import sys
from datetime import datetime
from PySide6.QtWidgets import QApplication, QMainWindow, QVBoxLayout, QWidget, QPushButton, QHBoxLayout, QFileDialog
from PySide6.QtWebEngineWidgets import QWebEngineView
from PySide6.QtWebEngineCore import QWebEngineUrlRequestInterceptor
from PySide6.QtWebChannel import QWebChannel
from PySide6.QtCore import QUrl, QDateTime, QObject, Slot
from PySide6.QtNetwork import QNetworkCookie
from PySide6.QtGui import QDesktopServices
import requests  # Add requests for downloading the PDF file

class PDFInterceptor(QWebEngineUrlRequestInterceptor):
    def interceptRequest(self, info):
        url = info.requestUrl().toString()
        if 'generate_pdf' in url:
            QDesktopServices.openUrl(info.requestUrl())
            info.block(True)

class MyApp(QObject):
    @Slot(str, str)
    def generate_report(self, start_date, end_date):
        formatted_end_date = datetime.strptime(end_date, '%Y-%m-%d').strftime('%m-%d-%Y')
		
        # Construct the URL for the PDF report
        pdf_url = f"http://timeclock:8000/generate_pdf/?start_date={start_date}&end_date={end_date}"
        
        default_filename = f"payroll {formatted_end_date}.pdf"
        # Prompt the user to select a location to save the PDF
        file_dialog = QFileDialog()
        save_path, _ = file_dialog.getSaveFileName(None, "Save Report", os.path.expanduser(f"~/{default_filename}"), "PDF Files (*.pdf)")

        if save_path:
            try:
                # Download the PDF
                response = requests.get(pdf_url)
                response.raise_for_status()  # Raise an error for bad status codes

                # Save the PDF to the chosen location
                with open(save_path, 'wb') as file:
                    file.write(response.content)
                print(f"Report saved to {save_path}")

            except requests.exceptions.RequestException as e:
                print(f"Failed to download the report: {e}")

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Time Clock App")

        self.webview = QWebEngineView()
        self.webview.page().profile().setUrlRequestInterceptor(PDFInterceptor())

        self.set_pyqt_client_cookie()

        self.channel = QWebChannel()
        self.myApp = MyApp()
        self.channel.registerObject('myApp', self.myApp)
        self.webview.page().setWebChannel(self.channel)

        self.timeclock_button = QPushButton("Employee Dashboard")
        self.admin_dashboard_button = QPushButton("Admin Dashboard")

        self.timeclock_button.clicked.connect(self.show_employee_dashboard)
        self.admin_dashboard_button.clicked.connect(self.show_admin_dashboard)

        button_layout = QHBoxLayout()
        button_layout.addWidget(self.timeclock_button)
        button_layout.addWidget(self.admin_dashboard_button)

        layout = QVBoxLayout()
        layout.addLayout(button_layout)
        layout.addWidget(self.webview)

        container = QWidget()
        container.setLayout(layout)
        self.setCentralWidget(container)

        self.show_employee_dashboard()

    def set_pyqt_client_cookie(self):
        profile = self.webview.page().profile()
        cookie_store = profile.cookieStore()

        cookie = QNetworkCookie(b"pyqt_client", b"true")
        cookie.setDomain("timeclock")
        cookie.setPath("/")
        cookie.setExpirationDate(QDateTime.currentDateTime().addYears(1))

        cookie_store.setCookie(cookie, QUrl("http://timeclock:8000"))

    def show_employee_dashboard(self):
        self.webview.setUrl(QUrl("http://timeclock:8000/employee-dashboard"))

    def show_admin_dashboard(self):
        self.webview.setUrl(QUrl("http://timeclock:8000/admin-dashboard"))

if __name__ == "__main__":
    app = QApplication(sys.argv)

    window = MainWindow()
    window.show()

    sys.exit(app.exec())
