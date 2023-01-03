from datetime import (
    datetime,
)
from io import TextIOWrapper
from zoneinfo import ZoneInfo
from django.views.decorators.http import (
    require_POST,
)
from django.http import (
    HttpRequest,
    HttpResponse,
    HttpResponseRedirect
)
from django.utils.timezone import make_aware, is_aware
from django.contrib import messages
from django.contrib.auth.decorators import login_required, permission_required
from django.http import Http404
from django.shortcuts import redirect, render, get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from accounts.models import (
    Profile,
    User,
)
from dashboard.emails import send_email_notification
from dashboard.util.time import (
    HOURS,
    MINUTES,
    TIMEZONE_UTC,
)
from dashboard.forms import (
    AssignedWidgetsForm,
    AssigneesForm,
    CommunicationForm,
    ProfileForm,
    ProfileMetaForm,
    UserForm,
    WidgetForm,
    WidgetTemplateForm,
    CommunicationSessionForm,
    CalendarForm,
    AppointmentActivationForm,
    SendAppointmentMessageForm,
    SendAppointmentReminderForm
)
from dashboard.models import (
    ClientBoard,
    Communication,
    CommunicationSession,
    Widget,
    WidgetTemplate,
    UserWorkingHours,
)


@login_required
def home_view(request: HttpRequest):
    user = request.user
    return render(request, 'dashboard/home.html', {'user': request.user})


@login_required
def widgets_view(
    request: HttpRequest
) -> HttpResponse:
    widgets: list[Widget] = Widget.objects.filter(
        active=True, client_board=request.user.client_board).order_by('id')
    active_widgets_len: int = len(widgets.filter(paused=False))
    return render(request, 'dashboard/widgets.html', {
        'user': request.user,
        'widgets': widgets,
        'languages': Widget.LANG_CHOICES,
        'active_widgets_len': active_widgets_len})


@permission_required("is_default_admin")
@permission_required("is_default_editor")
@login_required
def templates_view(
    request: HttpRequest
) -> HttpResponse:
    widget_templates: list[WidgetTemplate] = WidgetTemplate.objects.filter(
        active=True, last_editor=request.user
    ).order_by('id')
    return render(request, 'dashboard/templates.html', {
        'widget_templates': widget_templates
    })


@permission_required("is_default_editor")
@login_required
def appointment_edit_view(
    request: HttpRequest,
    appointment_id: int = None
) -> HttpResponse:
    """Appointment edit view.

    Args:
        request (HttpRequest): the HTTP request
        appointment_id (int, optional): the appointment id. Defaults to None.

    Returns:
        HttpResponse: the HTTP response
    """
    form: CommunicationForm = None
    if appointment_id is not None:
        appointment: Communication = Communication.objects.get(
            id=appointment_id)
        com_sessions: list[CommunicationSession] = appointment.communicationsession_set.all(
        )
        form = CommunicationForm(instance=appointment)
    else:
        return redirect('dashboard:appointments')
    if request.method == 'POST':
        form = CommunicationForm(request.POST, instance=appointment)
        if form.is_valid():
            form.save_all()
            messages.success(
                request, 'Appointment has been saved.')
            return redirect('dashboard:appointments')
    return render(request, 'dashboard/appointments/edit.html', {
        'form': form,
        'appointment': appointment,
        'client_user': appointment.caller,
        'statuses': Communication.STATUS_CHOICES,
        'com_sessions': com_sessions,
    })


def communication_session_edit_view(
    request: HttpRequest,
    session_id: int
) -> HttpResponse:
    instance = get_object_or_404(CommunicationSession, id=session_id)
    form = CommunicationSessionForm(request.POST or None, instance=instance)
    if form.is_valid():
        instance = form.save(commit=False)
        if (form.cleaned_data['status'] == instance.STATUS_COMPLETED):
            instance.attendant = request.user
            communication = instance.communication
            is_com_open = False
            for session in communication.communicationsession_set.all():
                is_com_open = is_com_open or session.status is not session.STATUS_COMPLETED
            if is_com_open is False:
                communication.status = Communication.STATUS_COMPLETED
                communication.save()
        instance.save()
        messages.success(
            request, 'Communication session has been saved.')
    return render(request, 'dashboard/communication_session_edit.html', {
        'session': instance,
        'client_user': instance.communication.caller,
        'statuses': CommunicationSession.STATUS_CHOICES,
    })


