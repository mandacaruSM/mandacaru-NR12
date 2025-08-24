from django.conf import settings
from django.contrib.auth.models import User
from django.db import models

class Profile(models.Model):
    ROLE_CHOICES = [
        ("ADMIN","ADMIN"),("SUPERVISOR","SUPERVISOR"),
        ("OPERADOR","OPERADOR"),("TECNICO","TECNICO"),
        ("FINANCEIRO","FINANCEIRO"),("COMPRAS","COMPRAS"),
    ]
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="ADMIN")
    modules_enabled = models.JSONField(default=list, blank=True)

    def __str__(self): return f"{self.user.username} ({self.role})"

class AuditLog(models.Model):
    source = models.CharField(max_length=10, default="WEB")  # WEB/BOT/API
    user = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    action = models.CharField(max_length=200)
    path = models.CharField(max_length=500)
    method = models.CharField(max_length=10)
    before_json = models.JSONField(null=True, blank=True)
    after_json = models.JSONField(null=True, blank=True)
    ip = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

class Operador(models.Model):
    nome_completo = models.CharField(max_length=200)
    data_nascimento = models.DateField()
    telegram_chat_id = models.CharField(max_length=50, null=True, blank=True, unique=True)
    ativo = models.BooleanField(default=True)

class Supervisor(models.Model):
    nome_completo = models.CharField(max_length=200)
    data_nascimento = models.DateField()
    telegram_chat_id = models.CharField(max_length=50, null=True, blank=True, unique=True)
    ativo = models.BooleanField(default=True)
