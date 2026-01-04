from django.urls import path
from .views import relatorio_operacional

urlpatterns = [
    path('operacional/', relatorio_operacional, name='relatorio-operacional'),
]
