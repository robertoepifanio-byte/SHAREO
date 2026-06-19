# Contratos de API — Domínio Items

**Base path**: `/api/items`

---

## Tipos compartilhados

```typescript
type ItemCondition = "NEW" | "EXCELLENT" | "GOOD" | "FAIR"

// Resumo de item — retornado em listagens
type ItemSummary = {
  id:            string
  title:         string
  condition:     ItemCondition
  pricePerDay:   number         // centavos
  pricePerWeek:  number | null
  pricePerMonth: number | null
  city:          string
  state:         string
  neighborhood:  string | null
  latitude:      number
  longitude:     number
  distance?:     number         // metros — presente quando query tem lat/lng
  isActive:      boolean
  viewCount:     number
  createdAt:     string
  category: {
    id:   string
    slug: string
    name: string
    icon: string | null
  }
  owner: {
    id:           string
    name:         string
    avatarUrl:    string | null
    isVerified:   boolean
    avgRating:    number | null  // média calculada
    totalReviews: number
  }
  images: {
    id:    string
    url:   string
    order: number
  }[]
}

// Detalhe completo — retornado em GET /api/items/:id
type ItemDetail = ItemSummary & {
  description:    string
  depositAmount:  number | null
  address:        string | null
  isApproved:     boolean
  recentReviews:  ReviewSummary[]  // últimas 5 avaliações do item
}

type ReviewSummary = {
  id:         string
  rating:     number
  comment:    string | null
  createdAt:  string
  reviewer: {
    id:        string
    name:      string
    avatarUrl: string | null
  }
}
```

---

## Endpoints

### `GET /api/items`

Lista e pesquisa itens com filtros opcionais. Suporta busca por geolocalização via PostGIS.

**Autenticação**: não requerida  
**Renderização**: SSR (dados frescos a cada request)

#### Query parameters

```typescript
type ItemsQuery = {
  // Geolocalização — se omitidos, ordena por data de criação
  lat?:       number    // latitude do ponto de busca
  lng?:       number    // longitude do ponto de busca
  radius?:    number    // km · default: 10 · max: 50

  // Filtros
  category?:  string    // slug da categoria, ex: "ferramentas"
  minPrice?:  number    // centavos/dia (inclusive)
  maxPrice?:  number    // centavos/dia (inclusive)
  condition?: ItemCondition

  // Ordenação
  sort?:      "distance" | "price_asc" | "price_desc" | "newest"
              // default: "distance" (quando lat/lng presentes), "newest" (sem geo)

  // Paginação
  page?:      number    // default: 1
  limit?:     number    // default: 20 · max: 50
}
```

#### Exemplo de request

```
GET /api/items?lat=-5.7945&lng=-35.2110&radius=10&category=ferramentas&maxPrice=15000&sort=distance&page=1&limit=20
```

#### Resposta de sucesso — `200 OK`

```json
{
  "data": [
    {
      "id": "clx1a2b3c0000001",
      "title": "Furadeira de Impacto Bosch 650W",
      "condition": "EXCELLENT",
      "pricePerDay": 5000,
      "pricePerWeek": 25000,
      "pricePerMonth": null,
      "city": "São Paulo",
      "state": "SP",
      "neighborhood": "Pinheiros",
      "latitude": -23.5614,
      "longitude": -46.7020,
      "distance": 2340,
      "isActive": true,
      "viewCount": 48,
      "createdAt": "2026-04-10T10:00:00.000Z",
      "category": {
        "id": "cat_ferramentas",
        "slug": "ferramentas",
        "name": "Ferramentas",
        "icon": "ferramentas.svg"
      },
      "owner": {
        "id": "clx1owner00001",
        "name": "Carlos Oliveira",
        "avatarUrl": "https://storage.supabase.co/avatars/carlos.jpg",
        "isVerified": true,
        "avgRating": 4.8,
        "totalReviews": 23
      },
      "images": [
        { "id": "img_001", "url": "https://storage.supabase.co/items/001.jpg", "order": 0 },
        { "id": "img_002", "url": "https://storage.supabase.co/items/002.jpg", "order": 1 }
      ]
    }
  ],
  "meta": {
    "total": 47,
    "page": 1,
    "limit": 20,
    "hasMore": true
  }
}
```

