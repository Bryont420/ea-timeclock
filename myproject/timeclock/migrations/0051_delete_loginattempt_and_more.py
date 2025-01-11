# Generated by Django 5.1 on 2025-01-07 13:12

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('timeclock', '0050_alter_passwordresetattempt_options_and_more'),
    ]

    operations = [
        migrations.DeleteModel(
            name='LoginAttempt',
        ),
        migrations.AlterModelOptions(
            name='passwordresetattempt',
            options={'verbose_name': 'Banned Ip', 'verbose_name_plural': 'Banned IPs'},
        ),
        migrations.RemoveIndex(
            model_name='passwordresetattempt',
            name='timeclock_p_ip_addr_ebfd75_idx',
        ),
        migrations.AddIndex(
            model_name='passwordresetattempt',
            index=models.Index(fields=['attempt_type'], name='timeclock_p_attempt_c5a2f0_idx'),
        ),
    ]