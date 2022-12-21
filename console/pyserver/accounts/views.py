# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from django.http import (
    HttpRequest,
    HttpResponse,
    HttpResponseRedirect
)
from django.conf import settings
from django.shortcuts import render
from django.contrib import messages
from django.contrib.auth import login, logout
from django.contrib.auth.forms import AuthenticationForm
from django.core.mail import send_mail
from django.db import transaction
from django.shortcuts import redirect, render
from django.template.loader import render_to_string
from django.views.decorators.csrf import csrf_exempt

from accounts.models import User, Profile
from accounts.forms import ForgotPasswordForm, ProfileForm, ProfileMetaForm, \
    ResetPasswordForm, UserForm, WidgetForm, ProfileThumbnailForm
from dashboard.models import (
    ClientBoard,
)


def home_view(
    request: HttpRequest
) -> HttpResponseRedirect:
    return redirect('/login')


@transaction.atomic
def signup_view(
    request: HttpRequest
) -> HttpResponse:
    """Signup view.

    Args:
        request (HttpRequest): the HTTP request

    Returns:
        HttpResponse: the HTTP response
    """
    if request.method == 'POST':
        user_form: UserForm = UserForm(request.POST)
        profile_form: ProfileForm = ProfileForm(request.POST)
        widget_form: WidgetForm = WidgetForm(request.POST)
        profile_meta_form: ProfileMetaForm = ProfileMetaForm(request.POST)
        if user_form.is_valid() and profile_meta_form.is_valid() and profile_form.is_valid():
            # Create client board
            client_board: ClientBoard = ClientBoard.objects.create()
            # Create new user and grant owner permissions
            user: User = user_form.save(client_board)
            user.set_password(user_form.cleaned_data['password'])
            user.is_admin = True
            user.set_as_default_admin()
            user.save()
            # Save profile form
            profile_form.save(
                profile_form.cleaned_data['full_name'].strip(), user)

            # email notification
            subject: str = 'QuickHellou - New User'
            recipients: list[str] = [settings.ADMIN_EMAIL]
            email_params: dict = {'username': user.first_name, 'email': user.email, 'full_name': user.get_full_name,
                                  'phone': user.profile.phone, 'console_app_url': settings.CONSOLE_APP_URL}
            send_email_notification(subject, recipients, email_params,
                                    'accounts/email/signup-admin.txt', 'accounts/email/signup-admin.html')
            # send email to client user
            recipients: list[str] = [user.email]
            send_email_notification(subject, recipients, email_params,
                                    'accounts/email/signup-client.txt', 'accounts/email/signup-client.html')

            # handle success action
            messages.success(
                request, 'Your profile is created. You can log in now.')
            return redirect('accounts:login')
        else:
            messages.error(request, 'Please correct the errors below.')
    else:
        user_form = UserForm()
        profile_form = ProfileForm()
        widget_form = WidgetForm()
        profile_meta_form = ProfileMetaForm()

    return render(request, 'accounts/signup.html', {
        'user_form': user_form,
        'profile_form': profile_form,
        'widget_form': widget_form,
        'profile_meta_form': profile_meta_form})


@csrf_exempt
def login_view(
    request: HttpRequest
) -> HttpResponse:
    """Login view.

    Args:
        request (HttpRequest): the HTTP request

    Returns:
        HttpResponse: the HTTP response
    """
    if request.method == 'POST':
        form: AuthenticationForm = AuthenticationForm(data=request.POST)
        if form.is_valid():
            user: User = form.get_user()
            login(request, user)
            if 'next' in request.POST:
                return redirect(request.POST.get('next'))
            else:
                return redirect('dashboard:home')
    else:
        form: AuthenticationForm = AuthenticationForm()
    return render(request, 'accounts/login.html', {'form': form})


def logout_view(request) -> HttpResponseRedirect:
    if request.method == 'POST':
        logout(request)
        return redirect('accounts:login')


def terms_of_use_view(request) -> HttpResponse:
    """Terms of use view.

    Args:
        request (HttpRequest): the HTTP request

    Returns:
        HttpResponse: the HTTP response
    """
    return render(request, 'accounts/terms-of-use.html')


