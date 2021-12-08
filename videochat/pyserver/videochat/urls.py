from django.urls import path, include

from rest_framework import routers, serializers, viewsets
from rest_framework.decorators import api_view

from .views import main
from . import views

router = routers.DefaultRouter()
router.register(r'initiate', views.PostInitiateView, basename='initiate')
router.register(r'other-clients', views.PostClientList, basename='other-clients')

urlpatterns = [
    path('', views.MainPage.as_view(), name='main'),
    path('problem', views.ProblemPage.as_view(), name='problem'),
    path('contact', views.ContactPage.as_view(), name='contact'),
    path('terms-of-use', views.TermsOfUsePage.as_view(), name='terms-of-use'),
    path('policy', views.PolicyPage.as_view(), name='policy'),
    path('scheduler', views.SchedulerPage.as_view(), name='scheduler'),
    path('full', views.FullRoomPage.as_view(), name='full'),
    path('widget_test', views.WidgetTest.as_view(), name='widget_test'),
    path('join/<slug:room_id>', views.JoinPage.as_view(), name='join'),
    path('leave/<slug:room_id>/<slug:client_id>', views.LeavePage.as_view(), name='leave'),
    path('bye/<slug:room_id>/<slug:client_id>', views.ByePage.as_view(), name='leave'),
    path('sessions-getter/<slug:room_id>', views.SessionsGetterPage.as_view(), name='sessions-getter'),
    path('consume/<slug:room_id>/<slug:session_id>/<slug:client_id>', views.ConsumePage.as_view(), name='consume'),
    path('removeRoom/<slug:room_id>', views.RemoveRoomPage.as_view(), name='removeRoom'),
    path('message/<slug:room_id>/<slug:client_id>', views.MessagePage.as_view(), name='message'),
    path('sessionmessage/<slug:room_id>/<slug:session_id>/<slug:client_id>', views.SessionMessagePage.as_view(), name='sessionmessage'),
    path('params', views.ParamsPage.as_view(), name='params'),
    path('sendinvitation', views.SendInvitation.as_view(), name='sendinvitation'),
    path('scheduler/<slug:room_id>', views.SchedulerPageWithRoomSelect.as_view(), name='scheduler'),
    path('r/<slug:room_id>', views.RoomPage.as_view(), name='r'),
    path('r/<slug:room_id>/<slug:additional_param>', views.RoomPageWithAdditionalParam.as_view(), name='r'),
    path('s', include(router.urls)),
]