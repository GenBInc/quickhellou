from django.urls import path
from . import views


urlpatterns = [
    path('terms', views.Terms, name='terms'),
    path('privacy', views.Privacy, name='privacy'),
    path('nft', views.NFT, name='nft'),
    path('help', views.Help, name='help'),
    ]
