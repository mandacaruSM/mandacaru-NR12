# backend/bot_telegram/urls.py
from django.urls import path
from . import views

app_name = 'bot_telegram'

urlpatterns = [
    path('webhook/', views.webhook_sync, name='webhook'),
    path('health/', views.health_check, name='health'),
]
