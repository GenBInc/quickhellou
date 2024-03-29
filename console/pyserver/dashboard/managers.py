from django.apps import apps
from django.db import models


class CommunicationQuerySet(models.QuerySet):
    def pending_sessions(self, communication_id):
        return self.filter(communication__id=communication_id, status=1)


class CommunicationManager(models.Manager):
    def get_queryset(self):
        return super(CommunicationManager, self).get_queryset()


class CommunicationSessionQuerySet(models.QuerySet):
    def pending_sessions(self, communication_id):
        return self.filter(communication__id=communication_id, status=1)


class CommunicationSessionManager(models.Manager):
    def get_queryset(self):
        return CommunicationSessionQuerySet(self.model, using=self._db)

    def create_session(self, communication,):
        session = self.model(communication=communication,)
        session.save(using=self._db)
        return session

    def pending_sessions(self, communication_id):
        return self.get_queryset().pending_sessions(communication_id)

    def create_message(self, communication, attendant, message, type = 2):
        session = self.model(communication=communication, attendant=attendant)
        session.type = type
        session.status = 1
        session.content = message
        session.rate = 0
        session.save(using=self._db)
        return session
