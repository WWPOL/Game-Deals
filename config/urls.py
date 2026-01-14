from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from config import views as config_views

# Admin branding
admin.site.site_header = "Game Deals Admin"
admin.site.site_title = "Game Deals Admin"
admin.site.index_title = "Welcome to Game Deals Administration"

urlpatterns = [
    re_path(r'^admin/flower/(?P<path>.*)$', config_views.FlowerProxyView.as_view(), name='admin_flower'),
    path('admin/', include('common.urls')),  # Common app admin API endpoints
    path('select2/', include('django_select2.urls')),  # Select2 autocomplete
    path('admin/', admin.site.urls),
    path('accounts/', include('allauth.urls')),  # Django-allauth authentication URLs
    path('i18n/', include('django.conf.urls.i18n')),  # Language switching
    path('tz_detect/', include('tz_detect.urls')),
    path('', include('deals.urls')),
]

# Add test URLs for error pages in DEBUG mode
if settings.DEBUG:
    urlpatterns += [
        path('test-404/', config_views.handler404, {'exception': Exception('Test 404')}, name='test_404'),
        path('test-500/', config_views.handler500, name='test_500'),
    ]
    # Serve media files in development
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# Custom error handlers (only work when DEBUG=False)
handler404 = 'config.views.handler404'
handler500 = 'config.views.handler500'
