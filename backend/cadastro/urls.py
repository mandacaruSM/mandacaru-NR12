from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ClienteViewSet, EmpreendimentoViewSet
from django.urls import path
from .views import cliente_qr_view

router = DefaultRouter()
router.register(r"clientes", ClienteViewSet, basename="clientes")
router.register(r"empreendimentos", EmpreendimentoViewSet, basename="empreendimentos")

urlpatterns = [
    path("", include(router.urls)),
    path('qr/<uuid:uuid_str>.png', cliente_qr_view, name='cliente_qr'),
]
