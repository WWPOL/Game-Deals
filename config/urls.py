from django.contrib import admin
from django.urls import path, include

# Admin branding
admin.site.site_header = "Game Deals Admin"
admin.site.site_title = "Game Deals Admin"
admin.site.index_title = "Welcome to Game Deals Administration"

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('deals.urls')),
]
