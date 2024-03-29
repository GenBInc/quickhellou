from typing import Any
from django.conf import settings
from django.template.loader import render_to_string
from django.core.mail import send_mail
from dashboard.models import (
    Communication,
)


def message_url(appointment_id: int) -> str:
    """Appointment message view URL

    Args:
        appointment_id (int): the appointment id

    Returns:
        str: the URL
    """
    return '{}/dashboard/appointment/message/{}'.format(
        settings.CONSOLE_APP_URL, appointment_id)


def cancel_url(appointment_id: int) -> str:
    """Appointment cancellation view URL

    Args:
        appointment_id (int): the appointment id

    Returns:
        str: the URL
    """
    return '{}/dashboard/appointment/cancel/{}'.format(
        settings.CONSOLE_APP_URL, appointment_id)


def send_appointment_reminder(
    appointment_url: str,
    datetime: str,
    time_left: str,
    client_name: str,
    client_email_address: str,
    client_phone_number: str,
    message_url: str,
    cancel_url: str,
    email_subject: str = 'QuickHellou - Appointment Reminder',
    email_template: str = 'dashboard/email/appointments/reminders/reminder',
):
    """Sends appointment reminder.

    Args:
        appointment_url (str): the appointment URL
        datetime (str): the start datetime 
        time_left (str): time left to start
        client_name (str): the customer name
        client_email_address (str): the customer email address
        client_phone_number (str): the customer phone number
        message_url (str): the message URL
        cancel_url (str): the cancel URL
        email_template (str): the email template file path name
    """
    recipients: list[str] = [client_email_address]

    console_app_url: str = settings.CONSOLE_APP_URL
    email_params: dict = {
        'appointment_url': appointment_url,
        'datetime': datetime,
        'time_left': time_left,
        'name': client_name,
        'email': client_email_address,
        'phone_number': client_phone_number,
        'console_app_url': console_app_url,
        'message_url': message_url,
        'cancel_url': cancel_url,
    }

    # send message notification to admin
    send_email_notification(
        email_subject,
        recipients,
        email_params,
        '{}.txt'.format(email_template),
        '{}.html'.format(email_template),
    )


def send_one_day_appointment_reminder(
    appointment_url: str,
    datetime: str,
    time_left: str,
    client_name: str,
    client_email_address: str,
    client_phone_number: str,
    message_url: str,
    cancel_url: str,
):
    return send_appointment_reminder(
        appointment_url,
        datetime,
        time_left,
        client_name,
        client_email_address,
        client_phone_number,
        message_url,
        cancel_url,
        'QuickHellou - One day to your appointment left',
        'dashboard/email/appointments/reminders/one-day',
    )


def send_one_hour_appointment_reminder(
    appointment_url: str,
    datetime: str,
    time_left: str,
    client_name: str,
    client_email_address: str,
    client_phone_number: str,
    message_url: str,
    cancel_url: str,
):
    return send_appointment_reminder(
        appointment_url,
        datetime,
        time_left,
        client_name,
        client_email_address,
        client_phone_number,
        message_url,
        cancel_url,
        'QuickHellou - One hour to your appointment left',
        'dashboard/email/appointments/reminders/one-hour',
    )


def send_appointment_message(
    appointment_url: str,
    client_name: str,
    client_email_address: str,
    client_phone_number: str,
    client_message: str,
):
    subject: str = 'QuickHellou - Appointment Message'
    recipients: list[str] = [settings.ADMIN_EMAIL]

    console_app_url: str = settings.CONSOLE_APP_URL
    email_params: dict = {
        'appointment_url': appointment_url,
        'name': client_name,
        'email': client_email_address,
        'phone_number': client_phone_number,
        'message': client_message,
        'console_app_url': console_app_url,
    }

    # send message notification to admin
    send_email_notification(
        subject,
        recipients,
        email_params,
        'dashboard/email/appointments/message-admin.txt',
        'dashboard/email/appointments/message-admin.html'
    )


def send_activation_appointment_notifications(
    status: int,
    client_name: str,
    client_email_address: str,
    client_message: str,
    datetime: str,
    videochat_url: str,
    message_url: str,
    cancel_url: str,
) -> int:
    if status == Communication.STATUS_OPEN:
        send_accept_appointment_notifications(
            client_name,
            client_email_address,
            client_message,
            datetime,
            videochat_url,
            message_url,
            cancel_url,
        )

    if status == Communication.STATUS_REJECTED:
        send_reject_appointment_notifications(
            client_name,
            client_email_address,
            client_message,
            datetime,
            videochat_url,
            message_url,
            cancel_url,
        )


