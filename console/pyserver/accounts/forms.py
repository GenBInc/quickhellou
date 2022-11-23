from django import forms
from django.core.validators import validate_email

from accounts.models import User, Profile
from dashboard.models import Widget


class ProfileMetaForm(forms.Form):
    """ User Profile Helpers """

    password = forms.CharField(required=True)
    confirm_password = forms.CharField(required=True)
    recaptcha = forms.CharField(required=True)
    phone_raw = forms.CharField(required=True)

    def is_valid(self):
        valid = super(ProfileMetaForm, self).is_valid()
        if not valid:
            return valid

        if self.cleaned_data['password'] != self.cleaned_data['confirm_password']:
            self._errors['passwords_not_match'] = 'Passwords don\'t match.'
            return False

        if self.cleaned_data['recaptcha'] == "0":
            self._errors['no_captcha'] = 'Please check the Captcha field.'
            return False
        return True


class UserForm(forms.ModelForm):
    class Meta:
        model = User
        fields = ('email', 'password')

    def save(self, client_board=None, commit=True):
        user = super(UserForm, self).save(commit=False)
        user.set_password(self.cleaned_data["password"])
        if client_board is not None:
            user.client_board = client_board
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


class ProfileThumbnailForm(forms.ModelForm):
    class Meta:
        model = Profile
        fields = ('id', 'thumbnail')


class ForgotPasswordForm(forms.Form):
    email = forms.CharField(required=True, validators=[validate_email])


class ResetPasswordForm(forms.Form):
    new_password = forms.CharField(required=True)
    repeat_new_password = forms.CharField(required=True)

    def is_valid(self):
        valid = super(ResetPasswordForm, self).is_valid()
        if not valid:
            return valid

        if self.cleaned_data['new_password'] != self.cleaned_data['repeat_new_password']:
            self._errors['passwords_not_match'] = 'Passwords don\'t match.'
            return False
        return True


class WidgetForm(forms.ModelForm):
    
    template = forms.CharField(required=True)
    
    class Meta:
        model = Widget
        fields = ['url', 'template']

    def clean(self):
        cleaned_data = super().clean()
        template: str = cleaned_data.get('template')
        if not template:
            self.add_error('template', 'Please select a template.')

    def save(
        self,
        user=None,
        client_board=None,
        commit=True
    ):
        widget = super(WidgetForm, self).save(commit=False)
        widget.last_editor = user
        widget.client_board = client_board
        if commit:
            widget.save()
            widget.assignees.add(user)
        return widget


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
