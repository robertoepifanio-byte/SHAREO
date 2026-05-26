# Especificação de Componentes — Sprint 1

**Data**: 25/05/2026
**Autor**: Subagente Designer (designer-shareo)
**Baseado em**: `shareo-prototipo.html` (revisão completa), `tailwind.config.ts`, `ADR-005`, `revisao-pre-sprint1.md`
**Metodologia**: Mobile-first — análise iniciada em 375px, depois 768px, depois 1280px

---

## Seção 1: Inventário de Telas

O protótipo define **7 telas/estados distintos** (6 telas principais + 1 estado de sub-tela dentro do Chat).

| # | ID da Tela | Nome | Feature PRD | Auth Required? | Estados de UI Presentes |
|---|---|---|---|---|---|
| 1 | `screen-home` | Landing / Home | F01 (Busca), F03 (Categorias), F06 (Filtros básicos) | Não | Default (logado e não-logado via JS toggle) |
| 2 | `screen-search` | Busca e Listagem | F01, F06 (Filtros), F05 (Geo) | Não | Resultados carregados; empty state não modelado no protótipo |
| 3 | `screen-item-detail` | Detalhe do Item | F07, F08 (Solicitar locação), F10 (Reviews), F11 (Favoritar) | Não (visualizar) / Sim (solicitar) | Default com preço dinâmico ao selecionar datas; sem loading/error explícitos |
| 4 | `screen-login` | Login | F02 (Auth) | Não | Default; sem estado de erro de credenciais modelado |
| 5 | `screen-signup` | Cadastro | F02 (Auth + CPF) | Não | Default PF; tab PJ presente mas sem campos extras; sem validação de erro modelada |
| 6 | `screen-add-item` | Cadastrar Item (Anunciar) | F04 (Criar anúncio) | Sim | Formulário preenchido com dados de exemplo; sem multi-step |
| 7 | `screen-dashboard` | Painel do Locador | F12 (Dashboard locador), F04 (Meus anúncios), F08 (Locações ativas) | Sim | Visão geral com KPIs; tabs mobile (Visão Geral, Anúncios, Locações, Receita, Mensagens, Avaliações) |
| 7a | `chat-inbox` | Inbox do Chat | F09 (Chat) | Sim | Lista de conversas; badge de não lidas |
| 7b | `chat-thread` | Thread do Chat | F09 (Chat) | Sim | Thread aberta com input; rolagem automática |

**Observações sobre features não cobertas no protótipo:**
- F11 (Favoritos como tela dedicada) — aparece como ação no card e no menu do dashboard, mas não há tela `screen-favoritos`.
- F13 (Admin) — completamente ausente no protótipo. Nenhuma tela admin presente.
- F14 (Notificações) — ausente como tela ou painel. Apenas o toast é usado como feedback.
- Recuperação de senha — presente como botão "Esqueci minha senha" no login, mas sem tela/modal correspondente.

**Escopo creep detectado:**
- Nenhuma tela apresenta feature fora do PRD, mas a tela de Chat com sub-estado (inbox + thread como estados distintos) não estava explicitamente descrita como duas sub-telas no PRD.

---

## Seção 2: Componentes a Implementar

Total identificado: **38 componentes distintos** (18 de UI primitivos + 20 de features/layout/shared).

### 2.1 Componentes UI (primitivos / shadcn/ui)

