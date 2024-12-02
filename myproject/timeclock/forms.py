# forms.py
from django import forms

class ResetVacationHoursForm(forms.Form):
    vacation_hours_allocated = forms.DecimalField(max_digits=6, decimal_places=2, required=True, label="New Allocated Hours")

class ResetSickHoursForm(forms.Form):
    sick_hours_allocated = forms.DecimalField(max_digits=6, decimal_places=2, label='Sick Hours Allocated')
