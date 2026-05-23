# Contratos de API — Bookings

**Base**: `/api/bookings` · **Auth**: obrigatória em todos os endpoints

---

## Fluxo de estados

```
PENDING → CONFIRMED → ACTIVE → RETURNED → COMPLETED
       ↘ CANCELLED             ↘ DISPUTED
```

Transições permitidas por ator:

| Transição | Quem pode executar |
|---|---|
| → CONFIRMED | Owner |
| → CANCELLED (de PENDING) | Owner ou Borrower |
| → CANCELLED (de CONFIRMED) | Owner ou Borrower |
| → ACTIVE | Sistema (automático na `startDate`) ou Owner |
| → RETURNED | Borrower |
| → COMPLETED | Sistema (automático 7 dias após RETURNED) |
| → DISPUTED | Owner ou Borrower (de ACTIVE ou RETURNED) |

---

## POST /api/bookings

**Cria uma solicitação de aluguel.** O locatário não pode ser o dono do item.

**Rate limit**: 10 req/min por usuário

### Request body

```typescript
{
  itemId:       string   // cuid
  startDate:    string   // ISO 8601, deve ser >= hoje + 1 dia
  endDate:      string   // ISO 8601, deve ser > startDate
  borrowerNote?: string  // mensagem opcional ao locador (max 500 chars)
}
```

### Validações Zod

```typescript
const CreateBookingSchema = z.object({
  itemId:      z.string().cuid(),
  startDate:   z.string().datetime().refine(d => new Date(d) >= tomorrow()),
  endDate:     z.string().datetime(),
  borrowerNote: z.string().max(500).optional(),
}).refine(d => new Date(d.endDate) > new Date(d.startDate), {
  message: "endDate deve ser posterior a startDate",
  path: ["endDate"],
})
```

### Regras de negócio

- Usuário autenticado não pode agendar o próprio item → `403 CANNOT_BOOK_OWN_ITEM`
- Item deve estar `isActive=true`, `isApproved=true`, `deletedAt=null` → `422 ITEM_UNAVAILABLE`
- Período não pode sobrepor booking existente com status `CONFIRMED` ou `ACTIVE` → `409 DATE_CONFLICT`
- `totalDays` calculado pelo backend: `Math.ceil((endDate - startDate) / 86400000)`
- Preço snapshot gravado no momento da criação: `dailyPrice = item.pricePerDay`, `totalPrice = dailyPrice * totalDays`
- Uma `Conversation` é criada automaticamente junto com o booking

### Response `201`

```typescript
{
  data: {
    id:           string
    itemId:       string
    item: {
      title:      string
      images:     [{ url: string, order: number }]
      owner: {
        id:       string
        name:     string
        avatarUrl: string | null
      }
    }
    status:       "PENDING"
    startDate:    string
    endDate:      string
    totalDays:    number
    dailyPrice:   number    // centavos
    totalPrice:   number    // centavos
    depositAmount: number | null
    borrowerNote: string | null
    conversationId: string
    createdAt:    string
  }
}
```

### Erros

| Código | Status |
|---|---|
| `ITEM_NOT_FOUND` | 404 |
| `ITEM_UNAVAILABLE` | 422 |
| `CANNOT_BOOK_OWN_ITEM` | 403 |
| `DATE_CONFLICT` | 409 |
| `INVALID_DATES` | 400 |

---

## GET /api/bookings

**Lista bookings do usuário autenticado** (como locatário ou locador).

### Query params

| Param | Tipo | Default | Descrição |
|---|---|---|---|
| `role` | `"borrower" \| "owner"` | ambos | Filtrar por papel |
| `status` | `BookingStatus` | todos | Filtrar por status |
| `page` | number | 1 | Paginação |
| `limit` | number | 20 (máx 50) | Resultados por página |

### Response `200`

```typescript
{
  data: BookingSummary[]  // lista, sem dados sensíveis de documento
  meta: { total, page, limit, hasMore }
}
```

`BookingSummary` inclui: `id`, `status`, `startDate`, `endDate`, `totalDays`, `totalPrice`, `item.title`, `item.images[0]`, contraparte (`owner` ou `borrower`) com `name` e `avatarUrl`.

---

## GET /api/bookings/:id

**Detalhe de um booking.** Apenas owner ou borrower do booking.

### Response `200`

```typescript
{
  data: {
    id:            string
    status:        BookingStatus
    startDate:     string
    endDate:       string
    totalDays:     number
    dailyPrice:    number
    totalPrice:    number
    depositAmount: number | null
    borrowerNote:  string | null
    ownerNote:     string | null
    cancelledAt:   string | null
    cancelReason:  string | null
    item: {
      id:          string
      title:       string
      images:      ItemImage[]
      city:        string
      state:       string
    }
    borrower: { id, name, avatarUrl, rating?: number }
    owner:    { id, name, avatarUrl, rating?: number }
    conversation: { id: string }
    reviews:  Review[]
    createdAt:     string
    updatedAt:     string
  }
}
```

### Erros

| Código | Status |
|---|---|
| `BOOKING_NOT_FOUND` | 404 |
| `FORBIDDEN` | 403 |

---

## PATCH /api/bookings/:id

**Transiciona o status do booking.** Cada ação valida o ator e o status atual.

### Request body

```typescript
{
  action:       "confirm" | "cancel" | "mark_active" | "mark_returned" | "open_dispute"
  reason?:      string    // obrigatório para cancel e open_dispute (max 500 chars)
}
```

### Regras por ação

| Ação | Status atual | Quem pode |
|---|---|---|
| `confirm` | PENDING | Owner |
| `cancel` | PENDING, CONFIRMED | Owner ou Borrower |
| `mark_active` | CONFIRMED | Owner |
| `mark_returned` | ACTIVE | Borrower |
| `open_dispute` | ACTIVE, RETURNED | Owner ou Borrower |

- `cancel` com booking CONFIRMED: registra `cancelledAt`, `cancelledById`, `cancelReason`
- `cancel` com booking CONFIRMED e < 24h antes de `startDate`: registra nota de política de cancelamento (UI informará ao usuário)
- Ao confirmar: cria notificação `BOOKING_CONFIRMED` para o borrower

### Response `200`

```typescript
{ data: { id, status, updatedAt } }
```

### Erros

| Código | Status |
|---|---|
| `BOOKING_NOT_FOUND` | 404 |
| `FORBIDDEN` | 403 |
| `INVALID_TRANSITION` | 422 |
| `REASON_REQUIRED` | 400 |
