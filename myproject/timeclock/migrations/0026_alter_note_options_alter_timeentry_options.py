# Generated by Django 5.1 on 2024-10-28 16:36

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('timeclock', '0025_alter_note_options_alter_timeentry_options'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='note',
            options={},
        ),
        migrations.AlterModelOptions(
            name='timeentry',
            options={'verbose_name': 'Time Entry', 'verbose_name_plural': 'Time Entries'},
        ),
    ]
