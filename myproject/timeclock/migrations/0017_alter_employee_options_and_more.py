# Generated by Django 5.1 on 2024-09-09 15:47

from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('timeclock', '0016_alter_employee_options_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='employee',
            options={'ordering': ['first_name']},
        ),
        migrations.AddIndex(
            model_name='employee',
            index=models.Index(fields=['employee_id'], name='timeclock_e_employe_2c7047_idx'),
        ),
        migrations.AddIndex(
            model_name='employee',
            index=models.Index(fields=['clocked_in'], name='timeclock_e_clocked_932fa2_idx'),
        ),
        migrations.AddIndex(
            model_name='employee',
            index=models.Index(fields=['last_name', 'first_name'], name='timeclock_e_last_na_733d5c_idx'),
        ),
        migrations.AddIndex(
            model_name='employee',
            index=models.Index(fields=['employee_id', 'clocked_in'], name='timeclock_e_employe_8122a9_idx'),
        ),
        migrations.AddIndex(
            model_name='employee',
            index=models.Index(fields=['user', 'employee_id'], name='timeclock_e_user_id_cb8fbb_idx'),
        ),
        migrations.AddIndex(
            model_name='employee',
            index=models.Index(fields=['clocked_in', 'last_name'], name='timeclock_e_clocked_49ba39_idx'),
        ),
        migrations.AddIndex(
            model_name='employee',
            index=models.Index(fields=['hire_date'], name='timeclock_e_hire_da_3b0279_idx'),
        ),
        migrations.AddIndex(
            model_name='employee',
            index=models.Index(fields=['hire_date', 'last_name'], name='timeclock_e_hire_da_4b0381_idx'),
        ),
        migrations.AddIndex(
            model_name='employee',
            index=models.Index(fields=['sick_hours_used', 'sick_hours_allocated'], name='timeclock_e_sick_ho_be5b86_idx'),
        ),
        migrations.AddIndex(
            model_name='employee',
            index=models.Index(fields=['vacation_hours_allocated', 'vacation_hours_used'], name='timeclock_e_vacatio_a47d8d_idx'),
        ),
    ]
