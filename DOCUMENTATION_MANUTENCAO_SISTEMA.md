# 📚 DOCUMENTAÇÃO DO SISTEMA DE MANUTENÇÃO PREVENTIVA - MANDACARU NR12

## 🎯 Visão Geral

Este documento descreve o sistema completo de gestão de manutenção preventiva, corretiva e preditiva para equipamentos pesados com conformidade NR12.

---

## 📋 ESTRUTURA DO BANCO DE DADOS

### Modelos Principais

#### 1. **Equipamento** (equipamentos/models.py)
```python
class Equipamento(models.Model):
    # Identificação
    codigo = CharField(max_length=50, unique=True)
    cliente = ForeignKey(Cliente)
    empreendimento = ForeignKey(Empreendimento)
    tipo = ForeignKey(TipoEquipamento)

    # Controle de Uso
    tipo_medicao = CharField(choices=[("KM", "Quilômetro"), ("HORA", "Horímetro")])
    leitura_atual = DecimalField(max_digits=12, decimal_places=2)
    data_ultima_leitura = DateTimeField()

    # Status
    status_operacional = CharField(choices=[
        'OPERACIONAL', 'EM_MANUTENCAO', 'PARADO', 'DESATIVADO'
    ])

    # Rastreamento de Manutenção
    data_ultima_manutencao = DateField()
    leitura_ultima_manutencao = DecimalField()
    proxima_manutencao_leitura = DecimalField()
    proxima_manutencao_data = DateField()
```

#### 2. **GatilhoManutencao** (manutencao/models_alertas.py)
Define QUANDO a manutenção deve ocorrer:

```python
class GatilhoManutencao(models.Model):
    equipamento = ForeignKey(Equipamento)
    nome = CharField(max_length=150)  # Ex: "Revisão 250h", "Troca de óleo 500h"

    tipo_gatilho = CharField(choices=[
        ('HORIMETRO', 'Por Horímetro/KM'),
        ('CALENDARIO', 'Por Calendário'),
        ('AMBOS', 'Horímetro E Calendário')
    ])

    # Gatilho por horímetro
    intervalo_leitura = DecimalField()  # Ex: 250.00 (a cada 250h)
    antecedencia_leitura = DecimalField(default=0.10)  # 10% de antecedência

    # Gatilho por calendário
    intervalo_dias = PositiveIntegerField()  # Ex: 30 (mensal)
    antecedencia_dias = PositiveIntegerField(default=7)  # 7 dias antes

    # Itens necessários (relacionamento M2M com Produto)
    itens_necessarios = ManyToManyField(Produto, through='ItemGatilhoManutencao')

    # Controle
    proxima_execucao_leitura = DecimalField()
    proxima_execucao_data = DateField()
```

#### 3. **ManutencaoAlerta** (manutencao/models_alertas.py)
Alertas gerados automaticamente:

```python
class ManutencaoAlerta(models.Model):
    equipamento = ForeignKey(Equipamento)

    tipo = CharField(choices=[
        'PREVENTIVA_VENCIDA',
        'PREVENTIVA_PROXIMA',
        'CHECKLIST_VENCIDO',
        'CHECKLIST_PROXIMO',
        'COMPONENTE_VIDA_UTIL',
        'OPERADOR_RECICLAGEM'
    ])

    prioridade = CharField(choices=['BAIXA', 'MEDIA', 'ALTA', 'CRITICA'])

    titulo = CharField(max_length=200)
    mensagem = TextField()

    # Controle
    lido = BooleanField(default=False)
    resolvido = BooleanField(default=False)
    manutencao_realizada = ForeignKey(Manutencao)
```

#### 4. **ItemGatilhoManutencao** (manutencao/models_alertas.py)
Define QUAIS peças são necessárias:

```python
class ItemGatilhoManutencao(models.Model):
    gatilho = ForeignKey(GatilhoManutencao)
    produto = ForeignKey(Produto)  # Filtro, óleo, etc
    quantidade = DecimalField()     # Ex: 15.000 (15 litros de óleo)
    observacao = CharField()
```

