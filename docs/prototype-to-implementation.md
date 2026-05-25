# Mapeamento Técnico: Protótipo → Implementação

**Gerado por**: fullstack-dev-shareo (Fase 3 — Revisão Pré-Sprint 1)  
**Data**: 2026-05-25  
**Referências**: ADR-005, ADR-006, ADR-008, PRD.md, shareo-prototipo.html

---

## Seção 1 — Mapa de Rotas

Telas identificadas no protótipo (`shareo-prototipo.html`) e sua correspondência no Next.js App Router.

| Tela no Protótipo | ID no Protótipo | Rota Next.js (App Router) | Grupo | Estratégia | Auth Required | PRD Feature |
|---|---|---|---|---|---|---|
| Landing Page (Home) | `screen-home` | `app/(public)/page.tsx` | `(public)` | SSG | Não | F01 (parcial) |
| Busca / Listagem com filtros | `screen-search` | `app/(public)/alugar/page.tsx` | `(public)` | SSR | Não | F05, F06 |
| Detalhe do item | `screen-item-detail` | `app/(public)/alugar/[slug]/page.tsx` | `(public)` | ISR 60s | Não | F07 |
| Login | `screen-login` | `app/login/page.tsx` | (raiz, sem layout) | CSR | Não | F01 |
| Cadastro | `screen-signup` | `app/cadastro/page.tsx` | (raiz, sem layout) | CSR | Não | F01, F03 |
| Cadastrar item (anunciar) | `screen-add-item` | `app/(auth)/meus-itens/novo/page.tsx` | `(auth)` | CSR | Sim | F04 |
| Dashboard do locador | `screen-dashboard` | `app/(auth)/dashboard/page.tsx` | `(auth)` | CSR | Sim | F10, F12 |
| Chat — inbox de conversas | `screen-chat` (inbox) | `app/(auth)/chat/page.tsx` | `(auth)` | CSR | Sim | F09 |
| Chat — thread individual | `screen-chat` (thread) | `app/(auth)/chat/[conversationId]/page.tsx` | `(auth)` | CSR | Sim | F09 |
| Perfil público do usuário | (link no detalhe do item) | `app/(public)/perfil/[id]/page.tsx` | `(public)` | ISR 300s | Não | F02 |
| Listagem por categoria | (chips de categoria) | `app/(public)/categoria/[slug]/page.tsx` | `(public)` | ISR 300s | Não | F05 |
| Editar item | (botão "Editar" no dashboard) | `app/(auth)/meus-itens/[id]/editar/page.tsx` | `(auth)` | CSR | Sim | F04 |
| Favoritos | (menu dashboard) | `app/(auth)/favoritos/page.tsx` | `(auth)` | CSR | Sim | F11 |
| Aluguéis (locações) | (menu dashboard) | `app/(auth)/alugueis/page.tsx` | `(auth)` | CSR | Sim | F12 |
| Formulário de solicitação | (botão "Solicitar locação") | `app/(auth)/alugueis/novo/page.tsx` | `(auth)` | CSR | Sim | F08 |
| Dashboard admin | (não presente no protótipo) | `app/(admin)/admin/page.tsx` | `(admin)` | CSR | Sim (ADMIN) | F13 |
| Perfil / Configurações | (menu "Configurações") | `app/(auth)/perfil/page.tsx` | `(auth)` | CSR | Sim | F02 |
| Sobre / Como funciona | (seção "Como funciona" na home) | `app/(public)/como-funciona/page.tsx` | `(public)` | SSG | Não | F02 (parcial) |
| Notificações | (componente global) | Componente em `app/(auth)/layout.tsx` | `(auth)` | CSR | Sim | F14 |

**Notas de rota:**
- `app/login/page.tsx` e `app/cadastro/page.tsx` ficam fora de qualquer route group — sem layout wrapper, para máxima simplicidade.
- O `[slug]` de item segue o padrão SEO definido como pendente (E1): `furadeira-bosch-em-natal-rn`. Padrão a formalizar em ADR antes do Sprint 1.
- Rotas SSR devem ter `loading.tsx` obrigatório (Regra 2, ADR-006).
- Rotas ISR devem implementar `generateStaticParams` (Regra 3, ADR-006).

**Total: 19 rotas únicas mapeadas** (incluindo sub-rotas do chat e admin que não aparecem explicitamente no protótipo).

---

## Seção 2 — Árvore de Componentes por Rota

Convenção:
- **[S]** = Server Component (padrão)
- **[C]** = Client Component (`"use client"`)
- **[RQ]** = dados via React Query no cliente
- **[fetch]** = dados via `fetch`/Prisma no servidor

### 2.1 Landing Page — `app/(public)/page.tsx`

