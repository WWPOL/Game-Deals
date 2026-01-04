from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from deals import views as deals_views
from config import views as config_views

# Admin branding
admin.site.site_header = "Game Deals Admin"
admin.site.site_title = "Game Deals Admin"
admin.site.index_title = "Welcome to Game Deals Administration"

urlpatterns = [
    # Custom admin URLs must come before admin.site.urls
    path('admin/deal/search-images/', deals_views.search_deal_images, name='admin_search_images'),
    path('admin/deal/<int:deal_id>/search-images/', deals_views.search_deal_images, name='admin_search_images_with_id'),
    path('admin/notification-channel/select-deals/', deals_views.select_deals_to_notify, name='admin_select_deals_to_notify'),
    path('admin/notification-channel/<str:channel_ids>/select-deals/', deals_views.select_deals_to_notify, name='admin_select_deals_to_notify_with_ids'),
    path('admin/', include('common.urls')),  # Common app admin API endpoints
    path('select2/', include('django_select2.urls')),  # Select2 autocomplete
    path('admin/', admin.site.urls),
    path('i18n/', include('django.conf.urls.i18n')),  # Language switching
    path('tz_detect/', include('tz_detect.urls')),
    path('', include('deals.urls')),
]

# Add test URLs for error pages in DEBUG mode
if settings.DEBUG:
    urlpatterns += [
        path('test-404/', config_views.handler404, {'exception': Exception('Test 404')}, name='test_404'),
    ]
    # Serve media files in development
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# Custom error handlers (only work when DEBUG=False)
handler404 = 'config.views.handler404'
handler500 = 'config.views.handler500'
