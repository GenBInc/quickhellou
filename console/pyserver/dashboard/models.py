# -*- coding: utf-8 -*-
from __future__ import unicode_literals
import re
import uuid
from zoneinfo import ZoneInfo
from datetime import datetime
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils.timezone import make_aware
from django.utils.translation import gettext_lazy as _
from common.strings import encode_short_url
from dashboard.managers import (
    CommunicationManager,
    CommunicationSessionManager,
)
from accounts.models import User
from console import settings


def full_domain_validator(hostname):
    """
    Fully validates a domain name as compilant with the standard rules:
        - Composed of series of labels concatenated with dots, as are all domain names.
        - Each label must be between 1 and 63 characters long.
        - The entire hostname (including the delimiting dots) has a maximum of 255 characters.
        - Only characters 'a' through 'z' (in a case-insensitive manner), the digits '0' through '9'.
        - Labels can't start or end with a hyphen.
    """
    HOSTNAME_LABEL_PATTERN = re.compile("(?!-)[A-Z\d-]+(?<!-)$", re.IGNORECASE)
    if not hostname:
        return
    if len(hostname) > 255:
        raise ValidationError(
            _("The domain name cannot be composed of more than 255 characters."))
    if hostname[-1:] == ".":
        # strip exactly one dot from the right, if present
        hostname = hostname[:-1]
    #parts = hostname.split(".")
    # if len(parts) <= 1:
    #    raise ValidationError(
    #            _("The URL is not valid."))
    for label in hostname.split("."):
        if len(label) > 63:
            raise ValidationError(
                _("The label '%(label)s' is too long (maximum is 63 characters).") % {'label': label})
        if not HOSTNAME_LABEL_PATTERN.match(label):
            raise ValidationError(
                _("Unallowed characters in label '%(label)s'.") % {'label': label})


class ClientBoard(models.Model):
    """Client board."""
    id = models.AutoField(primary_key=True)
    active = models.BooleanField(default=True)
    creation_date = models.DateTimeField(auto_now_add=True)
    uuid = models.UUIDField(default=uuid.uuid4, editable=False)


class WidgetManager(models.Manager):
    def get_queryset(self):
        return super(WidgetManager, self).get_queryset().filter(active=True)

    def create_default_widget(self, user_id, url):
        widget.last_editor = User.objects.get(id=user_id)
        widget = self.create(url=url)
        return widget


class WidgetTemplate(models.Model):
    """ Widget template model. """
    DEFAULT_COLOR_1 = '#7FD100'
    DEFAULT_COLOR_2 = '#29327d'
    DEFAULT_COLOR_CHOICES = (
        (DEFAULT_COLOR_1, 'DEFAULT_COLOR_1'),
        (DEFAULT_COLOR_2, 'DEFAULT_COLOR_2'),
    )
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=256, blank=False)
    code = models.TextField(default=None, null=True, blank=True)
    active = models.BooleanField(default=True)
    background_color = models.CharField(
        max_length=12, default=DEFAULT_COLOR_1, blank=False)
    icon = models.FileField(
        default='images/logo.svg', blank=True, upload_to='widget_templates/images')
    last_editor = models.ForeignKey(
        User, default=None, null=True, on_delete=models.CASCADE)


class Widget(models.Model):
    """ Widget model. """
    LANG_EN = 'en'
    LANG_ES = 'es'
    LANG_DE = 'de'
    LANG_PL = 'pl'
    LANG_CHOICES = (
        (LANG_EN, 'English'),
        (LANG_ES, 'Spanish'),
        (LANG_DE, 'German'),
        (LANG_PL, 'Polish'),
    )
    id = models.AutoField(primary_key=True)
    name = models.CharField(
        max_length=256, default="", blank=False)
    url = models.CharField(max_length=512, validators=[
                           full_domain_validator], blank=False)
    lang = models.CharField(max_length=5, default='en', blank=False)
    last_change = models.DateTimeField(auto_now_add=True)
    client_board = models.ForeignKey(
        ClientBoard, default=None, blank=True, null=True, on_delete=models.CASCADE)
    assignees = models.ManyToManyField(User, related_name='widget_user')
    last_editor = models.ForeignKey(
        User, related_name='last_editor', default=None, null=True, on_delete=models.CASCADE)
    active = models.BooleanField(default=True)
    is_installed = models.BooleanField(default=False)
    paused = models.BooleanField(default=False)
    template = models.ForeignKey(
        WidgetTemplate, default=None, blank=True, null=True, on_delete=models.CASCADE)
    # Properties merged into template.
    header = models.CharField(max_length=256, blank=True)
    content = models.TextField(blank=True)
    uuid = models.UUIDField(default=uuid.uuid4, editable=False)
    objects = WidgetManager()
    all_objects = models.Manager()


