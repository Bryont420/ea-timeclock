# Generated by Django 5.1 on 2025-01-06 15:49

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('timeclock', '0043_biometriccredential'),
    ]

    operations = [
        migrations.CreateModel(
            name='RateLimitViolation',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('ip_address', models.CharField(max_length=45)),
                ('violation_level', models.IntegerField(default=1)),
                ('ban_start', models.DateTimeField(auto_now_add=True)),
                ('ban_end', models.DateTimeField(blank=True, null=True)),
                ('level1_count', models.IntegerField(default=0)),
                ('level1_reset', models.DateTimeField(null=True)),
                ('level2_count', models.IntegerField(default=0)),
                ('level2_reset', models.DateTimeField(null=True)),
                ('level3_count', models.IntegerField(default=0)),
                ('level3_reset', models.DateTimeField(null=True)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'db_table': 'rate_limit_violations',
                'indexes': [models.Index(fields=['ip_address', 'is_active'], name='rate_limit__ip_addr_71edbc_idx'), models.Index(fields=['ban_end'], name='rate_limit__ban_end_8add4f_idx')],
            },
        ),
    ]