def change_appointment_status(
    request: HttpRequest,
    appointment_id: str,
    status: int,
) -> HttpResponseRedirect:
    appointment: Communication = Communication.objects.get(
        id=appointment_id)

    if not appointment:
        raise Http404

    form: AppointmentActivationForm = AppointmentActivationForm(
        request.POST, instance=appointment)

    if form.is_valid():
        form.set_status(status)
        if status == Communication.STATUS_OPEN:
            messages.success(
                request, 'Appointment has been accepted.')

        if status == Communication.STATUS_REJECTED:
            messages.error(
                request, 'Appointment has been rejected.')

    return redirect('dashboard:appointments')


@login_required
def accept_appointment(
    request: HttpRequest,
    appointment_id: str,
) -> HttpResponseRedirect:
    """Accepts appointment.

    Args:
        request (HttpRequest): the HTTP request
        appointment_id (str): the appointment id

    Returns:
        HttpResponseRedirect: the HTTP response redirect
    """
    return change_appointment_status(
        request,
        appointment_id,
        Communication.STATUS_OPEN
    )


def cancel_appointment(
    request: HttpRequest,
    appointment_id: str,
) -> HttpResponse:
    """Cancel appointment view.

    Args:
        request (HttpRequest): the HTTP request
        appointment_id (str): the appointment id

    Raises:
        Http404: the error

    Returns:
        HttpResponse: the HTTP response
    """
    appointment: Communication = Communication.objects.get(
        id=appointment_id)

    if not appointment:
        raise Http404

    appointment.status = Communication.STATUS_CANCELLED
    appointment.save()

    return render(request, 'dashboard/appointments/front/cancel.html', {
        'username': appointment.caller.profile.full_name,
        'appointment': appointment,
    })


def send_appointment_reminder(
    request: HttpRequest,
    appointment_id: str,
) -> HttpResponseRedirect:
    appointment: Communication = Communication.objects.get(
        id=appointment_id)

    if not appointment:
        raise Http404

    form: SendAppointmentReminderForm = SendAppointmentReminderForm(
        request.POST)
    if form.is_valid():
        form.send_reminder(appointment)

    messages.success(
        request, 'Reminder has been sent.')

    com_sessions: list[CommunicationSession] = appointment.communicationsession_set.all()

    return render(request, 'dashboard/appointments/edit.html', {
        'form': form,
        'appointment': appointment,
        'client_user': appointment.caller,
        'statuses': Communication.STATUS_CHOICES,
        'com_sessions': com_sessions,
    })


@csrf_exempt
def send_appointment_message(
    request: HttpRequest,
    appointment_id: str,
) -> HttpResponseRedirect:
    """Handles appointment message sent by caller.

    Args:
        request (HttpRequest): the HTTP request
        appointment_id (str): the appointment id

    Raises:
        Http404: the error

    Returns:
        HttpResponseRedirect: the HTTP response redirect
    """
    appointment: Communication = Communication.objects.get(
        id=appointment_id)

    if not appointment:
        raise Http404

    form: SendAppointmentMessageForm = SendAppointmentMessageForm(request.POST)
    if form.is_valid():
        form.add_message(appointment)
        messages.success(
            request, 'Message has been sent.')

    return render(request, 'dashboard/appointments/front/message.html', {
        'username': appointment.caller.profile.full_name,
        'form': form,
        'appointment': appointment,
    })


def appointment_message_view(
    request: HttpRequest,
    appointment_id: str,
) -> HttpResponse:
    """Appointment message view.

    Args:
        request (HttpRequest): the HTTP request
        appointment_id (str): the appointment id

    Raises:
        Http404: the error

    Returns:
        HttpResponse: the HTTP response
    """
    appointment: Communication = Communication.objects.get(
        id=appointment_id)

    if not appointment:
        raise Http404

    appointment.status = Communication.STATUS_CANCELLED
    appointment.save()

    print(1, appointment.caller.profile.__dict__)
    return render(request, 'dashboard/appointments/front/message.html', {
        'username': appointment.caller.profile.full_name,
        'appointment': appointment,
    })


