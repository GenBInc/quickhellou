# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import ast
import datetime
import io
import os
import re
import hashlib

from django.contrib import messages
from django.contrib.auth.decorators import login_required, permission_required
from django.core.mail import send_mail
from django.http import FileResponse, Http404
from django.shortcuts import redirect, render, get_object_or_404
from django.template.loader import render_to_string
from django.views.decorators.csrf import csrf_exempt

from console import settings
from accounts.models import Profile, User

from .forms import (ApplicationSettingsForm, AssignedWidgetsForm,
                    AssigneesForm, CommunicationForm, ProfileForm,
                    ProfileMetaForm, UserForm, WidgetExtensionViewForm,
                    WidgetForm, WidgetTemplateForm, CommunicationSessionForm,
                    WidgetActiveUserForm)
from .models import (ApplicationSettings, Communication, CommunicationSession,
                     Widget, WidgetTemplate)


@login_required(login_url="/accounts/login")
def home_view(request):
    user = request.user
    return render(request, 'dashboard/home.html', {'user': request.user})

@login_required(login_url="/accounts/login")
def widgets_view(request):
    widgets = Widget.objects.filter(
        active=True, client_board=request.user.client_board).order_by('id')
    active_widgets_len = len(widgets.filter(paused=False))
    return render(request, 'dashboard/widgets.html', {
        'user': request.user, 
        'widgets': widgets, 
        'languages': Widget.LANG_CHOICES, 
        'active_widgets_len': active_widgets_len})

@permission_required("is_default_admin")
@permission_required("is_default_editor")
@login_required(login_url="/accounts/login")
def settings_view(request):
    widget_templates = WidgetTemplate.objects.all()
    video_app_url = ApplicationSettings.objects.get(property='video_app_url')
    console_app_url = ApplicationSettings.objects.get(property='console_app_url')
    ws_service_url = ApplicationSettings.objects.get(property='ws_service_url')        
    admin_email_address = ApplicationSettings.objects.get(property='admin_email_address')        
    if request.method == 'POST':
        form = ApplicationSettingsForm(request.POST)
        if form.is_valid():
            video_app_url.value = form.cleaned_data['video_app_url']
            video_app_url.save()

            console_app_url.value = form.cleaned_data['console_app_url']
            console_app_url.save()

            admin_email_address.value = form.cleaned_data['admin_email_address']
            admin_email_address.save()

            ws_service_url.value = form.cleaned_data['ws_service_url']
            ws_service_url.save()

            messages.success(
                request, 'Settings have been saved.')
            return redirect('dashboard:settings')
    return render(request, 'dashboard/settings.html', {
        'widget_templates' : widget_templates,
        'video_app_url':video_app_url.value,
        'console_app_url':console_app_url.value,
        'ws_service_url':ws_service_url.value,
        'admin_email_address':admin_email_address.value
    })

@permission_required("is_default_editor")
@login_required(login_url="/accounts/login")
def communication_edit_view(request, communication_id=None):
    if communication_id is not None:
        communication = Communication.objects.get(id=communication_id)
        com_sessions = communication.communicationsession_set.all()
    else:
        return redirect('dashboard:communications')
    if request.method == 'POST':
        form = CommunicationForm(request.POST, instance=communication)
        if form.is_valid():
            instance = form.save(commit=False)
            instance.modification_time = datetime.datetime.now()
            instance.save()
            messages.success(
                request, 'Communication record has been saved.')
            return redirect('dashboard:communications')
    return render(request, 'dashboard/communication_edit.html', {
        'communication' : communication,
        'client_user' : communication.caller,
        'statuses': Communication.STATUS_CHOICES,
        'com_sessions' : com_sessions,
    })

def communication_session_edit_view(request, session_id):
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
        'session' : instance,
        'client_user' : instance.communication.caller,
        'statuses': CommunicationSession.STATUS_CHOICES,
    })

