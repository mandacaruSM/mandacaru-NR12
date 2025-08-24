from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ClienteViewSet, EmpreendimentoViewSet

router = DefaultRouter()
router.register(r"clientes", ClienteViewSet, basename="clientes")
router.register(r"empreendimentos", EmpreendimentoViewSet, basename="empreendimentos")

urlpatterns = [
    path("", include(router.urls)),
]
