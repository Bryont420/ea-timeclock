from .models import AdminProfile
from django.templatetags.static import static  # Import static
from django.contrib.auth.models import User

def admin_background_image(request):
    background_image = 'admin-background.jpg'  # Default image
    if request.user.is_authenticated and request.user.is_staff:
        try:
            admin_profile = AdminProfile.objects.get(user=request.user)
            if admin_profile.background_image:
                background_image = admin_profile.background_image
        except AdminProfile.DoesNotExist:
            pass
    # Construct the full static URL
    background_image_url = static('timeclock/images/admin_backgrounds/' + background_image)
    return {'background_image_url': background_image_url}

def is_pyqt_client_processor(request):
    return {
        'is_pyqt_client': request.COOKIES.get('pyqt_client') == 'true'
    }
