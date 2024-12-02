# Generated by Django 5.1 on 2024-11-27 18:41

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('timeclock', '0032_timeentry_skip_hours_deduction'),
    ]

    operations = [
        migrations.AddField(
            model_name='employee',
            name='department',
            field=models.CharField(choices=[('print', 'Print'), ('embroidery', 'Embroidery'), ('engraving', 'Engraving'), ('fulfillment', 'Fulfillment'), ('shipping', 'Shipping / Receiving')], default='print', max_length=20),
        ),
    ]
