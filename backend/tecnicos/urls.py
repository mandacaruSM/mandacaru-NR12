from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TecnicoViewSet

router = DefaultRouter()
router.register(r'tecnicos', TecnicoViewSet, basename='tecnicos')

urlpatterns = [path('', include(router.urls))]