@login_required
def reject_appointment(
    request: HttpRequest,
    appointment_id: str,
) -> HttpResponseRedirect:
    """Rejects appointment.

    Args:
        request (HttpRequest): the HTTP request
        appointment_id (str): the appointment id

    Returns:
        HttpResponseRedirect: the HTTP response redirect
    """
    return change_appointment_status(
        request,
        appointment_id,
        Communication.STATUS_REJECTED,
    )


@permission_required("is_default_admin")
@permission_required("is_default_editor")
@login_required
def widget_create_view(
    request: HttpRequest
) -> HttpResponse:
    users: list[User] = User.objects.filter(
        client_board=request.user.client_board)
    widget_templates: list[WidgetTemplate] = WidgetTemplate.objects.filter(
        active=True, last_editor=request.user
    ).order_by('id')
    if request.method == 'POST':
        form: WidgetForm = WidgetForm(request.POST)
        assignees_form: AssigneesForm = AssigneesForm(request.POST)
        if form.is_valid() and assignees_form.is_valid():
            instance = form.save(commit=False)
            instance.client_board = request.user.client_board
            instance.last_change = make_aware(datetime.now())
            instance.last_editor = request.user
            instance.save()
            """ Add assignees """
            for assignee in assignees_form.cleaned_data['assignee']:
                instance.assignees.add(assignee)
            messages.success(
                request, 'New widget has been created.')
            return redirect('dashboard:widgets')
        else:
            messages.error(request, 'Please correct the errors below.')
    else:
        form = WidgetForm()
        assignees_form = AssigneesForm()
    return render(request, 'dashboard/widget_create.html', {
        'assignees_form': assignees_form,
        'form': form,
        'languages': Widget.LANG_CHOICES,
        'widget_templates': widget_templates,
        'users': users})


@login_required
def widget_edit_view(
    request: HttpRequest,
    widget_id: int = None
) -> HttpResponse:
    widget_templates: list[WidgetTemplate] = WidgetTemplate.objects.filter(
        active=True, last_editor=request.user
    ).order_by('id')
    users: list[User] = User.objects.filter(
        client_board=request.user.client_board, is_admin=True)
    if widget_id is not None:
        widget = Widget.objects.get(id=widget_id)
        widget_code = '<script>{}</script>'.format(
            create_widget_embed_script(widget))
    else:
        return redirect('dashboard:widgets')
    if request.method == 'POST':
        form = WidgetForm(request.POST, instance=widget)
        assignees_form = AssigneesForm(request.POST)
        if form.is_valid() and assignees_form.is_valid():
            instance = form.save(commit=False)
            instance.last_change = make_aware(datetime.now())
            instance.last_editor = request.user
            instance.save()
            """ Update assignees """
            instance.assignees.clear()
            for assignee in assignees_form.cleaned_data['assignee']:
                instance.assignees.add(assignee)
            messages.success(
                request, 'Widget has been saved.')
            return redirect('dashboard:widgets')
        else:
            messages.error(request, 'Please correct the errors below.')
    else:
        form = WidgetForm()
        assignees_form = AssigneesForm()
    return render(request, 'dashboard/widget_edit.html', {
        'form': form,
        'assignees_form': assignees_form,
        'client_board': request.user.client_board,
        'users': users,
        'languages': Widget.LANG_CHOICES,
        'widget_templates': widget_templates,
        'widget': widget,
        'widget_code': widget_code
    })


@require_POST
@login_required
def save_calendar(
    request: HttpRequest,
) -> HttpResponse:
    """Saves calendar.

    Args:
        request (HttpRequest): the HTTP request

    Returns:
        HttpResponse: the HTTP response
    """
    user: User = request.user
    form: CalendarForm = CalendarForm(
        request.POST,
        time_interval=user.time_interval,
        working_hours=None
    )
    if form.is_valid():
        form.save_all(user)
        messages.success(
            request, 'Working hours have been saved.')

    return render(request, 'dashboard/calendar/view.html', get_calendar_view_parameters(user) | {
        'user': user,
        'form': form,
        'is_saved': True,
        'date_time': request.POST.getlist('date_time')
    })


@require_POST
@login_required
def calendar_time_row(
    request: HttpRequest,
    day: str,
    index: int,
) -> HttpResponse:
    return render(request, 'dashboard/calendar/time_row.html', {
        'day_name': day,
        'index': index,
        'additional': True,
    })


