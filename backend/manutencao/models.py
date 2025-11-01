from django.db import models
from django.core.validators import MinValueValidator
from django.utils import timezone

class ManutencaoTipo(models.TextChoices):
    PREVENTIVA = 'preventiva', 'Preventiva'
    CORRETIVA  = 'corretiva',  'Corretiva'

def manutencao_attachment_path(instance, filename):
    # media/manutencoes/<equip_id>/<id>/<filename>
    equip_id = instance.manutencao.equipamento_id if instance.manutencao_id else 'tmp'
    return f"manutencoes/{equip_id}/{filename}"

class Manutencao(models.Model):
    equipamento = models.ForeignKey(
        'equipamentos.Equipamento',
        on_delete=models.CASCADE,
        related_name='manutencoes'
    )
    tipo = models.CharField(max_length=20, choices=ManutencaoTipo.choices)
    data = models.DateField(default=timezone.now)
    horimetro = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])

    # ALTERE AQUI:
    tecnico = models.ForeignKey(
        'tecnicos.Tecnico',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='manutencoes'
    )

    descricao = models.TextField(blank=True, default='')
    observacoes = models.TextField(blank=True, default='')
    proxima_manutencao = models.DateField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-data', '-id']
        indexes = [
            models.Index(fields=['equipamento', 'data']),
            models.Index(fields=['equipamento', 'horimetro']),
        ]

    def __str__(self):
        return f"{self.get_tipo_display()} - {self.equipamento} ({self.data})"

class AnexoManutencao(models.Model):
    manutencao = models.ForeignKey(
        Manutencao,
        on_delete=models.CASCADE,
        related_name='anexos'
    )
    arquivo = models.FileField(upload_to=manutencao_attachment_path)
    nome_original = models.CharField(max_length=255, blank=True, default='')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.nome_original or self.arquivo.name