#### Respostas de erro

| Código | `error.code` | Quando |
|---|---|---|
| `400` | `INVALID_COORDINATES` | `lat` ou `lng` fora dos limites válidos |
| `400` | `INVALID_RADIUS` | `radius` > 50 km |
| `400` | `INVALID_PRICE_RANGE` | `minPrice` > `maxPrice` |

---

### `POST /api/items`

Cria um novo anúncio de item.

**Autenticação**: requerida  
**Rate limit**: 10 itens/hora por usuário

#### Request body

```typescript
const CreateItemSchema = z.object({
  title:         z.string().min(5).max(100),
  description:   z.string().min(20).max(2000),
  categoryId:    z.string().cuid(),
  condition:     z.enum(["NEW", "EXCELLENT", "GOOD", "FAIR"]),

  // Preços em centavos — ao menos pricePerDay é obrigatório
  pricePerDay:   z.number().int().min(100),         // mínimo R$ 1,00
  pricePerWeek:  z.number().int().min(100).optional(),
  pricePerMonth: z.number().int().min(100).optional(),
  depositAmount: z.number().int().min(0).optional(),

  // Localização
  address:       z.string().max(200).optional(),
  city:          z.string().min(2).max(100),
  state:         z.string().length(2),
  neighborhood:  z.string().max(100).optional(),
  latitude:      z.number().min(-90).max(90),
  longitude:     z.number().min(-180).max(180),
})
// Imagens enviadas via POST /api/items/:id/images após criação
```

**Exemplo:**
```json
{
  "title": "Furadeira de Impacto Bosch 650W",
  "description": "Furadeira em ótimo estado de conservação, com 2 brocas incluídas. Ideal para furos em concreto e madeira. Disponível para retirada em Pinheiros.",
  "categoryId": "cat_ferramentas",
  "condition": "EXCELLENT",
  "pricePerDay": 5000,
  "pricePerWeek": 25000,
  "depositAmount": 10000,
  "city": "São Paulo",
  "state": "SP",
  "neighborhood": "Pinheiros",
  "latitude": -23.5614,
  "longitude": -46.7020
}
```

#### Resposta de sucesso — `201 Created`

```json
{
  "data": {
    "id": "clx1newitem0001",
    "title": "Furadeira de Impacto Bosch 650W",
    "description": "Furadeira em ótimo estado...",
    "condition": "EXCELLENT",
    "pricePerDay": 5000,
    "pricePerWeek": 25000,
    "pricePerMonth": null,
    "depositAmount": 10000,
    "city": "São Paulo",
    "state": "SP",
    "neighborhood": "Pinheiros",
    "latitude": -23.5614,
    "longitude": -46.7020,
    "isActive": true,
    "isApproved": true,
    "viewCount": 0,
    "createdAt": "2026-05-22T14:30:00.000Z",
    "category": { "id": "cat_ferramentas", "slug": "ferramentas", "name": "Ferramentas", "icon": "ferramentas.svg" },
    "owner": { "id": "clx1owner00001", "name": "Carlos Oliveira", "avatarUrl": null, "isVerified": false, "avgRating": null, "totalReviews": 0 },
    "images": []
  }
}
```

#### Respostas de erro

| Código | `error.code` | Quando |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Body inválido |
| `400` | `INVALID_CATEGORY` | `categoryId` não existe |
| `401` | `UNAUTHORIZED` | Não autenticado |
| `422` | `PRICE_WEEK_LESS_THAN_DAY` | `pricePerWeek` < `pricePerDay` (regra de negócio: desconto esperado) |
| `429` | `RATE_LIMIT_EXCEEDED` | Muitos anúncios criados na última hora |

