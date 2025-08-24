# backend/core/urls.py
from django.urls import path
from .views import HealthView, MeView  # mantenha só as que existem

urlpatterns = [
    path("health/", HealthView.as_view(), name="health"),
    path("users/me/", MeView.as_view(), name="me"),
]
