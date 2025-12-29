from django.contrib import admin
from django.urls import path, include
from deals import views as deals_views

# Admin branding
admin.site.site_header = "Game Deals Admin"
admin.site.site_title = "Game Deals Admin"
admin.site.index_title = "Welcome to Game Deals Administration"

urlpatterns = [
    # Custom admin URLs must come before admin.site.urls
    path('admin/deal/<int:deal_id>/search-images/', deals_views.search_deal_images, name='admin_search_images'),
    path('admin/', admin.site.urls),
    path('', include('deals.urls')),
]
