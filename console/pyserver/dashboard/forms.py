from re import (
    compile,
    Pattern,
)
from zoneinfo import ZoneInfo
from django.conf import settings
from django.utils.timezone import make_aware
from django import forms
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from accounts.models import User, Profile
from dashboard.util.time import (
    DAYS,
    TIMEZONE_UTC,
    time_left_verbose,
)
from dashboard.models import (
    Widget,
    WidgetTemplate,
    Communication,
    CommunicationSession,
    UserWorkingHours,
)
from dashboard.validators import (
    validate_time_range,
)
from dashboard.util.time import (
    collect_time_ranges,
)
from phonenumber_field.formfields import PhoneNumberField
from dashboard.emails import (
    send_create_appointment_notifications,
    send_activation_appointment_notifications,
    send_appointment_message,
    send_appointment_reminder,
    message_url,
    cancel_url,
)
from dashboard.util.time import DATETIME_FORMAT
import datetime


class EmailOrPhoneField(forms.CharField):
    def validate(self, value):
        """Check if value consists of either email or phone number."""
        super().validate(value)
        if '@' in value:
            return validate_email(value)
        phone_regex = compile(
            '^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{3,6}$')
        if phone_regex.match(value):
            return True
        else:
            raise ValidationError('Incorrect email or phone format.')


class ProfileMetaForm(forms.Form):
    callpage_url_no_http = forms.CharField()


class UserForm(forms.ModelForm):
    class Meta:
        model = User
        fields = ('email',)

    def save(self, commit=True):
        user = super(UserForm, self).save(commit=False)
        if commit:
            user.save()
        return user


class ProfileForm(forms.ModelForm):
    class Meta:
        model = Profile
        fields = ('full_name', 'thumbnail', 'timezone')

    def is_valid(self):
        valid = super(ProfileForm, self).is_valid()

        if not valid:
            return valid

        if len(self.cleaned_data['full_name'].split(' ')) < 2:
            self._errors['invalid_full_name'] = 'Enter valid full name.'
            return False
        return True

    def save_all(self, full_name, user=None, commit=True):
        profile = super(ProfileForm, self).save(commit=False)
        profile.full_name = full_name
        profile.user = user
        profile.timezone = self.cleaned_data['timezone']
        if commit:
            profile.save()
        return profile


def get_first_name(fullname):
    firstname = ''
    try:
        firstname = fullname.split()[0]
    except Exception as e:
        print(e)
    return firstname


def get_last_name(fullname):
    lastname = ''
    try:
        return ' '.join(fullname.split()[1:])
    except Exception as e:
        print(e)
    return lastname


class WidgetForm(forms.ModelForm):
    class Meta:
        model = Widget
        fields = ('name', 'url', 'lang', 'template', 'header', 'content')


class CheckboxInput(forms.CheckboxInput):
    def __init__(self, default=False, *args, **kwargs):
        super(CheckboxInput, self).__init__(*args, **kwargs)
        self.default = default

    def value_from_datadict(self, data, files, name):
        if name not in data:
            return self.default
        return super(CheckboxInput, self).value_from_datadict(data, files, name)


