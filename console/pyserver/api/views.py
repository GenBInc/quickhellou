from django.conf import settings
from django.http import (
    HttpRequest,
    JsonResponse,
)
from accounts.models import User
from dashboard.models import (Widget, Communication, CommunicationSession,)
from rest_framework import (viewsets, status)
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.renderers import JSONRenderer
from rest_framework.decorators import (action, permission_classes)
from rest_framework.views import APIView
from .serializers import (UserSerializer, WidgetSerializer,
                          CommunicationSerializer, CommunicationSessionSerializer,)


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


class ApplicationSettingsView(APIView):
    """
    API endpoint that allows application settings to be viewed or edited.
    """

    def get(
        self,
        request: HttpRequest
    ):
        return Response({
            'video_app_url': settings.VIDEOCHAT_APP_URL,
            'console_app_url': settings.CONSOLE_APP_URL,
            'ws_service_url': settings.WEB_SERVICE_URL,
            'admin_email_address': settings.ADMIN_EMAIL,
        })


class WidgetViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows widgets to be viewed or edited.
    """
    queryset = Widget.objects.all()
    serializer_class = WidgetSerializer


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
        return Response({'uuid': uuid.uuid5(uuid.NAMESPACE_DNS, kwargs['str'])})

    @action(detail=True, renderer_classes=[JSONRenderer])
    def set_status(self, request: HttpRequest, *args, **kwargs) -> JsonResponse:
        communication_session: CommunicationSession = self.get_object()
        status: int = int(kwargs['status'])
        communication_session.status = status

        # If status change is caused by an user interaction
        if (status > CommunicationSession.STATUS_CANCELLED):
            communication_session.attendant = self.request.user
        communication_session.save()

        # Complete communication if session is accepted
        if (status in [6]):
            communication: Communication = communication_session.communication
            if communication is not None:
                communication.status = Communication.STATUS_COMPLETED
                communication.save()

        # Close communication if session is rejected or cancelled
        if (status in [CommunicationSession.STATUS_CANCELLED, CommunicationSession.STATUS_REJECTED]):
            communication: Communication = communication_session.communication
            if communication is not None:
                communication.status = Communication.CLOSED
                communication.save()
        return JsonResponse({'result': 'ok'})

    @action(detail=True, renderer_classes=[JSONRenderer])
    def set_rate(self, request, *args, **kwargs):
        communication_session = self.get_object()
        rate = int(kwargs['rate'])
        communication_session.rate = rate
        communication_session.save()
        return Response({'result': 'ok'})

    @action(detail=True, renderer_classes=[JSONRenderer])
    def pending_sessions(self, request, *args, **kwargs):
        sessions = CommunicationSession.objects.filter(status=1)
        objs = []
        for session in sessions:
            caller_name = None
            if session.communication is not None:
                caller_name = session.communication.caller_name
            objs.append({
                'id': session.id,
                'uuid': session.uuid,
                'client': caller_name
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
