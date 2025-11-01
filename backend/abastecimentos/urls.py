from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AbastecimentoViewSet

router = DefaultRouter()
router.register(r'abastecimentos', AbastecimentoViewSet, basename='abastecimentos')

urlpatterns = [path('', include(router.urls))]
