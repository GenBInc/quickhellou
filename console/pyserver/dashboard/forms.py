from re import (
    compile,
    search,
    Pattern,
    Match,
)
from datetime import datetime, date
from django import forms
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from accounts.models import User, Profile
from dashboard.models import (
    Widget,
    WidgetTemplate,
    Communication,
    CommunicationSession,
)


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


class CalendarForm(forms.Form):
    """The calendar view form.
    """
    day1 = forms.CharField(required=False)
    day2 = forms.CharField(required=False)
    day3 = forms.CharField(required=False)
    day4 = forms.CharField(required=False)
    day5 = forms.CharField(required=False)
    day6 = forms.CharField(required=False)
    day0 = forms.CharField(required=False)
    
    
    def clean(self):
        """Clean form data."""
        
        range_pattern: Pattern = compile(
            '^(\d{1})\s((\d{2})\:(\d{2})\s(AM|PM))\s((\d{2})\:(\d{2})\s(AM|PM))')

        day_fields: list[str] = ['day1', 'day2', 'day3', 'day4', 'day5', 'day6', 'day0']
        
        for day_field in day_fields:
            date_time_list = self.data.getlist(day_field)    
                
            for date_time in date_time_list:
                result: Match[str] = search(range_pattern, date_time)
                day: str = result.group(1)

                datetime_from_str: str = '{} {}'.format(day, result.group(2))
                datetime_to_str: str = '{} {}'.format(day, result.group(6))

                datetime_format: str = '%w %I:%M %p'
                datetime_from: datetime = datetime.strptime(
                    datetime_from_str, datetime_format)
                datetime_to: datetime = datetime.strptime(
                    datetime_to_str, datetime_format)

                if datetime_from > datetime_to:
                    self.add_error(
                        'day{}'.format(day), 'Time range is invalid.')

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
