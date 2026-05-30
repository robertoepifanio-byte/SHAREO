# ADR-010 — Upload de Imagens

**Status**: Aceito  
**Data**: 2026-05-25  
**Decisores**: Arquiteto, Analista de Segurança  
**Revisores**: Full Stack Dev, Designer  
**Referências**: ADR-005 (estrutura), ADR-008 (RLS/auth), CLAUDE.md (design system)

---

## Contexto

O ShareO permite que locadores façam upload de até 8 fotos por anúncio (PRD F04). As fotos são o principal fator de conversão em marketplaces de aluguel — qualidade, velocidade de carregamento e segurança são requisitos críticos.

Decisões necessárias:
1. Onde armazenar (storage provider)
2. Como validar com segurança (tipo, tamanho, conteúdo)
3. Como otimizar para Core Web Vitals (LCP, CLS)
4. Estrutura de paths no bucket
5. Política de acesso (quem pode fazer upload e leitura)

---

## Decisão

**Supabase Storage** como provider de armazenamento, com validação server-side obrigatória via API Route Next.js antes de qualquer escrita no bucket.

---

## Justificativa

O Supabase Storage já está na stack (mesmo provider do banco de dados). Usar um serviço externo (Cloudinary, AWS S3, Uploadthing) adicionaria:
- Uma dependência externa com custo adicional
- Configuração de CORS, presigned URLs e rotação de chaves separada
- Complexidade operacional desnecessária no MVP

O Supabase Storage oferece:
- Image Transformation nativa (redimensionamento, conversão para WebP via URL)
- CDN automático via Cloudflare
- Políticas de bucket integradas com autenticação Supabase Anon Key
- 1GB gratuito no free tier — suficiente para o MVP

---

## Especificação de Validação

### Tipos MIME aceitos

```typescript
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const
```

Apenas formatos comprimidos com suporte nativo a `next/image` e ao Image Transformation do Supabase. `image/gif`, `image/svg+xml` e `image/heic` são rejeitados no MVP.

### Tamanho máximo por arquivo

**10MB por foto** (antes da otimização).

Justificativa: fotos de câmera moderna (iPhone, Android) chegam a 5–8MB em JPEG nativo. 10MB aceita essas fotos sem exigir pré-processamento no dispositivo do usuário. Após upload, a otimização automática via Supabase Image Transformation reduz o tamanho servido para < 200KB.

### Máximo de fotos por anúncio

**8 fotos** (conforme PRD F04). Validação tanto no frontend (desabilita botão de upload após 8 fotos) quanto no server-side (conta fotos existentes no banco antes de aceitar novo upload).

### Validação server-side obrigatória

**Regra inviolável**: nunca confiar na extensão de arquivo ou no `Content-Type` informado pelo cliente. O tipo MIME deve ser validado lendo os primeiros bytes do arquivo (magic bytes).

```typescript
// utils/validate-image.ts
import { fileTypeFromBuffer } from "file-type" // detecta tipo por magic bytes

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"]
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export async function validateImageBuffer(buffer: ArrayBuffer): Promise<{
  valid: boolean
  mimeType?: string
  error?: string
}> {
  if (buffer.byteLength > MAX_FILE_SIZE) {
    return { valid: false, error: "Arquivo muito grande. Máximo: 10MB" }
  }

  const type = await fileTypeFromBuffer(new Uint8Array(buffer))

  if (!type || !ALLOWED_MIME_TYPES.includes(type.mime as typeof ALLOWED_MIME_TYPES[number])) {
    return {
      valid: false,
      error: "Formato não suportado. Use JPEG, PNG ou WebP",
    }
  }

  return { valid: true, mimeType: type.mime }
}
```

**Por que `file-type` e não apenas `Content-Type`**: um atacante pode enviar um arquivo malicioso com `Content-Type: image/jpeg`. A extensão `.jpg` em um arquivo PHP, por exemplo, pode ser executada em servidores mal configurados. Validar magic bytes é a única forma segura de garantir que o conteúdo é realmente uma imagem.

