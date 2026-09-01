# Contratos de API — Admin

**Base**: `/api/admin` · **Auth**: obrigatória · **Role**: `ADMIN`

Todos os endpoints verificam `session.user.role === "ADMIN"`. Retornam `403 FORBIDDEN` para qualquer outro role.

Todas as ações de escrita geram uma entrada em `admin_logs`.

---

## GET /api/admin/stats

**Dashboard stats.** Snapshot do estado atual da plataforma.

### Response `200`

```typescript
{
  data: {
    users: {
      total:         number
      active:        number
      newLast30Days: number
    }
    items: {
      total:         number
      active:        number
      pendingApproval: number
      newLast30Days: number
    }
    bookings: {
      total:         number
      byStatus: {
        PENDING:    number
        CONFIRMED:  number
        ACTIVE:     number
        RETURNED:   number
        COMPLETED:  number
        CANCELLED:  number
        DISPUTED:   number
      }
      completedLast30Days: number
    }
    reviews: {
      total:         number
      averageRating: number
    }
  }
}
```

---

## GET /api/admin/users

**Lista todos os usuários**, incluindo inativos e deletados.

### Query params

| Param | Tipo | Default | Descrição |
|---|---|---|---|
| `search` | string | — | Busca por name ou email (ILIKE) |
| `status` | `"active" \| "inactive" \| "deleted"` | todos | |
| `role` | `"USER" \| "ADMIN"` | todos | |
| `userType` | `"PF" \| "PJ"` | todos | |
| `page` | number | 1 | |
| `limit` | number | 20 (máx 100) | |

### Response `200`

```typescript
{
  data: {
    id:           string
    email:        string
    name:         string
    userType:     "PF" | "PJ"
    role:         "USER" | "ADMIN"
    isActive:     boolean
    isVerified:   boolean
    deletedAt:    string | null
    createdAt:    string
    // Documentos mascarados (admin pode ver versão mascarada, nunca texto claro)
    cpfMasked:    string | null
    cnpjMasked:   string | null
    _count: {
      items:    number
      bookings: number
    }
  }[]
  meta: { total, page, limit, hasMore }
}
```

---

## PATCH /api/admin/users/:id

**Gerencia usuário.** Admin não pode alterar o próprio role (proteção contra acidente).

### Request body

```typescript
{
  action: "activate" | "deactivate" | "promote_admin" | "demote_user"
  reason?: string  // obrigatório para deactivate (auditoria)
}
```

### Regras de negócio

- `deactivate`: define `isActive = false`, não cria soft delete
- `promote_admin`: define `role = ADMIN` (requer confirmação de senha do admin — **H2**)
- Não é possível alterar o próprio usuário via este endpoint → `403 CANNOT_MODIFY_SELF`
- Todas as ações gravadas em `admin_logs`

### Response `200`

```typescript
{ data: { id, role, isActive, updatedAt } }
```

### Erros

| Código | Status |
|---|---|
| `USER_NOT_FOUND` | 404 |
| `CANNOT_MODIFY_SELF` | 403 |
| `REASON_REQUIRED` | 400 |

---

## GET /api/admin/items

**Lista todos os itens**, incluindo inativos e com moderação pendente.

### Query params

| Param | Tipo | Default | Descrição |
|---|---|---|---|
| `search` | string | — | Busca por title (ILIKE) |
| `status` | `"active" \| "inactive" \| "deleted" \| "pending"` | todos | `pending` = `isApproved=false` |
| `categoryId` | string | — | Filtrar por categoria |
| `page` | number | 1 | |
| `limit` | number | 20 (máx 100) | |

### Response `200`

```typescript
{
  data: {
    id:         string
    title:      string
    isActive:   boolean
    isApproved: boolean
    approvedAt: string | null
    deletedAt:  string | null
    createdAt:  string
    owner: { id, name, email }
    category: { id, name }
    images: [{ url, order }]
    _count: { bookings: number, reviews: number }
  }[]
  meta: { total, page, limit, hasMore }
}
```

---

## PATCH /api/admin/items/:id

**Modera um item.** Aprova, rejeita ou remove.

### Request body