@permission_required("is_default_admin")
@login_required
def widget_template_create_view(
    request: HttpRequest
) -> HttpResponse:
    if request.method == 'POST':
        form = WidgetTemplateForm(request.POST, request.FILES)
        if form.is_valid():
            instance = form.save(request.user)
            messages.success(
                request, 'Widget template has been created.')
            return redirect('dashboard:templates')
        else:
            messages.error(request, 'Please correct the errors below.')
    else:
        form = WidgetTemplateForm()
    return render(request, 'dashboard/widget_template_create.html', {
        'form': form,
        'default_colors': WidgetTemplate.DEFAULT_COLOR_CHOICES,
    })


@permission_required("is_default_admin")
@login_required
def widget_template_edit_view(
    request: HttpRequest,
    widget_template_id: int = None
) -> HttpResponse:
    if widget_template_id is not None:
        widget_template = WidgetTemplate.objects.get(id=widget_template_id)
    else:
        return redirect('dashboard:templates')
    if request.method == 'POST':
        form = WidgetTemplateForm(
            request.POST, request.FILES, instance=widget_template)
        if form.is_valid():
            form.save(request.user)
            messages.success(
                request, 'Widget template has been saved.')
            return redirect('dashboard:templates')
        else:
            messages.error(request, 'Please correct the errors below.')
    else:
        form = WidgetTemplateForm()
    return render(request, 'dashboard/widget_template_edit.html', {
        'form': form,
        'widget_template': widget_template,
        'default_colors': WidgetTemplate.DEFAULT_COLOR_CHOICES
    })


@permission_required("is_default_admin")
@login_required
def widget_template_del_icon_view(
    request: HttpRequest,
    widget_template_id: int = None
) -> HttpResponse:
    if widget_template_id is not None:
        widget_template = WidgetTemplate.objects.get(id=widget_template_id)
    else:
        return redirect('dashboard:widget_template_edit')
    if request.method == 'POST':
        form = WidgetTemplateForm(
            request.POST, request.FILES, instance=widget_template)
        widget_template.icon = "/images/logo.svg"
        widget_template.save()
        messages.success(
            request, 'Widget template icon cleared.')
        return redirect('/dashboard/widgets/template/edit/{}'.format(widget_template_id))
    else:
        form = WidgetTemplateForm()

    return render(request, '/dashboard/widgets/template/edit/{}'.format(widget_template_id), {
        'form': form,
        'widget_template': widget_template,
        'default_colors': WidgetTemplate.DEFAULT_COLOR_CHOICES
    })


@login_required
def widget_template_delete(
    request: HttpRequest,
    widget_template_id: int
) -> HttpResponseRedirect:
    widget_template = WidgetTemplate.objects.get(id=widget_template_id)
    widget_template.active = False
    widget_template.save()
    messages.success(
        request, 'Template has been deleted.')
    return redirect('dashboard:templates')


@login_required
def appointment_delete(
    request: HttpRequest,
    appointment_id: int,
) -> HttpResponseRedirect:
    """Delete appointment action.

    Args:
        request (HttpRequest): the HTTP request
        appointment_id (int): the appointment id

    Returns:
        HttpResponseRedirect: the HTTP redirect response
    """
    appointment: Communication = Communication.objects.get(
        id=appointment_id)
    appointment.active = False
    appointment.save()
    messages.success(
        request, 'Appointment has been deleted.')
    return redirect('dashboard:appointments')


@login_required
def widget_delete(
    request: HttpRequest,
    widget_id: int
) -> HttpResponseRedirect:
    widget: Widget = Widget.objects.get(id=widget_id)
    widget.active = False
    widget.save()
    messages.success(
        request, 'Widget has been deleted.')
    return redirect('dashboard:widgets')


@login_required
def widget_pause(
    request: HttpRequest,
    widget_id: int
) -> HttpResponseRedirect:
    widget: Widget = Widget.objects.get(id=widget_id)
    widget.paused = True
    widget.save()
    messages.success(
        request, 'Widget has been paused.')
    return redirect('dashboard:widgets')


