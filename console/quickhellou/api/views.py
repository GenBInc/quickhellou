from django.shortcuts import render
from accounts.models import User
from dashboard.models import (Widget, Communication, CommunicationSession, ApplicationSettings)
from dashboard.forms import WidgetExtensionViewForm
from rest_framework import (viewsets, status)
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.renderers import JSONRenderer, StaticHTMLRenderer
from rest_framework.decorators import (action, api_view, permission_classes)
from .serializers import (UserSerializer, WidgetSerializer, CommunicationSerializer, CommunicationSessionSerializer, ApplicationSettingsSerializer)
from . import views



import uuid

# Create your views here.


class UserViewSet(viewsets.ModelViewSet):
  """
  API endpoint that allows users to be viewed or edited.
  """
  queryset = User.objects.all()
  serializer_class = UserSerializer

  def get_object(self):
    pk = self.kwargs.get('pk')

    if pk == "current":
      return self.request.user

    return super(UserViewSet, self).get_object()

class ApplicationSettingsViewSet(viewsets.ModelViewSet):
  """
  API endpoint that allows application settings to be viewed or edited.
  """
  queryset = ApplicationSettings.objects.all()
  serializer_class = ApplicationSettingsSerializer


class WidgetViewSet(viewsets.ModelViewSet):
  """
  API endpoint that allows widgets to be viewed or edited.
  """
  queryset = Widget.objects.all()
  serializer_class = WidgetSerializer

@permission_classes((IsAuthenticated, ))
class CommunicationSessionViewSet(viewsets.ModelViewSet):
  """
  API endpoint that allows communication sessions to be viewed or edited.
  """
  queryset = CommunicationSession.objects.all()
  serializer_class = CommunicationSessionSerializer

  def post(self, request, *args, **kwargs):
    serializer = self.get_serializer(data=request.data)
    data = serializer.data
    return Response(serializer.validated_data, status=status.HTTP_201_CREATED)

  @action(detail=True, renderer_classes=[JSONRenderer])
  def room_uuid(self, request, *args, **kwargs):
    return Response({'uuid':uuid.uuid5(uuid.NAMESPACE_DNS, kwargs['str'])})
  
  @action(detail=True, renderer_classes=[JSONRenderer])
  def set_status(self, request, *args, **kwargs):
    communication_session = self.get_object()
    status = int(kwargs['status'])
    communication_session.status = status
    # if status change is caused by an user interaction 
    if (status > 4):
      communication_session.attendant = self.request.user
    communication_session.save()
    # complete communication if session is accepted
    if (status in [6]):
      communication = communication_session.communication
      communication.status = 4
      communication.save()
    # close communication if session is rejected or cancelled
    if (status in [4,5]):
      communication = communication_session.communication
      communication.status = 3
      communication.save()
    return Response({'result':'ok'})
  
  @action(detail=True, renderer_classes=[JSONRenderer])
  def set_rate(self, request, *args, **kwargs):
    communication_session = self.get_object()
    rate = int(kwargs['rate'])
    communication_session.rate = rate
    communication_session.save()
    return Response({'result':'ok'})
  
  @action(detail=True, renderer_classes=[JSONRenderer])
  def pending_sessions(self, request, *args, **kwargs):
    sessions = CommunicationSession.objects.filter(status=1)
    objs = []
    for session in sessions:
      objs.append({
        'id':session.id,
        'uuid':session.uuid,
        'client':session.communication.caller_name
      })
    return Response(objs)

@permission_classes((IsAuthenticated, ))
class CommunicationViewSet(viewsets.ModelViewSet):
  """
  API endpoint that allows call records to be viewed or edited.
  """
  queryset = Communication.objects.all()
  serializer_class = CommunicationSerializer

  def post(self, request, format=None):
    serializer = CommunicationSerializer(data=request.data)
    if serializer.is_valid():
      serializer.save()
      return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

  @action(detail=True, renderer_classes=[JSONRenderer])
  def create_with_session(self, request, *args, **kwargs):
    pass
