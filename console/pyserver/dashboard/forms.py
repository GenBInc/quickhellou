from re import (
    compile,
    search,
    Pattern,
    Match,
)
from datetime import (
    timedelta,
    datetime
)
from django import forms
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from accounts.models import User, Profile
from dashboard.util.time import (
    DAYS,
    TIME_FORMAT,
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
from dashboard.util.time import RANGE_PATTERN


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
        fields = ('full_name', 'thumbnail')

    def is_valid(self):
        valid = super(ProfileForm, self).is_valid()

        if not valid:
            return valid

        if len(self.cleaned_data['full_name'].split(" ")) < 2:
            self._errors["invalid_full_name"] = 'Enter valid full name.'
            return False
        return True

    def save(self, full_name, user=None, commit=True):
        profile = super(ProfileForm, self).save(commit=False)
        profile.full_name = full_name
        profile.user = user
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
        return " ".join(fullname.split()[1:])
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
        
        working_hour_entries: list[UserWorkingHours] = kwargs.pop(
            'working_hours')
        
        # Initialize form
        super(CalendarForm, self).__init__(*args, **kwargs)

        # Terminate if working hours are not set 
        if not working_hour_entries:
            return
        
        # Collect time range values per day
        time_ranges: dict[str, list[str]] = {}
        for working_hours in working_hour_entries:
            time_result: Match[str] = search(RANGE_PATTERN, working_hours.time)
            day: str = time_result.group(1)

            if not time_ranges.get(day):
                time_ranges[day] = []
            time_ranges[day].append(working_hours.time)

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

    def get_day_group(
        self,
        day_code: int
    ):
        time_field_key_regex: Pattern = compile('^day\d\_\d$')
        return filter(lambda x: 'day{}'.format(day_code) in x and time_field_key_regex.match(x), self.fields.keys())

    def clean(self):
        """Clean form data."""

        for day_code in list(range(0, 7)):
            time_ranges = []
            for day_field in self.get_day_group(day_code):
                date_time = self.cleaned_data.get(day_field)
                # TODO: move the collect time_ranges feature inot separate, accessible from widget creation place
                continue
                if not date_time:
                    continue

                result: Match[str] = search(RANGE_PATTERN, date_time)
                day: str = result.group(1)

                datetime_from_str: str = '{} {}'.format(day, result.group(2))
                datetime_to_str: str = '{} {}'.format(day, result.group(6))

                datetime_from: datetime = datetime.strptime(
                    datetime_from_str, TIME_FORMAT)
                datetime_to: datetime = datetime.strptime(
                    datetime_to_str, TIME_FORMAT)
                delta = datetime_to - datetime_from
                hours = int(delta.seconds / 60 / 60 * 2)
                for i in range(hours):
                    working_hour: datetime = datetime_from + \
                        timedelta(hours=i * .5)
                    time_ranges.append(working_hour.strftime(TIME_FORMAT))

                """
                if datetime_from > datetime_to:
                    self.add_error(
                        'day{}'.format(day), 'Time range is invalid.')
                """
            time_ranges = list(set(time_ranges))
            time_ranges.sort()
            # print(time_ranges)

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


class CommunicationForm(forms.ModelForm):
    class Meta:
        model = Communication
        fields = ('caller_name', 'status')


class CommunicationSessionForm(forms.ModelForm):
    class Meta:
        model = CommunicationSession
        fields = ('status',)