@login_required
def widget_unpause(
    request: HttpRequest,
    widget_id: int
) -> HttpResponseRedirect:
    widget: Widget = Widget.objects.get(id=widget_id)
    widget.paused = False
    widget.save()
    messages.success(
        request, 'Widget has been activated.')
    return redirect('dashboard:widgets')


class AppointmentPayload:
    """Appointment payload model.
    """

    id: str
    status_verbose: str
    full_name: str
    email_or_phone: str
    status: int
    link_url: str
    datetime: datetime
    is_pastdate: bool

    def __init__(
        self,
        tzinfo: ZoneInfo,
        appointment: Communication,
    ) -> None:
        """Constructor

        Args:
            tzinfo (ZoneInfo): the timezone info
            appointment (Communication): the appointment
        """
        self.id = appointment.id
        self.status_verbose = appointment.status_verbose
        self.full_name = appointment.caller.profile.full_name
        self.email_or_phone = appointment.caller.profile.email_or_phone
        self.status = appointment.status
        self.link_url = appointment.link_url
        self.datetime = appointment.datetime.astimezone(tzinfo)
        self.is_pastdate = appointment.is_pastdate


@login_required
def appointments_view(
    request: HttpRequest
) -> HttpResponse:
    """Appointment view.

    Args:
        request (HttpRequest): the HTTP request

    Returns:
        HttpResponse: the HTTP response
    """
    appointments_len: int = Communication.objects.filter(
        client_board=request.user.client_board, active=True).__len__()
    return render(request, 'dashboard/appointments/home.html', {
        'user': request.user,
        'appointments_len': appointments_len,
    })


@login_required
def appointments_list_view(
    request: HttpRequest
) -> HttpResponse:
    """List of appointments view.

    Args:
        request (HttpRequest): the HTTP request

    Returns:
        HttpResponse: the HTTP response
    """
    appointments: list[Communication] = Communication.objects.filter(
        client_board=request.user.client_board, active=True).order_by('-datetime')

    # Create payload
    appointments_payload: list[AppointmentPayload] = list(map(
        lambda appointment: AppointmentPayload(request.user.tzinfo, appointment), appointments))

    return render(request, 'dashboard/appointments/list.html', {
        'user': request.user,
        'appointments': appointments_payload,
    })


@login_required
def call_create_view(
    request: HttpRequest
) -> HttpResponse:
    return render(request, 'dashboard/call_create.html', {
        'user': request.user,
    })


@permission_required("is_default_admin")
@login_required
def team_view(
    request: HttpRequest
) -> HttpResponse:
    users: list[User] = User.objects.filter(
        is_active=True, is_admin=True, is_superuser=False,
        client_board=request.user.client_board).order_by('id')
    return render(request, 'dashboard/team.html', {'users': users})


@permission_required("is_default_admin")
@login_required
def calendar_view(
    request: HttpRequest
) -> HttpResponse:
    """Calendar view.

    Args:
        request (HttpRequest): the HTTP request

    Returns:
        HttpResponse: the HTTP response
    """
    user: User = request.user

    # Collect all existing working hours.
    working_hours_entries: list[UserWorkingHours] = UserWorkingHours.objects.filter(
        user=user).all()

    return render(request, 'dashboard/calendar/view.html', get_calendar_view_parameters(user) | {
        'user': request.user,
        'is_saved': working_hours_entries.__len__() > 0,
        'form': CalendarForm(
            working_hours=working_hours_entries,
            time_interval=user.time_interval,
        )
    })


def get_calendar_view_parameters(user: User) -> dict:
    """Gets calendar views common parameters.

    Args:
        user (User): the user

    Returns:
        dict: the parameters
    """
    return {
        'user': user,
        'hours': HOURS,
        'minutes': MINUTES,
    }