def send_accept_appointment_notifications(
    client_name: str,
    client_email_address: str,
    client_message: str,
    datetime: str,
    videochat_url: str,
    message_url: str,
    cancel_url: str,
) -> int:
    """Sends accept appointment notifications.

    Args:
        client_name (str): the customer name
        client_email_address (str): the customer email address
        client_message (str): the customer message
        datetime (str): the start datetime
        videochat_url (str): the videochat URL
        message_url (str): the message URL
        cancel_url (str): the cancel URL

    Returns:
        int: 1 if success
    """
    subject: str = 'QuickHellou - Appointment Accepted'
    recipients: list[str] = [settings.ADMIN_EMAIL]

    console_app_url: str = settings.CONSOLE_APP_URL
    email_params: dict = {
        'name': client_name,
        'email': client_email_address,
        'message': client_message,
        'datetime': datetime,
        'videochat_url': videochat_url,
        'console_app_url': console_app_url,
        'message_url': message_url,
        'cancel_url': cancel_url,
    }

    # send message notification to admin
    send_email_notification(
        subject,
        recipients,
        email_params,
        'dashboard/email/appointments/accept-appointment-admin.txt',
        'dashboard/email/appointments/accept-appointment-admin.html'
    )

    # send message notification to client
    if settings.FAKE_EMAIL_DOMAIN not in client_email_address:
        recipients = [client_email_address]

    return send_email_notification(
        subject,
        recipients,
        email_params,
        'dashboard/email/appointments/accept-appointment-client.txt',
        'dashboard/email/appointments/accept-appointment-client.html'
    )


def send_reject_appointment_notifications(
    client_name: str,
    client_email_address: str,
    client_message: str,
    datetime: str,
    videochat_url: str,
    message_url: str,
    cancel_url: str,
) -> int:
    """Sends reject appointment notification.

    Args:
        client_name (str): the customer name
        client_email_address (str): the customer email address
        client_message (str): the customer message
        datetime (str): the start datetime
        videochat_url (str): the videochat URL

    Returns:
        int: 1 if success
    """
    subject: str = 'QuickHellou - Appointment Rejected'
    recipients: list[str] = [settings.ADMIN_EMAIL]

    console_app_url: str = settings.CONSOLE_APP_URL
    email_params: dict = {
        'name': client_name,
        'email': client_email_address,
        'message': client_message,
        'datetime': datetime,
        'videochat_url': videochat_url,
        'console_app_url': console_app_url,
        'message_url': message_url,
        'cancel_url': cancel_url,
    }

    # send message notification to admin
    send_email_notification(
        subject,
        recipients,
        email_params,
        'dashboard/email/appointments/reject-appointment-admin.txt',
        'dashboard/email/appointments/reject-appointment-admin.html'
    )

    # send message notification to client
    if settings.FAKE_EMAIL_DOMAIN not in client_email_address:
        recipients = [client_email_address]

    return send_email_notification(
        subject,
        recipients,
        email_params,
        'dashboard/email/appointments/reject-appointment-client.txt',
        'dashboard/email/appointments/reject-appointment-client.html'
    )


def send_create_appointment_notifications(
    client_name: str,
    client_email_address: str,
    client_phone_number: str,
    client_message: str,
    datetime: str,
    message_url: str,
    cancel_url: str,
) -> int:
    # Send message
    subject: str = 'QuickHellou - New Appointment'
    recipients: list[str] = [settings.ADMIN_EMAIL]
    # If email address is empty prevent sending email
    console_app_url: str = settings.CONSOLE_APP_URL
    email_params: dict = {
        'name': client_name,
        'email': client_email_address,
        'phone': client_phone_number,
        'message': client_message,
        'datetime': datetime,
        'console_app_url': console_app_url,
        'message_url': message_url,
        'cancel_url': cancel_url,
    }
    # Send message notification to admin
    send_email_notification(
        subject,
        recipients,
        email_params,
        'dashboard/email/appointments/create-appointment-admin.txt',
        'dashboard/email/appointments/create-appointment-admin.html'
    )

    # Send message notification to client
    if settings.FAKE_EMAIL_DOMAIN not in client_email_address:
        recipients = [client_email_address]

    return send_email_notification(
        subject,
        recipients,
        email_params,
        'dashboard/email/appointments/create-appointment-client.txt',
        'dashboard/email/appointments/create-appointment-client.html'
    )


def send_email_notification(
    subject: str,
    recipients: list,
    email_params: dict[str, Any],
    text_template_url: str,
    html_template_url: str
) -> int:
    """
    Sends email notification.

    Args:
        subject (str): the email subject
        recipients (list): the recipient list 
        email_params (dict[str, Any]): the email params
        text_template_url (str): the text template URL
        html_template_url (str): the HTML template URL

    Returns:
        int: success
    """
    message_plain: str = render_to_string(text_template_url, email_params)
    message_html: str = render_to_string(html_template_url, email_params)
    return send_mail(
        subject,
        message_plain,
        settings.ADMIN_EMAIL,
        recipients,
        html_message=message_html
    )