---

## Implementação do Upload

### Fluxo completo

```
Cliente (browser)
  │
  ├─ 1. Seleciona arquivo(s)
  ├─ 2. Valida client-side: tipo por extensão, tamanho — feedback imediato
  └─ 3. POST /api/upload → envia arquivo como FormData
          │
          Server (API Route Next.js)
          ├─ 4. Verifica sessão (NextAuth) — rejeita se não autenticado
          ├─ 5. Verifica propriedade do item — rejeita se itemId não pertence ao user
          ├─ 6. Conta fotos existentes — rejeita se >= 8
          ├─ 7. Valida magic bytes (fileTypeFromBuffer)
          ├─ 8. Valida tamanho (<= 10MB)
          ├─ 9. Gera filename único: ulid() + extensão original
          ├─ 10. Upload para Supabase Storage (service role)
          └─ 11. Persiste URL no banco (ItemImage) via Prisma
                  │
                  Cliente recebe URL pública da imagem
```

### API Route de upload

```typescript
// app/api/upload/route.ts
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { supabaseAdmin } from "@/lib/supabase"
import { validateImageBuffer } from "@/utils/validate-image"
import { monotonicFactory } from "ulid"

const ulid = monotonicFactory()
const MAX_PHOTOS = 8

export async function POST(req: Request) {
  // 1. Autenticação
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "Não autenticado" }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get("file") as File
  const itemId = formData.get("itemId") as string

  if (!file || !itemId) {
    return Response.json({ error: "Parâmetros ausentes" }, { status: 400 })
  }

  // 2. Verificar propriedade do item
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    select: { ownerId: true, _count: { select: { images: true } } },
  })

  if (!item || item.ownerId !== session.user.id) {
    return Response.json({ error: "Acesso negado" }, { status: 403 })
  }

  // 3. Verificar limite de fotos
  if (item._count.images >= MAX_PHOTOS) {
    return Response.json({ error: `Limite de ${MAX_PHOTOS} fotos atingido` }, { status: 422 })
  }

  // 4. Validar conteúdo do arquivo (magic bytes)
  const buffer = await file.arrayBuffer()
  const validation = await validateImageBuffer(buffer)

  if (!validation.valid) {
    return Response.json({ error: validation.error }, { status: 422 })
  }

  // 5. Gerar path único no bucket
  const ext = validation.mimeType === "image/png" ? "png"
            : validation.mimeType === "image/webp" ? "webp"
            : "jpg"
  const filename = `${ulid()}.${ext}`
  const storagePath = `items/${session.user.id}/${itemId}/${filename}`

  // 6. Upload para Supabase Storage (service role — bypassa RLS do Storage)
  const { error: uploadError } = await supabaseAdmin.storage
    .from("item-images")
    .upload(storagePath, new Uint8Array(buffer), {
      contentType: validation.mimeType,
      upsert: false,
    })

  if (uploadError) {
    console.error("Supabase Storage upload error:", uploadError)
    return Response.json({ error: "Falha no upload" }, { status: 500 })
  }

  // 7. Obter URL pública
  const { data: { publicUrl } } = supabaseAdmin.storage
    .from("item-images")
    .getPublicUrl(storagePath)

  // 8. Persistir no banco
  const image = await prisma.itemImage.create({
    data: {
      itemId,
      url: publicUrl,
      order: item._count.images, // próxima posição na ordem
    },
  })

  return Response.json({ id: image.id, url: publicUrl }, { status: 201 })
}
```

---

## Estrutura de Paths no Bucket

```
bucket: item-images (público)
└── items/
    └── {userId}/
        └── {itemId}/
            └── {ulid}.{ext}

Exemplo:
  items/clx1abc2def/clx3ghi4jkl/01HZ9KQWERTY.jpg
```

**Por que incluir `userId` no path**:
- Permite política de bucket do Supabase que restringe uploads por prefixo: `items/${userId}/` só pode ser escrito pelo próprio usuário (quando usar Supabase Auth no futuro)
- Facilita limpeza de dados LGPD: `deleteFolder('items/${userId}/')` remove todas as fotos do usuário

