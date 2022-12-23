# Generated by Django 2.1.5 on 2019-02-04 19:02

from django.db import migrations

def load_applicationsettings(apps, schema_editor):
    ApplicationSettings = apps.get_model("dashboard", "ApplicationSettings")
    video_app_url = ApplicationSettings(id=0,property='video_app_url',value='http://localhost:8080')
    video_app_url.save()
    console_app_url = ApplicationSettings(id=1,property='console_app_url',value='https://localhost:8081')
    console_app_url.save()
    ws_service_url = ApplicationSettings(id=2,property='ws_service_url',value='wss://localhost:8099/ws')
    ws_service_url.save()
    admin_email_address = ApplicationSettings(id=3,property='admin_email_address',value='us_office@genb.com')
    admin_email_address.save()

class Migration(migrations.Migration):

    dependencies = [
        ('dashboard', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(load_applicationsettings),
    ]