```typescript
{
  action:  "approve" | "reject" | "deactivate"
  reason?: string  // obrigatório para reject e deactivate
}
```

### Regras de negócio

- `approve`: `isApproved = true`, `approvedAt = now()`, `approvedById = adminId`. Cria notificação `ITEM_APPROVED` para o dono.
- `reject`: `isApproved = false`, `isActive = false`. Cria notificação `ITEM_REJECTED` para o dono com o motivo.
- `deactivate`: `isActive = false` (mantém `isApproved` inalterado, não notifica).

### Response `200`

```typescript
{ data: { id, isActive, isApproved, updatedAt } }
```

---

## GET /api/admin/bookings

**Lista todos os bookings**, com filtro por status (útil para triagem de disputas).

### Query params

| Param | Tipo | Default |
|---|---|---|
| `status` | `BookingStatus` | todos |
| `page` | number | 1 |
| `limit` | number | 20 (máx 100) |

### Response `200`

```typescript
{
  data: {
    id:         string
    status:     BookingStatus
    startDate:  string
    endDate:    string
    totalPrice: number
    cancelReason: string | null
    createdAt:  string
    item: { id, title, images[0] }
    borrower: { id, name, email }
    owner: { id, name, email }
  }[]
  meta: { total, page, limit, hasMore }
}
```

---

## PATCH /api/admin/disputes/:id

**Resolve uma disputa.** Só pode ser executado em reservas com `disputeStatus = OPEN`
(a disputa deixou de ser um valor de `status` em 01/09/2026 — ver `docs/api/bookings.md`).

> Esta seção documentava `POST /api/admin/bookings/:id/resolve`, com um corpo
> (`resolution`/`notes`/`newStatus`) que **o código nunca aceitou**. A rota não
> existe. Corrigido em 01/09/2026 para o contrato real.

### Request body

```typescript
{
  action:    "resolve_completed" | "resolve_cancelled" | "dismiss_dispute"
  adminNote?: string  // max 500 — OBRIGATÓRIO em dismiss_dispute
}
```

### Os três desfechos

| `action` | `booking.status` | `disputeStatus` | Dinheiro |
|---|---|---|---|
| `resolve_completed` | → `COMPLETED` | `RESOLVED_OWNER` | cria o repasse ao proprietário |
| `resolve_cancelled` | → `CANCELLED` | `RESOLVED_BORROWER` | estorno **integral** (100%, sem a escada de `calcRefund`) se a reserva foi paga |
| `dismiss_dispute` | **inalterado** | `DISMISSED` | nenhum |

`dismiss_dispute` encerra a mediação sem decidir nada sobre a locação: a reserva
fica exatamente onde estava e segue seu curso. É o único desfecho sem
consequência financeira — por isso `adminNote` é obrigatório ali, senão a
decisão não deixa rastro nenhum.

### Regras de negócio

- Registra em `admin_logs` com `metadata: { adminNote }`
- Notifica **ambas** as partes. Em `dismiss_dispute` o texto diz que a locação
  segue — anunciar cancelamento que não houve seria pior que não avisar.

### Response `200`

```typescript
{ data: { id, status, disputeStatus, updatedAt } }
```

---

## GET /api/admin/logs

**Audit log de ações administrativas.** Imutável — sem DELETE.

### Query params

| Param | Tipo | Default | Descrição |
|---|---|---|---|
| `adminId` | string | — | Filtrar por admin |
| `entityType` | string | — | ex.: `"Item"`, `"User"`, `"Booking"` |
| `entityId` | string | — | ID da entidade |
| `from` | string | — | ISO 8601, data de início |
| `to` | string | — | ISO 8601, data de fim |
| `page` | number | 1 | |
| `limit` | number | 50 (máx 200) | |

### Response `200`

```typescript
{
  data: {
    id:         string
    action:     string   // ex.: "APPROVE_ITEM", "BAN_USER"
    entityType: string
    entityId:   string
    metadata:   object | null
    createdAt:  string
    admin: {
      id:       string
      name:     string
      email:    string
    }
  }[]
  meta: { total, page, limit, hasMore }
}
```