---

### `GET /api/items/:id`

Retorna os detalhes completos de um item. Incrementa o contador de visualizações.

**Autenticação**: não requerida  
**Renderização**: ISR (revalidação a cada 60s para itens populares)

#### Path params

| Param | Tipo | Descrição |
|---|---|---|
| `id` | `string (cuid)` | ID do item |

#### Resposta de sucesso — `200 OK`

```json
{
  "data": {
    "id": "clx1newitem0001",
    "title": "Furadeira de Impacto Bosch 650W",
    "description": "Furadeira em ótimo estado de conservação...",
    "condition": "EXCELLENT",
    "pricePerDay": 5000,
    "pricePerWeek": 25000,
    "pricePerMonth": null,
    "depositAmount": 10000,
    "address": null,
    "city": "São Paulo",
    "state": "SP",
    "neighborhood": "Pinheiros",
    "latitude": -23.5614,
    "longitude": -46.7020,
    "isActive": true,
    "isApproved": true,
    "viewCount": 49,
    "createdAt": "2026-04-10T10:00:00.000Z",
    "category": { "id": "cat_ferramentas", "slug": "ferramentas", "name": "Ferramentas", "icon": "ferramentas.svg" },
    "owner": {
      "id": "clx1owner00001",
      "name": "Carlos Oliveira",
      "avatarUrl": "https://...",
      "isVerified": true,
      "avgRating": 4.8,
      "totalReviews": 23
    },
    "images": [
      { "id": "img_001", "url": "https://...", "order": 0 }
    ],
    "recentReviews": [
      {
        "id": "rev_001",
        "rating": 5,
        "comment": "Item em perfeito estado, entrega pontual.",
        "createdAt": "2026-05-01T10:00:00.000Z",
        "reviewer": { "id": "rev_user_001", "name": "João Silva", "avatarUrl": null }
      }
    ]
  }
}
```

#### Respostas de erro

| Código | `error.code` | Quando |
|---|---|---|
| `404` | `ITEM_NOT_FOUND` | Item não existe ou foi removido |

> **Nota**: itens com `isActive: false` retornam `404` para usuários não-proprietários. O proprietário ainda pode ver e reativar via dashboard.

---

### `PATCH /api/items/:id`

Atualiza um anúncio existente. Apenas o proprietário pode editar.

**Autenticação**: requerida (proprietário do item)

#### Request body (todos os campos são opcionais)

```typescript
const UpdateItemSchema = z.object({
  title:         z.string().min(5).max(100).optional(),
  description:   z.string().min(20).max(2000).optional(),
  categoryId:    z.string().cuid().optional(),
  condition:     z.enum(["NEW", "EXCELLENT", "GOOD", "FAIR"]).optional(),
  pricePerDay:   z.number().int().min(100).optional(),
  pricePerWeek:  z.number().int().min(100).nullable().optional(),
  pricePerMonth: z.number().int().min(100).nullable().optional(),
  depositAmount: z.number().int().min(0).nullable().optional(),
  address:       z.string().max(200).nullable().optional(),
  city:          z.string().min(2).max(100).optional(),
  state:         z.string().length(2).optional(),
  neighborhood:  z.string().max(100).nullable().optional(),
  latitude:      z.number().min(-90).max(90).optional(),
  longitude:     z.number().min(-180).max(180).optional(),
  isActive:      z.boolean().optional(),  // desativar/reativar anúncio
})
```

#### Resposta de sucesso — `200 OK`

Retorna o item atualizado no mesmo formato de `GET /api/items/:id`.

#### Respostas de erro

| Código | `error.code` | Quando |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Body inválido |
| `401` | `UNAUTHORIZED` | Não autenticado |
| `403` | `FORBIDDEN` | Usuário não é o proprietário do item |
| `404` | `ITEM_NOT_FOUND` | Item não existe |

---

### `DELETE /api/items/:id`

