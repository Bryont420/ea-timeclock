# Generated by Django 5.1 on 2024-10-16 13:25

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('timeclock', '0020_employee_vacation_allocated_on_90_days'),
    ]

    operations = [
        migrations.AddField(
            model_name='employee',
            name='initial_sick_hours_allocated',
            field=models.BooleanField(default=False),
        ),
    ]
