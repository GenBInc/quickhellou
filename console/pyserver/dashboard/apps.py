from django.apps import AppConfig

class DashboardConfig(AppConfig):
    name = 'dashboard'
    def ready(self):
        from dashboard.util.reminders import setup_reminders_job
        setup_reminders_job()