Remove um anúncio (soft delete). Apenas o proprietário pode remover.

**Autenticação**: requerida (proprietário do item)

#### Resposta de sucesso — `204 No Content`

**Comportamento interno:**
- Define `item.deletedAt = now()`, `item.isActive = false`
- Cancela aluguéis pendentes (`PENDING`) associados com notificação ao locatário
- Aluguéis `CONFIRMED` ou `ACTIVE` **bloqueiam** a exclusão (retorna `422`)

#### Respostas de erro

| Código | `error.code` | Quando |
|---|---|---|
| `401` | `UNAUTHORIZED` | Não autenticado |
| `403` | `FORBIDDEN` | Não é o proprietário |
| `404` | `ITEM_NOT_FOUND` | Item não existe |
| `422` | `ACTIVE_BOOKINGS_EXIST` | Item tem aluguéis confirmados ou ativos em andamento |

---

### `POST /api/items/:id/images`

Faz upload de imagens para o item. As imagens são enviadas como `multipart/form-data`.

**Autenticação**: requerida (proprietário do item)  
**Limite**: máximo 8 imagens por item · máximo 5 MB por arquivo

#### Request

```
Content-Type: multipart/form-data

Campo: "images" (múltiplos arquivos)
Formatos aceitos: image/jpeg, image/png, image/webp
Tamanho máximo por arquivo: 5 MB
```

**Internamente:**
1. Valida tipo MIME e tamanho
2. Faz upload para Supabase Storage (`item-images/{itemId}/{uuid}.webp`) com conversão para WebP
3. Cria registros `ItemImage` no banco com `order` sequencial a partir do último existente

#### Resposta de sucesso — `201 Created`

```json
{
  "data": [
    { "id": "img_003", "url": "https://storage.supabase.co/item-images/clx1.../img_003.webp", "order": 2 },
    { "id": "img_004", "url": "https://storage.supabase.co/item-images/clx1.../img_004.webp", "order": 3 }
  ]
}
```

#### Respostas de erro

| Código | `error.code` | Quando |
|---|---|---|
| `400` | `INVALID_FILE_TYPE` | Arquivo não é imagem |
| `400` | `FILE_TOO_LARGE` | Arquivo > 5 MB |
| `400` | `TOO_MANY_FILES` | Upload levaria total > 8 imagens |
| `401` | `UNAUTHORIZED` | Não autenticado |
| `403` | `FORBIDDEN` | Não é o proprietário |
| `404` | `ITEM_NOT_FOUND` | Item não existe |

---

### `DELETE /api/items/:id/images/:imageId`

Remove uma imagem do item.

**Autenticação**: requerida (proprietário do item)  
**Regra**: item deve ter ao menos 1 imagem após a remoção

#### Resposta de sucesso — `204 No Content`

**Comportamento**: remove o arquivo do Supabase Storage e o registro `ItemImage` do banco. Reordena automaticamente as imagens restantes.

#### Respostas de erro

| Código | `error.code` | Quando |
|---|---|---|
| `403` | `FORBIDDEN` | Não é o proprietário |
| `404` | `IMAGE_NOT_FOUND` | Imagem não existe ou não pertence ao item |
| `422` | `LAST_IMAGE` | Não é possível remover a última imagem do item |

---

### `POST /api/items/:id/favorite`

Adiciona ou remove o item dos favoritos do usuário (toggle).

**Autenticação**: requerida

#### Resposta de sucesso — `200 OK`

```json
// Adicionado aos favoritos
{ "data": { "isFavorited": true } }

// Removido dos favoritos
{ "data": { "isFavorited": false } }
```

#### Respostas de erro

| Código | `error.code` | Quando |
|---|---|---|
| `401` | `UNAUTHORIZED` | Não autenticado |
| `404` | `ITEM_NOT_FOUND` | Item não existe |
| `422` | `CANNOT_FAVORITE_OWN_ITEM` | Proprietário tentando favoritar o próprio item |

---

