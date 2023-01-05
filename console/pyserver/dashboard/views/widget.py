from datetime import (
    datetime,
    timedelta,
)
import re
import hashlib
from io import BytesIO, TextIOWrapper
from django.views.decorators.http import (
    require_POST,
)
from django.http import (
    HttpRequest,
    HttpResponse,
)
from django.utils import timezone
from django.contrib import messages
from django.core.mail import send_mail
from django.http import FileResponse, Http404
from django.shortcuts import render
from django.template.loader import render_to_string
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from accounts.models import (
    Profile,
    User,
)
from dashboard.util.time import (
    TIME_FORMAT,
    DATETIME_FORMAT,
    format_day_with_ordinal,
    collect_weekly_hours,
    filter_upcoming_hours,
    filter_available_hours,
    set_timezone,
)
from dashboard.emails import send_email_notification
from dashboard.forms import (
    WidgetScheduleForm,
    WidgetActiveUserForm,
    ContactInformationForm,
)
from dashboard.models import (
    Communication,
    CommunicationSession,
    Widget,
    WidgetTemplate,
)


def create_widget_embed_script(
    widget: Widget
) -> str:
    widget_source_file: TextIOWrapper = open(
        'console/static/js/embed/widget_embed_script.js', "r", encoding="utf-8")
    widget_source: list[str] = widget_source_file.readlines()

    code: str = ''
    if widget is not None:
        for line in widget_source:
            line = line.format(
                widget_id=widget.id,
                uuid=widget.uuid,
                console_app_url=settings.CONSOLE_APP_URL
            )
            code += line
    return code


def widget_embed_script_file(
    request: HttpRequest,
    widget_id: int
) -> FileResponse:
    widget: Widget = Widget.objects.get(id=widget_id)

    if not widget:
        raise Http404

    code: str = create_widget_embed_script(widget)

    buffer: BytesIO = BytesIO(code.encode())

    return FileResponse(buffer, as_attachment=False)


def create_widget_content_script(
    widget: Widget
) -> str:
    """Creates widget content script with iframe.

    Args:
        widget (Widget): the widget object

    Returns:
        str: the script code
    """
    widget_template: WidgetTemplate = widget.template
    template_params: dict = app_params() | {
        'widget_id': widget.id,
        'uuid': str(widget.uuid),
        'background_color': widget_template.background_color,
        'icon': widget_template.icon}
    template_iframe: str = render_to_string(
        'embed/widget_iframe.html', template_params)

    widget_source_file: TextIOWrapper = open(
        'console/static/js/embed/widget_content_script.js', 'r', encoding='utf-8')
    widget_source: list[str] = widget_source_file.readlines()

    code: str = ''
    if widget is not None:
        for line in widget_source:
            line = line.format(
                template_code=template_iframe,
                console_app_url=settings.CONSOLE_APP_URL,
                video_app_url=settings.VIDEOCHAT_APP_URL,
            )
            code += line
    return code


def widget_content_script_file(
    request: HttpRequest,
    widget_id: int
) -> FileResponse:
    widget: Widget = Widget.objects.get(id=widget_id)
    if not widget:
        raise Http404

    code: str = create_widget_content_script(widget)
    buffer: BytesIO = BytesIO(code.encode())

    return FileResponse(buffer, as_attachment=False, filename='quickhellou.js')


