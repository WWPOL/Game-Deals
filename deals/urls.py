from django.urls import path
from . import views

app_name = 'deals'

urlpatterns = [
    path('', views.HomeView.as_view(), name='home'),
    path('deals/<slug:slug>/', views.DealDetailView.as_view(), name='detail'),
    path('admin/deal/<int:deal_id>/search-images/', views.search_deal_images, name='search_images'),
]