```
page.tsx [S][fetch: stats, featuredItems]
├── components/layout/Header.tsx [S]
│   ├── Logo (next/image) [S]
│   ├── components/features/auth/UserMenu.tsx [C] — "use client" (estado de sessão)
│   └── components/layout/DesktopNav.tsx [S]
├── Hero [S] (inline na página ou HeroSection.tsx [S])
│   └── components/shared/HeroSearch.tsx [C] — "use client" (input controlado)
├── CategoryGrid [S]
│   └── components/shared/CategoryIcon.tsx [S] — next/image para cada ícone de categoria
├── MapPreview [S] — placeholder estático na landing
│   └── components/shared/MapView.tsx [C] — "use client" (Mapbox SDK)
├── ItemGrid (featured) [S]
│   └── components/features/items/ItemCard.tsx [S]
│       └── components/features/items/FavButton.tsx [C] — "use client" (toggle estado)
├── HowItWorks [S] (seção estática)
├── OwnerCTA [S] (seção estática)
├── components/layout/Footer.tsx [S]
└── components/layout/BottomNav.tsx [C] — "use client" (active state por rota)
```

### 2.2 Busca / Listagem — `app/(public)/alugar/page.tsx`

```
page.tsx [S][fetch: items via searchParams — SSR]
├── components/layout/Header.tsx [S]
├── components/features/items/SearchBar.tsx [C] — "use client" (input + submit)
├── components/features/items/CategoryChips.tsx [C] — "use client" (seleção ativa)
├── components/features/items/ItemFilters.tsx [C] — "use client" (checkboxes, range)
│   └── (sidebar desktop — oculta mobile)
├── components/features/items/FilterSheet.tsx [C] — "use client" (Sheet mobile shadcn/ui)
├── components/features/items/SortSelect.tsx [C] — "use client" (select controlado)
├── components/features/items/ItemGrid.tsx [S]
│   └── components/features/items/ItemCard.tsx [S]
│       └── components/features/items/FavButton.tsx [C]
├── LoadMoreButton.tsx [C] — "use client" (pagination)
└── loading.tsx [S] — skeleton obrigatório (Regra 2, ADR-006)
```

### 2.3 Detalhe do Item — `app/(public)/alugar/[slug]/page.tsx`

```
page.tsx [S][fetch: item by slug — ISR 60s]
├── components/layout/Header.tsx [S]
├── BackBar.tsx [S]
├── components/features/items/ItemGallery.tsx [C] — "use client" (troca de foto ativa)
├── components/features/items/ItemDetailCard.tsx [S] (container de preço e info)
│   ├── components/features/bookings/BookingDatePicker.tsx [C] — "use client" (datas, cálculo dinâmico)
│   ├── components/features/bookings/PriceSummary.tsx [C] — "use client" (computed a partir das datas)
│   ├── Suspense boundary ← envolve BookingRequestButton [C]
│   │   └── components/features/bookings/BookingRequestButton.tsx [C] — "use client"
│   ├── components/shared/FavButton.tsx [C] — "use client"
│   └── components/features/items/OwnerMiniCard.tsx [S]
├── components/features/items/ItemDescription.tsx [S]
├── components/features/items/ItemTags.tsx [S]
├── components/features/reviews/ReviewList.tsx [S][fetch: reviews server-side]
└── MapView.tsx [C] — "use client" envolvido em Suspense (Regra 4, ADR-006)
```

### 2.4 Login — `app/login/page.tsx`

```
page.tsx [S] (sem layout wrapper)
└── components/features/auth/LoginForm.tsx [C] — "use client" (useState, react-hook-form)
    ├── Logo (next/image) [C — dentro do componente]
    └── SocialButton (Google OAuth) [C]
```

### 2.5 Cadastro — `app/cadastro/page.tsx`

```
page.tsx [S] (sem layout wrapper)
└── components/features/auth/RegisterForm.tsx [C] — "use client"
    ├── TypeTabs (PF / PJ) [C]
    ├── CPFInput [C] — validação com máscara
    └── LGPDConsent [C] — checkbox de consentimento
```

### 2.6 Cadastrar Item — `app/(auth)/meus-itens/novo/page.tsx`

```
page.tsx [S]
├── components/layout/HeaderAuth.tsx [S]
├── BackBar.tsx [S]
└── components/features/items/ItemForm.tsx [C] — "use client" (react-hook-form, upload)
    ├── components/features/items/PhotoUpload.tsx [C] — "use client" (drag-and-drop, preview)
    ├── CategorySelect.tsx [C] — select controlado
    ├── AvailabilityGrid.tsx [C] — "use client" (dias da semana com toggle)
    └── PriceInputs.tsx [C] — inputs de preço dia/semana/mês
```

### 2.7 Dashboard — `app/(auth)/dashboard/page.tsx`

```
page.tsx [S][RQ: dados carregados client-side via React Query]
├── components/layout/HeaderAuth.tsx [S]
├── components/layout/Sidebar.tsx [S] (desktop)
├── DashboardTabs.tsx [C] — "use client" (tabs mobile)
└── components/features/dashboard/DashboardMain.tsx [C] — "use client" [RQ]
    ├── ProfileHero.tsx [C] [RQ]
    ├── KPIRow.tsx [C] [RQ]
    ├── MyItemsGrid.tsx [C] [RQ]
    │   └── MyItemCard.tsx [C]
    └── ActiveRentals.tsx [C] [RQ]
```

### 2.8 Chat Inbox — `app/(auth)/chat/page.tsx`

```
page.tsx [S]
├── components/layout/HeaderAuth.tsx [S]
└── components/features/chat/ConversationList.tsx [C] — "use client" [RQ]
    └── ConversationItem.tsx [C]
```

### 2.9 Chat Thread — `app/(auth)/chat/[conversationId]/page.tsx`