def privacy_policy_view(request) -> HttpResponse:
    """Privacy policy view.

    Args:
        request (HttpRequest): the HTTP request

    Returns:
        HttpResponse: the HTTP response
    """
    return render(request, 'accounts/privacy-policy.html')


def forgot_password_view(
    request: HttpRequest
) -> HttpResponse:
    """Forget password view.

    Args:
        request (HttpRequest): the HTTP request

    Returns:
        HttpResponse: the HTTP response
    """
    if request.method == 'POST':
        form: ForgotPasswordForm = ForgotPasswordForm(data=request.POST)
        if form.is_valid():
            receiver = form.cleaned_data['email']
            user = User.objects.get(email=receiver)
            if user is not None:
                subject = 'QuickHellou - Reset Your Password'
                recipients = [receiver]
                email_params = {
                    'username': user.first_name, 'user_id': user.id, 'console_app_url': settings.CONSOLE_APP_URL}
                send_email_notification(subject, recipients, email_params,
                                        'accounts/email/forgot-password.txt', 'accounts/email/forgot-password.html')
                messages.success(
                    request, 'We\'ve sent you instructions how to reset your password. Please check your email account.')
            else:
                messages.error(
                    request, 'Account with given email address doesn\'t exist.')
    else:
        form = ForgotPasswordForm()
    return render(request, 'accounts/forgot-password.html', {'form': form})


def reset_password_view(
    request: HttpRequest,
    user_id: int
) -> HttpResponse:
    """Reset password view.

    Args:
        request (HttpRequest): the HTTP request
        user_id (HttpRequest): the user id

    Returns:
        HttpResponse: the HTTP response
    """
    user: User = User.objects.get(id=user_id)
    if request.method == 'POST':
        form: ResetPasswordForm = ResetPasswordForm(data=request.POST)
        if form.is_valid():
            user.set_password(form.cleaned_data['new_password'])
            user.save()
            messages.success(
                request, 'Your password is now set. You may log in with your new password.')
            return redirect('accounts:login')
        else:
            messages.error(request, 'Please correct the errors below.')
    else:
        form = ResetPasswordForm()
    return render(request, 'accounts/reset-password.html', context={'user_id': user_id, 'form': form})


def upload_thumbnail(
    request: HttpRequest,
    profile_id: int
) -> HttpResponseRedirect:
    if request.method == 'POST':
        form = ProfileThumbnailForm(request.POST, request.FILES)
        if form.is_valid():
            profile = Profile.objects.get(id=profile_id)
            profile.thumbnail = request.FILES['thumbnail']
            profile.save()
            return redirect('dashboard:home')
        else:
            form = ProfileThumbnailForm()
    else:
        form = ProfileThumbnailForm()
    return redirect('dashboard:home')


def delete_thumbnail(
    request: HttpRequest,
    profile_id: int
) -> HttpResponseRedirect:
    if request.method == 'POST':
        form = ProfileThumbnailForm(request.POST, request.FILES)
        if form.is_valid():
            profile = Profile.objects.get(id=profile_id)
            profile.thumbnail = "images/user.svg"
            profile.save()
            return redirect('dashboard:home')
        else:
            form = ProfileThumbnailForm()
    else:
        form = ProfileThumbnailForm()
    return redirect('dashboard:home')


def activate_user_view(
    request: HttpRequest,
    user_id: int
) -> HttpResponse:
    user = User.objects.get(id=user_id)
    if user.is_password_set:
        return redirect('accounts:login')
    if request.method == 'POST':
        form = ResetPasswordForm(data=request.POST)
        if form.is_valid():
            user.set_password(form.cleaned_data['new_password'])
            user.is_password_set = True
            user.save()
            messages.success(
                request, 'Your account has been activated. You may log in now.')
            return redirect('accounts:login')
    else:
        form = ResetPasswordForm()
    return render(request, 'accounts/activate-user.html', context={
        'user': user,
        'form': form,
    })


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
        'support@genb.com',
        recipients,
        html_message=message_html
    )