class CalendarForm(forms.Form):
    """The calendar view form.
    """

    time_interval = forms.CharField(required=True, initial='30')

    # Input slots (5 per day)
    # TODO: make number of slots dynamic
    day1_1 = forms.CharField(required=False, validators=[validate_time_range])
    day1_2 = forms.CharField(required=False, validators=[validate_time_range])
    day1_3 = forms.CharField(required=False, validators=[validate_time_range])
    day1_4 = forms.CharField(required=False, validators=[validate_time_range])
    day1_5 = forms.CharField(required=False, validators=[validate_time_range])

    day2_1 = forms.CharField(required=False, validators=[validate_time_range])
    day2_2 = forms.CharField(required=False, validators=[validate_time_range])
    day2_3 = forms.CharField(required=False, validators=[validate_time_range])
    day2_4 = forms.CharField(required=False, validators=[validate_time_range])
    day2_5 = forms.CharField(required=False, validators=[validate_time_range])

    day3_1 = forms.CharField(required=False, validators=[validate_time_range])
    day3_2 = forms.CharField(required=False, validators=[validate_time_range])
    day3_3 = forms.CharField(required=False, validators=[validate_time_range])
    day3_4 = forms.CharField(required=False, validators=[validate_time_range])
    day3_5 = forms.CharField(required=False, validators=[validate_time_range])

    day4_1 = forms.CharField(required=False, validators=[validate_time_range])
    day4_2 = forms.CharField(required=False, validators=[validate_time_range])
    day4_3 = forms.CharField(required=False, validators=[validate_time_range])
    day4_4 = forms.CharField(required=False, validators=[validate_time_range])
    day4_5 = forms.CharField(required=False, validators=[validate_time_range])

    day5_1 = forms.CharField(required=False, validators=[validate_time_range])
    day5_2 = forms.CharField(required=False, validators=[validate_time_range])
    day5_3 = forms.CharField(required=False, validators=[validate_time_range])
    day5_4 = forms.CharField(required=False, validators=[validate_time_range])
    day5_5 = forms.CharField(required=False, validators=[validate_time_range])

    day6_1 = forms.CharField(required=False, validators=[validate_time_range])
    day6_2 = forms.CharField(required=False, validators=[validate_time_range])
    day6_3 = forms.CharField(required=False, validators=[validate_time_range])
    day6_4 = forms.CharField(required=False, validators=[validate_time_range])
    day6_5 = forms.CharField(required=False, validators=[validate_time_range])

    day0_1 = forms.CharField(required=False, validators=[validate_time_range])
    day0_2 = forms.CharField(required=False, validators=[validate_time_range])
    day0_3 = forms.CharField(required=False, validators=[validate_time_range])
    day0_4 = forms.CharField(required=False, validators=[validate_time_range])
    day0_5 = forms.CharField(required=False, validators=[validate_time_range])

    # Checks if day is selected
    day1_checked = forms.BooleanField(
        widget=CheckboxInput(default=True), required=False)
    day2_checked = forms.BooleanField(
        widget=CheckboxInput(default=True), required=False)
    day3_checked = forms.BooleanField(
        widget=CheckboxInput(default=True), required=False)
    day4_checked = forms.BooleanField(
        widget=CheckboxInput(default=True), required=False)
    day5_checked = forms.BooleanField(
        widget=CheckboxInput(default=True), required=False)
    day6_checked = forms.BooleanField(
        widget=CheckboxInput(default=False), required=False)
    day0_checked = forms.BooleanField(
        widget=CheckboxInput(default=False), required=False)

    def __init__(self, *args, **kwargs):
        """Form constructor.
        """
        time_interval: str = kwargs.pop(
            'time_interval')

        working_hours_entries: list[UserWorkingHours] = kwargs.pop(
            'working_hours')

        # Initialize form
        super(CalendarForm, self).__init__(*args, **kwargs)

        # Terminate if working hours are not set
        if not working_hours_entries:
            return

        # Collect time range values per day
        time_ranges: dict[str, list[str]] = collect_time_ranges(
            working_hours_entries)

        # Initialize time range fields
        for day_code in time_ranges:
            datetime_ranges: list[str] = time_ranges[day_code]
            for index, datetime_range in enumerate(datetime_ranges):
                field_name: str = 'day{}_{}'.format(day_code, index+1)
                self.initial[field_name] = datetime_range

        # Initialize day check fields
        for day_code in DAYS:
            field_name: str = 'day{}_checked'.format(day_code)
            self.initial[field_name] = time_ranges.get(day_code) is not None

        # Set the initial time interval
        self.initial['time_interval'] = time_interval

    def get_day_group(
        self,
        day_code: int
    ):
        """Gets related to given day fields.

        Args:
            day_code (int): the day code

        Returns:
            filter[str]: the fields list
        """
        time_field_key_regex: Pattern = compile('^day\d\_\d$')
        return filter(lambda x: 'day{}'.format(day_code) in x and time_field_key_regex.match(x), self.fields.keys())

    def save_all(self, user, commit=True):
        """Saves the working hours.

        Args:
            user (User): the user
            commit (bool, optional): True if commit to database. Defaults to True.
        """
        # Collect all working hours field values
        time_values: list[str] = []
        for day_code in list(range(0, 7)):
            for day_field in self.get_day_group(day_code):
                day_value = self.cleaned_data.get(day_field)
                if day_value != '':
                    time_values.append(day_value)

        # Delete all former associations
        UserWorkingHours.objects.filter(user=user).delete()

        # Save new working hours
        if commit:
            working_hours_entries: list[UserWorkingHours] = []
            for time in time_values:
                working_hours: UserWorkingHours = UserWorkingHours.objects.create(
                    user=user, time=time)
                working_hours_entries.append(working_hours)
            UserWorkingHours.objects.abulk_create(working_hours_entries)

        # Save time interval
        user.time_interval = self.cleaned_data.get('time_interval')
        user.save()