```
page.tsx [S][fetch: verificar autorização server-side]
└── components/features/chat/ChatWindow.tsx [C] — "use client" [Supabase Realtime]
    ├── ChatThreadHeader.tsx [C]
    ├── components/features/chat/MessageList.tsx [C]
    │   └── MessageBubble.tsx [C]
    └── components/features/chat/MessageInput.tsx [C] — "use client" (input + send)
```

---

## Seção 3 — Uso dos Assets `icones/`

### 3.1 Logos

| Arquivo | Componente de Destino | Como Importar | Observações |
|---|---|---|---|
| `ShareO v3 fundo transparente.png` | `components/layout/Header.tsx`, `app/login/page.tsx`, `app/cadastro/page.tsx` | `<Image src="/images/shareo-logo.png" width={120} height={36} alt="ShareO — voltar para a página inicial" priority />` | Mover para `public/images/shareo-logo.png`. `priority` obrigatório (above the fold). Usar em fundo navy e fundo claro |
| `Shareo logo Navy.png` | Landing page hero section, e-mails transacionais, OG image | `<Image src="/images/shareo-logo-navy.png" width={200} height={60} alt="ShareO" />` | Mover para `public/images/shareo-logo-navy.png`. Usar apenas em contextos marketing (fundo claro). Para e-mails: exportar como base64 ou URL pública Supabase Storage |

### 3.2 Ícones de Categoria

| Arquivo | Nome Canônico | Componente de Destino | Rota de Uso | Como Importar |
|---|---|---|---|---|
| `ferramentas.jpeg` | `ferramentas` | `components/shared/CategoryIcon.tsx` | Landing, Busca, Detalhe, Categoria | `<Image src="/images/categorias/ferramentas.webp" width={52} height={52} alt="Categoria: Ferramentas" />` |
| `construção.jpeg` | `construcao` | `components/shared/CategoryIcon.tsx` | Landing, Busca, Detalhe, Categoria | `<Image src="/images/categorias/construcao.webp" width={52} height={52} alt="Categoria: Construção Civil" />` |
| `eletronicos.jpeg` | `eletronicos` | `components/shared/CategoryIcon.tsx` | Landing, Busca, Detalhe, Categoria | `<Image src="/images/categorias/eletronicos.webp" width={52} height={52} alt="Categoria: Eletrônicos" />` |
| `Casa e jardim.jpeg` | `casa-jardim` | `components/shared/CategoryIcon.tsx` | Landing, Busca, Detalhe, Categoria | `<Image src="/images/categorias/casa-jardim.webp" width={52} height={52} alt="Categoria: Casa e Jardim" />` |
| `esportes.jpeg` | `esportes` | `components/shared/CategoryIcon.tsx` | Landing, Busca, Detalhe, Categoria | `<Image src="/images/categorias/esportes.webp" width={52} height={52} alt="Categoria: Esporte e Lazer" />` |
| `festas .jpeg` ou `festas v2.jpeg` | `festas` | `components/shared/CategoryIcon.tsx` | Landing, Busca, Detalhe, Categoria | `<Image src="/images/categorias/festas.webp" width={52} height={52} alt="Categoria: Festas e Eventos" />` |
| `modas.jpeg` ou `modas v2.jpeg` | `moda` | `components/shared/CategoryIcon.tsx` | Landing, Busca, Detalhe, Categoria | `<Image src="/images/categorias/moda.webp" width={52} height={52} alt="Categoria: Moda" />` |

### 3.3 Escolha de Versão (festas e modas)

**Festas**: Usar `festas v2.jpeg` — a convenção de nomenclatura "v2" indica versão revisada. Inspecionar visualmente ambas antes da implementação; se `festas v2` tiver melhor enquadramento ou fundo limpo (mais fácil de converter para WebP com qualidade), priorizar a v2.

**Modas**: Usar `modas v2.jpeg` pelo mesmo critério. A versão v2 presume correção de algum problema da versão original.

**Regra de decisão para o desenvolvedor**: abrir ambas as versões no explorador e escolher a que tiver:
1. Melhor resolução (mínimo 200×200px)
2. Objeto centralizado no enquadramento
3. Fundo mais limpo (evita artefatos na conversão WebP)

### 3.4 Conversão de Formato

**Todos os 7 arquivos JPEG de categoria precisam ser convertidos para WebP antes de usar** no Next.js.

Motivo: JPEG tem compressão inferior ao WebP para ícones pequenos (52×52px). WebP reduz ~30% no tamanho do arquivo sem perda de qualidade perceptível. O `next/image` converte automaticamente no runtime quando a fonte é um arquivo local em `public/`, mas o ideal é entregar WebP pré-convertido para eliminar processamento em build time.

**Processo recomendado (uma única vez, pré-desenvolvimento):**

```bash
# Usando sharp via npx ou script Node
npx sharp-cli -i icones/*.jpeg -o public/images/categorias/ -f webp -q 85

# Ou com ImageMagick (se disponível no ambiente)
for f in icones/*.jpeg; do
  name=$(basename "$f" .jpeg)
  convert "$f" -resize 104x104 "public/images/categorias/${name}.webp"
done
```

**Destino final**: `public/images/categorias/[nome-kebab-case].webp`