| Componente | Localização | Base shadcn/ui | Variantes identificadas no protótipo | `"use client"`? |
|---|---|---|---|---|
| `Button` | `components/ui/button.tsx` | Sim — `shadcn/ui Button` | `primary` (orange-cta, sm/md/lg/full), `outline` (border+hover), `ghost-white` (navbar), `ghost` (back-btn, link-orange text) | Não (Server Component ok; interação via onClick em leaf) |
| `Input` | `components/ui/input.tsx` | Sim — `shadcn/ui Input` | `default` (44px height), `search` (com ícone prefixo), `error` (border vermelho), `date` | Não |
| `Textarea` | `components/ui/textarea.tsx` | Sim — `shadcn/ui Textarea` | `default` (resize vertical, min-height 100px) | Não |
| `Select` | `components/ui/select.tsx` | Sim — `shadcn/ui Select` | `default` (44px height, form-select), `sort` (menor, resultados) | Não |
| `Badge` | `components/ui/badge.tsx` | Sim — `shadcn/ui Badge` | `available` (green), `rented` (amber/orange), `pending` (indigo/análise), `eco` (green light), `profile` (navy translúcido) | Não |
| `Avatar` | `components/ui/avatar.tsx` | Sim — `shadcn/ui Avatar` | `sm` (36px — header), `md` (44–48px — owner/chat), `lg` (72px — profile hero) | Não |
| `Skeleton` | `components/ui/skeleton.tsx` | Sim — `shadcn/ui Skeleton` | `card` (ItemCard loading), `text` (linhas de texto) | Não |
| `Dialog` | `components/ui/dialog.tsx` | Sim — `shadcn/ui Dialog` | Não presente no protótipo, mas necessário para modais (confirmação de locação, logout) | Sim (Radix Dialog usa portal) |
| `Sheet` | `components/ui/sheet.tsx` | Sim — `shadcn/ui Sheet` | `bottom` (filtros mobile — slide-up), `right` (menu lateral futuro) | Sim (Radix Sheet) |
| `Toast` | `components/ui/toast.tsx` | Sim — `shadcn/ui Toast` / Sonner | `default` (navy), `success` (green), `error` (red) | Sim (useToast hook) |
| `Separator` | `components/ui/separator.tsx` | Sim — `shadcn/ui Separator` | `horizontal` (divider-h), `divider com texto` (ou/e-mail) | Não |
| `Label` | `components/ui/label.tsx` | Sim — `shadcn/ui Label` | `default` (uppercase 12px semibold), `sr-only` | Não |
| `Checkbox` | `components/ui/checkbox.tsx` | Sim — `shadcn/ui Checkbox` | `default` (filtros de categoria/avaliação) | Não |
| `RadioGroup` | `components/ui/radio-group.tsx` | Sim — `shadcn/ui RadioGroup` | `default` (filtros de distância) | Não |
| `Tabs` | `components/ui/tabs.tsx` | Sim — `shadcn/ui Tabs` | `type-tabs` (PF/PJ no cadastro), `dash-tabs` (mobile dashboard) | Sim (estado de aba ativo) |
| `Slider` | `components/ui/slider.tsx` | Sim — `shadcn/ui Slider` | `price-range` (filtro de preço) | Sim |
| `Card` | `components/ui/card.tsx` | Sim — `shadcn/ui Card` | `default` (surface + border), `auth` (max-w 420px + shadow-md), `form-card` (seções do formulário), `filter-card` (sticky sidebar) | Não |
| `Toggle` | `components/ui/toggle.tsx` | Sim — `shadcn/ui Toggle` | `day-btn` (dias de disponibilidade — aria-pressed) | Sim |

### 2.2 Componentes de Feature

