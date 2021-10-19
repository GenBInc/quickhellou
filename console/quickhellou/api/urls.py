from django.conf.urls import url
from django.conf.urls import include
from django.urls import path, re_path
from rest_framework import routers
from . import views
from rest_framework.renderers import JSONRenderer

router = routers.DefaultRouter()
router.register(r'users', views.UserViewSet)
router.register(r'widgets', views.WidgetViewSet)
router.register(r'communications', views.CommunicationViewSet)
router.register(r'comSessions', views.CommunicationSessionViewSet)
router.register(r'settings', views.ApplicationSettingsViewSet)

com_create_with_session = views.CommunicationViewSet.as_view({
    'post': 'create_with_session',
}, renderer_classes=[JSONRenderer])

room_uuid = views.CommunicationSessionViewSet.as_view({
    'get': 'room_uuid',
}, renderer_classes=[JSONRenderer])

com_session = views.CommunicationSessionViewSet.as_view({
    'get': 'set_status',
}, renderer_classes=[JSONRenderer])

rate_com_session = views.CommunicationSessionViewSet.as_view({
    'get': 'set_rate',
}, renderer_classes=[JSONRenderer])

pending_sessions = views.CommunicationSessionViewSet.as_view({
    'get': 'pending_sessions',
}, renderer_classes=[JSONRenderer])

urlpatterns = [
  path('', include(router.urls)),
  path('communications/create-with-session/', com_create_with_session, name='com-create-with-session'),
  path('comSessions/room-uuid/<slug:str>', room_uuid, name='com-sessions-room-uuid'),
  path('comSessions/status/<int:pk>/<int:status>', com_session, name='com-session'),
  path('comSessions/rate/<int:pk>/<int:rate>', rate_com_session, name='rate-com-session'),
  path('comSessions/pending/<slug:uuid>', pending_sessions, name='pending-sessions'),
]