**Logos PNG**: não precisam de conversão. Next.js serve PNG eficientemente. Mover apenas para `public/images/`.

### 3.5 Implementação do Componente CategoryIcon

```typescript
// components/shared/CategoryIcon.tsx — Server Component
import Image from "next/image"

const CATEGORY_ICONS: Record<string, { src: string; label: string }> = {
  ferramentas:  { src: "/images/categorias/ferramentas.webp",  label: "Categoria: Ferramentas" },
  construcao:   { src: "/images/categorias/construcao.webp",   label: "Categoria: Construção Civil" },
  eletronicos:  { src: "/images/categorias/eletronicos.webp",  label: "Categoria: Eletrônicos" },
  "casa-jardim":{ src: "/images/categorias/casa-jardim.webp",  label: "Categoria: Casa e Jardim" },
  esportes:     { src: "/images/categorias/esportes.webp",     label: "Categoria: Esporte e Lazer" },
  festas:       { src: "/images/categorias/festas.webp",       label: "Categoria: Festas e Eventos" },
  moda:         { src: "/images/categorias/moda.webp",         label: "Categoria: Moda" },
}

interface CategoryIconProps {
  slug: string
  size?: number
}

export function CategoryIcon({ slug, size = 52 }: CategoryIconProps) {
  const icon = CATEGORY_ICONS[slug]
  if (!icon) return <span aria-hidden="true" className="text-3xl">📦</span>

  return (
    <Image
      src={icon.src}
      width={size}
      height={size}
      alt={icon.label}
      className="object-contain"
    />
  )
}
```

---

## Seção 4 — Cenários de Teste E2E (Playwright)

Localização dos arquivos: `e2e/` (conforme ADR-005).

**Regra de seletores**: sempre `getByRole`, `getByLabel`, `getByText` — nunca `querySelector` ou seletores CSS.

### 4.1 Fluxo 1 — Cadastro e Login (F01)

```typescript
// e2e/auth.spec.ts
import { test, expect } from "@playwright/test"

test.describe("F01 — Cadastro e Login", () => {

  test.describe("Cadastro de usuário PF", () => {
    test("usuário faz cadastro completo como Pessoa Física", async ({ page }) => {
      await page.goto("/cadastro")

      // Selecionar tipo PF (já ativo por padrão)
      await page.getByRole("tab", { name: "Pessoa Física" }).click()

      await page.getByLabel("Nome").fill("Roberto")
      await page.getByLabel("Sobrenome").fill("Silva")
      await page.getByLabel("E-mail").fill("roberto.teste@example.com")
      await page.getByLabel("Telefone").fill("(84) 9 9999-9999")
      await page.getByLabel("Senha").fill("SenhaSegura123!")
      await page.getByLabel("Confirmar senha").fill("SenhaSegura123!")
      await page.getByLabel("CPF").fill("529.982.247-25") // CPF válido para testes

      // Aceitar termos (LGPD)
      await page.getByRole("checkbox", { name: /termos de uso/i }).check()

      await page.getByRole("button", { name: "Criar minha conta" }).click()

      // Verificação de e-mail enviado
      await expect(page.getByText(/verifique seu e-mail/i)).toBeVisible()
    })

    test("usuário PF com CPF inválido vê mensagem de erro", async ({ page }) => {
      await page.goto("/cadastro")
      await page.getByLabel("CPF").fill("111.111.111-11") // CPF inválido
      await page.getByRole("button", { name: "Criar minha conta" }).click()

      await expect(page.getByText(/CPF inválido/i)).toBeVisible()
    })

    test("e-mail já cadastrado exibe mensagem específica", async ({ page }) => {
      await page.goto("/cadastro")
      await page.getByLabel("E-mail").fill("usuario.existente@example.com")
      // ... preencher outros campos válidos ...
      await page.getByRole("button", { name: "Criar minha conta" }).click()

      await expect(page.getByText(/e-mail já cadastrado/i)).toBeVisible()
    })
  })

  test.describe("Login", () => {
    test("usuário faz login com credenciais válidas", async ({ page }) => {
      await page.goto("/login")

      await page.getByLabel("E-mail").fill("roberto@example.com")
      await page.getByLabel("Senha").fill("SenhaSegura123!")
      await page.getByRole("button", { name: "Entrar" }).click()

      // Redireciona para home após login
      await expect(page).toHaveURL("/")
      // Avatar do usuário aparece no header
      await expect(page.getByRole("button", { name: /meu perfil/i })).toBeVisible()
    })

    test("credenciais inválidas exibem mensagem de erro", async ({ page }) => {
      await page.goto("/login")
      await page.getByLabel("E-mail").fill("naoexiste@example.com")
      await page.getByLabel("Senha").fill("senhaerrada")
      await page.getByRole("button", { name: "Entrar" }).click()

      await expect(page.getByText(/e-mail ou senha inválidos/i)).toBeVisible()
    })

    test("usuário com e-mail não verificado vê mensagem de verificação", async ({ page }) => {
      await page.goto("/login")
      await page.getByLabel("E-mail").fill("nao.verificado@example.com")
      await page.getByLabel("Senha").fill("SenhaSegura123!")
      await page.getByRole("button", { name: "Entrar" }).click()

      await expect(page.getByText(/verifique seu e-mail/i)).toBeVisible()
    })

    test("logout encerra sessão e redireciona para home", async ({ page }) => {
      // Assumindo fixture com usuário logado
      await page.goto("/dashboard")
      await page.getByRole("button", { name: "Sair da conta" }).click()

      await expect(page).toHaveURL("/")
      await expect(page.getByRole("link", { name: "Entrar" })).toBeVisible()
    })
  })
})
```