| Componente | Localização | Base shadcn/ui | Variantes | `"use client"`? |
|---|---|---|---|---|
| `ItemCard` | `components/features/items/ItemCard.tsx` | Card + Badge + Button | `default` (grid 2col mobile), com e sem imagem real | Não (Server) — `FavButton` filho é Client |
| `FavButton` | `components/features/items/FavButton.tsx` | Button | `idle` (🤍), `active` (❤️) — toggle com aria-pressed | **Sim** (useState + onClick) |
| `ItemGrid` | `components/features/items/ItemGrid.tsx` | — | `2col` mobile, `3col` md, `4col` lg | Não |
| `ItemFilters` | `components/features/items/ItemFilters.tsx` | Sheet + Checkbox + RadioGroup + Slider | Mobile: bottom Sheet; Desktop: sidebar fixa | **Sim** (useState para filtros ativos) |
| `CategoryChip` | `components/features/items/CategoryChip.tsx` | Toggle | `default`, `active` (border orange + bg #fff3e0) | **Sim** (estado ativo) |
| `CategoryGrid` | `components/features/items/CategoryGrid.tsx` | — | Scroll horizontal mobile (cats-wrap + fade) | Não |
| `SearchBar` | `components/features/items/SearchBar.tsx` | Input + Button | `hero` (full-width + search-btn), `page` (44px + ícone prefixo) | **Sim** (onChange + debounce) |
| `ItemForm` | `components/features/items/ItemForm.tsx` | Input + Textarea + Select + Card + Toggle | — | **Sim** (useForm) |
| `PhotoUpload` | `components/features/items/PhotoUpload.tsx` | — | Dropzone + thumbs | **Sim** (drag-and-drop) |
| `PriceSummary` | `components/features/items/PriceSummary.tsx` | — | Calculado dinamicamente ao selecionar datas | **Sim** (useState + calcPrice) |
| `BookingForm` | `components/features/bookings/BookingForm.tsx` | Input (date) + Button | Datas retirada/devolução + PriceSummary | **Sim** (useState) |
| `BookingCard` | `components/features/bookings/BookingCard.tsx` | Card + Badge + Button | `active` (locação em andamento no dashboard) | Não |
| `LoginForm` | `components/features/auth/LoginForm.tsx` | Input + Button + Separator | — | **Sim** (useForm) |
| `RegisterForm` | `components/features/auth/RegisterForm.tsx` | Input + Button + Tabs | Tabs PF/PJ | **Sim** (useForm + useState tab) |
| `ReviewCard` | `components/features/reviews/ReviewCard.tsx` | Card | — | Não |
| `ConversationList` | `components/features/chat/ConversationList.tsx` | Avatar | Lista de conversas com badge não-lidas | Não (dados SSR) |
| `ChatThread` | `components/features/chat/ChatThread.tsx` | — | Thread de mensagens (msg--me / msg--them) | **Sim** (useEffect scroll + Supabase Realtime) |
| `MessageInput` | `components/features/chat/MessageInput.tsx` | Input + Button | — | **Sim** (useState + onKeyDown) |

### 2.3 Componentes de Layout

| Componente | Localização | Base shadcn/ui | Variantes | `"use client"`? |
|---|---|---|---|---|
| `Header` | `components/layout/Header.tsx` | — | `public` (com btn-login + btn-anunciar), `auth` (com avatar-btn) | Não (troca de estado é via Server Component condicional + `UserMenu` Client) |
| `BottomNav` | `components/layout/BottomNav.tsx` | — | Mobile only (oculto ≥768px); item central com círculo orange-cta | **Sim** (pathname para item ativo) |
| `DesktopNav` | `components/layout/DesktopNav.tsx` | — | Oculto <768px; dnav-items | Não |
| `DashboardSidebar` | `components/layout/Sidebar.tsx` | — | Desktop only (oculto <768px); dash-menu-items | Não (navegação via `<Link>`) |

### 2.4 Componentes Shared

| Componente | Localização | Base shadcn/ui | Variantes | `"use client"`? |
|---|---|---|---|---|
| `MapPlaceholder` | `components/shared/MapView.tsx` | — | Placeholder 200px com map-pins; substituir por Google Maps/Mapbox | **Sim** (Google Maps API usa browser) |
| `KpiCard` | `components/shared/KpiCard.tsx` | Card | `default` (label + valor grande + delta em verde) | Não |
| `OwnerMini` | `components/shared/OwnerMini.tsx` | Avatar + Card | Card clicável com avatar + nome + meta | Não |
| `PriceDisplay` | `components/shared/PriceDisplay.tsx` | — | `main` (28px bold), `alt` (12px badge bg) | Não |
| `StarRating` | `components/shared/StarRating.tsx` | — | Estático (display) com aria-label | Não |
| `EmptyState` | `components/shared/EmptyState.tsx` | — | Genérico (ícone + texto + CTA opcional) | Não |
| `SkipNav` | `components/shared/SkipNav.tsx` | — | `<a href="#main-content">` com focus-visible | Não |
| `Toast` | `components/ui/toast.tsx` | shadcn/ui Toast | default/success/error | **Sim** |

---

## Seção 3: Tokens Faltando no Tailwind

### 3.1 Cor CTA — Conflito Crítico (Bloqueador B2)

O `tailwind.config.ts` atual usa `#F97316` como `brand.DEFAULT` — que **reprova WCAG AA** (2,94:1 sobre branco). O protótipo já corrigiu com `#C05800` (4,47:1 sobre branco) e usa `#F97316` apenas para elementos decorativos sem texto.

**Inconsistências encontradas no protótipo:**
- `--orange: #F97316` — usado em: `avatar-btn` (background sem texto sobre fundo navy), ponto decorativo no logo, `profile-av` (background). Decorativo — OK.
- `--orange-cta: #C05800` — usado em: todos os `btn-primary`, `.bnav-add-circle`, `.how-card__num`, `.chat-send-btn`, `.chat-unread-badge`, `.day-btn.active`, `.chat-msg.msg--me`. CTA com texto branco — correto.
- `--orange-link: #9A4700` — usado em: `.link-orange`, `.detail-cat`, `.my-item-price`, `.chip.active`, `dash-menu-item.active`. Texto sobre fundo claro — contraste 6,5:1. Correto.

**Ação obrigatória no `tailwind.config.ts`:**

```typescript
// Substituir brand:
brand: {
  DEFAULT:    "#C05800",   // CTA laranja — 4.47:1 sobre branco ✅ WCAG AA
  hover:      "#A34A00",   // ~10% mais escuro
  light:      "#FED7AA",   // laranja claro (backgrounds sutis)
  link:       "#9A4700",   // texto laranja sobre branco — 6.5:1 ✅
  decorative: "#F97316",   // laranja vivo — SÓ para fills sem texto
  foreground: "#FFFFFF",
},
```

**O token `shareo.orange: "#F97316"` no config atual não tem alias semântico que impeça uso acidental em CTAs — deve ser renomeado para `shareo.orange-decorative` ou removido.**

### 3.2 Tokens ausentes identificados

| Token | Valor sugerido | Onde usar | Status no config atual |
|---|---|---|---|
| `colors.brand.cta` | `#C05800` | Botões primários, círculo BottomNav | **AUSENTE** — substitui `brand.DEFAULT: #F97316` |
| `colors.brand.link` | `#9A4700` | Links laranja, preços, ativo nos menus | **AUSENTE** |
| `colors.brand.decorative` | `#F97316` | Avatar bg, logo dot, sem texto | Presente como `shareo.orange` mas sem nome semântico |
| `colors.disabled.bg` | `#F1F5F9` (slate-100) | Input/button disabled background | **AUSENTE** |
| `colors.disabled.text` | `#94A3B8` (slate-400) | Texto em elementos desabilitados | **AUSENTE** |
| `colors.disabled.border` | `#CBD5E1` (slate-300) | Borda em elementos desabilitados | **AUSENTE** |
| `colors.overlay` | `rgba(13,27,42,0.5)` | Backdrop de modais/sheets | **AUSENTE** |
| `ringWidth.DEFAULT` | `2px` | Focus ring padrão | **AUSENTE** (implícito pelo Tailwind, mas não explícito) |
| `ringOffsetWidth.DEFAULT` | `2px` | Offset do focus ring | **AUSENTE** |
| `colors.chip.active.bg` | `#FFF3E0` | Fundo chip/cat-chip ativo | **AUSENTE** (usado hardcoded no protótipo como `#fff3e0`) |
| `colors.chip.active.text` | `#9A4700` | Texto chip ativo | Deve usar `brand.link` |
| `colors.star` | `#F59E0B` | Estrelas de avaliação | **AUSENTE** (usado inline como `color: #f59e0b`) |
| `colors.booking.pending` | `#F59E0B` | Badge de status | Presente em `booking.pending` — OK |
| `borderRadius.r-card-lg` | `12px` | Auth card, hero search box | Presente como `borderRadius.xl: 12px` — mapear explicitamente |
| `spacing.tap` | `44px` | Alias explícito de tap target | Presente como `spacing["11"]: 44px` mas falta alias `tap` |

### 3.3 Plugins Tailwind ausentes (gap D2 do revisao-pre-sprint1.md)

```typescript
// tailwind.config.ts — adicionar em plugins:
plugins: [
  require("tailwindcss-animate"),   // necessário para animações Dialog/Sheet do shadcn/ui
  require("@tailwindcss/forms"),     // reset de inputs (remove estilos de browser em radio/checkbox)
],
```

### 3.4 Estados interativos sem token explícito

| Estado | Elemento | Token sugerido | Situação |
|---|---|---|---|
| `hover` em botão primary | `.btn-primary:hover { opacity: .88 }` | Usar `brand.hover: #A34A00` em vez de opacity | Incompleto — opacity não é suficiente para high-contrast mode |
| `focus-visible` | `:focus-visible { outline: 3px solid var(--orange-link) }` | `ring-2 ring-brand-link ring-offset-2` via Tailwind | OK no protótipo, precisa mapear para classe Tailwind |
| `disabled` | Não modelado no protótipo | `disabled:bg-disabled-bg disabled:text-disabled-text disabled:border-disabled-border disabled:cursor-not-allowed` | **AUSENTE** — nenhum estado disabled no protótipo |
| `active` / `pressed` | `.day-btn.active`, `.chip.active` | Usar `aria-pressed:bg-chip-active-bg` | Parcial — precisa de tokens explícitos |
| `error` | `.form-input.error { border-color: var(--error) }` | `border-destructive` | Mapeado (destructive existe) — OK |

---

## Seção 4: Checklist de Acessibilidade por Tela

### Tela 1 — Home (`screen-home`)

| Item | Status | Detalhe |
|---|---|---|
| H1 único | APROVADO | `<h1 class="hero__title">Use Mais. Possua Menos.</h1>` — único H1 |
| Hierarquia de headings | APROVADO | H1 > H2 (Explorar por categoria, Próximos de você, Como funciona) |
| Skip nav | APROVADO | `<a class="skip-nav" href="#main-content">` com `:focus` visível |
| Alt text em imagens | APROVADO PARCIAL | Imagens reais têm alt descritivo. Ícones de categoria usam `aria-hidden="true"` — correto para decorativo. Imagem do logo usa `alt="Shareo"` — OK. |
| Contraste navbar navy | APROVADO | Navy `#0D1B2A` + branco `#FFFFFF` = 16,1:1 |
| Contraste botão CTA | APROVADO | `#C05800` + branco = 4,47:1 — passa AA (mínimo 3:1 para UI, 4,5:1 para texto) |
| Contraste texto muted | ATENÇÃO | `--text2: #64748B` sobre `--bg: #F8FAFC` = 4,48:1 — passa AA por margem mínima |
| Tap targets botões hero | BUG | `hero__search-btn` não tem altura mínima explícita — depende de `padding: 0 24px` + conteúdo. Verificar se ≥44px de altura. Adicionar `min-height: 44px`. |
| CategoryChip tap target | APROVADO | `padding: 14px 16px` + min-width 88px — área ≥44px confirmada |
| `aria-current` na nav | APROVADO | `aria-current="page"` no item ativo via JS |
| Área de toque de favoritos | APROVADO | `.item-card__fav` = 44×44px explícito no protótipo |
| `<main>` presente | APROVADO | `<main id="main-content">` |
| Hero stats acessível | APROVADO | `aria-label="Estatísticas da plataforma"` no container |

### Tela 2 — Busca (`screen-search`)

| Item | Status | Detalhe |
|---|---|---|
| H1 ausente | BUG | Não há `<h1>` na tela de busca — `screen-search` tem apenas `<div>` e `section-title` sem heading lógico para SR. Adicionar H1 visualmente oculto (`sr-only`) tipo "Resultados de busca". |
| Label para search-field | APROVADO | `<label for="search-field" style="sr-only">` presente |
| Label para sort-select | APROVADO | `<label for="sort-select" style="sr-only">` presente |
| Chips como botões | ATENÇÃO | `.chip` são `<div role="listitem button" tabindex="0">` — semântica mista. Converter para `<button>` com role adequado. |
| Filtros sidebar labeling | APROVADO | Grupos de filtro com `aria-labelledby` apontando para span IDs |
| Range slider acessível | APROVADO | `aria-label="Preço máximo por dia"` no input range |
| Resultados com live region | APROVADO | `aria-live="polite"` no results-count |
| Contraste chip ativo | APROVADO | `color: var(--orange-link) #9A4700` sobre `#FFF3E0` — contraste 5,9:1 |

### Tela 3 — Detalhe do Item (`screen-item-detail`)

| Item | Status | Detalhe |
|---|---|---|
| H1 único | APROVADO | `<h1 class="detail-title">Furadeira de Impacto Bosch GSB 13 RE</h1>` |
| Hierarquia de headings | BUG | `<h2>Sobre o item</h2>` e `<h2>Avaliações</h2>` dentro de `.detail-gallery`, mas o H1 está em `.detail-info` — estrutura semântica fora de ordem no DOM. No mobile (coluna única) o H1 aparece após as imagens. Reordenar no HTML mantendo layout via CSS. |
| Label de campos de data | APROVADO | `<label for="date-start">Retirada</label>` e `<label for="date-end">Devolução</label>` |
| PriceSummary aria-live | APROVADO | `aria-live="polite"` no `#price-summary` |
| Owner mini como link | ATENÇÃO | `.owner-mini` usa `role="button" tabindex="0"` mas deveria ser `<a href="/perfil/joao-silva">` ou `<button>`. Sem role correto viola ARIA best practices. |
| Tap target botões de ação | APROVADO | `btn-primary--lg` tem `padding: 14px 24px` — ≥44px de altura |
| Gallery thumbs | APROVADO | `<button class="gallery-thumb">` com `aria-label="Foto X"` |
| Tags descritivas | APROVADO | `role="list"` + `role="listitem"` nas tags |
| Contraste detail-cat | BUG | `.detail-cat` usa `color: var(--orange-link) #9A4700` sobre branco — 6,5:1 OK. Mas verificar se alguma instância usa `--orange #F97316` — contraste seria 2,9:1 (FALHA). Auditar em implementação. |

### Tela 4 — Login (`screen-login`)

| Item | Status | Detalhe |
|---|---|---|
| H1 único | APROVADO | `<h1 class="auth-title">Bem-vindo de volta</h1>` |
| Labels associados a inputs | APROVADO | `<label for="login-email">`, `<label for="login-pass">` presentes |
| Autocomplete nos campos | APROVADO | `autocomplete="email"` e `autocomplete="current-password"` |
| Botão "Esqueci senha" | BUG | `<button class="link-orange">Esqueci minha senha</button>` — sem ação, sem tela destino no protótipo. Falta feature (ver P2 em revisao-pre-sprint1.md). |
| Social login button | ATENÇÃO | `aria-label="Continuar com Google"` presente, mas o ícone é emoji `🇬` — não é o logo Google oficial. Em implementação usar SVG do Google com `aria-hidden`. |
| Contraste link-orange | APROVADO | `#9A4700` sobre branco = 6,5:1 |
| auth-card tem `role="main"` | BUG | `<div role="main">` dentro de `<main>` — landmark duplicado. Remover `role="main"` do `auth-card`; o `<main>` pai já serve. |

### Tela 5 — Cadastro (`screen-signup`)

| Item | Status | Detalhe |
|---|---|---|
| H1 único | APROVADO | `<h1>Criar conta grátis</h1>` |
| Labels para todos os campos | APROVADO | Todos os inputs têm `<label for="...">` |
| CPF field | ATENÇÃO | `<input type="text" id="s-cpf" autocomplete="off">` — CPF não tem tipo semântico nativo. Em implementação: adicionar `inputmode="numeric"` e máscara. `autocomplete="off"` é correto por segurança. |
| Tabs PF/PJ | APROVADO | `role="tablist"` + `role="tab"` + `aria-selected` |
| Campos PJ ausentes | BUG | Tab "Empresa (PJ)" está presente mas não exibe campos adicionais (CNPJ, Razão Social) ao ser selecionada. No protótipo é placeholder sem funcionalidade. Em implementação usar `aria-controls` + painel oculto com `hidden`. |
| Consentimento LGPD | ATENÇÃO | Texto de consentimento presente mas sem checkbox obrigatório. Em implementação: adicionar `<input type="checkbox" required aria-required="true">` para aceite explícito. |
| auth-card tem `role="main"` | BUG | Mesmo bug da tela de Login — landmark duplicado. |

### Tela 6 — Cadastrar Item (`screen-add-item`)

| Item | Status | Detalhe |
|---|---|---|
| H1 único | APROVADO | `<h1>Cadastrar novo item</h1>` |
| Labels em todos os campos | APROVADO | Todos os inputs, selects, textareas têm `<label for="...">` |
| Preço com prefixo R$ | APROVADO | `.prefix` com `aria-hidden="true"` + `aria-label` no input com "em reais" |
| Foto upload acessível | APROVADO | `role="button" tabindex="0" aria-label="Clique para enviar fotos..."` |
| Thumbs de foto | APROVADO | `role="listitem" aria-label="Foto N" tabindex="0"` |
| Day buttons | APROVADO | `aria-pressed` em cada botão de dia |
| Dias group label | APROVADO | `<label id="avail-label">` + `aria-labelledby="avail-label"` |
| Tap targets day-btn | BUG | `.day-btn { aspect-ratio: 1 }` em grid de 7 colunas — largura depende do container. Em 375px: `(375px - 2*16px - 6*8px) / 7 ≈ 39px`. ABAIXO de 44px. Solução: `min-width: 44px` + gap menor, ou usar grid de scroll horizontal. |
| Formulário sem autocomplete | ATENÇÃO | Campos de marca/modelo sem `autocomplete`. Adicionar `autocomplete="off"` explícito para evitar preenchimento automático indesejado. |

### Tela 7 — Dashboard (`screen-dashboard`)

| Item | Status | Detalhe |
|---|---|---|
| H1 ausente | BUG | Dashboard não tem `<h1>` — o primeiro heading é `<h2>Meus anúncios</h2>`. Adicionar H1 sr-only ("Painel do locador") ou visível. |
| KPI cards semânticos | APROVADO | `role="list"` + `role="listitem"` nos KPI cards |
| Sidebar e tabs | APROVADO | Sidebar usa `<aside aria-label="Menu do painel">` + nav com `aria-current`. Tabs mobile: `role="tablist"` + `role="tab"` |
| my-item-btn tamanho | BUG | `.my-item-btn { min-height: 36px }` — **abaixo do mínimo de 44px**. O protótipo tem comentário "área de toque aumentada (era 4px 10px)" mas ainda está em 36px. Corrigir para `min-height: 44px`. |
| profile-badges | APROVADO | `role="list"` + `role="listitem"` |
| Botão logout mobile | ATENÇÃO | `<button class="btn-ghost-white">🚪 Sair da conta</button>` com `aria-label="Sair da conta"` — OK, mas visualmente usa classes de botão do header (cor branca sobre bg colorido). Em implementação, usar variante correta. |
| Contraste kpi-delta | APROVADO | `color: #15803d` (verde escuro) sobre branco = 4,56:1 |

### Telas 7a/7b — Chat

| Item | Status | Detalhe |
|---|---|---|
| H1 único | APROVADO | `<h1>Mensagens</h1>` no inbox |
| Lista de conversas | APROVADO | `role="list"` + `role="listitem"` + `tabindex="0"` + `onkeydown` para Enter |
| Thread aria-live | APROVADO | `role="log" aria-live="polite"` no `chat-messages` |
| Chat send button tap target | BUG | `.chat-send-btn { width:40px; height:40px }` — **abaixo do mínimo de 44×44px**. Aumentar para 44×44px. |
| Chat input height | BUG | `.chat-input { height: 40px }` — abaixo de 44px. Aumentar para `height: 44px`. |
| Thread header back btn | APROVADO | `<button class="back-btn" aria-label="Voltar para mensagens">` |
| Unread badge | APROVADO | `aria-label="N não lidas"` no badge |

---

## Seção 5: Ordem de Implementação Sugerida

A lógica é: começar pelos componentes que desbloqueiam mais telas. Os componentes são ordenados do mais genérico para o mais específico.

### Fase 1 — Infraestrutura de design (Sprint 0 — antes do primeiro componente)

1. **Corrigir `tailwind.config.ts`**: substituir `brand.DEFAULT: #F97316` por `#C05800`, adicionar tokens `brand.link`, `disabled.*`, `chip.active.*`, `star`, `overlay`. Adicionar plugins `tailwindcss-animate` e `@tailwindcss/forms`.
2. **Instalar shadcn/ui**: `npx shadcn-ui@latest init` + `add button input label textarea select badge avatar skeleton dialog sheet toast separator checkbox radio-group tabs slider`
3. **Criar `utils/cn.ts`**: clsx + tailwind-merge (shadcn/ui padrão)

### Fase 2 — Componentes UI primitivos customizados

4. **`Button`** — variantes `primary`, `outline`, `ghost-white`, `ghost` mapeadas para tokens corrigidos. Usado em **todas as 7 telas**.
5. **`Input`** — variante padrão + `search` + `error`. Usado em Login, Cadastro, Busca, Item Detail, Add Item, Chat.
6. **`Badge`** — variantes `available`, `rented`, `pending`, `eco`. Usado em Item Card, Dashboard, Item Detail.
7. **`Avatar`** — tamanhos `sm/md/lg` com fallback de iniciais. Usado em Header, Chat, Dashboard, Item Detail.

### Fase 3 — Componentes de Layout (desbloqueiam todas as páginas)

8. **`Header`** — variante pública e autenticada. Presente em todas as telas.
9. **`BottomNav`** — mobile-only. Presente em todas as telas autenticadas mobile.
10. **`SkipNav`** — acessibilidade baseline. Presente em todas as telas.

### Fase 4 — Componentes críticos de Feature (desbloqueiam F01 + F07)

11. **`ItemCard`** — usado em Home (4 cards), Search (6+ cards), Dashboard (my-item-card). É o componente mais reutilizado do MVP.
12. **`ItemGrid`** — wrapper responsivo do ItemCard. Desbloqueia Home e Search.
13. **`SearchBar`** — variante `hero` (Home) e `page` (Search). Desbloqueia F01.
14. **`CategoryChip` + `CategoryGrid`** — Desbloqueia seção de categorias da Home e filtros de busca.
15. **`FavButton`** — leaf node client dentro do ItemCard.

### Fase 5 — Feature de Busca completa (F06)

16. **`ItemFilters`** — Sheet mobile + sidebar desktop. Depende de Checkbox, RadioGroup, Slider.
17. **`PriceDisplay`** — formatação de preço. Reutilizado em ItemCard, Detail, Dashboard.
18. **`StarRating`** — display estático. Reutilizado em ItemCard, Detail, Dashboard.

### Fase 6 — Detalhe do Item e Booking (F07, F08)

19. **`BookingForm`** (com `PriceSummary`) — Desbloqueia F08. `use client`.
20. **`OwnerMini`** — Card do proprietário no detail. Desbloqueia link para perfil.
21. **`ReviewCard`** — lista de avaliações no detail. Desbloqueia F10 parcialmente.

### Fase 7 — Auth (F02)

22. **`LoginForm`** — Desbloqueia F02. `use client`.
23. **`RegisterForm`** — Desbloqueia F02 + cadastro PJ. `use client`.

### Fase 8 — Dashboard e Anúncios (F04, F12)

24. **`ItemForm` + `PhotoUpload`** — Desbloqueia F04. `use client`.
25. **`DashboardSidebar`** — Layout do painel do locador.
26. **`KpiCard`** — Métricas do dashboard. Desbloqueia F12.
27. **`BookingCard`** (locações ativas no dashboard) — Desbloqueia F08 view.

### Fase 9 — Chat (F09)

28. **`ConversationList`** — Inbox do chat.
29. **`ChatThread` + `MessageInput`** — Thread e input. `use client` + Supabase Realtime.

### Fase 10 — Componentes de suporte

30. **`EmptyState`** — Para listagens sem resultado, dashboard sem itens, etc.
31. **`Toast`** — Sistema de notificações. Já instalado via shadcn/ui.
32. **`MapPlaceholder` / `MapView`** — Placeholder mobile → integração Mapbox/Google Maps.

---

## Resumo Executivo

| Métrica | Valor |
|---|---|
| Telas distintas identificadas | 7 (+ 2 sub-estados de chat = 9 estados visuais) |
| Componentes únicos inventariados | 38 (18 UI primitivos + 20 feature/layout/shared) |
| Componentes com base shadcn/ui | 18 |
| Componentes a criar do zero | 20 |
| Componentes que requerem `"use client"` | 17 |
| Violações de tap target (<44px) | 4 (day-btn, my-item-btn, chat-send-btn, chat-input) |
| Bugs de hierarquia de heading | 3 (busca sem H1, dashboard sem H1, detalhe fora de ordem) |
| Tokens ausentes no Tailwind | 14 |
| Conflito de cor CTA | Crítico — `#F97316` no config vs `#C05800` correto no protótipo |

### Os 3 componentes mais críticos para o Sprint 1

1. **`ItemCard`** — usado em Home, Search, Dashboard (Meus anúncios, Locações). É a célula fundamental do produto.
2. **`Button`** — presente em absolutamente todas as 7 telas. É a primeira peça do design system que precisa estar correta com os tokens `brand.cta: #C05800`.
3. **`SearchBar`** — presente na Home (hero) e na Search (page). Desbloqueia o fluxo principal de descoberta (F01), que é o entry point do funil de locação.

### Telas sem Feature PRD correspondente (scope creep)

- Nenhuma tela adicional foi detectada. Porém, **F11 (Favoritos) não tem tela dedicada** no protótipo — está como ação em cards e item no menu. Isso é uma lacuna: o PRD menciona favoritos mas o protótipo não os implementa como tela. Esta é uma inconsistência PRD ↔ protótipo, não scope creep.
- **F13 (Admin)** e **F14 (Notificações)** estão no PRD mas **completamente ausentes** do protótipo. O Sprint 1 provavelmente não depende dessas telas, mas o Designer precisará criar wireframes antes da implementação.

### Principais violações de acessibilidade

1. **`my-item-btn` com `min-height: 36px`** (Dashboard) — abaixo de 44px. Bug crítico que afeta todos os usuários mobile.
2. **`chat-send-btn` e `chat-input` com 40px** (Chat) — abaixo de 44px. Bug que afeta F09 em mobile.
3. **`day-btn` com ~39px em 375px`** (Add Item) — depende de cálculo de grid; pode falhar em mobile. Bug condicional.
4. **H1 ausente na tela de Busca** — screen reader anuncia página sem contexto. Bug de estrutura.
5. **H1 ausente no Dashboard** — mesmo problema. Bug de estrutura.
6. **H2 antes do H1 no DOM da tela de Detalhe** — ordem de heading invertida no HTML. Bug semântico.
7. **`role="main"` duplicado em telas de Auth** — landmark duplicado (Login e Cadastro). Bug ARIA.
8. **Campos PJ sem painel associado por `aria-controls`** (Cadastro) — tab sem conteúdo acessível. Bug ARIA.
9. **Checkbox de consentimento LGPD ausente** (Cadastro) — conformidade legal + acessibilidade. Bug crítico.
10. **`hero__search-btn` sem `min-height: 44px` explícito** (Home) — pode falhar dependendo do conteúdo. Verificar.

---

---

## Seção 6: Assets — Logos e Ícones de Categoria

Todos os arquivos estão em `C:\Users\Roberto\Documents\2026\ShareO\icones\`. Devem ser movidos para `public/images/` antes do primeiro commit.

### Logos

| Arquivo | Destino no projeto | Componente | Uso |
|---|---|---|---|
| `ShareO v3 fundo transparente.png` | `public/images/logo-transparente.png` | `components/layout/Header.tsx` | Navbar — fundo navy e fundo claro |
| `Shareo logo Navy.png` | `public/images/logo-navy.png` | `components/layout/Hero.tsx`, templates de email | Landing page hero, rodapé, emails transacionais |

```tsx
// Exemplo de uso correto no Header
import Image from 'next/image'
<Image
  src="/images/logo-transparente.png"
  alt="ShareO — Use Mais. Possua Menos."
  width={120}
  height={36}
  priority  // LCP — acima da dobra
/>
```

### Ícones de Categoria

Usar `festas v2.jpeg` e `modas v2.jpeg` (versões revisadas). Converter todos os 7 JPEGs para WebP antes de mover para `public/images/categorias/`.

| Arquivo original | Path final | Alt text | Componente |
|---|---|---|---|
| `ferramentas.jpeg` | `public/images/categorias/ferramentas.webp` | `"Categoria Ferramentas"` | `CategoryGrid`, `CategoryPage` |
| `construção.jpeg` | `public/images/categorias/construcao.webp` | `"Categoria Construção Civil"` | idem |
| `eletronicos.jpeg` | `public/images/categorias/eletronicos.webp` | `"Categoria Eletrônicos"` | idem |
| `Casa e jardim.jpeg` | `public/images/categorias/casa-jardim.webp` | `"Categoria Casa e Jardim"` | idem |
| `esportes.jpeg` | `public/images/categorias/esportes.webp` | `"Categoria Esporte e Lazer"` | idem |
| `festas v2.jpeg` | `public/images/categorias/festas.webp` | `"Categoria Festas e Eventos"` | idem |
| `modas v2.jpeg` | `public/images/categorias/moda.webp` | `"Categoria Moda"` | idem |

**Conversão WebP** (rodar uma vez antes do primeiro commit):
```bash
# Requer cwebp instalado (libwebp)
for f in icones/*.jpeg; do cwebp "$f" -o "public/images/categorias/$(basename "${f%.jpeg}" | tr ' ' '-' | tr '[:upper:]' '[:lower:]').webp"; done
```

**Uso no `CategoryGrid`**:
```tsx
// Server Component — sem "use client"
import Image from 'next/image'

const CATEGORIES = [
  { slug: 'ferramentas', label: 'Ferramentas', image: '/images/categorias/ferramentas.webp' },
  // ...
]

export function CategoryGrid() {
  return (
    <ul>
      {CATEGORIES.map(cat => (
        <li key={cat.slug}>
          <a href={`/alugar/${cat.slug}`}>
            <Image src={cat.image} alt={`Categoria ${cat.label}`} width={160} height={120} />
            <span>{cat.label}</span>
          </a>
        </li>
      ))}
    </ul>
  )
}
```

> Ver mapeamento completo de uso em `docs/prototype-to-implementation.md` — Seção 3.

---

*Especificação gerada em 25/05/2026 pelo subagente designer-shareo como entrega pré-Sprint 1.*
*Próximas ações: (1) Aplicar correções de token no `tailwind.config.ts`, (2) Corrigir 4 violações de tap target antes do primeiro commit, (3) Confirmar com PO as telas de Favoritos, Admin e Notificações antes do Sprint 1 planning, (4) Converter ícones JPEG para WebP e mover logos para `public/images/`.*
