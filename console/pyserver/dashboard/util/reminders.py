from datetime import datetime
from django.conf import settings
from accounts.models import User
from dashboard.util.time import (
    time_left_verbose,
    one_day_left_delta,
    one_hour_left_delta,
)
from dashboard.models import Communication
from dashboard.emails import (
    message_url,
    cancel_url,
    send_one_day_appointment_reminder,
    send_one_hour_appointment_reminder,
)


def send_reminders():
    """Sends appointments reminders.
    """
    appointments: list[Communication] = Communication.objects.filter(
        status=Communication.STATUS_OPEN).all()

    print('enter appointments')
    for appointment in appointments:
        if not appointment.reminders:
            print('not included')
            continue

        end_datetime: datetime = appointment.datetime
        caller: User = appointment.caller

        print('is sent', appointment.one_day_reminder_sent)
        if one_day_left_delta(end_datetime) and not appointment.one_day_reminder_sent:
            print('send..')
            send_one_day_appointment_reminder(
                appointment.link_url,
                appointment.datetime,
                time_left_verbose(appointment.datetime),
                caller.profile.full_name,
                caller.email,
                caller.profile.phone,
                message_url(appointment.id),
                cancel_url(appointment.id),
            )

            appointment.one_day_reminder_sent = True
            appointment.save()

        if one_day_left_delta(end_datetime) and not appointment.one_hour_reminder_sent:
            send_one_hour_appointment_reminder(
                appointment.link_url,
                appointment.datetime,
                time_left_verbose(appointment.datetime),
                caller.profile.full_name,
                caller.email,
                caller.profile.phone,
                message_url(appointment.id),
                cancel_url(appointment.id),
            )

            appointment.one_hour_reminder_sent = True
            appointment.save()
