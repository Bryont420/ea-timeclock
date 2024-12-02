from rest_framework.decorators import api_view
from rest_framework.response import Response
from ..models import Employee, TimeEntry, Note  # Models for the application

@api_view(['GET'])
def employee_data(request, employee_id):
    employee = Employee.objects.filter(employee_id=employee_id).first()
    if employee:
        # Sample data to be returned
        data = {
            "employee_id": employee.employee_id,
            "name": f"{employee.first_name} {employee.last_name}",
            # Add other fields as necessary
        }
        return Response(data)
    return Response({"error": "Employee not found"}, status=404)
