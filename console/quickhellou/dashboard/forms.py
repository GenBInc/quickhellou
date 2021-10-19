import re
from django import forms
from django.core.exceptions import ValidationError
from django.core.validators import URLValidator, RegexValidator, validate_email
from accounts.models import User, Profile
from .models import (Widget, WidgetTemplate, Communication, CommunicationSession, \
    ApplicationSettings)

class EmailOrPhoneField(forms.CharField):
    def validate(self, value):
        """Check if value consists of either email or phone number."""
        super().validate(value)
        if '@' in value:
            return validate_email(value)
        phone_regex = re.compile('^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{3,6}$')
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
        fields = ('full_name', 'phone', 'thumbnail')

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
        print (e)
    return firstname


def get_last_name(fullname):
    lastname = ''
    try:
        return " ".join(fullname.split()[1:])
    except Exception as e:
        print (e)
    return lastname


class WidgetForm(forms.ModelForm):
    class Meta:
        model = Widget
        fields = ('name', 'url', 'lang', 'template' , 'header', 'content')

class WidgetActiveUserForm(forms.Form):
    name = forms.CharField(max_length=256, required=True)
    email_or_phone = EmailOrPhoneField(max_length=256,required=True)

class WidgetExtensionViewForm(forms.Form):
    name = forms.CharField(max_length=256, required=True)
    email_or_phone = EmailOrPhoneField(max_length=256,required=True)
    message = forms.CharField(widget=forms.Textarea(), required=True)

class ApplicationSettingsForm(forms.Form):
    video_app_url = forms.CharField(max_length=256)
    console_app_url = forms.CharField(max_length=256)
    ws_service_url = forms.CharField(max_length=256)
    admin_email_address = forms.CharField(max_length=256, validators=[validate_email])

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
    code = "<div><div>{}</div><div>{}</div></div>"#.format(widget_template.header,widget_template.content)
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
        widget_template = super(WidgetTemplateForm, self).save(commit=False)
        widget_template.code = generate_template_code(widget_template)
        widget_template.last_editor = user;
        if commit:
            widget_template.save()
        return widget_template

class CommunicationForm(forms.ModelForm):
    class Meta:
        model = Communication
        fields = ('caller_name',)
class CommunicationSessionForm(forms.ModelForm):
    class Meta:
        model = CommunicationSession
        fields = ('status',)