---

## 🚀 COMO USAR O SISTEMA

### Passo 1: Configurar Gatilhos de Manutenção

**Exemplo: Escavadeira Hyundai Robex 250LC-7**

```python
from equipamentos.models import Equipamento
from manutencao.models_alertas import GatilhoManutencao, ItemGatilhoManutencao
from almoxarifado.models import Produto

# Buscar equipamento
escavadeira = Equipamento.objects.get(codigo="CAT-962H-001")

# Criar gatilho: Revisão a cada 250 horas
gatilho_250h = GatilhoManutencao.objects.create(
    equipamento=escavadeira,
    nome="Revisão 250h - Troca de óleo e filtros",
    descricao="Manutenção preventiva padrão a cada 250 horas de operação",
    tipo_gatilho='HORIMETRO',
    intervalo_leitura=250.00,
    antecedencia_leitura=0.10,  # Alerta com 10% de antecedência (25h antes)
    ativo=True
)

# Adicionar itens necessários
oleo_motor = Produto.objects.get(codigo="OLEO-15W40")
filtro_oleo = Produto.objects.get(codigo="FILTRO-OLEO-CAT")
filtro_ar = Produto.objects.get(codigo="FILTRO-AR-CAT")

ItemGatilhoManutencao.objects.create(
    gatilho=gatilho_250h,
    produto=oleo_motor,
    quantidade=15.000,  # 15 litros
    observacao="Óleo mineral 15W40 API CF"
)

ItemGatilhoManutencao.objects.create(
    gatilho=gatilho_250h,
    produto=filtro_oleo,
    quantidade=1.000,
    observacao="Filtro original Caterpillar"
)

ItemGatilhoManutencao.objects.create(
    gatilho=gatilho_250h,
    produto=filtro_ar,
    quantidade=2.000,
    observacao="Filtro primário + secundário"
)

# Calcular próxima execução
gatilho_250h.calcular_proxima_execucao()
```

### Passo 2: Criar Gatilho por Calendário

```python
# Inspeção mensal obrigatória
gatilho_mensal = GatilhoManutencao.objects.create(
    equipamento=escavadeira,
    nome="Inspeção Mensal de Segurança",
    descricao="Inspeção visual e teste de sistemas de segurança NR12",
    tipo_gatilho='CALENDARIO',
    intervalo_dias=30,
    antecedencia_dias=5,  # Alerta 5 dias antes
    ativo=True
)
```

### Passo 3: Criar Gatilho Combinado (Horímetro E Calendário)

```python
# Revisão 500h OU 3 meses (o que ocorrer primeiro)
gatilho_500h_trimestral = GatilhoManutencao.objects.create(
    equipamento=escavadeira,
    nome="Revisão 500h ou Trimestral",
    descricao="Manutenção preventiva major - 500h ou 90 dias",
    tipo_gatilho='AMBOS',
    intervalo_leitura=500.00,
    antecedencia_leitura=0.10,
    intervalo_dias=90,
    antecedencia_dias=7,
    ativo=True
)
```

### Passo 4: Executar Verificação Manual

```bash
# Via Django management command
python manage.py verificar_manutencoes

# Verificar apenas um equipamento específico
python manage.py verificar_manutencoes --equipamento CAT-962H-001

# Forçar verificação
python manage.py verificar_manutencoes --force
```

