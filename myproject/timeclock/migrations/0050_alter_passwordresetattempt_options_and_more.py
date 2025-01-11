# Generated by Django 5.1 on 2025-01-06 21:10

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('timeclock', '0049_loginattempt'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='passwordresetattempt',
            options={},
        ),
        migrations.RemoveIndex(
            model_name='passwordresetattempt',
            name='timeclock_p_attempt_c5a2f0_idx',
        ),
        migrations.AddField(
            model_name='passwordresetattempt',
            name='grace_period_end',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='passwordresetattempt',
            name='attempt_type',
            field=models.CharField(choices=[('password_reset', 'Password Reset Attempt'), ('login', 'Login Attempt'), ('ban', 'Ban Record')], max_length=20),
        ),
        migrations.AlterField(
            model_name='passwordresetattempt',
            name='ban_level',
            field=models.IntegerField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='passwordresetattempt',
            name='ip_address',
            field=models.GenericIPAddressField(),
        ),
        migrations.AddIndex(
            model_name='passwordresetattempt',
            index=models.Index(fields=['ip_address', 'attempt_type'], name='timeclock_p_ip_addr_ebfd75_idx'),
        ),
    ]