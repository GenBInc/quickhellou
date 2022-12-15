# -*- coding: utf-8 -*-
from __future__ import unicode_literals

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
    HttpResponseRedirect
)
from django.utils.timezone import make_aware
from django.contrib import messages
from django.contrib.auth.decorators import login_required, permission_required
from django.core.mail import send_mail
from django.http import FileResponse, Http404
from django.shortcuts import redirect, render, get_object_or_404
from django.template.loader import render_to_string
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from accounts.models import (
    Profile,
    User,
)
from dashboard.util.time import (
    HOURS,
    MINUTES,
    TIME_FORMAT,
    DATETIME_FORMAT,
    format_day_with_ordinal,
    collect_weekly_hours,
)
from dashboard.forms import (
    AssignedWidgetsForm,
    AssigneesForm,
    CommunicationForm,
    ProfileForm,
    ProfileMetaForm,
    UserForm,
    WidgetScheduleForm,
    WidgetForm,
    WidgetTemplateForm,
    CommunicationSessionForm,
    WidgetActiveUserForm,
    CalendarForm,
    ContactInformationForm,
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
def communication_edit_view(
    request: HttpRequest,
    communication_id: int = None
) -> HttpResponse:
    if communication_id is not None:
        communication = Communication.objects.get(id=communication_id)
        com_sessions = communication.communicationsession_set.all()
    else:
        return redirect('dashboard:communications')
    if request.method == 'POST':
        form = CommunicationForm(request.POST, instance=communication)
        if form.is_valid():
            instance = form.save(commit=False)
            instance.modification_time = datetime.now()
            instance.save()
            messages.success(
                request, 'Communication record has been saved.')
            return redirect('dashboard:communications')
    return render(request, 'dashboard/communication_edit.html', {
        'communication': communication,
        'client_user': communication.caller,
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
        widget_code = '<script>' + \
            create_widget_embed_script(widget) + '</script>'
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
def communication_delete(
    request: HttpRequest,
    communication_id: int,
) -> HttpResponseRedirect:
    communication: Communication = Communication.objects.get(
        id=communication_id)
    communication.active = False
    communication.save()
    messages.success(
        request, 'Communication has been deleted.')
    return redirect('dashboard:communications')


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


@login_required
def communications_view(
    request: HttpRequest
) -> HttpResponse:
    communications: list[Communication] = Communication.objects.filter(
        client_board=request.user.client_board).filter(active=True)
    return render(request, 'dashboard/communications.html', {
        'communications': communications,
        'user': request.user,
    })


@login_required
def communication_list_view(
    request: HttpRequest
) -> HttpResponse:
    communications: list[Communication] = Communication.objects.filter(
        client_board=request.user.client_board).filter(active=True).order_by('-modification_time')
    if communications.count() > 0:
        communication = communications[0]
        count = communication.pending_sessions_count
    else:
        count = 0
    return render(request, 'dashboard/communication_list.html', {
        'user': request.user,
        'communications': communications,
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
            profile_form.save(
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
        profile_form = ProfileForm()
        profile_meta_form = ProfileMetaForm()
    return render(request, 'dashboard/client_user_edit.html', {'client_user': client_user,
                                                               'user_widgets': user_widgets,
                                                               'board_widgets': board_widgets,
                                                               'user_form': user_form,
                                                               'profile_form': profile_form,
                                                               'profile_meta_form': profile_meta_form, })


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
        'profile_meta_form': profile_meta_form, })


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
    widget: Widget = Widget.objects.get(id=widget_id)
    if not widget:
        raise Http404

    user: User = widget.last_editor

    working_hours: dict[str, list[str]] = collect_weekly_hours(user)

    pages: list[dict] = []
    for week in range(0, 4):
        start_date = datetime.today() + timedelta(days=7*week)
        date_list: list = [start_date + timedelta(days=x) for x in range(7)]
        days: list[dict] = []
        dates: list[datetime] = []
        for index, date in enumerate(date_list):
            day: dict = {
                'info': '',
                'date': date.strftime('%Y-%m-%d'),
                'day_name': date.strftime('%A'),
                'month_date': date.strftime('%b %d'),
                'time': working_hours.get(date.strftime('%w'))
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
        Communication.objects.create_appointment(
            form.cleaned_data['name'],
            form.cleaned_data['email_address'],
            form.cleaned_data['phone_number'],
        )
        # Send client notification
        # Send admin notification
        return render(request, 'embed/widget/contact_information_form_complete.html', {
            'date': date_payload,
            'background_color': widget_template.background_color,
        })

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


def send_email_notification(
    subject: str,
    recipients: list[str],
    email_params: dict,
    text_template_url: str,
    html_template_url: str
) -> int:
    message_plain: str = render_to_string(text_template_url, email_params)
    message_html: str = render_to_string(html_template_url, email_params)
    return send_mail(
        subject,
        message_plain,
        settings.ADMIN_EMAIL,
        recipients,
        html_message=message_html
    )


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
