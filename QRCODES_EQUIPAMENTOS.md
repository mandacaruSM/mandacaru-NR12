# 📱 QR Codes dos Equipamentos - Localização e Funcionamento

## 📂 Onde São Salvos

### Diretório de Armazenamento

Os QR codes dos equipamentos são salvos no sistema de arquivos do servidor Django:

**Caminho completo:**
```
backend/media/qrcodes/equipamentos/
```

**Configuração no Django:**
- **MEDIA_ROOT:** `backend/media/` ([settings.py:152](backend/config/settings.py:152))
- **MEDIA_URL:** `/media/` ([settings.py:151](backend/config/settings.py:151))
- **Upload para:** `qrcodes/equipamentos/` ([models.py:41](backend/equipamentos/models.py:41))

**Estrutura de diretórios:**
```
backend/
├── media/
│   └── qrcodes/
│       └── equipamentos/
│           ├── equipamento_1_a3f7b8c9-4d2e-4f3a-9b1c-2d4e5f6a7b8c.png
│           ├── equipamento_2_d4e8c9b2-5e3f-4a9d-8c1b-3e5f6a7b8c9d.png
│           └── equipamento_3_e5f9d3c4-6f4a-5b0e-9d2c-4f6a7b8c9d0e.png
```

---

## 🔧 Como Funciona

### 1. Geração Automática

Os QR codes são gerados **automaticamente** quando um equipamento é criado ou salvo sem QR code.

**Arquivo:** [backend/equipamentos/models.py](backend/equipamentos/models.py:61-66)

```python
class Equipamento(models.Model):
    # ...
    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    qr_code = models.ImageField(upload_to='qrcodes/equipamentos/', blank=True, null=True)

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        # Gera QR code automaticamente após salvar
        if not self.qr_code:
            self.gerar_qr_code()
```

**Quando é gerado:**
- ✅ Ao criar novo equipamento (POST)
- ✅ Ao salvar equipamento sem QR code (PUT)
- ❌ Não regenera se já existe QR code (evita sobrescrever)

### 2. Conteúdo do QR Code

**Payload (dados codificados):**
```python
@property
def qr_payload(self) -> str:
    return f"eq:{self.uuid}"
```

**Exemplo:**
```
eq:a3f7b8c9-4d2e-4f3a-9b1c-2d4e5f6a7b8c
```

**Formato:**
- Prefixo: `eq:` (identifica como equipamento)
- UUID: Identificador único universal do equipamento
- Permanente: UUID nunca muda, QR code sempre válido

### 3. Geração da Imagem

**Arquivo:** [backend/equipamentos/models.py](backend/equipamentos/models.py:47-59)

```python
def gerar_qr_code(self):
    """Gera e salva o QR code do equipamento"""
    from core.qr_utils import save_qr_code_to_file
    filename = f"equipamento_{self.id}_{self.uuid}.png"
    # Usar código + descrição como texto inferior
    bottom_text = f"{self.codigo} - {self.descricao or self.modelo}"
    qr_file = save_qr_code_to_file(
        data=self.qr_payload,
        top_text="MANDACARU S M",
        bottom_text=bottom_text
    )
    self.qr_code.save(filename, qr_file, save=True)
```

**Estrutura da imagem:**
```
┌─────────────────────────────┐
│                             │
│      MANDACARU S M          │  ← Texto superior (empresa)
│                             │
│    ███████████████████      │
│    ██ ▄▄▄▄▄ █▀█ ▄▄▄▄▄ ██   │
│    ██ █   █ ███ █   █ ██   │
│    ██ █▄▄▄█ ██▀ █▄▄▄█ ██   │  ← QR Code
│    ██▄▄▄▄▄▄▄█▀▄▄▄▄▄▄▄▄██   │
│    ████ █▄▀▄ ▀█▄ ▀█  ▄██   │
│    ██████████████████████   │
│                             │
│  EQ-001 - Trator John Deere │  ← Texto inferior (código + descrição)
│                             │
└─────────────────────────────┘
```

**Nome do arquivo:**
```
equipamento_{id}_{uuid}.png
```

**Exemplo:**
```
equipamento_123_a3f7b8c9-4d2e-4f3a-9b1c-2d4e5f6a7b8c.png
```