**Saída esperada:**
```
======================================================================
Iniciando verificação de manutenções - 2026-02-23 15:30:00
======================================================================

📋 Verificando 1 equipamento(s)...

🔧 CAT-962H-001 - Escavadeira Caterpillar 962H
   Leitura atual: 1225.50 HORA
   🚨 NOVO ALERTA: Revisão 250h [ALTA]
      VENCIDA: Leitura atual 1225.50 Horímetro já passou da meta 1250.00
      📦 Itens necessários:
         - Óleo Motor 15W40: 15.000 L
         - Filtro de Óleo CAT: 1.000 UN
         - Filtro de Ar CAT: 2.000 UN
   ✅ Revisão 500h ou Trimestral - OK

======================================================================
RESUMO DA VERIFICAÇÃO
======================================================================
Equipamentos verificados: 1
Gatilhos processados: 2
Alertas NOVOS criados: 1
Alertas ATUALIZADOS: 0

⚠️  Alertas pendentes no sistema: 1
🚨 Alertas CRÍTICOS/ALTOS: 1

✅ Verificação concluída!
```

### Passo 5: Agendar Verificação Automática (Cron)

**No Linux/Mac:**
```bash
# Editar crontab
crontab -e

# Adicionar linha: executar a cada 30 minutos
*/30 * * * * cd /path/to/nr12_erp/backend && /path/to/venv/bin/python manage.py verificar_manutencoes >> /var/log/manutencao.log 2>&1
```

**No Windows (Task Scheduler):**
```powershell
# Criar tarefa agendada
schtasks /create /tn "Verificar Manutencoes" /tr "C:\path\to\venv\Scripts\python.exe C:\path\to\backend\manage.py verificar_manutencoes" /sc minute /mo 30
```

---

## 🔔 INTEGRAÇÃO COM FRONTEND

### API Endpoints Necessários

#### 1. Listar Alertas Pendentes

```python
# views.py
from rest_framework.decorators import action
from rest_framework.response import Response
from manutencao.models_alertas import ManutencaoAlerta

class ManutencaoAlertaViewSet(viewsets.ModelViewSet):
    queryset = ManutencaoAlerta.objects.all()
    serializer_class = ManutencaoAlertaSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Filtrar por cliente se não for admin
        user = self.request.user
        queryset = super().get_queryset()

        if not user.profile.role == 'ADMIN':
            # Cliente vê apenas alertas de seus equipamentos
            queryset = queryset.filter(equipamento__cliente=user.cliente_profile)

        # Filtros opcionais
        resolvido = self.request.query_params.get('resolvido')
        if resolvido is not None:
            queryset = queryset.filter(resolvido=resolvido=='true')

        prioridade = self.request.query_params.get('prioridade')
        if prioridade:
            queryset = queryset.filter(prioridade=prioridade)

        return queryset.select_related('equipamento', 'manutencao_realizada')

    @action(detail=True, methods=['post'])
    def marcar_lido(self, request, pk=None):
        """POST /api/alertas/{id}/marcar_lido/"""
        alerta = self.get_object()
        alerta.marcar_como_lido(request.user)
        return Response({'status': 'lido'})

    @action(detail=True, methods=['post'])
    def resolver(self, request, pk=None):
        """POST /api/alertas/{id}/resolver/
        Body: {"manutencao_id": 123} (opcional)
        """
        alerta = self.get_object()
        manutencao_id = request.data.get('manutencao_id')
        manutencao = None

        if manutencao_id:
            from manutencao.models import Manutencao
            manutencao = Manutencao.objects.get(id=manutencao_id)

        alerta.resolver(request.user, manutencao)
        return Response({'status': 'resolvido'})
```

#### 2. Dashboard de Alertas (Frontend React/Next.js)

