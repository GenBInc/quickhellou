from django import forms
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from django.shortcuts import redirect
from django.contrib.auth import (
    login,
    authenticate
)
from dashboard.models import Widget
from accounts.models import User, Profile


class UserAuthorizationForm(forms.Form):
    """ User authorization form. """
    username = forms.CharField(required=False)
    password = forms.CharField(required=False)

    def clean(self):
        """Cleans the form."""
        cleaned_data = super().clean()
        username = cleaned_data.get('username')
        if not username:
            self.add_error('username', 'E-mail is required.')

        password = cleaned_data.get('password')
        if not password:
            self.add_error('password', 'Password is required.')

        if not password or not username:
            return

        try:
            validate_email(username)
            user: User = User.objects.filter(email__iexact=username).first()
            if user and not user.is_active:
                self.add_error('username', 'Account is inactive.')
        except ValidationError:
            self.add_error('username', 'Username or password is invalid.')

    def login(self, request):
        user = self.get_user()

        password: str = self.cleaned_data.get('password')
        user = authenticate(request, username=user.email,
                               password=password)
        if user:
            login(request, user)
            return user.is_authenticated
        if not user:
            self.add_error('username', 
                'Username or password is invalid.')
        return False

    def get_user(self):
        cleaned_data = super().clean()
        email = cleaned_data.get('username')
        return User.objects.filter(email=email).first()


class ProfileMetaForm(forms.Form):
    """ User Profile Helpers """

    password = forms.CharField(required=True)
    confirm_password = forms.CharField(required=True)
    #recaptcha = forms.CharField(required=False)

    def is_valid(self):
        valid = super(ProfileMetaForm, self).is_valid()
        if not valid:
            return valid

        if self.cleaned_data['password'] != self.cleaned_data['confirm_password']:
            self.add_error('password', 'Passwords don\'t match.')
            return False


#        if self.cleaned_data['recaptcha'] == "0":
#            self._errors['no_captcha'] = 'Please check the Captcha field.'
#            return False
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
            self.add_error('new_password', 'Passwords don\'t match.')
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