---

## 🌐 URLs de Acesso

### Desenvolvimento (Local)

```
http://localhost:8000/media/qrcodes/equipamentos/equipamento_123_abc.png
```

### Produção (Render)

```
https://nr12-backend.onrender.com/media/qrcodes/equipamentos/equipamento_123_abc.png
```

**Nota:** As URLs são servidas através do Django (em desenvolvimento) ou através de CDN/storage (em produção).

---

## 📋 Verificação de QR Codes

### Listar QR Codes Existentes

**Local:**
```bash
cd backend
ls -lah media/qrcodes/equipamentos/
```

**Render (via Django Admin):**
```
1. Acesse: https://nr12-backend.onrender.com/admin/
2. Login: admin / admin123
3. Equipamentos → Equipamentos
4. Clique em um equipamento
5. Campo "QR Code": mostra a imagem ou link
```

### Ver QR Code de um Equipamento

**Via API:**
```bash
curl https://nr12-backend.onrender.com/api/v1/equipamentos/equipamentos/1/
```

**Resposta (JSON):**
```json
{
  "id": 1,
  "uuid": "a3f7b8c9-4d2e-4f3a-9b1c-2d4e5f6a7b8c",
  "qr_code": "/media/qrcodes/equipamentos/equipamento_1_a3f7b8c9.png",
  "qr_payload": "eq:a3f7b8c9-4d2e-4f3a-9b1c-2d4e5f6a7b8c",
  // ... outros campos
}
```

**URL completa:**
```
https://nr12-backend.onrender.com/media/qrcodes/equipamentos/equipamento_1_a3f7b8c9.png
```

---

## 🔄 Regenerar QR Codes

### Para um único equipamento

**Django Shell:**
```bash
python manage.py shell
```

```python
from equipamentos.models import Equipamento

# Pegar equipamento
eq = Equipamento.objects.get(id=1)

# Remover QR code atual (opcional)
if eq.qr_code:
    eq.qr_code.delete()

# Regenerar
eq.qr_code = None
eq.save()  # Automaticamente gera novo QR code

print(f"QR code regenerado: {eq.qr_code.url}")
```

### Para todos os equipamentos

**Criar management command:**
```bash
python manage.py regenerar_qrcodes
```

**Implementação (criar arquivo):**
```python
# backend/equipamentos/management/commands/regenerar_qrcodes.py
from django.core.management.base import BaseCommand
from equipamentos.models import Equipamento

class Command(BaseCommand):
    help = 'Regenera QR codes de todos os equipamentos'

    def handle(self, *args, **options):
        equipamentos = Equipamento.objects.all()
        total = equipamentos.count()

        for i, eq in enumerate(equipamentos, 1):
            # Remove QR code antigo
            if eq.qr_code:
                eq.qr_code.delete()

            # Gera novo
            eq.qr_code = None
            eq.save()

            self.stdout.write(f"[{i}/{total}] {eq.codigo}: {eq.qr_code.url}")

        self.stdout.write(self.style.SUCCESS(f'✅ {total} QR codes regenerados!'))
```

---

## 📱 Uso do QR Code

### Escaneamento

**Aplicativos compatíveis:**
- Câmera nativa (iOS/Android)
- Google Lens
- Qualquer leitor de QR code

**Resultado:**
```
eq:a3f7b8c9-4d2e-4f3a-9b1c-2d4e5f6a7b8c
```

### Processamento

**Bot do Telegram:**
Quando o usuário escaneia e envia para o bot, o sistema:

1. Extrai UUID do payload (`eq:UUID`)
2. Busca equipamento no banco: `Equipamento.objects.get(uuid=UUID)`
3. Retorna informações do equipamento
4. Permite registrar manutenção, checklist NR12, etc.

**Arquivo:** [backend/bot_telegram/handlers.py](backend/bot_telegram/handlers.py)

