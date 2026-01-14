from django.urls import path
from . import views

app_name = 'deals'

urlpatterns = [
    path('', views.HomeView.as_view(), name='home'),
    path('browse/', views.BrowseView.as_view(), name='browse'),
    path('deals/<path:slug>/', views.DealDetailView.as_view(), name='detail'),
    # Custom admin URLs must come before admin.site.urls
    path('admin/deal/search-images/', views.search_deal_images, name='admin_search_images'),
    path('admin/deal/<int:deal_id>/search-images/', views.search_deal_images, name='admin_search_images_with_id'),
    path('admin/notification-channel/select-deals/', views.select_deals_to_notify, name='admin_select_deals_to_notify'),
    path('admin/notification-channel/<str:channel_ids>/select-deals/', views.select_deals_to_notify, name='admin_select_deals_to_notify_with_ids'),
]
