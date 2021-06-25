from django.urls import path, re_path
from . import views

app_name = 'dashboard'

urlpatterns = [
    path('', views.home_view, name="home"),
    path('widgets/', views.widgets_view, name="widgets"),
    path('widgets/create', views.widget_create_view, name="widget_create"),
    path('widgets/edit/<int:widget_id>/', views.widget_edit_view, name="widget_edit"),    
    path('widgets/edit/', views.widget_edit_view, name="widget_edit"),    
    path('widgets/pause/(<int:widget_id>/', views.widget_pause, name="widget_pause"),    
    path('widgets/unpause/<int:widget_id>/', views.widget_unpause, name="widget_unpause"),    
    path('widgets/delete/<int:widget_id>/', views.widget_delete, name="widget_delete"),    
    path('widgets/template/create', views.widget_template_create_view, name="widget_template_create"),
    path('widgets/template/edit', views.widget_template_edit_view, name="widget_template_edit"),    
    path('widgets/template/edit/<int:widget_template_id>/', views.widget_template_edit_view, name="widget_template_edit"),    
    path('settings/', views.settings_view, name="settings"),
    path('communications/', views.communications_view, name="communications"),
    path('communications/list/', views.communication_list_view, name="communication_list"),
    path('communications/edit/<int:communication_id>', views.communication_edit_view, name="communication_edit"),
    path('communications/delete/<int:communication_id>', views.communication_delete, name="communication_delete"),
    path('com_sessions/edit/<int:session_id>', views.communication_session_edit_view, name="communication_session_edit"),
    path('team/', views.team_view, name="team"),
    path('user/edit/<int:user_id>/', views.client_user_edit_view, name="client_user_edit"),
    path('user/edit/', views.client_user_edit_view, name="client_user_edit"),  
    path('user/create/', views.client_user_create_view, name="client_user_create"),
    path('billing/', views.billing_view, name="billing"),
    path('users/activate/<int:user_id>/', views.user_activate, name="user_activate"),    
    path('users/deactivate/<int:user_id>/', views.user_deactivate, name="user_deactivate"),    
    path('users/delete/<int:user_id>/', views.user_delete, name="user_delete"),    
    path('widget_embed/<int:widget_id>/<str:hostname>/<slug:uuid>', views.widget_embed_view, name='widget_embed'),
    path('widget_extension_embed/<int:widget_id>/<str:hostname>/<slug:uuid>', views.widget_extension_embed_view, name='widget_extension_embed'),
    # path('widget_embed_script/<int:widget_id>/', views.widget_embed_script_file, name="widget_embed_script"),    
    path('widget_content_script/<int:widget_id>/', views.widget_content_script_file, name="widget_embed_content"),    
    re_path(r'^install/(?P<widget_id>[\d]+)/(?P<domain>[\w\d\.\-\_]+)/(?P<uuid>[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12})$', views.install, name="install"),    
]