```typescript
// frontend/src/components/DashboardAlertas.tsx
interface Alerta {
  id: number;
  equipamento: {
    codigo: string;
    descricao: string;
  };
  tipo: string;
  prioridade: 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';
  titulo: string;
  mensagem: string;
  lido: boolean;
  resolvido: boolean;
  criado_em: string;
  dias_em_aberto: number;
}

export function DashboardAlertas() {
  const [alertas, setAlertas] = useState<Alerta[]>([]);

  useEffect(() => {
    fetch('/api/v1/manutencao/alertas/?resolvido=false')
      .then(res => res.json())
      .then(data => setAlertas(data.results));
  }, []);

  const getPrioridadeColor = (prioridade: string) => {
    const cores = {
      'BAIXA': 'bg-blue-100 text-blue-800',
      'MEDIA': 'bg-yellow-100 text-yellow-800',
      'ALTA': 'bg-orange-100 text-orange-800',
      'CRITICA': 'bg-red-100 text-red-800'
    };
    return cores[prioridade] || 'bg-gray-100';
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Alertas de Manutenção</h2>

      {alertas.map(alerta => (
        <div key={alerta.id} className={`p-4 mb-3 rounded-lg border ${
          alerta.prioridade === 'CRITICA' ? 'border-red-500' : 'border-gray-200'
        }`}>
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-1 rounded text-xs ${getPrioridadeColor(alerta.prioridade)}`}>
                  {alerta.prioridade}
                </span>
                <span className="font-semibold">{alerta.equipamento.codigo}</span>
              </div>
              <h3 className="font-bold">{alerta.titulo}</h3>
              <p className="text-sm text-gray-600 whitespace-pre-line">{alerta.mensagem}</p>
              <p className="text-xs text-gray-500 mt-2">
                Criado há {alerta.dias_em_aberto} dia(s)
              </p>
            </div>
            <button
              onClick={() => handleResolver(alerta.id)}
              className="ml-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Resolver
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

## 📊 FLUXO COMPLETO DE USO

### Cenário Real: Escavadeira Hyundai chegando em 250h

**1. Estado inicial:**
- Equipamento: Hyundai Robex 250LC-7
- Horímetro atual: 980h
- Última manutenção: 750h
- Gatilho configurado: Revisão a cada 250h
- Próxima manutenção: 1000h (750h + 250h)
- Antecedência: 10% = 25h antes = 975h

**2. Sistema executa verificação (via cron a cada 30 min):**
```python
# Automático via comando: verificar_manutencoes
gatilho.verificar_e_criar_alerta()

# Verifica: 980h >= 975h? SIM
# Cria alerta: "PRÓXIMA" com prioridade "MEDIA"
```

**3. Alerta criado:**
```
Título: Manutenção: Revisão 250h
Mensagem: PRÓXIMA: Faltam 20.0 Horímetro para atingir 1000.0
Prioridade: MEDIA
Itens necessários:
  - Óleo Motor 15W40: 15.000 L
  - Filtro de Óleo Hyundai: 1.000 UN
  - Filtro de Ar: 2.000 UN
```

**4. Gerente vê alerta no dashboard e:**
- Gera requisição de peças no almoxarifado
- Agenda mecânico para próxima semana
- Equipamento continua operando

**5. Equipamento atinge 1010h (passou da meta):**
```
# Nova verificação atualiza alerta
Prioridade: ALTA (foi de MEDIA para ALTA)
Mensagem: VENCIDA: Leitura atual 1010.0 já passou da meta 1000.0
```

**6. Manutenção realizada:**
```python
# Mecânico registra manutenção via sistema
manutencao = Manutencao.objects.create(
    equipamento=escavadeira,
    tipo='PREVENTIVA',
    horimetro=1015.00,
    descricao="Revisão 250h - Troca de óleo e filtros realizada"
)

# Alerta é resolvido automaticamente
alerta.resolver(usuario=mecanico, manutencao=manutencao)

# Sistema atualiza equipamento
escavadeira.data_ultima_manutencao = timezone.now().date()
escavadeira.leitura_ultima_manutencao = 1015.00
escavadeira.save()

# Gatilho recalcula próxima
gatilho.calcular_proxima_execucao()
# Resultado: proxima_execucao_leitura = 1265.00 (1015 + 250)
```

---

## ✅ CHECKLIST NR12 OBRIGATÓRIO

### Integração com Sistema de Checklist

