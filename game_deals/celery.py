import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'game_deals.settings')

app = Celery('game_deals')

app.config_from_object('django.conf:settings', namespace='CELERY')

app.autodiscover_tasks()