@csrf_exempt
@require_POST
def widget_calendar_view(
    request: HttpRequest,
    widget_id: int,
) -> HttpResponse:
    """Widget calendar page view.

    Args:
        request (HttpRequest): the HTTP request
        widget_id (int): the widget id

    Returns:
        HttpResponse: the HTTP response
    """
    # Activate front user timezone
    user_timezone: str = request.POST.get('timezone')
    set_timezone(user_timezone)

    widget: Widget = Widget.objects.get(id=widget_id)
    if not widget:
        raise Http404

    user: User = widget.last_editor

    working_hours: dict[str, list[str]] = collect_weekly_hours(user)

    appointments: list[Communication] = Communication.objects.filter(
        client_board=user.client_board).all()

    pages: list[dict] = []
    for week in range(0, 4):
        start_date = datetime.today() + timedelta(days=7*week)
        date_list: list = [start_date + timedelta(days=x) for x in range(7)]
        days: list[dict] = []
        dates: list[datetime] = []
        for index, date in enumerate(date_list):
            all_working_hours: list = working_hours.get(date.strftime('%w'))
            # Collect only upcoming dates
            daily_working_hours: list = filter_upcoming_hours(
                user, date, all_working_hours)

            # Collect only available dates (not yet scheduled)
            available_working_hours: list = filter_available_hours(
                user, date, appointments, daily_working_hours
            )

            day: dict = {
                'info': '',
                'date': date.strftime('%Y-%m-%d'),
                'datetime': date,
                'day_name': date.strftime('%A'),
                'month_date': date.strftime('%b %d'),
                'time': available_working_hours
            }
            dates.append(date.strptime(date.strftime('%B %Y'), '%B %Y'))
            days.append(day)

        months: list = []
        for index, month_date in enumerate(list(set(dates))):
            months.append({
                'index': index,
                'month': month_date.strftime('%B'),
                'year': month_date.strftime('%Y')
            })

        page: dict = {
            'months': months,
            'days': days
        }
        pages.append(page)

    return render(request, 'embed/widget/scheduler_calendar.html', {
        'pages': pages,
    })


class DatePayload():
    """Formatted date properties model
    """

    datetime: str
    day: str
    hour: str
    day_ordinal: str
    month: str
    year: str

    def __init__(
        self,
        date: datetime,
    ) -> None:
        """Constructor

        Args:
            date (datetime): the date
        """
        self.datetime = date.strftime(DATETIME_FORMAT)
        self.day = date.strftime('%A')
        self.hour = date.strftime(TIME_FORMAT)
        self.day_ordinal = format_day_with_ordinal(date)
        self.month = date.strftime('%B')
        self.year = date.strftime('%Y')


@csrf_exempt
@require_POST
def add_widget_contact_form_view(
    request: HttpRequest,
    widget_id: int,
) -> HttpResponse:
    """Add widget contact form view.

    Args:
        request (HttpRequest): the HTTP request
        widget_id (int): the widget id

    Returns:
        HttpResponse: the HTTP response
    """
    widget: Widget = Widget.objects.get(id=widget_id)
    if not widget:
        raise Http404

    date_selected: str = request.POST.get('datetime')
    date: datetime = datetime.strptime(date_selected, DATETIME_FORMAT)
    date_payload: DatePayload = DatePayload(date)
    widget_template: WidgetTemplate = widget.template
    return render(request, 'embed/widget/contact_information_form.html', {
        'date': date_payload,
        'form': ContactInformationForm(),
        'background_color': widget_template.background_color,
    })


@csrf_exempt
@require_POST
def edit_widget_contact_form_view(
    request: HttpRequest,
    widget_id: int,
) -> HttpResponse:
    """Edit widget contact form view.

    Args:
        request (HttpRequest): the HTTP request
        widget_id (int): the widget id

    Returns:
        HttpResponse: the HTTP response
    """
    widget: Widget = Widget.objects.get(id=widget_id)
    if not widget:
        raise Http404

    widget_template: WidgetTemplate = widget.template

    form: ContactInformationForm = ContactInformationForm(request.POST)

    # Create date payload
    date_selected: str = form.data['datetime']
    date: datetime = datetime.strptime(date_selected, DATETIME_FORMAT)
    date_payload: DatePayload = DatePayload(date)

    if form.is_valid():
        # Create appointment
        email_sent: bool = form.create_appointment(widget)

        # If apppointments is created and email are sent, render complete view
        if email_sent:
            return render(request, 'embed/widget/contact_information_form_complete.html', {
                'date': date_payload,
                'background_color': widget_template.background_color,
            })

        # If there was an issue with email services, add error message
        if not email_sent:
            messages.error(
                request, 'An error with sending emails has occured.')

    return render(request, 'embed/widget/contact_information_form.html', {
        'date': date_payload,
        'form': form,
        'background_color': widget_template.background_color,
    })


