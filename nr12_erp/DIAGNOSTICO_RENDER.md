# Diagnóstico do Deploy no Render

## Status Atual

✅ **Frontend**: Build concluído com sucesso
⚠️ **Problema**: Frontend fica carregando e não abre a página de login

## Possíveis Causas

### 1. Backend não está respondendo
**Como verificar:**
- Acesse: https://nr12-backend.onrender.com/api/v1/auth/me/
- Deve retornar `{"detail":"Authentication credentials were not provided."}` ou similar
- Se retornar erro 502/503, o backend não está funcionando

### 2. Problema de CORS
**Sintomas:**
- No console do navegador (F12) aparece erro de CORS
- Mensagem tipo: "blocked by CORS policy"

**Solução:**
Verificar no painel do Render se as variáveis de ambiente estão corretas:
```
DJANGO_CORS_ORIGINS=https://nr12-frontend.onrender.com
DJANGO_ALLOWED_HOSTS=nr12-backend.onrender.com
```

### 3. URLs incorretas
**Verificar no Render:**
- Frontend deve ter: `NEXT_PUBLIC_API_URL=https://nr12-backend.onrender.com/api/v1`
- Backend deve aceitar requisições do frontend

## Passos para Diagnóstico

1. **Abra o navegador e acesse:**
   - https://nr12-frontend.onrender.com

2. **Abra o Console (F12 → Console)**
   - Veja se há mensagens de erro
   - Procure por:
     - ❌ Erros de CORS
     - ❌ Erros de timeout
     - ❌ Failed to fetch
     - ✅ "🔍 Verificando autenticação..."
     - ✅ "❌ Não autenticado" (esperado se não logado)

3. **Teste o Backend diretamente:**
   ```bash
   # Teste se o backend responde
   curl https://nr12-backend.onrender.com/api/v1/auth/me/
   ```

   Deve retornar algo como:
   ```json
   {"detail":"Authentication credentials were not provided."}
   ```

4. **Verifique a aba Network (F12 → Network)**
   - Recarregue a página
   - Veja se há requisição para `/api/v1/auth/me/`
   - Verifique o status code:
     - 200 = OK (mas sem credenciais retorna 401)
     - 401 = Não autenticado (esperado)
     - 502/503 = Backend offline
     - 0 = Erro de CORS ou rede

## Correções Aplicadas

✅ **Commit a8a6c81**: Adicionado timeout de 10 segundos no checkAuth para evitar travamento
- Se o backend não responder em 10 segundos, o frontend redireciona para login

## Próximos Passos

1. Aguardar o Render fazer rebuild do frontend (commit a8a6c81)
2. Após rebuild, testar novamente
3. Se ainda não funcionar, verificar logs do backend no Render
4. Ajustar variáveis de ambiente se necessário

## Logs Úteis

**Backend logs no Render:**
- Vá em: Dashboard → nr12-backend → Logs
- Procure por erros de CORS ou falhas ao servir `/api/v1/auth/me/`

**Frontend logs no Render:**
- Vá em: Dashboard → nr12-frontend → Logs
- Veja se há erros durante o startup

## Comandos de Teste

```bash
# Testar backend
curl -i https://nr12-backend.onrender.com/api/v1/auth/me/

# Testar frontend
curl -i https://nr12-frontend.onrender.com/

# Testar login (se backend estiver ok)
curl -X POST https://nr12-backend.onrender.com/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"suasenha"}'
```
