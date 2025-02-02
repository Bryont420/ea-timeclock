# Generated by Django 5.1 on 2025-01-08 17:19

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('timeclock', '0053_delete_passwordresetattempt'),
    ]

    operations = [
        migrations.CreateModel(
            name='LoginAttempt',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('ip_address', models.GenericIPAddressField()),
                ('attempt_time', models.DateTimeField(auto_now_add=True)),
                ('attempt_type', models.CharField(choices=[('attempt', 'Login Attempt'), ('ban', 'Ban Record')], max_length=10)),
                ('ban_level', models.IntegerField(blank=True, null=True)),
                ('ban_start', models.DateTimeField(blank=True, null=True)),
                ('ban_end', models.DateTimeField(blank=True, null=True)),
            ],
            options={
                'indexes': [models.Index(fields=['ip_address', 'attempt_time'], name='timeclock_l_ip_addr_25d104_idx'), models.Index(fields=['ip_address', 'attempt_type'], name='timeclock_l_ip_addr_74d018_idx')],
            },
        ),
        migrations.CreateModel(
            name='PasswordResetAttempt',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('ip_address', models.GenericIPAddressField()),
                ('attempt_time', models.DateTimeField(auto_now_add=True)),
                ('attempt_type', models.CharField(choices=[('password_reset', 'Password Reset Attempt'), ('login', 'Login Attempt'), ('ban', 'Ban Record')], max_length=20)),
                ('ban_level', models.IntegerField(blank=True, null=True)),
                ('ban_start', models.DateTimeField(blank=True, null=True)),
                ('ban_end', models.DateTimeField(blank=True, null=True)),
                ('grace_period_end', models.DateTimeField(blank=True, null=True)),
            ],
            options={
                'verbose_name': 'Banned Ip',
                'verbose_name_plural': 'Banned IPs',
                'indexes': [models.Index(fields=['ip_address', 'attempt_time'], name='timeclock_p_ip_addr_b83904_idx'), models.Index(fields=['attempt_type'], name='timeclock_p_attempt_c5a2f0_idx')],
            },
        ),
    ]