@permission_required("is_default_admin")
@permission_required("is_default_editor")
@login_required(login_url="/accounts/login")
def widget_create_view(request):
    users = User.objects.filter(client_board=request.user.client_board)
    widget_templates = WidgetTemplate.objects.all()
    if request.method == 'POST':
        form = WidgetForm(request.POST)
        assignees_form = AssigneesForm(request.POST)
        if form.is_valid() and assignees_form.is_valid():
            instance = form.save(commit=False)
            instance.client_board = request.user.client_board
            instance.last_change = datetime.datetime.now()
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
        'languages' : Widget.LANG_CHOICES,
        'widget_templates' : widget_templates,
        'users': users})

@login_required(login_url="/accounts/login")
def widget_edit_view(request, widget_id=None):
    widget_templates = WidgetTemplate.objects.all()
    users = User.objects.filter(client_board=request.user.client_board, is_admin=True)
    if widget_id is not None:
        widget = Widget.objects.get(id=widget_id)
        widget_code = '<script>' + create_widget_embed_script(widget) + '</script>'
    else:
        return redirect('dashboard:widgets')
    if request.method == 'POST':
        form = WidgetForm(request.POST, instance=widget)
        assignees_form = AssigneesForm(request.POST)
        if form.is_valid() and assignees_form.is_valid():
            instance = form.save(commit=False)
            instance.last_change = datetime.datetime.now()
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
        'languages' : Widget.LANG_CHOICES,
        'widget_templates' : widget_templates,
        'widget': widget,
        'widget_code' : widget_code})

@permission_required("is_default_admin")
@login_required(login_url="/accounts/login")
def widget_template_create_view(request):
    if request.method == 'POST':
        form = WidgetTemplateForm(request.POST, request.FILES)
        if form.is_valid():
            instance = form.save(request.user)
            messages.success(
                request, 'Widget template has been created.')
            return redirect('dashboard:settings')
        else:
            messages.error(request, 'Please correct the errors below.')
    else:
        form = WidgetTemplateForm()
    return render(request, 'dashboard/widget_template_create.html', {
        'form': form,
        'default_colors' : WidgetTemplate.DEFAULT_COLOR_CHOICES,
    })

@permission_required("is_default_admin")
@login_required(login_url="/accounts/login")
def widget_template_edit_view(request, widget_template_id=None):
    if widget_template_id is not None:
        widget_template = WidgetTemplate.objects.get(id=widget_template_id)
    else:
        return redirect('dashboard:settings')
    if request.method == 'POST':
        form = WidgetTemplateForm(request.POST, request.FILES, instance=widget_template)
        if form.is_valid():
            instance = form.save(request.user)
            messages.success(
                request, 'Widget template has been saved.')
            return redirect('dashboard:settings')
        else:
            messages.error(request, 'Please correct the errors below.')
    else:
        form = WidgetTemplateForm()
    return render(request, 'dashboard/widget_template_edit.html', {
        'form' : form,
        'widget_template' : widget_template,
        'default_colors' : WidgetTemplate.DEFAULT_COLOR_CHOICES
    })

@login_required(login_url="/accounts/login")
def communication_delete(request, communication_id):
    communication = Communication.objects.get(id=communication_id)
    communication.active = False
    communication.save()
    messages.success(
        request, 'Communication has been deleted.')
    return redirect('dashboard:communications')

@login_required(login_url="/accounts/login")
def widget_delete(request, widget_id):
    widget = Widget.objects.get(id=widget_id)
    widget.active = False
    widget.save()
    messages.success(
        request, 'Widget has been deleted.')
    return redirect('dashboard:widgets')


@login_required(login_url="/accounts/login")
def widget_pause(request, widget_id):
    widget = Widget.objects.get(id=widget_id)
    widget.paused = True
    widget.save()
    messages.success(
        request, 'Widget has been paused.')
    return redirect('dashboard:widgets')


