# Generated by Django 3.2.4 on 2021-11-24 18:52

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('dashboard', '0007_delete_applicationsettings_alter_widget_name'),
    ]

    operations = [
        migrations.AlterField(
            model_name='widgettemplate',
            name='background_color',
            field=models.CharField(default='#7FD100', max_length=12),
        ),
    ]