### 4.2 Fluxo 2 — Busca e Listagem (F05 + F06)

```typescript
// e2e/items.spec.ts
import { test, expect } from "@playwright/test"

test.describe("F05 + F06 — Busca e Listagem", () => {

  test("busca por categoria 'Ferramentas' exibe itens corretos", async ({ page }) => {
    await page.goto("/alugar")

    // Selecionar chip de categoria
    await page.getByRole("button", { name: /ferramentas/i }).click()

    // Verificar que os resultados contêm itens de ferramentas
    const itemCards = page.getByRole("article")
    await expect(itemCards.first()).toBeVisible()

    // Verificar que a contagem de resultados é atualizada
    await expect(page.getByText(/itens encontrados/i)).toBeVisible()
  })

  test("filtro por localização retorna itens dentro do raio", async ({ page }) => {
    await page.goto("/alugar?cidade=natal-rn&raio=5")

    // Verificar que os resultados indicam distância <= 5km
    const distanceLabels = page.getByText(/km ·/i)
    await expect(distanceLabels.first()).toBeVisible()

    // Abrir painel de filtros e alterar raio
    await page.getByRole("button", { name: /filtros/i }).click()
    await page.getByLabel("Até 2 km").check()
    await page.getByRole("button", { name: "Aplicar filtros" }).click()

    await expect(page.getByText(/itens encontrados/i)).toBeVisible()
  })

  test("busca sem resultados exibe empty state com sugestão", async ({ page }) => {
    await page.goto("/alugar?q=submarino+nuclear+para+alugar")

    await expect(page.getByText(/nenhum item encontrado/i)).toBeVisible()
    await expect(page.getByText(/ampliar o raio de busca/i)).toBeVisible()
  })

  test("ordenar por 'Menor preço' reordena os resultados", async ({ page }) => {
    await page.goto("/alugar")

    await page.getByLabel("Ordenar por").selectOption("Menor preço")

    const prices = page.locator(".item-card__price")
    // Verificar que primeiro preço é menor ou igual ao segundo
    const firstPrice = await prices.first().innerText()
    const secondPrice = await prices.nth(1).innerText()
    // Extração de valor numérico para comparação
    const toNum = (s: string) => parseFloat(s.replace(/[^\d,]/g, "").replace(",", "."))
    expect(toNum(firstPrice)).toBeLessThanOrEqual(toNum(secondPrice))
  })
})
```

### 4.3 Fluxo 3 — Cadastro de Anúncio (F04)

```typescript
// e2e/items.spec.ts (continuação)
test.describe("F04 — Cadastro de Anúncio", () => {

  test.beforeEach(async ({ page }) => {
    // Login antes de cada teste do grupo
    await page.goto("/login")
    await page.getByLabel("E-mail").fill("locador@example.com")
    await page.getByLabel("Senha").fill("SenhaSegura123!")
    await page.getByRole("button", { name: "Entrar" }).click()
    await expect(page).toHaveURL("/")
  })

  test("proprietário cria anúncio completo com fotos", async ({ page }) => {
    await page.goto("/meus-itens/novo")

    // Upload de foto (mínimo 1)
    const fileInput = page.getByLabel(/clique para enviar/i)
    await fileInput.setInputFiles([
      "e2e/fixtures/foto-item-1.jpg",
      "e2e/fixtures/foto-item-2.jpg",
    ])

    await page.getByLabel("Categoria").selectOption("Ferramentas")
    await page.getByLabel("Título do anúncio").fill("Furadeira Bosch GSB 13 RE")
    await page.getByLabel("Descrição").fill("Furadeira profissional em ótimo estado.")
    await page.getByLabel("Marca").fill("Bosch")
    await page.getByLabel("Modelo").fill("GSB 13 RE")
    await page.getByLabel("Condição").selectOption("Seminovo — excelente estado")
    await page.getByLabel("Preço por dia").fill("35")
    await page.getByLabel("Local de retirada").fill("Ponta Negra, Natal-RN")

    await page.getByRole("button", { name: "Publicar anúncio" }).click()

    // Redireciona para dashboard com toast de sucesso
    await expect(page).toHaveURL("/dashboard")
    await expect(page.getByText(/item publicado com sucesso/i)).toBeVisible()
  })

  test("upload de arquivo acima de 10MB exibe erro", async ({ page }) => {
    await page.goto("/meus-itens/novo")

    // Arquivo grande simulado
    const fileInput = page.getByLabel(/clique para enviar/i)
    await fileInput.setInputFiles("e2e/fixtures/arquivo-grande-15mb.jpg")

    await expect(page.getByText(/arquivo muito grande/i)).toBeVisible()
    await expect(page.getByText(/máximo 10MB/i)).toBeVisible()
  })

  test("anúncio sem foto é rejeitado com mensagem de erro", async ({ page }) => {
    await page.goto("/meus-itens/novo")

    await page.getByLabel("Categoria").selectOption("Ferramentas")
    await page.getByLabel("Título do anúncio").fill("Item sem foto")
    await page.getByLabel("Preço por dia").fill("50")

    await page.getByRole("button", { name: "Publicar anúncio" }).click()

    await expect(page.getByText(/ao menos uma foto é obrigatória/i)).toBeVisible()
  })

  test("proprietário não pode solicitar aluguel do próprio item", async ({ page }) => {
    // Navegar para o detalhe de um item que pertence ao usuário logado
    await page.goto("/alugar/furadeira-bosch-em-natal-rn")

    // O botão "Solicitar locação" deve estar desabilitado ou oculto para o próprio dono
    const bookingButton = page.getByRole("button", { name: /solicitar locação/i })
    await expect(bookingButton).toBeDisabled()
  })
})
```

