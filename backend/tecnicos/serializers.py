from rest_framework import serializers
from .models import Tecnico

class TecnicoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tecnico
        fields = ["id", "nome", "email", "telefone", "ativo", "created_at"]
        read_only_fields = ["id", "created_at"]