class WidgetActiveUserForm(forms.Form):
    name = forms.CharField(max_length=256, required=True)
    email_or_phone = EmailOrPhoneField(max_length=256, required=True)


class WidgetScheduleForm(forms.Form):
    name = forms.CharField(max_length=256, required=True)
    email_address = forms.EmailField(required=True)
    phone_number = forms.CharField(required=False)
    datetime = forms.CharField(required=True)


class AssigneesForm(forms.Form):
    assignee = forms.ModelMultipleChoiceField(
        queryset=User.objects.all(),
        required=False,
        widget=forms.CheckboxSelectMultiple,
    )

    def __init__(self, *args, **kwargs):
        super(AssigneesForm, self).__init__(*args, **kwargs)
        self.fields['assignee'].queryset = User.objects.all()


class AssignedWidgetsForm(forms.Form):
    widget = forms.ModelMultipleChoiceField(
        queryset=Widget.objects.all(),
        required=False,
        widget=forms.CheckboxSelectMultiple,
    )

    def __init__(self, *args, **kwargs):
        super(AssignedWidgetsForm, self).__init__(*args, **kwargs)
        self.fields['widget'].queryset = Widget.objects.all()


def generate_template_code(widget_template):
    # .format(widget_template.header,widget_template.content)
    code = "<div><div>{}</div><div>{}</div></div>"
    return code


class WidgetTemplateForm(forms.ModelForm):
    """ Widget template form. """
    class Meta:
        model = WidgetTemplate
        fields = ['name', 'background_color', 'icon']

    def is_valid(self):
        valid = super(WidgetTemplateForm, self).is_valid()
        return valid

    def save(self, user, commit=True):
        widget_template: WidgetTemplate = super(
            WidgetTemplateForm, self).save(commit=False)
        widget_template.code = generate_template_code(widget_template)
        widget_template.last_editor = user
        if commit:
            widget_template.save()
        return widget_template


class SendAppointmentReminderForm(forms.Form):
    def send_reminder(self, appointment: Communication):

        # Send reminder notification
        caller: User = appointment.caller

        send_appointment_reminder(
            appointment.link_url,
            appointment.datetime,
            time_left_verbose(appointment.datetime),
            caller.profile.full_name,
            caller.email,
            caller.profile.phone,
            message_url(appointment.id),
            cancel_url(appointment.id),
        )


class SendAppointmentMessageForm(forms.Form):
    message = forms.CharField(required=True)

    def add_message(self, appointment: Communication) -> int:
        message = self.cleaned_data.get('message')

        # Create message session
        message_session: CommunicationSession = CommunicationSession.objects.create_message(
            appointment,
            appointment.caller,
            message
        )
        message_session.save()

        # Send email notification
        caller: User = appointment.caller
        appointment_url: str = '{}/dashboard/appointment/edit/{}'.format(
            settings.CONSOLE_APP_URL, appointment.id)
        return send_appointment_message(
            appointment_url,
            caller.profile.full_name,
            caller.email,
            caller.profile.phone,
            message
        )