@csrf_exempt
def install(
    request: HttpRequest,
    widget_id: int,
    domain: str,
    uuid: str
) -> HttpResponse:
    widget: Widget = Widget.objects.get(id=widget_id, uuid=uuid)

    if not widget:
        raise Http404

    domain_match = domain in widget.url
    if widget is not None and not domain_match:
        result = "Widget not installed. Incorrect domain."
        status = "failure"
    if widget is not None and domain_match and widget.is_installed:
        result = "Widget already installed."
        status = "ok"
    if widget is not None and domain_match and not widget.is_installed:
        widget.is_installed = True
        widget.save()
        result = "Widget installed."
        status = "ok"

    return render(request, 'embed/install.html', {'status': status, 'result': result})


@csrf_exempt
def test_widget(
    request: HttpRequest
) -> HttpResponse:
    return render(request, 'embed/test_widget_v2.html', {})


def active_operator_init_form(
    request: HttpRequest
) -> HttpResponse:
    return render(request, 'embed/active_operator_init_form.html', {})


def inactive_operator_init_form(
    request: HttpRequest
) -> HttpResponse:
    return render(request, 'embed/inactive_operator_init_form.html', {})


def widget_content_view(
    request: HttpRequest,
    widget_id: int,
) -> HttpResponse:
    """Widget content view that is rendered within the iframe.

    Args:
        request (HttpRequest): the HTTP request
        widget_id (int): the widget id

    Returns:
        HttpResponse: the HTTP response
    """
    widget: Widget = Widget.objects.get(id=widget_id)
    widget_template: WidgetTemplate = widget.template
    template_params: dict = app_params() | {
        'widget_id': widget.id,
        'uuid': str(widget.uuid),
        'background_color': widget_template.background_color,
        'icon': widget_template.icon}
    return render(request, 'embed/widget_content.html', template_params)


def widget_embed_view(
    request: HttpRequest,
    widget_id: int,
    hostname: str,
    uuid: str
) -> HttpResponse:
    widget = Widget.objects.get(id=widget_id, uuid=uuid)

    if not widget:
        raise Http404

    domain_match = hostname == widget.url
    if widget is not None and domain_match and not widget.is_installed:
        widget.is_installed = True
        widget.save()

    if (widget.is_installed):
        return render(request, 'embed/widget.html', {'widget': widget})
    else:
        return render(request, 'embed/widget.html', {'widget': None})


@csrf_exempt
def widget_active_operator(
    request: HttpRequest,
    widget_id: int,
    hostname: str,
    uuid: str
) -> HttpResponse:
    widget = Widget.objects.get(id=widget_id, uuid=uuid)

    if not widget:
        raise Http404

    domain_match = hostname == widget.url

    status = ''
    user_id = None

    if widget is not None and domain_match and not widget.is_installed:
        widget.is_installed = True
        widget.save()

    if request.method == 'POST':
        form = WidgetActiveUserForm(request.POST)
        if form.is_valid():
            clientName = form.cleaned_data['name']
            clientEmailOrPhone = form.cleaned_data['email_or_phone']

            clientEmail = ''
            clientPhone = ''

            if '@' in clientEmailOrPhone:
                clientEmail = clientEmailOrPhone
            else:
                clientEmail = '{0}@{1}'.format(hashlib.md5(str(datetime.now()).encode('utf-8')).hexdigest(),
                                               settings.FAKE_EMAIL_DOMAIN)

            phone_regex = re.compile(
                '^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{3,6}$')
            if phone_regex.match(clientEmailOrPhone):
                clientPhone = clientEmailOrPhone
            # create or update user
            try:
                client_user = User.objects.get(email=clientEmail)
            except Exception as e:
                client_user = User.objects.create(
                    email=clientEmail, client_board=widget.client_board)
                client_user.save()
            user_id = client_user.id
            # create user profile
            try:
                profile = Profile.objects.get(user=client_user)
            except:
                profile = Profile.objects.create(user=client_user)
                profile.full_name = clientName
                profile.phone = clientPhone
                profile.save()

            # update profile data
            profile.full_name = form.cleaned_data['name']
            profile.save()

            status = 'ok'
            # set success message
            form = WidgetActiveUserForm()
    else:
        form = WidgetActiveUserForm()
    return render(request, 'embed/active_operator_form_response.html', {
        'widget': widget,
        'form': form,
        'status': status,
        'user_id': user_id,
        'hostname': hostname})


