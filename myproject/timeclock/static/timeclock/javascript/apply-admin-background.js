document.addEventListener("DOMContentLoaded", function() {
    var body = document.getElementById('employee-background');
    var backgroundUrl = body.getAttribute('data-background-url');
    if (backgroundUrl) {
        body.style.backgroundImage = 'url(' + backgroundUrl + ')';
    }
});