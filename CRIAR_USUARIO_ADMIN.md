# 🔐 Como Criar Usuário Admin no Render

**Problema:** Não consegue fazer login porque o banco está vazio (sem usuários cadastrados)

**Solução:** Criar o usuário admin padrão

---

## ✅ Método 1: Automático via build.sh (RECOMENDADO)

### Status: ✅ IMPLEMENTADO

O arquivo `backend/build.sh` foi atualizado para executar automaticamente:
```bash
python manage.py create_default_user
```

**Isso vai criar:**
- Username: `admin`
- Password: `admin123`
- Email: `admin@nr12.com`
- Role: `ADMIN`
- Todos os módulos habilitados

### Como Ativar:

1. O comando já foi adicionado ao build.sh
2. Faça commit e push (instruções abaixo)
3. Render fará redeploy automático
4. Usuário admin será criado automaticamente
5. Faça login com: `admin` / `admin123`

---

## 🛠️ Método 2: Manual via Shell do Render

Se você precisa criar o usuário AGORA sem esperar redeploy:

### Passo 1: Acessar Shell do Backend

1. Acesse: https://dashboard.render.com
2. Vá em **Services** → **nr12-backend**
3. Clique na aba **Shell** (no topo)
4. Aguarde o shell carregar

### Passo 2: Executar Comando

Digite no shell:
```bash
python manage.py create_default_user
```

**Saída esperada:**
```
✅ Usuário criado com sucesso!
Username: admin
Password: admin123
Email: admin@nr12.com
```

### Passo 3: Testar Login

1. Acesse: https://nr12-frontend.onrender.com/login
2. Username: `admin`
3. Password: `admin123`
4. Clique em "Entrar"

---

## 🐍 Método 3: Python Shell do Render (Avançado)

Se o comando não funcionar, use o Python shell:

### No Shell do Render, execute:

```bash
python manage.py shell
```

### Depois cole este código Python:

```python
from django.contrib.auth import get_user_model
from core.models import Profile

User = get_user_model()

# Criar superusuário
user = User.objects.create_superuser(
    username='admin',
    email='admin@nr12.com',
    password='admin123'
)

# Criar perfil com todos os módulos
Profile.objects.create(
    user=user,
    role='ADMIN',
    modules_enabled=[
        'dashboard',
        'clientes',
        'empreendimentos',
        'equipamentos',
        'tipos_equipamento',
        'operadores',
        'tecnicos',
        'supervisores',
        'manutencoes',
        'manutencao_preventiva',
        'nr12',
        'orcamentos',
        'ordens_servico',
        'almoxarifado',
        'abastecimentos',
        'financeiro',
        'relatorios',
    ]
)

print("✅ Usuário admin criado com sucesso!")
exit()
```

---

## 📊 Como Fazer o Deploy da Correção

### Passo 1: Commit e Push

```bash
git add backend/build.sh CRIAR_USUARIO_ADMIN.md
git commit -m "Fix: Adiciona criação automática de usuário admin no deploy"
git push
```

### Passo 2: Aguardar Redeploy

- Render detecta o push automaticamente
- Faz rebuild do backend (~3-5 minutos)
- Executa `build.sh` incluindo `create_default_user`
- Usuário admin é criado

### Passo 3: Verificar Logs

No painel do Render, aba **Logs**, procure por:
```
✅ Usuário criado com sucesso!
Username: admin
Password: admin123
```

Ou, se já existir:
```
⚠️ Usuário admin já existe!
```

---

## 🔍 Troubleshooting

### Problema: "User matching query does not exist"
**Causa:** Perfil não foi criado junto com o usuário
**Solução:** Use o Método 3 (Python Shell) para criar o perfil manualmente

### Problema: "Database connection error"
**Causa:** PostgreSQL não está respondendo
**Solução:**
1. Verifique no Render Dashboard se o banco `nr12-db` está ONLINE
2. Verifique a variável `DATABASE_URL` no backend

### Problema: "create_default_user: command not found"
**Causa:** App 'core' não está em INSTALLED_APPS
**Solução:** Verifique `backend/config/settings.py`:
```python
INSTALLED_APPS = [
    # ...
    'core',  # ✅ Deve estar aqui
    # ...
]
```

### Problema: "Usuário criado mas não consigo fazer login"
**Causa:** Possível problema com JWT ou cookies
**Solução:**
1. Limpe cookies do navegador (DevTools → Application → Clear storage)
2. Teste com Postman/curl:
   ```bash
   curl -X POST https://nr12-backend.onrender.com/api/v1/auth/login/ \
     -H "Content-Type: application/json" \
     -d '{"username":"admin","password":"admin123"}'
   ```
3. Verifique se retorna tokens `access` e `refresh`

---

## 🎯 Credenciais Padrão

**IMPORTANTE:** Altere a senha após o primeiro login!

| Campo | Valor |
|-------|-------|
| Username | `admin` |
| Password | `admin123` |
| Email | `admin@nr12.com` |
| Role | `ADMIN` |
| Módulos | Todos habilitados |

### Como Alterar Senha (Depois do Login)

1. Faça login no frontend
2. Vá em **Perfil** ou **Configurações**
3. Altere a senha
4. **Ou** use o Django Admin:
   - Acesse: `https://nr12-backend.onrender.com/admin/`
   - Login: `admin` / `admin123`
   - Vá em **Users** → **admin** → **Change password**

---

## ✅ Checklist Final

- [ ] Executei commit do build.sh atualizado
- [ ] Push para GitHub concluído
- [ ] Render iniciou redeploy automático
- [ ] Logs mostram "Usuário criado com sucesso"
- [ ] Testei login no frontend: https://nr12-frontend.onrender.com
- [ ] Login funcionou com admin/admin123
- [ ] Acessei o dashboard
- [ ] **IMPORTANTE:** Alterei a senha padrão

---

## 📞 Precisa de Ajuda?

Se nenhum método funcionar:

1. Capture screenshots dos erros
2. Copie logs do Render (Backend)
3. Teste a API diretamente:
   ```bash
   curl https://nr12-backend.onrender.com/api/v1/auth/login/
   ```
4. Verifique se o banco PostgreSQL está ONLINE no Dashboard do Render

---

**Próximo passo:** Fazer commit da correção e aguardar redeploy! 🚀
