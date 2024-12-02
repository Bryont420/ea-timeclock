from rest_framework import views
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from ..models import Employee, AdminProfile

class BackgroundImageView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            if request.user.is_staff:
                # Get admin background
                admin_profile = AdminProfile.objects.get(user=request.user)
                background_image = admin_profile.background_image
            else:
                # Get employee background
                employee = request.user.employee
                background_image = employee.background_image

            return Response({
                'background_image': background_image
            })
        except (Employee.DoesNotExist, AdminProfile.DoesNotExist):
            return Response({
                'background_image': None
            })
