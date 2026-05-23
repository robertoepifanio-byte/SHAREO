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

## POST /api/admin/bookings/:id/resolve

**Resolve uma disputa.** Só pode ser executado em bookings com status `DISPUTED`.

### Request body

```typescript
{
  resolution: "favor_borrower" | "favor_owner" | "split"
  notes:      string  // obrigatório, min 10 chars — registrado no admin_log
  newStatus:  "COMPLETED" | "CANCELLED"
}
```

### Regras de negócio

- Atualiza `booking.status` para `newStatus`
- Registra a resolução em `admin_logs` com `metadata: { resolution, notes }`
- Cria notificação para ambos os participantes

### Response `200`

```typescript
{ data: { id, status, updatedAt } }
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
