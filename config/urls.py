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
    path('admin/', admin.site.urls),
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
