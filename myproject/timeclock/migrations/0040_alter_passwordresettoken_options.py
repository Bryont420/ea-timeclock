# Generated by Django 5.1 on 2024-12-05 20:42

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('timeclock', '0039_passwordresettoken'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='passwordresettoken',
            options={'verbose_name': 'Password Reset Token', 'verbose_name_plural': 'Password Reset Tokens'},
        ),
    ]