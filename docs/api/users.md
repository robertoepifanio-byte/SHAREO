# Contratos de API — Users

**Base**: `/api/users`

---

## GET /api/users/me

**Perfil completo do usuário autenticado**, incluindo dados mascarados. Requer auth.

### Response `200`

```typescript
{
  data: {
    id:           string
    email:        string
    name:         string
    phone:        string | null
    userType:     "PF" | "PJ"
    role:         "USER" | "ADMIN"
    // Documentos — sempre mascarados, nunca texto claro
    cpfMasked:    string | null  // ex.: "•••.456.789-09"
    cnpjMasked:   string | null  // ex.: "••.222.333/0001-81"
    avatarUrl:    string | null
    bio:          string | null
    city:         string | null
    state:        string | null   // UF, 2 chars
    neighborhood: string | null
    isVerified:   boolean
    consentAt:    string | null   // ISO 8601
    consentVersion: string | null
    createdAt:    string
    // Stats
    totalItemsActive:    number
    totalBookingsOwner:  number   // como locador
    totalBookingsBorrower: number // como locatário
    averageRating:       number | null
    totalReviews:        number
  }
}
```

**Campos NUNCA retornados**: `cpfHash`, `cpfEncrypted`, `cnpjHash`, `cnpjEncrypted`, `passwordHash`, `consentIp`

---

## PATCH /api/users/me

**Atualiza o perfil do usuário autenticado.** Requer auth.

### Request body (todos opcionais)

```typescript
{
  name?:         string  // min 2, max 100 chars
  phone?:        string  // formato: (99) 99999-9999 ou +55...
  bio?:          string  // max 500 chars
  city?:         string  // max 100 chars
  state?:        string  // UF 2 chars, ex.: "SP"
  neighborhood?: string  // max 100 chars
  latitude?:     number  // -90 a 90
  longitude?:    number  // -180 a 180
}
```

### Validação Zod

```typescript
const UpdateProfileSchema = z.object({
  name:         z.string().min(2).max(100).optional(),
  phone:        z.string().regex(/^(\(\d{2}\)\s?\d{4,5}-\d{4}|\+55\d{10,11})$/).optional(),
  bio:          z.string().max(500).optional(),
  city:         z.string().max(100).optional(),
  state:        z.string().length(2).toUpperCase().optional(),
  neighborhood: z.string().max(100).optional(),
  latitude:     z.number().min(-90).max(90).optional(),
  longitude:    z.number().min(-180).max(180).optional(),
})
```

### Regras de negócio

- CPF/CNPJ **não são atualizáveis** por esta rota — imutáveis após o cadastro
- Email **não é atualizável** por esta rota (fluxo separado com verificação)
- `latitude`/`longitude` só aceitos juntos (ambos ou nenhum)

### Response `200`

```typescript
{ data: UserProfile }  // mesmo formato de GET /api/users/me
```

---

## POST /api/users/me/avatar

**Upload de foto de perfil.** Requer auth.

**Content-Type**: `multipart/form-data`

### Request

| Campo | Tipo | Regras |
|---|---|---|
| `avatar` | File | JPEG ou PNG, máx 5 MB |

### Processamento

1. Valida MIME type e tamanho
2. Converte para WebP (512×512, `sharp().resize(512,512).webp()`)
3. Upload para Supabase Storage bucket `avatars/{userId}/avatar.webp`
4. Atualiza `user.avatarUrl` no banco
5. Se havia avatar anterior, deleta do Storage

### Response `200`

```typescript
{ data: { avatarUrl: string } }
```

### Erros

| Código | Status |
|---|---|
| `INVALID_FILE_TYPE` | 400 |
| `FILE_TOO_LARGE` | 400 |
| `UPLOAD_FAILED` | 500 |

---

## GET /api/users/:id

**Perfil público de um usuário.** Não requer auth.

Retorna apenas campos públicos — sem email, phone, documentos, consentimento.

### Response `200`

```typescript
{
  data: {
    id:           string
    name:         string
    avatarUrl:    string | null
    bio:          string | null
    city:         string | null
    state:        string | null
    isVerified:   boolean
    createdAt:    string
    averageRating:  number | null
    totalReviews:   number
    totalItemsActive: number
  }
}
```

### Erros

| Código | Status |
|---|---|
| `USER_NOT_FOUND` | 404 |

---

## GET /api/users/:id/reviews

**Lista avaliações recebidas por um usuário.** Não requer auth.

### Query params

| Param | Tipo | Default |
|---|---|---|
| `type` | `"ITEM" \| "BORROWER" \| "OWNER"` | todos |
| `page` | number | 1 |
| `limit` | number | 20 (máx 50) |

### Response `200`

```typescript
{
  data: {
    id:          string
    reviewType:  ReviewType
    rating:      number  // 1–5
    comment:     string | null
    reviewer: {
      id:        string
      name:      string
      avatarUrl: string | null
    }
    item?: {
      id:        string
      title:     string
      images:    [{ url: string }]
    }
    createdAt:   string
  }[]
  meta: { total, page, limit, hasMore, averageRating: number }
}
```

---

## GET /api/users/:id/items

**Lista itens ativos e aprovados de um usuário.** Não requer auth.

Retorna apenas `isActive=true`, `isApproved=true`, `deletedAt=null`.

### Query params

| Param | Tipo | Default |
|---|---|---|
| `page` | number | 1 |
| `limit` | number | 20 (máx 50) |

### Response `200`

```typescript
{
  data: ItemSummary[]
  meta: { total, page, limit, hasMore }
}
```

`ItemSummary`: `id`, `title`, `pricePerDay`, `city`, `state`, `condition`, `images[0]`, `averageRating`.
