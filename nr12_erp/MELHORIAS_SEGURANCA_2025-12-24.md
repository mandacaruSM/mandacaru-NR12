# Melhorias de Segurança e Organização - 2025-12-24

## ✅ Correções Implementadas

### 1. Segurança - Remoção de Arquivos Sensíveis

**Problema:** Arquivo `cookies.txt` versionado no repositório contendo sessões/tokens

**Solução:**
- Removido `cookies.txt` do controle de versão com `git rm --cached`
- Adicionado ao `.gitignore`:
  ```
  # Sensitive files
  cookies.txt
  *cookies*.txt
  *.session
  ```

**Impacto:** ✅ Credenciais não serão mais expostas no repositório

---

### 2. Organização - Arquivos de Teste

**Problema:** QR codes de teste e scripts soltos no root do repositório

**Arquivos movidos:**
- `qr_com_texto.png` → `backend/tests/fixtures/`
- `test_final_qr.png` → `backend/tests/fixtures/`
- `test_qr.png` → `backend/tests/fixtures/`
- `test_saved_qr.png` → `backend/tests/fixtures/`
- `start_bot.py` → `backend/tests/`

**Impacto:** ✅ Repositório mais limpo e organizado

---

### 3. Validação Centralizada - CPF/CNPJ

**Problema:** Validação de CPF/CNPJ duplicada em vários modelos (Operador, Supervisor, Tecnico)

**Solução:** Criado `backend/core/validators.py` com:

```python
from backend.core.validators import (
    validate_cpf,      # Valida CPF com dígitos verificadores
    validate_cnpj,     # Valida CNPJ com dígitos verificadores
    validate_documento, # Valida CPF ou CNPJ baseado no tipo
    normalize_cpf,     # Remove pontuação do CPF
    normalize_cnpj,    # Remove pontuação do CNPJ
)
```

**Recursos:**
- Normalização automática (remove pontos, traços)
- Validação de dígitos verificadores
- Rejeita documentos com todos dígitos iguais
- Mensagens de erro em português

**Como usar nos modelos:**
```python
from backend.core.validators import validate_cpf

class Operador(models.Model):
    cpf = models.CharField(
        max_length=14,
        unique=True,
        validators=[validate_cpf]
    )
```

**Impacto:** ✅ Validação consistente em todo o sistema

---

## 📋 Melhorias Recomendadas para Próxima Fase

### 1. Modelo Cliente - Unique Constraint

**Problema:** Campo `documento` sem unique constraint permite duplicatas

**Solução recomendada:**
```python
class Cliente(models.Model):
    documento = models.CharField(
        max_length=20,
        validators=[validate_documento]  # Usar validador centralizado
    )
    
    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['tipo_pessoa', 'documento'],
                name='unique_cliente_documento'
            )
        ]
```

### 2. Refatoração de Modelos - PessoaBase

**Problema:** Operador, Supervisor e Tecnico repetem os mesmos campos

**Solução recomendada:** Criar classe abstrata
```python
class PessoaBase(models.Model):
    nome_completo = models.CharField(max_length=150)
    cpf = models.CharField(max_length=14, unique=True, validators=[validate_cpf])
    data_nascimento = models.DateField(null=True, blank=True)
    email = models.EmailField(blank=True)
    telefone = models.CharField(max_length=20, blank=True)
    # ... outros campos comuns
    
    class Meta:
        abstract = True

class Operador(PessoaBase):
    # Apenas campos específicos de Operador
    pass
```

### 3. Endpoint de Cadastro de Usuário

Criar `/api/auth/register/` para permitir auto-cadastro:

```python
# backend/config/auth_views.py
@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    serializer = UserRegistrationSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        return Response({
            'detail': 'Usuário criado com sucesso',
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email
            }
        }, status=201)
    return Response(serializer.errors, status=400)
```

---

## 🔐 Ações de Segurança Recomendadas

1. ⚠️ **ROTACIONAR TODAS AS CHAVES** que possam ter sido expostas no `cookies.txt`
2. ⚠️ Verificar se há sessões ativas com esses cookies e revogá-las
3. ✅ Nunca commitar arquivos `.env`, `cookies.txt`, `*.session`
4. ✅ Revisar periodicamente o `.gitignore`

---

**Implementado em:** 2025-12-24
**Status:** ✅ Correções críticas aplicadas | ⏳ Recomendações pendentes