```python
# Em ordens_servico/models.py
class OrdemServico(models.Model):
    # ... campos existentes ...

    checklist_nr12_realizado = models.OneToOneField(
        'nr12.ChecklistRealizado',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ordem_servico'
    )

    def pode_concluir(self):
        """Verifica se a OS pode ser concluída"""
        # Regra de negócio: OS NÃO pode ser fechada sem checklist NR12
        if not self.checklist_nr12_realizado:
            return False, "Checklist NR12 obrigatório não foi realizado"

        if self.checklist_nr12_realizado.resultado == 'REPROVADO':
            return False, "Checklist NR12 reprovou. Corrija as não conformidades"

        return True, "OK"

    def concluir(self):
        """Sobrescrever método de conclusão para validar NR12"""
        pode, mensagem = self.pode_concluir()
        if not pode:
            raise ValidationError(mensagem)

        # Continua com conclusão normal
        self.status = 'CONCLUIDA'
        self.data_conclusao = timezone.now()
        self.save()
```

---

## 🎓 EXEMPLOS DE CONFIGURAÇÃO POR TIPO DE EQUIPAMENTO

### 1. **Carregadeira Caterpillar 962H**
```python
equipamento = Equipamento.objects.get(modelo="962H")

# Gatilho 1: Revisão 250h
GatilhoManutencao.objects.create(
    equipamento=equipamento,
    nome="Revisão 250h",
    tipo_gatilho='HORIMETRO',
    intervalo_leitura=250,
    antecedencia_leitura=0.10
)

# Gatilho 2: Revisão 500h
GatilhoManutencao.objects.create(
    equipamento=equipamento,
    nome="Revisão 500h",
    tipo_gatilho='HORIMETRO',
    intervalo_leitura=500,
    antecedencia_leitura=0.10
)

# Gatilho 3: Revisão 1000h
GatilhoManutencao.objects.create(
    equipamento=equipamento,
    nome="Revisão 1000h",
    tipo_gatilho='HORIMETRO',
    intervalo_leitura=1000,
    antecedencia_leitura=0.08  # 80h antes
)
```

### 2. **Escavadeira CAT 336**
```python
escavadeira = Equipamento.objects.get(modelo="336 SP9")

# Preventiva combinada: 250h OU mensal
GatilhoManutencao.objects.create(
    equipamento=escavadeira,
    nome="Manutenção Preventiva Mensal/250h",
    tipo_gatilho='AMBOS',
    intervalo_leitura=250,
    intervalo_dias=30
)
```

### 3. **Hyundai Robex 380**
```python
robex = Equipamento.objects.get(modelo="Robex 380")

# Lubrificação semanal
GatilhoManutencao.objects.create(
    equipamento=robex,
    nome="Lubrificação Semanal",
    tipo_gatilho='CALENDARIO',
    intervalo_dias=7,
    antecedencia_dias=1
)
```

---

## 📈 PRÓXIMOS PASSOS RECOMENDADOS

1. **Executar migrations:**
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

2. **Configurar gatilhos via Django Admin ou API**

3. **Agendar comando de verificação (cron)**

4. **Criar dashboard frontend de alertas**

5. **Integrar com sistema de notificações (email/Telegram)**

6. **Implementar requisição automática de peças**

---

## 🆘 TROUBLESHOOTING

### Alerta não está sendo criado

**Verificar:**
1. Gatilho está ativo? `gatilho.ativo == True`
2. Próxima execução foi calculada? `gatilho.proxima_execucao_leitura`
3. Leitura atual do equipamento está correta? `equipamento.leitura_atual`
4. Comando de verificação está sendo executado? Testar manualmente

### Alerta duplicado

**Solução:** O sistema verifica se já existe alerta não resolvido antes de criar novo. Se houver duplicação, verificar lógica em `verificar_e_criar_alerta()`.

### Horímetro não atualiza

**Verificar:**
1. `MedicaoEquipamento` está sendo criada?
2. Signal `post_save` de `MedicaoEquipamento` atualiza `Equipamento.leitura_atual`?

---

**Documentação criada em:** 23/02/2026
**Versão:** 1.0
**Autor:** Sistema Mandacaru NR12
