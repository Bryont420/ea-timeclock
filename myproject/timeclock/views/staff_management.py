from django.shortcuts import render  # For rendering templates
from django.http import JsonResponse  # For returning JSON responses
from django.contrib.auth.decorators import login_required  # For login restrictions on views
from django.views.decorators.http import require_POST, require_http_methods  # For limiting HTTP methods
from django.contrib.auth.models import User  # To manage staff members (users)
from django.contrib.auth.password_validation import validate_password  # For password validation
from django.core.exceptions import ValidationError  # To handle validation errors
import os
from django.conf import settings
from ..models import AdminProfile

#Edit Staff Within Admin View
# Show Admins View
@login_required
def admin_dashboard_show_admins(request):
    if not request.user.is_staff:
        return redirect('admin_login')
    staff_members = User.objects.filter(is_staff=True)

    # Get available background images
    background_image_dir = os.path.join(settings.BASE_DIR, 'timeclock/static/timeclock/images/admin_backgrounds')
    available_images = os.listdir(background_image_dir)

    return render(request, 'staff_management.html', {
        'staff_members': staff_members,
        'available_images': available_images,
        # Remove 'current_background_image' if not used elsewhere
    })


# Add Staff View
@login_required
@require_POST
def add_staff(request):
    if request.headers.get('x-requested-with') != 'XMLHttpRequest':
        return JsonResponse({'status': 'error', 'message': 'Invalid access method'}, status=403)

    username = request.POST.get('username')
    first_name = request.POST.get('first_name')
    last_name = request.POST.get('last_name')
    email = request.POST.get('email')
    password = request.POST.get('password')

    # Check if username or email already exists
    if User.objects.filter(username=username).exists():
        return JsonResponse({'status': 'error', 'message': 'Username already exists.'}, status=400)
    if User.objects.filter(email=email).exists():
        return JsonResponse({'status': 'error', 'message': 'Email already exists.'}, status=400)

    # Validate password
    try:
        validate_password(password)
    except ValidationError as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=400)

    # Create the user
    user = User.objects.create_user(
        username=username,
        password=password,
        email=email,
        first_name=first_name,
        last_name=last_name
    )
    user.is_staff = True
    user.save()

    return JsonResponse({'status': 'success', 'message': 'Staff member added successfully.'})

# Edit Staff View
@login_required
@require_http_methods(["GET", "POST"])
def edit_staff(request):
    user = request.user

    if request.method == 'POST':
        user.first_name = request.POST.get('first_name')
        user.last_name = request.POST.get('last_name')
        user.email = request.POST.get('email')

        password = request.POST.get('password')
        if password:
            try:
                validate_password(password)
                user.set_password(password)
            except ValidationError as e:
                return JsonResponse({'status': 'error', 'message': str(e)}, status=400)

        # Update background image
        background_image = request.POST.get('background_image')
        if background_image:
            try:
                admin_profile, created = AdminProfile.objects.get_or_create(user=user)
                admin_profile.background_image = background_image
                admin_profile.save()
            except Exception as e:
                return JsonResponse({'status': 'error', 'message': str(e)}, status=400)

        user.save()
        return JsonResponse({'status': 'success', 'message': 'Profile updated successfully.'})

    else:
        # GET request
        try:
            admin_profile = AdminProfile.objects.get(user=user)
            background_image = admin_profile.background_image
        except AdminProfile.DoesNotExist:
            background_image = None

        return JsonResponse({
            'first_name': user.first_name,
            'last_name': user.last_name,
            'email': user.email,
            'background_image': background_image,
        })