## Implementação — notas para o FullStack Dev

### Query de busca geolocalizada (Prisma + PostGIS)

```typescript
// services/items.server.ts
export async function searchItems(params: ItemsQuery) {
  const { lat, lng, radius = 10, category, minPrice, maxPrice, condition, sort, page = 1, limit = 20 } = params

  const skip = (page - 1) * limit
  const radiusMeters = radius * 1000

  // Quando lat/lng presentes: usar raw SQL para PostGIS
  if (lat && lng) {
    const items = await prisma.$queryRaw<ItemRow[]>`
      SELECT
        i.*,
        ST_Distance(
          ST_MakePoint(i.longitude, i.latitude)::geography,
          ST_MakePoint(${lng}, ${lat})::geography
        ) AS distance
      FROM items i
      WHERE
        i.deleted_at IS NULL
        AND i.is_active = true
        AND i.is_approved = true
        AND ST_DWithin(
          ST_MakePoint(i.longitude, i.latitude)::geography,
          ST_MakePoint(${lng}, ${lat})::geography,
          ${radiusMeters}
        )
        ${category ? Prisma.sql`AND i.category_id = (SELECT id FROM categories WHERE slug = ${category})` : Prisma.empty}
        ${minPrice ? Prisma.sql`AND i.price_per_day >= ${minPrice}` : Prisma.empty}
        ${maxPrice ? Prisma.sql`AND i.price_per_day <= ${maxPrice}` : Prisma.empty}
        ${condition ? Prisma.sql`AND i.condition = ${condition}::"ItemCondition"` : Prisma.empty}
      ORDER BY distance ASC
      LIMIT ${limit} OFFSET ${skip}
    `
    return items
  }

  // Sem geo: usar Prisma ORM normalmente
  return prisma.item.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      isApproved: true,
      ...(category && { category: { slug: category } }),
      ...(minPrice && { pricePerDay: { gte: minPrice } }),
      ...(maxPrice && { pricePerDay: { lte: maxPrice } }),
      ...(condition && { condition }),
    },
    orderBy: { createdAt: "desc" },
    skip,
    take: limit,
    include: { category: true, owner: true, images: { orderBy: { order: "asc" } } },
  })
}
```

### Upload de imagens — conversão para WebP

```typescript
// app/api/items/[id]/images/route.ts
import sharp from "sharp"
import { createClient } from "@supabase/supabase-js"

async function uploadImage(file: File, itemId: string): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer())

  // Converte para WebP com qualidade 85, redimensiona se > 1920px
  const webp = await sharp(buffer)
    .resize({ width: 1920, withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer()

  const fileName = `${itemId}/${crypto.randomUUID()}.webp`
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { error } = await supabase.storage
    .from(process.env.NEXT_PUBLIC_STORAGE_BUCKET!)
    .upload(fileName, webp, { contentType: "image/webp", upsert: false })

  if (error) throw error

  const { data } = supabase.storage
    .from(process.env.NEXT_PUBLIC_STORAGE_BUCKET!)
    .getPublicUrl(fileName)

  return data.publicUrl
}
```

### React Query — hooks do cliente

```typescript
// hooks/useItems.ts

// Busca paginada com filtros (SSR-compatible via initialData)
export function useItems(params: ItemsQuery) {
  return useInfiniteQuery({
    queryKey: ["items", params],
    queryFn: ({ pageParam = 1 }) =>
      itemsService.list({ ...params, page: pageParam }),
    getNextPageParam: (last) => last.meta.hasMore ? last.meta.page + 1 : undefined,
    staleTime: 30_000,  // 30s — dados de listagem ficam frescos por 30s
  })
}

// Detalhe do item
export function useItem(id: string) {
  return useQuery({
    queryKey: ["item", id],
    queryFn: () => itemsService.getById(id),
    staleTime: 60_000,  // 1 min
  })
}

// Criar item
export function useCreateItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: itemsService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] })
    },
  })
}
```