**Por que ULID e não UUID**:
- ULID é monotônico (ordenável por tempo de criação) — útil para debugging e listagem por ordem de upload
- Resistente a colisão e não previsível (não expõe sequência numérica)

---

## Política de Bucket no Supabase

O bucket `item-images` é **público para leitura** (URLs acessíveis sem autenticação — necessário para exibir fotos em páginas SSR/ISR).

A escrita é controlada server-side pelo API Route (usando `supabaseAdmin` com service role key). Não há política de INSERT no bucket client-side — todo upload passa pelo servidor.

```sql
-- Política de leitura pública
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'item-images');

-- Não existe política de INSERT/DELETE client-side
-- Toda escrita é feita via service role no API Route
```

---

## Otimização de Imagens

### next/image obrigatório

Todo `<img>` de item deve usar o componente `<Image>` do Next.js com `width` e `height` declarados para evitar CLS (Cumulative Layout Shift).

```typescript
// components/features/items/ItemCard.tsx
import Image from "next/image"

export function ItemCard({ item }: { item: Item }) {
  return (
    <div className="aspect-4/3 relative overflow-hidden rounded-lg">
      <Image
        src={item.images[0]?.url ?? "/images/placeholder-item.jpg"}
        alt={item.title}
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
        className="object-cover"
        priority={false} // true apenas para a primeira imagem acima do fold
      />
    </div>
  )
}
```

### Supabase Image Transformation

Usar a API de transformação do Supabase para servir imagens no tamanho correto e em WebP:

```typescript
// utils/image.ts
export function getOptimizedImageUrl(
  originalUrl: string,
  options: { width: number; height?: number; quality?: number }
): string {
  const url = new URL(originalUrl)
  url.searchParams.set("width", String(options.width))
  if (options.height) url.searchParams.set("height", String(options.height))
  url.searchParams.set("format", "webp")
  url.searchParams.set("quality", String(options.quality ?? 80))
  return url.toString()
}

// Uso:
// Card thumbnail (375px wide): getOptimizedImageUrl(url, { width: 400, quality: 75 })
// Detalhe do item (1280px max): getOptimizedImageUrl(url, { width: 1200, quality: 85 })
```

**Configuração no `next.config.ts`**:
```typescript
const config = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
}
```

### Exclusão de imagens

Ao deletar um item (soft delete) ou remover uma foto específica, o arquivo no Supabase Storage deve ser deletado:

```typescript
// lib/storage.ts
export async function deleteItemImage(storagePath: string): Promise<void> {
  const { error } = await supabaseAdmin.storage
    .from("item-images")
    .remove([storagePath])
  if (error) console.error("Storage delete error:", error)
}
```

---

## Consequências

**Positivas**:
- Zero dependência externa adicional (Supabase já na stack)
- Validação por magic bytes elimina upload de arquivos maliciosos
- CDN automático via Cloudflare (Supabase) — imagens servidas globalmente com baixa latência
- next/image com `fill` + `sizes` garante CLS = 0 nas listagens
- WebP via Supabase Image Transformation reduz tamanho das imagens em ~30% vs JPEG

**Negativas**:
- Supabase Image Transformation tem custo acima do free tier (após 50MB/mês transformados) — aceitável no MVP
- Deleção de arquivo do Storage precisa ser explicitamente chamada (não acontece automaticamente ao deletar `ItemImage` do banco) — risco de orphaned files se não implementado corretamente

---

## Itens em Aberto

- [ ] Implementar job de limpeza de arquivos órfãos (Storage sem registro no banco) — P2
- [ ] Definir placeholder de imagem para itens sem fotos (`/images/placeholder-item.jpg`)
- [ ] Avaliar upload direto do browser para Supabase Storage (presigned URLs) para evitar latência no API Route — H2, quando volume de uploads justificar
- [ ] Moderação de imagens automática (detectar conteúdo impróprio via Vision API) — H2