@permission_required("is_default_admin")
@login_required
def client_user_edit_view(
    request: HttpRequest,
    user_id: int = None
) -> HttpResponse:
    """User edit view.

    Args:
        request (HttpRequest): the HTTP request
        user_id (int, optional): the user id. Defaults to None.

    Returns:
        HttpResponse: the HTTP response
    """
    if user_id is not None:
        client_user: User = User.objects.get(id=user_id)
        board_widgets = Widget.objects.filter(
            client_board=request.user.client_board)
        user_widgets: list[Widget] = Widget.objects.filter(
            assignees__id=user_id)
    else:
        return redirect('dashboard:team')
    if request.method == 'POST':
        user_form: UserForm = UserForm(request.POST, instance=client_user)
        profile_form: ProfileForm = ProfileForm(
            request.POST, request.FILES, instance=client_user.profile)
        profile_meta_form = ProfileMetaForm(request.POST)
        widgets_form = AssignedWidgetsForm(request.POST)
        if user_form.is_valid() and profile_form.is_valid() and widgets_form.is_valid():
            client_user = user_form.save()
            client_user.is_admin = True
            profile_form.save_all(
                profile_form.cleaned_data['full_name'].strip(), client_user)
            # Assign widgets
            client_user.widget_user.clear()
            for widget in widgets_form.cleaned_data['widget']:
                client_user.widget_user.add(widget)
            # Set message.
            messages.success(
                request, 'User has been updated.')
            return redirect('dashboard:team')
        else:
            messages.error(request, 'Please correct the errors below.')
    else:
        user_form = UserForm()
        profile_form = ProfileForm(instance=client_user.profile)
        profile_meta_form = ProfileMetaForm()
    return render(request, 'dashboard/client_user_edit.html', {
        'client_user': client_user,
        'user_widgets': user_widgets,
        'board_widgets': board_widgets,
        'user_form': user_form,
        'profile_form': profile_form,
        'profile_meta_form': profile_meta_form,
        'timezones': settings.TIMEZONES
    })


@permission_required("is_default_admin")
@login_required
def client_user_create_view(
    request: HttpRequest
) -> HttpResponse:
    client_board: ClientBoard = request.user.client_board
    widgets: list[Widget] = Widget.objects.filter(client_board=client_board)
    if request.method == 'POST':
        user_form = UserForm(request.POST)
        profile_form = ProfileForm(
            request.POST, request.FILES)
        profile_meta_form = ProfileMetaForm(request.POST)
        widgets_form = AssignedWidgetsForm(request.POST)
        if user_form.is_valid() and profile_form.is_valid() and widgets_form.is_valid():
            client_user = user_form.save()
            # Attach user to client board.
            client_user.client_board = request.user.client_board
            client_user.is_admin = True
            client_user.save()
            # Set client user permissions.
            client_user.set_as_default_editor()
            client_user.save()
            # Save profile form.
            profile = profile_form.save(
                profile_form.cleaned_data['full_name'].strip(), client_user)
            # Assign widgets.
            for widget in widgets_form.cleaned_data['widget']:
                client_user.widget_user.add(widget)
            # send activation email
            subject = 'QuickHellou - Account Activation'
            recipients = [client_user.email]
            email_params = app_params() | {
                'user_id': client_user.id,
                'username': profile.full_name,
            }
            send_email_notification(subject, recipients, email_params,
                                    'accounts/email/client-activation.txt', 'accounts/email/client-activation.html')

            messages.success(
                request, 'User has been created.')
            return redirect('dashboard:team')
        else:
            messages.error(request, 'Please correct the errors below.')
    else:
        user_form = UserForm()
        profile_form = ProfileForm()
        profile_meta_form = ProfileMetaForm()
    return render(request, 'dashboard/client_user_create.html', {
        'widgets': widgets,
        'user_form': user_form,
        'profile_form': profile_form,
        'profile_meta_form': profile_meta_form,
        'timezones': settings.TIMEZONES
    })


@login_required
def user_delete(
    request: HttpRequest,
    user_id: int
) -> HttpResponseRedirect:
    user: User = User.objects.get(id=user_id)
    user.is_active = False
    user.save()
    messages.success(
        request, "User has been deleted.")
    return redirect('dashboard:team')


@login_required
def user_deactivate(
    request: HttpRequest,
    user_id: int
) -> HttpResponseRedirect:
    profile = Profile.objects.get(user_id=user_id)
    profile.available = False
    profile.save()
    messages.success(
        request, "User has been deactivated.")
    return redirect('dashboard:team')


@login_required
def user_activate(
    request: HttpRequest,
    user_id: int
) -> HttpResponseRedirect:
    profile = Profile.objects.get(user_id=user_id)
    profile.available = True
    profile.save()
    messages.success(
        request, 'User has been activated.')
    return redirect('dashboard:team')


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
