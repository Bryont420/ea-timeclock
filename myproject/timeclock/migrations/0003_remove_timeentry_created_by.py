# Generated by Django 5.1 on 2024-09-02 16:14

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('timeclock', '0002_timeentry_created_by'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='timeentry',
            name='created_by',
        ),
    ]