### 4.4 Fluxo 4 — Solicitação de Aluguel (F08)

```typescript
// e2e/booking.spec.ts
import { test, expect } from "@playwright/test"

test.describe("F08 — Solicitação de Aluguel", () => {

  test("locatário envia solicitação de aluguel com datas válidas", async ({ page }) => {
    // Login como locatário
    await page.goto("/login")
    await page.getByLabel("E-mail").fill("locatario@example.com")
    await page.getByLabel("Senha").fill("SenhaSegura123!")
    await page.getByRole("button", { name: "Entrar" }).click()

    await page.goto("/alugar/furadeira-bosch-em-natal-rn")

    // Selecionar datas futuras
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dayAfter = new Date()
    dayAfter.setDate(dayAfter.getDate() + 3)

    await page.getByLabel("Retirada").fill(tomorrow.toISOString().split("T")[0])
    await page.getByLabel("Devolução").fill(dayAfter.toISOString().split("T")[0])

    // Verificar cálculo de preço dinâmico
    await expect(page.getByText(/Total/i)).toBeVisible()

    await page.getByRole("button", { name: /solicitar locação/i }).click()

    // Confirmação de solicitação enviada
    await expect(page.getByText(/solicitação enviada ao proprietário/i)).toBeVisible()
    // Status PENDING na página de aluguéis
    await page.goto("/alugueis")
    await expect(page.getByText(/pendente/i)).toBeVisible()
  })

  test("datas inválidas — início no passado — são rejeitadas", async ({ page }) => {
    await page.goto("/alugar/furadeira-bosch-em-natal-rn")

    // Data no passado
    await page.getByLabel("Retirada").fill("2020-01-01")
    await page.getByLabel("Devolução").fill("2020-01-05")

    await expect(page.getByText(/data inválida/i)).toBeVisible()
  })

  test("locador aceita solicitação de aluguel", async ({ page }) => {
    // Login como locador
    await page.goto("/login")
    await page.getByLabel("E-mail").fill("locador@example.com")
    await page.getByLabel("Senha").fill("SenhaSegura123!")
    await page.getByRole("button", { name: "Entrar" }).click()

    await page.goto("/dashboard")

    // Encontrar a solicitação pendente
    await expect(page.getByText(/solicitação pendente/i)).toBeVisible()
    await page.getByRole("button", { name: /aceitar/i }).click()

    // Confirmação de aceitação
    await expect(page.getByText(/solicitação confirmada/i)).toBeVisible()
    await expect(page.getByText(/confirmado/i)).toBeVisible() // status CONFIRMED
  })

  test("locador recusa solicitação de aluguel", async ({ page }) => {
    await page.goto("/login")
    await page.getByLabel("E-mail").fill("locador@example.com")
    await page.getByLabel("Senha").fill("SenhaSegura123!")
    await page.getByRole("button", { name: "Entrar" }).click()

    await page.goto("/dashboard")

    await expect(page.getByText(/solicitação pendente/i)).toBeVisible()
    await page.getByRole("button", { name: /recusar/i }).click()

    // Dialog de confirmação de recusa
    await page.getByRole("dialog").getByRole("button", { name: /confirmar recusa/i }).click()

    await expect(page.getByText(/solicitação recusada/i)).toBeVisible()
  })

  test("usuário não autenticado é redirecionado ao tentar solicitar aluguel", async ({ page }) => {
    await page.goto("/alugar/furadeira-bosch-em-natal-rn")

    await page.getByRole("button", { name: /solicitar locação/i }).click()

    // Redireciona para login
    await expect(page).toHaveURL(/\/login/)
  })
})
```

### 4.5 Fluxo 5 — Chat in-app (F09)