@login_required(login_url="/accounts/login")
def widget_unpause(request, widget_id):
    widget = Widget.objects.get(id=widget_id)
    widget.paused = False
    widget.save()
    messages.success(
        request, 'Widget has been activated.')
    return redirect('dashboard:widgets')

@login_required(login_url="/accounts/login")
def communications_view(request):
    communications = Communication.objects.filter(
        client_board=request.user.client_board).filter(active=True)
    return render(request, 'dashboard/communications.html', {
        'communications':communications,
        'user': request.user,})

@login_required(login_url="/accounts/login")
def communication_list_view(request):
    communications = Communication.objects.filter(
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

@login_required(login_url="/accounts/login")
def call_create_view(request):
    return render(request, 'dashboard/call_create.html', {
        'user': request.user,
    })

@permission_required("is_default_admin")
@login_required(login_url="/accounts/login")
def team_view(request):
    users = User.objects.filter(
        is_active=True, is_admin=True, is_superuser=False, \
            client_board=request.user.client_board).order_by('id')
    return render(request, 'dashboard/team.html', {'users': users})

@permission_required("is_default_admin")
@login_required(login_url="/accounts/login")
def billing_view(request):
    return render(request, 'dashboard/billing.html', {'user': request.user})

@permission_required("is_default_admin")
@login_required(login_url="/accounts/login")
def client_user_edit_view(request, user_id=None):
    if user_id is not None:
        client_user = User.objects.get(id=user_id)
        board_widgets = Widget.objects.filter(client_board=request.user.client_board)
        user_widgets = Widget.objects.filter(assignees__id=user_id)
    else:
        return redirect('dashboard:team')
    if request.method == 'POST':
        user_form = UserForm(request.POST, instance=client_user)
        print(user_form)
        profile_form = ProfileForm(request.POST, request.FILES, instance=client_user.profile)
        profile_meta_form = ProfileMetaForm(request.POST)
        widgets_form = AssignedWidgetsForm(request.POST)
        if user_form.is_valid() and profile_form.is_valid() and widgets_form.is_valid():
            client_user = user_form.save()
            client_user.is_admin = True
            profile_form.save(profile_form.cleaned_data['full_name'].strip(), client_user)
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
@login_required(login_url="/accounts/login")
def client_user_create_view(request):
    client_board = request.user.client_board
    widgets = Widget.objects.filter(client_board=client_board)
    if request.method == 'POST':
        user_form = UserForm(request.POST)
        profile_form = ProfileForm(
            request.POST, request.FILES)
        profile_meta_form = ProfileMetaForm(request.POST)
        widgets_form = AssignedWidgetsForm(request.POST)
        if user_form.is_valid() and profile_form.is_valid() and widgets_form.is_valid   ():
            client_user = user_form.save()
            # Attach user to client board.
            client_user.client_board = request.user.client_board
            client_user.is_admin = True
            client_user.save()
            # Set client user permissions. 
            client_user.set_as_default_editor()
            client_user.save()
            # Save profile form.
            profile = profile_form.save(profile_form.cleaned_data['full_name'].strip(), client_user)
            # Assign widgets.
            for widget in widgets_form.cleaned_data['widget']:
                client_user.widget_user.add(widget)
            # send activation email
            subject = 'QuickHellou - Account Activation'
            recipients = [client_user.email]
            email_params = {'console_app_url':ApplicationSettings.objects.get_console_app_url(),
                'user_id': client_user.id, 'username': profile.full_name}
            send_email_notification(subject, recipients, email_params, 'accounts/email/client-activation.txt', 'accounts/email/client-activation.html')    
            
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


@login_required(login_url="/accounts/login")
def user_delete(request, user_id):
    user = User.objects.get(id=user_id)
    user.is_active = False
    user.save()
    messages.success(
        request, "User has been deleted.")
    return redirect('dashboard:team')


@login_required(login_url="/accounts/login")
def user_deactivate(request, user_id):
    profile = Profile.objects.get(user_id=user_id)
    profile.available = False
    profile.save()
    messages.success(
        request, "User has been deactivated.")
    return redirect('dashboard:team')


@login_required(login_url="/accounts/login")
def user_activate(request, user_id):
    profile = Profile.objects.get(user_id=user_id)
    profile.available = True
    profile.save()
    messages.success(
        request, 'User has been activated.')
    return redirect('dashboard:team')

def create_widget_embed_script(widget):    
    widget_source_file = open('console/static/js/embed/widget_embed_script.js', "r", encoding="utf-8")
    widget_source = widget_source_file.readlines()
    
    code = ''
    if widget is not None:
        for line in widget_source:
            line = line.format(widget_id=widget.id, uuid=widget.uuid, console_app_url=ApplicationSettings.objects.get_console_app_url())
            code += line
    return code

def create_widget_content_script(widget):
    template_params = {'widget_id':widget.id, 'uuid':str(widget.uuid), 'console_app_url':ApplicationSettings.objects.get_console_app_url(),
            'video_app_url':ApplicationSettings.objects.get_video_app_url(),
            'background_color':widget.template.background_color, 'icon':widget.template.icon.url}
    template_code = render_to_string('embed/widget_content.html', template_params)
    
    widget_source_file = open('console/static/js/embed/widget_content_script.js', 'r', encoding='utf-8')
    widget_source = widget_source_file.readlines()
    

    code = ''
    if widget is not None:        
        for line in widget_source:
            line = line.format(template_code=template_code, console_app_url=ApplicationSettings.objects.get_console_app_url(), video_app_url=ApplicationSettings.objects.get_video_app_url())
            code += line
    return code

def widget_embed_script_file(request, widget_id):
    widget = Widget.objects.get(id=widget_id)

    if not widget:
        raise Http404
    
    code = create_widget_embed_script(widget)

    buffer = io.BytesIO(code.encode())
    
    return FileResponse(buffer, as_attachment=False)

def widget_content_script_file(request, widget_id):
    widget = Widget.objects.get(id=widget_id)
    
    if not widget:
        raise Http404
    
    code = create_widget_content_script(widget)

    buffer = io.BytesIO(code.encode())
    
    return FileResponse(buffer, as_attachment=False, filename='quickhellou.js')    

@csrf_exempt
def install(request, widget_id, domain, uuid):
    widget = Widget.objects.get(id=widget_id, uuid=uuid)

    if not widget:
        raise Http404

    print(domain, widget.url)
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
def test_widget(request):
    return render(request, 'embed/test_widget_v2.html', {})

def active_operator_init_form(request):
    return render(request, 'embed/active_operator_init_form.html', {})

def inactive_operator_init_form(request):
    return render(request, 'embed/inactive_operator_init_form.html', {})

def widget_embed_view(request, widget_id, hostname, uuid):
    widget = Widget.objects.get(id=widget_id, uuid=uuid)
    
    if not widget:
        raise Http404
    
    domain_match = hostname == widget.url
    print (domain_match, hostname, widget.url)
    if widget is not None and domain_match and not widget.is_installed:
        widget.is_installed = True
        widget.save()
    
    if (widget.is_installed):
        return render(request, 'embed/widget.html', {'widget': widget})
    else:
        return render(request, 'embed/widget.html', {'widget': None})

@csrf_exempt
def widget_extension_embed_view(request, widget_id, hostname, uuid):
    widget = Widget.objects.get(id=widget_id, uuid=uuid)
    
    if not widget:
        raise Http404
    
    domain_match = hostname == widget.url

    user_id = None
    
    if widget is not None and domain_match and not widget.is_installed:
        widget.is_installed = True
        widget.save()

    if request.method == 'POST':
        form = WidgetExtensionViewForm(request.POST)
        if form.is_valid():
            clientName = form.cleaned_data['name']
            clientEmailOrPhone = form.cleaned_data['email_or_phone']
            clientMessage = form.cleaned_data['message']
            
            clientEmail = ''
            clientPhone = ''
            
            if '@' in clientEmailOrPhone:
                clientEmail = clientEmailOrPhone
            else:
                clientEmail = hashlib.md5(str(datetime.datetime.now()).encode('utf-8')).hexdigest() + '@' + settings.FAKE_EMAIL_DOMAIN
            
            phone_regex = re.compile('^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{3,6}$')
            if phone_regex.match(clientEmailOrPhone):
                clientPhone = clientEmailOrPhone
            # get or create user
            try:
                client_user = User.objects.get(email=clientEmail)
            except:
                client_user = User.objects.create(email=clientEmail, client_board=widget.client_board)
                client_user.save()
            user_id = client_user.id
            # get or create user profile
            try:
                profile = Profile.objects.get(user=client_user)
            except:
                profile = Profile.objects.create(user=client_user)
                profile.phone = clientPhone

            profile.full_name = clientName
            profile.save()

            # get or create communication
            try:
                communication = Communication.objects.get(caller=client_user)
                communication.status = 2
            except:
                communication = Communication.objects.create(caller=client_user, caller_name=clientName, \
                    client_board=widget.client_board, status=2, widget=widget)
            communication.save()

            # create communication session
            session = CommunicationSession.objects.create_message(communication=communication, attendant=client_user, message = clientMessage, type = 2)

            #send message
            subject = 'QuickHellou - Message'
            recipients = [ApplicationSettings.objects.get_admin_email_address()]
            # if email address is empty prevent sending email
            console_app_url = ApplicationSettings.objects.get_console_app_url()
            email_params = {
                'name': clientName, 'email': clientEmail, 'phone': clientPhone, 'message': clientMessage, 'console_app_url': console_app_url}
            try:
                #send message notification to admin
                send_email_notification(subject, recipients, email_params, 'dashboard/email/widget-message-admin.txt', 'dashboard/email/widget-message-admin.html')    
                
                #send message notification to client
                if settings.FAKE_EMAIL_DOMAIN not in clientEmail:
                    recipients = [clientEmail]
                    send_email_notification(subject, recipients, email_params, 'dashboard/email/widget-message-client.txt', 'dashboard/email/widget-message-client.html')    
                messages.success(
                    request, "Thank You!")
                messages.success(
                    request, "Message sent successfully.")
            except Exception as e:
                print('e', e)
                messages.error(request, "Error sending email.")
                messages.error(request, "Please try again later.")
            #set success message
            form = WidgetExtensionViewForm()
    else:
        form = WidgetExtensionViewForm()
    return render(request, 'embed/widget_form_response.html', {
        'widget': widget,
        'form': form,
        'user_id': user_id,
        'hostname': hostname})

@csrf_exempt
def widget_active_operator(request, widget_id, hostname, uuid):
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
                clientEmail = '{0}@{1}'.format(hashlib.md5(str(datetime.datetime.now()).encode('utf-8')).hexdigest(), \
                    settings.FAKE_EMAIL_DOMAIN)
            
            phone_regex = re.compile('^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{3,6}$')
            if phone_regex.match(clientEmailOrPhone):
                clientPhone = clientEmailOrPhone
            # create or update user
            try:
                client_user = User.objects.get(email=clientEmail)
            except Exception as e:
                client_user = User.objects.create(email=clientEmail, client_board=widget.client_board)
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
            #set success message
            form = WidgetActiveUserForm()
    else:
        form = WidgetActiveUserForm()
    return render(request, 'embed/active_operator_form_response.html', {
        'widget': widget,
        'form': form,
        'status': status,
        'user_id': user_id,
        'hostname':hostname})

def send_email_notification(subject, recipients, email_params, text_template_url, html_template_url):
    message_plain = render_to_string(text_template_url, email_params)
    message_html = render_to_string(html_template_url, email_params)
    send_mail(subject, message_plain, 'support@<you_company.com>',
              recipients, html_message=message_html)