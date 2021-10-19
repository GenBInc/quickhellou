from django.conf.urls import url
from django.conf.urls import include
from django.urls import path, re_path
from rest_framework import routers
from . import views

router = routers.DefaultRouter()

urlpatterns = [
  path('', include(router.urls)),
  path('video-settings/<slug:room_id>', views.VideoSettingsViewSet.as_view(), name='video-settings'),
  path('video-settings/<slug:room_id>/<slug:client_id>', views.VideoSettingsViewSet.as_view(), name='video-settings'),
]