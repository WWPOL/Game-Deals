from django.urls import path
from . import views

app_name = 'deals'

urlpatterns = [
    path('', views.HomeView.as_view(), name='home'),
    path('browse/', views.BrowseView.as_view(), name='browse'),
    path('deals/<path:slug>/', views.DealDetailView.as_view(), name='detail'),
]
