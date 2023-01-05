# -*- coding: utf-8 -*-
from __future__ import unicode_literals
import zoneinfo
from django.core.exceptions import ObjectDoesNotExist
from django.contrib.auth.models import (
    AbstractBaseUser,
    BaseUserManager
)
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.contrib.auth.decorators import user_passes_test
from django.contrib.auth.models import (
    PermissionsMixin,
    Permission
)

from django.conf import settings

import uuid


class UserManager(BaseUserManager):
    def create_user(self, email, password=None):
        """
        Creates and saves a User with the given email and password.
        """
        if not email:
            raise ValueError('Users must have an email address')

        user = self.model(
            email=self.normalize_email(email),
        )

        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password):
        """
        Creates and saves a superuser with the given email and password.
        """
        user = self.create_user(
            email,
            password=password,
        )
        user.is_admin = True
        user.is_superuser = True
        user.save(using=self._db)
        return user

    def is_assigned(self, widget=None, user=None):
        """ Checks if widget is assigned to the user. """
        return len(Widget.objects.filter(id=widget.id, assignees__id=user.id)) > 0


class User(AbstractBaseUser, PermissionsMixin):
    """User model."""

    class Meta:
        permissions = (
            ("is_owner", "is owner"),
            ("is_enterprise_admin", "is enterprise admin"),
            ("is_enterprise_editor", "is enterprise editor"),
            ("is_enterprise_viewer", "is enterprise viewer"),
            ("is_default_admin", "is default admin"),
            ("is_default_editor", "is default editor"),
            ("is_default_viewer", "is default viewer"),
            ("is_guest", "is guest"),)
    id = models.AutoField(primary_key=True)
    username = None
    email = models.EmailField(_('email address'), unique=True)
    client_board = models.ForeignKey(
        'dashboard.ClientBoard', default=None, blank=True, null=True, on_delete=models.CASCADE)
    is_admin = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    is_password_set = models.BooleanField(default=False)

    time_interval = models.CharField(blank=False, default='30', max_length=2)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    NAMESPACE_USER = '6c4ff860-bbc2-492d-bbb2-d966846fe21a'

    objects = UserManager()

    def __str__(self):
        return self.email

    def has_perm(self, perm, obj=None):
        "Does the user have a specific permission?"
        try:
            user_perm = self.user_permissions.get(codename=perm)
        except ObjectDoesNotExist:
            user_perm = False
        if user_perm:
            return True
        else:
            return False

    def has_module_perms(self, app_label):
        "Does the user have permissions to view the app `app_label`?"
        return True

    def set_as_guest(self):
        self.set_as_permission('is_guest')

    def set_as_default_admin(self):
        self.set_as_default_admin_only()
        self.set_as_default_editor()

    def set_as_default_editor(self):
        self.set_as_default_editor_only()
        self.set_as_default_viewer()

    def set_as_default_admin_only(self):
        self.set_as_permission('is_default_admin')

    def set_as_default_editor_only(self):
        self.set_as_permission('is_default_editor')

    def set_as_default_viewer(self):
        self.set_as_permission('is_default_viewer')

    def set_as_permission(self, codename):
        permission = Permission.objects.get(codename=codename)
        self.user_permissions.add(permission)

    def set_full_name(self, full_name):
        self.profile.full_name = full_name

    @property
    def tzinfo(self):
        return zoneinfo.ZoneInfo(self.profile.timezone)
    
    @property
    def is_staff(self):
        "Is the user a member of staff?"
        return self.is_admin and self.is_superuser

    @property
    def is_owner(self):
        "Is the user an owner?"
        return self.has_perm("is_owner")

    @property
    def is_default_admin(self):
        "Is the user an default admin user?"
        return self.has_perm("is_default_admin")

    @property
    def is_default_editor(self):
        "Is the user an default editor user?"
        return self.has_perm("is_default_editor")

    @property
    def is_default_viewer(self):
        "Is the user an default viewer user?"
        return self.has_perm("is_default_viewer")

    @property
    def is_default_rw(self):
        "Is the user an default admin or editor user?"
        return self.is_default_admin or self.is_default_editor

    @property
    def role(self):
        if self.is_default_admin:
            return "Admin"
        if self.is_default_editor:
            return "Editor"
        if self.is_default_admin:
            return "Viewer"

    @property
    def get_full_name(self):
        return self.profile.full_name

    @property
    def first_name(self):
        firstname = ''
        try:
            firstname = self.profile.full_name.split()[0]
        except Exception as e:
            print(e)
        return firstname

    @property
    def last_name(self):
        lastname = ''
        try:
            lastname = self.profile.full_name.split()[1]
        except Exception as e:
            print(e)
        return lastname

    @property
    def uuid(self):
        return uuid.uuid5(uuid.NAMESPACE_DNS, str(self.id))

    def permission_required(self, *perms):
        return user_passes_test(lambda u: any(u.has_perm(perm) for perm in perms), login_url='/login')


class ProfileManager(models.Manager):
    def get_queryset(self):
        return super(ProfileManager, self).get_queryset()

    def create_profile(self, user, full_name):
        profile = self.model(user=user,)
        profile.save(using=self._db)
        return profile


class Profile(models.Model):
    """ User Profile """

    id = models.AutoField(primary_key=True)
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    full_name = models.CharField(max_length=256, blank=False)
    phone = models.CharField(max_length=32, blank=False)
    role = models.CharField(max_length=32, blank=False, default="Owner")
    available = models.BooleanField(default=True)
    thumbnail = models.FileField(
        default='images/user.svg', blank=True, upload_to='users/images')

    # User timezone
    TIMEZONE_CHOICES = ((x, x) for x in sorted(
        zoneinfo.available_timezones(), key=str.lower))
    timezone = models.CharField(max_length=64, default='Etc/GMT+0')

    objects = ProfileManager()

    @property
    def email_or_phone(self):
        if settings.FAKE_EMAIL_DOMAIN not in self.user.email:
            return self.user.email
        if self.phone:
            return self.phone
        return 'No contact information.'
