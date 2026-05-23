# Contratos de API — ShareO

**Versão**: 1.0 · **Data**: 2026-05-22 · **Base URL**: `/api`

---

## Convenções gerais

### Autenticação

Endpoints protegidos exigem o cookie de sessão do NextAuth.js (httpOnly, Secure, SameSite=Lax). O cookie é enviado automaticamente pelo browser — sem necessidade de header `Authorization` nas chamadas internas.

Para chamadas server-to-server futuras (parceiros, mobile), usar `Authorization: Bearer <token>`.

### Formato de resposta

**Sucesso**
```typescript
type ApiSuccess<T> = {
  data: T
  meta?: {          // presente em listagens paginadas
    total:   number
    page:    number
    limit:   number
    hasMore: boolean
  }
}
```

**Erro**
```typescript
type ApiError = {
  error: {
    code:     string                        // snake_upper_case, ex: EMAIL_ALREADY_EXISTS
    message:  string                        // mensagem em PT-BR para exibir ao usuário
    field?:   string                        // campo com erro (validações simples)
    details?: Record<string, string[]>      // erros por campo (validações Zod)
  }
}
```

### Preços

Todos os valores monetários são em **centavos (int)**. Exemplos:
- `pricePerDay: 5000` → R$ 50,00
- `depositAmount: 20000` → R$ 200,00

Converter no cliente: `value / 100` para exibição, `Math.round(value * 100)` para envio.

### Datas

Todas as datas em **ISO 8601 UTC**: `"2026-05-22T14:30:00.000Z"`

### Paginação

```
GET /api/items?page=1&limit=20
```

- `page`: começa em `1` (default: `1`)
- `limit`: máximo `50` (default: `20`)

### Erros HTTP

| Código | Uso |
|---|---|
| `200` | OK |
| `201` | Recurso criado |
| `204` | Sucesso sem corpo |
| `400` | Dados inválidos (validação Zod) |
| `401` | Não autenticado |
| `403` | Sem permissão para o recurso |
| `404` | Recurso não encontrado |
| `409` | Conflito (duplicata) |
| `422` | Entidade não processável (regra de negócio) |
| `429` | Rate limit excedido |
| `500` | Erro interno (nunca expor detalhes ao cliente) |

### Rate Limiting

Implementado via middleware Next.js com contagem por IP + userId.

| Grupo | Limite |
|---|---|
| Auth (register, login) | 5 req/min por IP |
| Operações de escrita (POST, PATCH, DELETE) | 30 req/min por usuário |
| Leitura pública (GET sem auth) | 100 req/min por IP |

### LGPD

- CPF e CNPJ nunca retornam em respostas de API — apenas versão mascarada (`•••.456.789-••`)
- Campos removidos em respostas públicas: `cpfEncrypted`, `cnpjEncrypted`, `cpfHash`, `cnpjHash`, `consentIp`, `passwordHash`
- Logs de erro no Sentry: PII filtrado antes do envio

---

## Índice de domínios

| Domínio | Arquivo | Status |
|---|---|---|
| Auth | [auth.md](auth.md) | Definido |
| Items | [items.md](items.md) | Definido |
| Bookings | [bookings.md](bookings.md) | Definido |
| Users | [users.md](users.md) | Definido |
| Chat | [chat.md](chat.md) | Definido |
| Admin | [admin.md](admin.md) | Definido |