```python
# Exemplo de processamento (pseudocódigo)
def handle_qr_scan(update, context):
    payload = update.message.text  # "eq:a3f7b8c9-..."

    if payload.startswith("eq:"):
        uuid = payload[3:]  # Remove prefixo "eq:"

        try:
            equipamento = Equipamento.objects.get(uuid=uuid)
            context.bot.send_message(
                chat_id=update.effective_chat.id,
                text=f"✅ Equipamento: {equipamento.codigo}\n"
                     f"📋 Descrição: {equipamento.descricao}\n"
                     f"🏢 Empreendimento: {equipamento.empreendimento.nome}"
            )
        except Equipamento.DoesNotExist:
            context.bot.send_message(
                chat_id=update.effective_chat.id,
                text="❌ Equipamento não encontrado"
            )
```

---

## 🔒 Segurança

### UUID vs ID

**Por que usar UUID e não ID numérico?**

❌ **ID numérico:**
```
eq:1    → Alguém pode adivinhar eq:2, eq:3, etc.
eq:123  → Sequencial, previsível
```

✅ **UUID:**
```
eq:a3f7b8c9-4d2e-4f3a-9b1c-2d4e5f6a7b8c  → Impossível adivinhar
```

**Vantagens:**
- 🔒 Não sequencial (impossível enumerar todos os equipamentos)
- 🔒 128 bits de entropia (praticamente impossível colidir)
- 🔒 Permanente (nunca muda, mesmo se equipamento for atualizado)

---

## 📊 Estatísticas

### Tamanho dos Arquivos

**QR code típico:**
- Dimensões: ~400x500 pixels (com texto)
- Formato: PNG
- Tamanho: ~10-30 KB por arquivo

**Estimativa para 1000 equipamentos:**
```
1000 equipamentos × 20 KB = ~20 MB
```

**Render Free Tier:**
- Limite de storage: 512 MB
- QR codes ocupam ~4% do espaço disponível (para 1000 equipamentos)

---

## 🚀 Deploy no Render

### Armazenamento Persistente

**⚠️ IMPORTANTE:** No Render free tier, a pasta `/media/` é **efêmera**.

Isso significa que:
- ❌ QR codes gerados são perdidos após redeploy
- ❌ Arquivos não persistem entre deployments

**Soluções:**

### Opção 1: Regenerar após deploy (Atual)
```bash
# Após cada deploy, executar:
python manage.py shell -c "
from equipamentos.models import Equipamento
for eq in Equipamento.objects.filter(qr_code=''):
    eq.gerar_qr_code()
"
```

### Opção 2: Usar S3/Cloudinary (Recomendado para produção)

**Instalar:**
```bash
pip install django-storages boto3
```

**Configurar settings.py:**
```python
# AWS S3 Storage
AWS_ACCESS_KEY_ID = os.environ.get('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY')
AWS_STORAGE_BUCKET_NAME = os.environ.get('AWS_STORAGE_BUCKET_NAME')
AWS_S3_REGION_NAME = 'us-east-1'

DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
```

**Vantagens:**
- ✅ QR codes persistem permanentemente
- ✅ CDN integrado (imagens carregam mais rápido)
- ✅ Backup automático
- ✅ Não ocupa espaço no servidor

---

## 📝 Checklist

### Verificar QR Codes Funcionando

- [ ] Criar novo equipamento
- [ ] Verificar se QR code foi gerado automaticamente
- [ ] Acessar URL do QR code no navegador
- [ ] Imagem deve carregar corretamente
- [ ] Texto superior: "MANDACARU S M"
- [ ] Texto inferior: código + descrição do equipamento
- [ ] Escanear com smartphone
- [ ] Payload deve ser: `eq:{uuid}`

---

## 🆘 Troubleshooting

### QR Code não está sendo gerado

**Verificar logs:**
```bash
tail -f backend/logs/django.log
```

**Possíveis causas:**
1. Biblioteca `qrcode` não instalada
2. Biblioteca `Pillow` não instalada
3. Permissões de escrita na pasta `/media/`
4. Fonte não encontrada (usa fonte padrão como fallback)

**Solução:**
```bash
pip install qrcode[pil] Pillow
python manage.py collectstatic --no-input
```

### QR Code retorna 404

**Verificar:**
1. MEDIA_URL configurado corretamente
2. MEDIA_ROOT aponta para diretório correto
3. urls.py inclui servir arquivos de media (em dev)

**urls.py (desenvolvimento):**
```python
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
```

---

**Última atualização:** 2025-12-21
**Status:** ✅ Sistema de QR codes funcionando
