function handleReportButtonClick() {
    var startDate = encodeURIComponent(document.getElementById('start_date').value);
    var endDate = encodeURIComponent(document.getElementById('end_date').value);
    
    // Update the condition to detect if the app is running in PySide6
    if (window.qt && window.qt.webChannelTransport) {
        new QWebChannel(qt.webChannelTransport, function(channel) {
            if (channel.objects.myApp) {
                channel.objects.myApp.generate_report(startDate, endDate);
            } else {
                console.error("PySide6 app is not connected");
            }
        });
    } else {
        var url = pdfLink + "?start_date=" + startDate + "&end_date=" + endDate;
        window.open(url, '_blank');
    }
}
