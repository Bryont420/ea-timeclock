# Generated by Django 5.1 on 2025-01-08 17:35

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('timeclock', '0054_loginattempt_passwordresetattempt'),
    ]

    operations = [
        migrations.DeleteModel(
            name='LoginAttempt',
        ),
        migrations.DeleteModel(
            name='PasswordResetAttempt',
        ),
    ]