```typescript
// e2e/chat.spec.ts
import { test, expect, chromium } from "@playwright/test"

test.describe("F09 — Chat in-app", () => {

  test("mensagem aparece em tempo real no outro lado (dois browsers)", async () => {
    // Teste multi-browser para Supabase Realtime
    const browser1 = await chromium.launch()
    const browser2 = await chromium.launch()

    const locadorPage = await browser1.newPage()
    const locatarioPage = await browser2.newPage()

    // Login locador
    await locadorPage.goto("/login")
    await locadorPage.getByLabel("E-mail").fill("locador@example.com")
    await locadorPage.getByLabel("Senha").fill("SenhaSegura123!")
    await locadorPage.getByRole("button", { name: "Entrar" }).click()

    // Login locatário
    await locatarioPage.goto("/login")
    await locatarioPage.getByLabel("E-mail").fill("locatario@example.com")
    await locatarioPage.getByLabel("Senha").fill("SenhaSegura123!")
    await locatarioPage.getByRole("button", { name: "Entrar" }).click()

    // Ambos abrem a mesma conversa
    const conversationId = "conv-test-123"
    await locadorPage.goto(`/chat/${conversationId}`)
    await locatarioPage.goto(`/chat/${conversationId}`)

    // Locador envia mensagem
    await locadorPage.getByLabel("Campo de mensagem").fill("Olá, ainda está disponível?")
    await locadorPage.getByRole("button", { name: "Enviar mensagem" }).click()

    // Locatário vê a mensagem em tempo real (timeout de 5s para Realtime)
    await expect(locatarioPage.getByText("Olá, ainda está disponível?")).toBeVisible({ timeout: 5000 })

    await browser1.close()
    await browser2.close()
  })

  test("usuário não autenticado é redirecionado ao tentar acessar chat", async ({ page }) => {
    await page.goto("/chat")

    // Deve ser redirecionado para login
    await expect(page).toHaveURL(/\/login/)
  })

  test("usuário não pode acessar conversa de terceiros", async ({ page }) => {
    // Login como usuário C (não participante da conversa)
    await page.goto("/login")
    await page.getByLabel("E-mail").fill("usuario.outro@example.com")
    await page.getByLabel("Senha").fill("SenhaSegura123!")
    await page.getByRole("button", { name: "Entrar" }).click()

    // Tentar acessar conversa de outros usuários diretamente pela URL
    await page.goto("/chat/conv-entre-outros-usuarios")

    // Deve retornar 403 ou redirecionar
    await expect(page.getByText(/acesso negado/i)).toBeVisible()
  })

  test("chat só existe após solicitação de aluguel — mensagem direta não existe", async ({ page }) => {
    // Login como locatário
    await page.goto("/login")
    await page.getByLabel("E-mail").fill("locatario@example.com")
    await page.getByLabel("Senha").fill("SenhaSegura123!")
    await page.getByRole("button", { name: "Entrar" }).click()

    // No perfil público de um item, não deve haver botão "Enviar mensagem"
    // sem solicitação de aluguel ativa
    await page.goto("/alugar/camera-sony-a7-em-natal-rn")

    await expect(page.getByRole("button", { name: /enviar mensagem sem solicitar/i })).not.toBeVisible()
  })
})
```

---

## Seção 5 — Lacunas entre Protótipo e PRD

### 5.1 Telas do Protótipo sem Feature PRD correspondente

| Tela / Elemento no Protótipo | Observação |
|---|---|
| "Pagamento seguro via Shareo · Seguro incluso" (detalhe do item) | Copy no protótipo menciona seguro, mas seguro está **fora do escopo MVP** (PRD 3.2). Texto deve ser alterado para não criar expectativa falsa. |
| Taxa ShareO de 10% calculada no resumo de preço | Comissão da plataforma não tem Feature ID. É lógica de negócio sem cobertura no PRD (percentual, regras de isenção, repasse ao locador). |
| "Em análise" como status de item no dashboard | Fluxo de aprovação/moderação de anúncios é mencionado como "moderação reativa no MVP" no PRD (risco R2) mas sem feature ID ou critérios de aceite. |
| KPIs do dashboard (Receita, Locações ativas, Itens, Avaliação) | Métricas existem no dashboard do protótipo mas não há Feature ID para o dashboard de analytics do locador. Coberto genericamente por F12. |
| Botão "Salvar rascunho" no formulário de item | Funcionalidade de rascunho não tem critério de aceite no F04. |
| Seção "Locações ativas" no dashboard | Inclui linha "Comissão Shareo: R$ 45,00" — comissão referenciada sem especificação. |

### 5.2 Features do PRD (F01–F14) sem tela no Protótipo

| Feature PRD | O que falta no protótipo |
|---|---|
| F01 — Cadastro PJ (CNPJ) | A tab "Empresa (PJ)" existe na tela de cadastro mas o formulário não muda — não exibe campo CNPJ, Razão Social. |
| F03 — Validação CPF/CNPJ | Campo CPF presente no cadastro, mas sem feedback visual de validação em tempo real (máscara, dígito verificador). |
| F07 — Detalhe do item: mapa de localização | Protótipo não mostra mapa na tela de detalhe (apenas na home). PRD F07 exige mapa. |
| F08 — Máquina de estados completa | Protótipo mostra apenas PENDING → sucesso. Não há telas para CONFIRMED, ACTIVE, RETURNED, DISPUTED, COMPLETED. |
| F10 — Avaliações bilaterais | Protótipo mostra avaliações existentes no detalhe do item, mas não tem tela de formulário de avaliação pós-aluguel. |
| F13 — Dashboard Admin | Totalmente ausente do protótipo (apenas usuário comum). |
| F14 — Notificações in-app | Ausente do protótipo. Nenhum sino/badge no header para notificações. |
| Features implícitas (P2) | Recuperação de senha (botão "Esqueci minha senha" existe mas não leva a nenhuma tela), verificação de e-mail (sem tela), exclusão de conta LGPD (sem tela). |

