from rest_framework import serializers
from django.contrib.auth.models import User

class ProfileSerializer(serializers.Serializer):
    role = serializers.CharField()
    modules_enabled = serializers.ListField(child=serializers.CharField())

class MeSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    username = serializers.CharField()
    email = serializers.EmailField(allow_blank=True)
    profile = ProfileSerializer()

class OnboardingSerializer(serializers.Serializer):
    nome_completo = serializers.CharField()
    data_nascimento = serializers.CharField()  # DD/MM/AAAA
    chat_id = serializers.CharField()
