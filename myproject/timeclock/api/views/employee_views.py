from rest_framework import generics, mixins
from rest_framework.permissions import IsAuthenticated
from timeclock.models import Employee
from timeclock.api.serializers.employee_serializers import EmployeeSerializer

class EmployeeInfoView(mixins.UpdateModelMixin, generics.RetrieveAPIView):
    serializer_class = EmployeeSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user.employee

    def put(self, request, *args, **kwargs):
        return self.update(request, *args, **kwargs)

    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)
