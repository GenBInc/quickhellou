from django.urls import path, re_path
from dashboard import views

urlpatterns = [
    path('', views.home_view, name="home"),
    path('widgets/', views.widgets_view, name="widgets"),
    path('widgets/create', views.widget_create_view, name="widget_create"),
    path('widgets/edit/<int:widget_id>/',
         views.widget_edit_view, name="widget_edit"),
    path('widgets/edit/', views.widget_edit_view, name="widget_edit"),
    path('widgets/pause/(<int:widget_id>/',
         views.widget_pause, name="widget_pause"),
    path('widgets/unpause/<int:widget_id>/',
         views.widget_unpause, name="widget_unpause"),
    path('widgets/delete/<int:widget_id>/',
         views.widget_delete, name="widget_delete"),
    path('widgets/template/create', views.widget_template_create_view,
         name="widget_template_create"),
    path('calendar_edit', views.save_calendar,
         name="calendar_edit"),
    path('calendar/time_row/<slug:day>/<int:index>', views.calendar_time_row,
         name="calendar_time_row"),
    path('widgets/template/edit', views.widget_template_edit_view,
         name="widget_template_edit"),
    path('widgets/template/edit/<int:widget_template_id>/',
         views.widget_template_edit_view, name="widget_template_edit"),
    path('widgets/template/del_icon/<int:widget_template_id>/',
         views.widget_template_del_icon_view, name="widget_template_del_icon"),
    path('widgets/template/delete/<int:widget_template_id>/',
         views.widget_template_delete, name="widget_template_delete"),
    path('templates/', views.templates_view, name="templates"),
    path('appointments/', views.appointments_view, name="appointments"),
    path('appointments/list/', views.appointments_list_view,
         name="appointments_list"),
    path('appointment/edit/<int:appointment_id>',
         views.appointment_edit_view, name="appointment_edit"),
    path('appointment/delete/<int:appointment_id>',
         views.appointment_delete, name="appointment_delete"),
    path('com_sessions/edit/<int:session_id>',
         views.communication_session_edit_view, name="communication_session_edit"),
    path('team/', views.team_view, name="team"),
    path('appointment/status/<int:appointment_id>/accept',
         views.accept_appointment, name='accept_appointment'),
    path('appointment/status/<int:appointment_id>/reject',
         views.reject_appointment, name='reject_appointment'),
    path('appointment/cancel/<int:appointment_id>',
         views.cancel_appointment, name='cancel_appointment'),
    path('appointment/message/<int:appointment_id>',
         views.appointment_message_view, name='appointment_message_view'),
    path('appointment/send_message/<int:appointment_id>',
         views.send_appointment_message, name='send_appointment_message'),
    path('user/edit/<int:user_id>/',
         views.client_user_edit_view, name="client_user_edit"),
    path('user/edit/', views.client_user_edit_view, name="client_user_edit"),
    path('user/create/', views.client_user_create_view, name="client_user_create"),
    path('calendar/', views.calendar_view, name="calendar"),
    path('users/activate/<int:user_id>/',
         views.user_activate, name="user_activate"),
    path('users/deactivate/<int:user_id>/',
         views.user_deactivate, name="user_deactivate"),
    path('users/delete/<int:user_id>/', views.user_delete, name="user_delete"),
    path('widget_embed/<int:widget_id>/<str:hostname>/<slug:uuid>',
         views.widget_embed_view, name='widget_embed'),
    path('widget_content/<int:widget_id>',
         views.widget_content_view, name='widget_content'),
    path('widget_schedule/<int:widget_id>/<str:hostname>/<slug:uuid>',
         views.widget_schedule_view, name='widget_schedule'),
    path('widget_calendar_view/<int:widget_id>',
         views.widget_calendar_view, name='widget_calendar_view'),
    path('edit_widget_contact_form_view/<int:widget_id>',
         views.edit_widget_contact_form_view, name='edit_widget_contact_form_view'),
    path('add_widget_contact_form_view/<int:widget_id>',
         views.add_widget_contact_form_view, name='add_widget_contact_form_view'),
    path('widget_active_operator/<int:widget_id>/<str:hostname>/<slug:uuid>',
         views.widget_active_operator, name='widget_active_operator'),
    path('test_widget2', views.test_widget, name="test_widget"),
    path('active_operator_init_form', views.active_operator_init_form,
         name="active_operator_init_form"),
    path('inactive_operator_init_form', views.inactive_operator_init_form,
         name="inactive_operator_init_form"),
    # path('widget_embed_script/<int:widget_id>/', views.widget_embed_script_file, name="widget_embed_script"),
    path('widget_content_script/<int:widget_id>/',
         views.widget_content_script_file, name="widget_embed_content"),
    re_path(
        r'^install/(?P<widget_id>[\d]+)/(?P<domain>[\w\d\.\-\_]+)/(?P<uuid>[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12})$', views.install, name="install"),
]