class Communication(models.Model):
    # Appointment is created, pending for creator's response
    STATUS_PENDING = 1
    # Creator accepts pending appointment
    STATUS_OPEN = 2
    # Creator rejects pending appointment
    STATUS_REJECTED = 3
    # Creator closes open/rejected appointment
    STATUS_CLOSED = 4
    # Client cancels appointment
    STATUS_CANCELLED = 5

    STATUS_CHOICES = (
        (STATUS_PENDING, 'pending'),
        (STATUS_OPEN, 'open'),
        (STATUS_REJECTED, 'rejected'),
        (STATUS_CANCELLED, 'cancelled'),
        (STATUS_CLOSED, 'closed'),
    )
    id = models.AutoField(primary_key=True)
    client_board = models.ForeignKey(
        'ClientBoard', default=None, blank=True, null=True, on_delete=models.CASCADE)
    caller_name = models.CharField(
        max_length=256, default="anonymous_guest", blank=False)
    caller = models.ForeignKey(
        User, default=None, null=True, on_delete=models.CASCADE)
    widget = models.ForeignKey(Widget, related_name='communications',
                               default=None, blank=True, null=True, on_delete=models.CASCADE)
    modification_time = models.DateTimeField(auto_now_add=True)
    datetime = models.DateTimeField()
    short_url = models.CharField(
        max_length=16, blank=True)
    uuid = models.UUIDField(default=uuid.uuid4, editable=False)
    active = models.BooleanField(default=True)
    status = models.SmallIntegerField(
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
    )
    # Turn reminders on/off
    reminders = models.BooleanField(default=True)
    # Is one hour reminder sent
    one_hour_reminder_sent = models.BooleanField(default=False)
    # Is one day reminder sent
    one_day_reminder_sent = models.BooleanField(default=False)

    objects = CommunicationManager()

    class Meta:
        get_latest_by = ['modification_time']

    def encode_short_url(self):
        """Encodes short URL.
        """
        self.short_url = encode_short_url(self.id)
        self.save()

    def is_closed(self):
        return self.status in (self.STATUS_REJECTED)

    def status_verbose(self):
        return dict(Communication.STATUS_CHOICES)[self.status]

    @property
    def is_pastdate(self) -> bool:
        """Checks if datetime is past date.

        Returns:
            bool: True if date is past
        """
        return self.datetime.__lt__(make_aware(datetime.utcnow()))

    @property
    def is_open(self):
        return self.status.__eq__(Communication.STATUS_OPEN)

    @property
    def link_url(self) -> str:
        """Gets associated videochat room URL. 

        Returns:
            str: the videochat room URL
        """
        return '{}/r/{}'.format(settings.VIDEOCHAT_APP_URL, self.short_url)

    @property
    def pending_sessions_count(self):
        return self.communicationsession_set.filter(status=CommunicationSession.STATUS_CREATED).count

    @property
    def initial_session(self):
        return self.communicationsession_set.filter(
            communication__id=self.id, status=CommunicationSession.STATUS_CREATED).first()

    @property
    def current_session_id(self):
        sessions = self.communicationsession_set.filter(
            communication__id=self.id, status=CommunicationSession.STATUS_CREATED)
        if (sessions.count != 0):
            return str(sessions[0].id)
        return None


class CommunicationSession(models.Model):
    TYPE_VIDEO_CALL = 1
    TYPE_MESSAGE = 2
    TYPE_CHOICES = (
        (TYPE_VIDEO_CALL, 'video call'),
        (TYPE_MESSAGE, 'message'),
    )

    STATUS_CREATED = 1
    STATUS_POSTED = 2
    STATUS_MISSED = 3
    STATUS_CANCELLED = 4
    STATUS_REJECTED = 5
    STATUS_ACCEPTED = 6
    STATUS_COMPLETED = 7
    STATUS_CHOICES = (
        (STATUS_CREATED, 'created'),
        (STATUS_POSTED, 'posted'),
        (STATUS_MISSED, 'missed'),
        (STATUS_CANCELLED, 'cancelled'),
        (STATUS_REJECTED, 'rejected'),
        (STATUS_ACCEPTED, 'accepted'),
        (STATUS_COMPLETED, 'completed'),
    )

    id = models.AutoField(primary_key=True)
    communication = models.ForeignKey(
        Communication, default=None, null=True, on_delete=models.CASCADE)
    attendant = models.ForeignKey(
        User, default=None, null=True, on_delete=models.CASCADE)
    creation_time = models.DateTimeField(auto_now_add=True)
    close_time = models.DateTimeField(auto_now_add=True)
    uuid = models.UUIDField(default=uuid.uuid4, editable=False)
    content = models.TextField(default=None, null=True, blank=True)

    type = models.SmallIntegerField(
        choices=TYPE_CHOICES,
        default=TYPE_MESSAGE,
    )
    status = models.SmallIntegerField(
        choices=STATUS_CHOICES,
        default=STATUS_CREATED,
    )
    rate = models.SmallIntegerField(default=0)
    objects = CommunicationSessionManager()

    def type_verbose(self):
        return dict(CommunicationSession.TYPE_CHOICES)[self.type]

    def status_verbose(self):
        return dict(CommunicationSession.STATUS_CHOICES)[self.status]

    def modifier_name(self):
        if self.attendant is not None:
            return self.attendant.profile.full_name
        else:
            return self.communication.caller_name
        return None

    def contact_data(self):
        if self.attendant is not None:
            if self.attendant.email and settings.FAKE_EMAIL_DOMAIN not in self.attendant.email:
                return self.attendant.email
            elif self.attendant.profile.phone:
                return self.attendant.profile.phone
        else:
            return self.communication.caller_name
        return None

    def type_verbose(self):
        return dict(CommunicationSession.TYPE_CHOICES)[self.type]

    class Meta:
        db_table = 'dashboard_communication_session'
        verbose_name = "communication_session"
        verbose_name_plural = "communication_sessions"


class UserWorkingHours(models.Model):
    """ User working hours model. """
    id = models.AutoField(primary_key=True)
    # Assigned user
    user = models.ForeignKey(
        User, null=False, on_delete=models.CASCADE)
    # Time range entries in RANGE_PATTERN format
    time = models.CharField(max_length=256, blank=False)
