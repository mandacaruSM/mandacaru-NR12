from django.urls import path
from .views import relatorio_operacional
from .metricas import (
    dashboard_metricas,
    disponibilidade_fisica,
    consumo_combustivel,
    utilizacao_frota,
    custo_por_hora,
    alertas_manutencao,
    exportar_relatorio,
)

urlpatterns = [
    path('operacional/', relatorio_operacional, name='relatorio-operacional'),

    # Métricas de gestão para mineração
    path('metricas/dashboard/', dashboard_metricas, name='metricas-dashboard'),
    path('metricas/disponibilidade/', disponibilidade_fisica, name='metricas-disponibilidade'),
    path('metricas/consumo/', consumo_combustivel, name='metricas-consumo'),
    path('metricas/utilizacao/', utilizacao_frota, name='metricas-utilizacao'),
    path('metricas/cph/', custo_por_hora, name='metricas-cph'),
    path('metricas/alertas-manutencao/', alertas_manutencao, name='metricas-alertas'),
    path('metricas/exportar/', exportar_relatorio, name='metricas-exportar'),
]
