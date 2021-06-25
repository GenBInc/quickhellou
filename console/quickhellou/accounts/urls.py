from django.urls import path
from . import views

app_name = 'accounts'

urlpatterns = [
    path('', views.home_view, name="home"),
    path('signup/', views.signup_view, name="signup"),
    path('login/', views.login_view, name="login"),
    path('logout/', views.logout_view, name="logout"),
    path('activate/<int:user_id>/', views.activate_user_view, name="activate_user"),
    path('forgot-password/', views.forgot_password_view, name="forgot-password"),
    path('reset-password/<int:user_id>/', views.reset_password_view, name="reset-password"),
    path('reset-password/', views.login_view, name="reset-password"),
    path('terms-of-use/', views.terms_of_use_view, name="terms-of-use"),
    path('privacy-policy/', views.privacy_policy_view, name="privacy-policy"),
]