# backend/cadastro/urls.py
from django.urls import path
from .views import cliente_qr_view

urlpatterns = [
    path("qr/<uuid:uuid_str>.png", cliente_qr_view, name="cliente_qr"),
]