@csrf_exempt
def widget_schedule_view(
    request: HttpRequest,
    widget_id: int,
    hostname: str,
    uuid: str
) -> HttpResponse:
    widget: Widget = Widget.objects.get(id=widget_id, uuid=uuid)

    if not widget:
        raise Http404

    domain_match: bool = hostname == widget.url

    user_id: int = None

    if widget is not None and domain_match and not widget.is_installed:
        widget.is_installed = True
        widget.save()

    if request.method == 'POST':
        form = WidgetScheduleForm(request.POST)
        if form.is_valid():
            client_name = form.cleaned_data['name']
            email_address = form.cleaned_data['email_address']
            phone_number: str = form.cleaned_data['phone_number']
            datetime: str = form.cleaned_data['datetime']

            clientEmail = ''
            clientPhone = ''

            # get or create user
            try:
                client_user: User = User.objects.get(email=email_address)
            except:
                client_user: User = User.objects.create(
                    email=email_address, client_board=widget.client_board)
                client_user.save()
            user_id: int = client_user.id
            # get or create user profile
            try:
                profile: Profile = Profile.objects.get(user=client_user)
            except:
                profile: Profile = Profile.objects.create(user=client_user)
                profile.phone = phone_number

            profile.full_name = client_name
            profile.save()

            # get or create communication
            try:
                communication = Communication.objects.get(caller=client_user)
                communication.status = 2
            except:
                communication = Communication.objects.create(caller=client_user, caller_name=client_name,
                                                             client_board=widget.client_board, status=2, widget=widget)
            communication.save()

            # TODO: check what is clientMessage and clientName
            clientMessage = '__clientMessage__'
            clientName = '__clientName__'

            # create communication session
            session: CommunicationSession = CommunicationSession.objects.create_message(
                communication=communication, attendant=client_user, message=clientMessage, type=2)

            # send message
            subject = 'QuickHellou - Message'
            recipients = [settings.ADMIN_EMAIL]
            # if email address is empty prevent sending email
            console_app_url: str = settings.CONSOLE_APP_URL
            email_params: dict = {
                'name': clientName, 'email': clientEmail, 'phone': clientPhone, 'message': clientMessage, 'console_app_url': console_app_url}
            try:
                # send message notification to admin
                send_email_notification(subject, recipients, email_params,
                                        'dashboard/email/widget-message-admin.txt', 'dashboard/email/widget-message-admin.html')

                # send message notification to client
                if settings.FAKE_EMAIL_DOMAIN not in clientEmail:
                    recipients = [clientEmail]
                    send_email_notification(
                        subject, recipients, email_params, 'dashboard/email/widget-message-client.txt', 'dashboard/email/widget-message-client.html')
                messages.success(
                    request, "Thank You!")
                messages.success(
                    request, "Message sent successfully.")
            except Exception as e:
                messages.error(request, "Error sending email.")
                messages.error(request, "Please try again later.")
            # set success message
            form = WidgetScheduleForm()
    else:
        form = WidgetScheduleForm()
    return render(request, 'embed/widget_form_response.html', {
        'widget': widget,
        'form': form,
        'user_id': user_id,
        'hostname': hostname})


def app_params() -> dict[str]:
    """Application settings object.

    Returns:
        dict[str]: the applcaition settings
    """
    return {
        'video_app_url': settings.VIDEOCHAT_APP_URL,
        'console_app_url': settings.CONSOLE_APP_URL,
        'ws_service_url': settings.WEB_SERVICE_URL,
    }
