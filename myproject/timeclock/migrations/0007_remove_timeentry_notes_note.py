# Generated by Django 5.1 on 2024-09-03 13:33

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('timeclock', '0006_remove_timeentry_created_by_timeentry_notes_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.RemoveField(
            model_name='timeentry',
            name='notes',
        ),
        migrations.CreateModel(
            name='Note',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('note_text', models.TextField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
                ('time_entry', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='notes', to='timeclock.timeentry')),
            ],
            options={
                'ordering': ['created_at'],
                'indexes': [models.Index(fields=['time_entry'], name='timeclock_n_time_en_632e5d_idx'), models.Index(fields=['created_by'], name='timeclock_n_created_62e16a_idx')],
            },
        ),
    ]