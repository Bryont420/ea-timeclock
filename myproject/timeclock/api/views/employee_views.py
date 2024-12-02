from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from timeclock.models import Employee
from timeclock.api.serializers.employee_serializers import EmployeeSerializer

class EmployeeInfoView(generics.RetrieveAPIView):
    serializer_class = EmployeeSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user.employee
