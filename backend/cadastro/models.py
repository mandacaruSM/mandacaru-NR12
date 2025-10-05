from django.db import models

UF_CHOICES = [
    ("AC","AC"),("AL","AL"),("AP","AP"),("AM","AM"),("BA","BA"),("CE","CE"),("DF","DF"),
    ("ES","ES"),("GO","GO"),("MA","MA"),("MT","MT"),("MS","MS"),("MG","MG"),("PA","PA"),
    ("PB","PB"),("PR","PR"),("PE","PE"),("PI","PI"),("RJ","RJ"),("RN","RN"),("RS","RS"),
    ("RO","RO"),("RR","RR"),("SC","SC"),("SP","SP"),("SE","SE"),("TO","TO"),
]

class Cliente(models.Model):
    TIPO_PESSOA = [("PJ","PJ"), ("PF","PF")]
    tipo_pessoa = models.CharField(max_length=2, choices=TIPO_PESSOA, default="PJ")
    nome_razao = models.CharField(max_length=150)
    documento = models.CharField(max_length=20, blank=True, default="")  # CNPJ/CPF (sem validação por enquanto)
    inscricao_estadual = models.CharField(max_length=20, blank=True, default="")
    email_financeiro = models.EmailField(blank=True, default="")
    telefone = models.CharField(max_length=30, blank=True, default="")

    logradouro = models.CharField(max_length=150, blank=True, default="")
    numero = models.CharField(max_length=20, blank=True, default="")
    complemento = models.CharField(max_length=100, blank=True, default="")
    bairro = models.CharField(max_length=100, blank=True, default="")
    cidade = models.CharField(max_length=100, blank=True, default="")
    uf = models.CharField(max_length=2, choices=UF_CHOICES, blank=True, default="")
    cep = models.CharField(max_length=10, blank=True, default="")

    ativo = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    documento = models.CharField(
        max_length=20, 
        blank=True, 
        default="",
        db_index=True
    )

    class Meta:
        ordering = ["nome_razao"]

    def __str__(self):
        return self.nome_razao


class Empreendimento(models.Model):
    TIPO = [("LAVRA","Lavra"), ("OBRA","Obra"), ("PLANTA","Planta"), ("OUTRO","Outro")]
    cliente = models.ForeignKey(Cliente, on_delete=models.PROTECT, related_name="empreendimentos")
    nome = models.CharField(max_length=150)
    tipo = models.CharField(max_length=10, choices=TIPO, default="LAVRA")
    distancia_km = models.DecimalField(max_digits=8, decimal_places=2, default=0)  # sem API Maps por enquanto
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    ativo = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["nome"]

    def __str__(self):
        return f"{self.nome} ({self.cliente.nome_razao})"
