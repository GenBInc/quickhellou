from django.core.management.base import BaseCommand, CommandError

from dashboard.util.reminders import send_reminders


class Command(BaseCommand):
    help = 'Sends appointment reminders.'

    def handle(self, *args, **options):
        try:
            send_reminders()
        except Exception as exception:
            raise CommandError('Reminders sending error.', exception)

        self.stdout.write(self.style.SUCCESS('Reminders have been sent.'))
