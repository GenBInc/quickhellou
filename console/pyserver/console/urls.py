from django.urls import path
from django.views.i18n import JavaScriptCatalog
from django.conf.urls import include
from django.conf.urls.static import static
from django.contrib import admin
from django.contrib.staticfiles.urls import staticfiles_urlpatterns
from django.conf import settings

admin.autodiscover()

urlpatterns = [
    path('jsi18n/', JavaScriptCatalog.as_view(), name='javascript-catalog'),
    path('admin/', admin.site.urls),
	path('dashboard/', include(('dashboard.urls', 'dashboard'), namespace='dashboard')),
    path('', include(('accounts.urls', 'accounts'), namespace='accounts')), 
    path('api/', include('api.urls'))
]

urlpatterns += staticfiles_urlpatterns()
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