---

## Seção 6 — Ordem de Implementação Técnica

### Objetivo: Demo navegável mínima (fluxo completo de aluguel)

**Critério de prioridade**: implementar as rotas que permitem completar o fluxo `home → busca → detalhe → cadastro → login → solicitar aluguel → chat`.

#### Sprint 0.5 — Setup técnico (pré-feature)
Itens do checklist `revisao-pre-sprint1.md` que desbloqueiam o desenvolvimento:
- Estrutura de pastas (`app/`, `components/`, etc.)
- `tailwind.config.ts` com tokens corrigidos (contraste CTA)
- `components/ui/` com shadcn/ui instalado
- `lib/prisma.ts`, `lib/auth.ts`, `lib/supabase.ts`
- `public/images/` com logos e ícones convertidos para WebP

#### Fase A — Rotas públicas (3 rotas, ~2 sprints)

**1. `app/(public)/page.tsx` — Landing (SSG)**
- Prioridade: mais alta — é o ponto de entrada e a "vitrine"
- Componentes: `Header`, `Hero`, `CategoryGrid` com `CategoryIcon`, `ItemGrid` com dados mock, `HowItWorks`
- Desbloqueio: todos os logos e ícones de categoria devem estar em `public/images/` antes

**2. `app/(public)/alugar/page.tsx` — Busca (SSR)**
- Segunda prioridade — fluxo de descoberta de itens
- Componentes: `SearchBar`, `CategoryChips`, `ItemFilters`, `ItemGrid`, `loading.tsx`
- Dependência: API Route `GET /api/items` com suporte a `searchParams` (cidade, categoria, raio)

**3. `app/(public)/alugar/[slug]/page.tsx` — Detalhe do Item (ISR)**
- Terceira prioridade — converte visitante em solicitação
- Componentes: `ItemGallery`, `ItemDetailCard`, `BookingDatePicker`, `PriceSummary`, `OwnerMiniCard`, `ReviewList`
- Dependência: API Route `GET /api/items/[id]`

#### Fase B — Auth + Solicitar Aluguel (2 rotas)

**4. `app/login/page.tsx` e `app/cadastro/page.tsx` — Auth (CSR)**
- Necessário para desbloquear todas as rotas `(auth)`
- Componentes: `LoginForm`, `RegisterForm` (com validação CPF)
- Dependência: NextAuth.js configurado, API Route `[...nextauth]/route.ts`

**5. `app/(auth)/alugueis/novo/page.tsx` — Solicitação de Aluguel (CSR)**
- Fecha o loop do fluxo principal (locatário → solicitar)
- Componentes: `BookingForm` com seleção de datas e mensagem inicial
- Dependência: API Route `POST /api/bookings`

#### Fase C — Dashboard + Chat (fecha o fluxo do locador)

**6. `app/(auth)/meus-itens/novo/page.tsx` — Anunciar Item (CSR)**
- Componentes: `ItemForm`, `PhotoUpload`
- Dependência: API Route `POST /api/items`, `POST /api/upload`

**7. `app/(auth)/dashboard/page.tsx` — Dashboard (CSR)**
- Componentes: `DashboardMain`, `KPIRow`, `MyItemsGrid`, `ActiveRentals`
- Dependência: API Routes `GET /api/bookings` (com filtro por usuário)

**8. `app/(auth)/chat/page.tsx` + `app/(auth)/chat/[conversationId]/page.tsx` — Chat (CSR)**
- Componentes: `ConversationList`, `ChatWindow`, `MessageInput`
- Dependência: Supabase Realtime + API Routes de chat

### Caminho mínimo para demo navegável (3 rotas)

Se apenas 3 rotas puderem ser implementadas para uma demonstração:

| # | Rota | Por quê é essencial |
|---|---|---|
| 1 | `app/(public)/page.tsx` | Ponto de entrada — mostra a proposta de valor e os ícones de categoria |
| 2 | `app/(public)/alugar/[slug]/page.tsx` | Mostra o produto — principal página de conversão |
| 3 | `app/login/page.tsx` + `app/cadastro/page.tsx` | Desbloqueia o fluxo de solicitar aluguel — sem isso não há interação |

Com essas 3 implementações (+ mocks de dados) é possível navegar da landing → item → login/cadastro e demonstrar o design system, os ícones de categoria e a UX de descoberta de itens.

---

## Resumo Executivo

| Métrica | Valor |
|---|---|
| Rotas únicas mapeadas | 19 |
| Rotas públicas (SSG/SSR/ISR) | 6 |
| Rotas autenticadas/admin (CSR) | 13 |
| Server Components esperados | ~65% (estimativa) |
| Client Components esperados | ~35% (estimativa) |
| Assets JPEG que precisam converter para WebP | 7 (todos os ícones de categoria) |
| Assets PNG que NÃO precisam converter | 2 (logos — servidos nativamente pelo Next.js) |
| Funcionalidades no protótipo sem Feature ID no PRD | 6 identificadas (ver Seção 5.1) |

---

*Produzido por fullstack-dev-shareo — Fase 3 da Revisão Pré-Sprint 1.*