class AppointmentActivationForm(forms.ModelForm):

    class Meta:
        model = Communication
        fields = ['id', ]

    def set_status(self, status: int):
        # Open appointment
        appointment: Communication = self.save(False)
        appointment.status = status
        self.save()

        # Change session status
        initial_session: CommunicationSession = appointment.initial_session
        if initial_session:
            initial_session.status = CommunicationSession.STATUS_CREATED
            initial_session.save()

        # Send email notifications
        date = datetime.datetime.strftime(
            appointment.datetime, DATETIME_FORMAT)

        # TODO: handle initial message
        message: str = ''

        send_activation_appointment_notifications(
            status,
            appointment.caller.profile.full_name,
            appointment.caller.email,
            message,
            date,
            appointment.link_url,
            message_url(appointment.id),
            cancel_url(appointment.id),
        )

        return appointment


class CommunicationForm(forms.ModelForm):

    client_username = forms.CharField(required=True)

    class Meta:
        model = Communication
        fields = ('caller_name', 'status', 'reminders')

    def __init__(self, *args, **kwargs):
        """Constructor.
        """
        super(CommunicationForm, self).__init__(*args, **kwargs)
        self.initial['client_username'] = self.instance.caller.profile.full_name

    def save_all(self):
        """Saves appointment and related data.
        """
        # Save appointment fields
        appointment: Communication = self.save(commit=False)
        appointment.modification_time = make_aware(datetime.datetime.now())
        appointment.save()

        # Save client user fields
        client_username: str = self.cleaned_data.get('client_username')
        client_profile: Profile = appointment.caller.profile
        client_profile.full_name = client_username
        client_profile.save()


class CommunicationSessionForm(forms.ModelForm):
    class Meta:
        model = CommunicationSession
        fields = ('status',)


class ScheduleDatetimeForm(forms.Form):
    datetime = forms.CharField(required=True)


class ContactInformationForm(forms.Form):
    """Contact information form
    """
    datetime = forms.CharField(required=True)
    timezone = forms.CharField(required=True)
    name = forms.CharField(required=True, initial='')
    email_address = forms.EmailField(required=True, initial='')
    phone_number = PhoneNumberField(required=False, max_length=15, initial='')
    message = forms.CharField(required=False, initial='')

    def create_appointment(
        self,
        widget: Widget,
    ):
        client_name: str = self.cleaned_data['name']
        email_address: str = self.cleaned_data['email_address']
        phone_number: str = self.cleaned_data['phone_number']
        message: str = self.cleaned_data['message']
        datetime_str: str = self.cleaned_data['datetime']
        timezone_str: str = self.cleaned_data['timezone']

        # Get or create user
        client_user, created = User.objects.get_or_create(
            email=email_address,
            defaults={
                'client_board': widget.client_board
            }
        )

        # Get or create user profile
        Profile.objects.get_or_create(
            user_id=client_user.id,
            defaults={
                'phone': phone_number,
                'full_name': client_name
            }
        )

        # Convert front user specific timezone for schedule date into UTC
        schedule_datetime: datetime = datetime.datetime.strptime(
            datetime_str, DATETIME_FORMAT).replace(tzinfo=ZoneInfo(timezone_str))
        schedule_datetime_utc: datetime = schedule_datetime.astimezone(
            tz=TIMEZONE_UTC)

        # Get or create communication
        appointment: Communication = Communication.objects.create(
            caller=client_user,
            caller_name=client_name,
            client_board=widget.client_board,
            status=Communication.STATUS_PENDING,
            widget=widget,
            datetime=schedule_datetime_utc,
        )

        # Encode communication short URL for videochat room id.
        appointment.encode_short_url()

        if message:
            # Create communication session
            message_session: CommunicationSession = CommunicationSession.objects.create_message(
                communication=appointment,
                attendant=client_user,
                message=message,
                type=2
            )
            message_session.save()

        # Send notifications
        return send_create_appointment_notifications(
            client_name,
            email_address,
            phone_number,
            message,
            datetime_str,
            message_url(appointment.id),
            cancel_url(appointment.id),
        )
