from typing import Any
from django.conf import settings
from django.template.loader import render_to_string
from django.core.mail import send_mail
from dashboard.models import (
    Communication,
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
        'dashboard/email/accept-appointment-admin.txt',
        'dashboard/email/accept-appointment-admin.html'
    )

    # send message notification to client
    if settings.FAKE_EMAIL_DOMAIN not in client_email_address:
        recipients = [client_email_address]

    return send_email_notification(
        subject,
        recipients,
        email_params,
        'dashboard/email/accept-appointment-client.txt',
        'dashboard/email/accept-appointment-client.html'
    )


def send_reject_appointment_notifications(
    client_name: str,
    client_email_address: str,
    client_message: str,
    datetime: str,
    videochat_url: str,
) -> int:
    print('send_reject_appointment_notifications')
    subject: str = 'QuickHellou - Appointment Rejected'
    recipients: list[str] = [settings.ADMIN_EMAIL]

    console_app_url: str = settings.CONSOLE_APP_URL
    email_params: dict = {
        'name': client_name,
        'email': client_email_address,
        'message': client_message,
        'datetime': datetime,
        'videochat_url': videochat_url,
        'console_app_url': console_app_url
    }

    # send message notification to admin
    send_email_notification(
        subject,
        recipients,
        email_params,
        'dashboard/email/reject-appointment-admin.txt',
        'dashboard/email/reject-appointment-admin.html'
    )

    # send message notification to client
    if settings.FAKE_EMAIL_DOMAIN not in client_email_address:
        recipients = [client_email_address]

    return send_email_notification(
        subject,
        recipients,
        email_params,
        'dashboard/email/reject-appointment-client.txt',
        'dashboard/email/reject-appointment-client.html'
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
    # send message
    subject: str = 'QuickHellou - New Appointment'
    recipients: list[str] = [settings.ADMIN_EMAIL]
    # if email address is empty prevent sending email
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
    # send message notification to admin
    send_email_notification(
        subject,
        recipients,
        email_params,
        'dashboard/email/create-appointment-admin.txt',
        'dashboard/email/create-appointment-admin.html'
    )

    # send message notification to client
    if settings.FAKE_EMAIL_DOMAIN not in client_email_address:
        recipients = [client_email_address]

    return send_email_notification(
        subject,
        recipients,
        email_params,
        'dashboard/email/create-appointment-client.txt',
        'dashboard/email/create-appointment-client.html'
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
