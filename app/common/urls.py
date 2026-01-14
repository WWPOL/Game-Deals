"""
URL configuration for common app.
"""
from django.urls import path

from tasks.views import TaskStatusAPIView

app_name = 'common'

urlpatterns = [
    path('api/tasks/status/', TaskStatusAPIView.as_view(), name='task_status_api'),
]
