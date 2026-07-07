# ShareO Mobile App — Handoff de Design v1

Referência: `docs/design/mobile-app-prototipo-v1.html`
Data: 2026-07-02 (revisão de fidelidade: 2026-07-02)
Protótipo web de referência: `shareo-prototipo-v3b.html`

---

## 0. Rastreabilidade frame → arquivo-fonte (revisão de fidelidade 2026-07-02)

Cada correção abaixo foi feita por transcrição literal do componente indicado. Zero interpretação.

| Frame | Divergência corrigida | Arquivo-fonte transcrito |
|---|---|---|
| Login (normal / erro / loading) | Logo estava encaixotada num `<div>` com `background:var(--navy); border-radius:12px`. Removida a caixa; logo agora solta sobre fundo claro com `height:48px`, igual ao `<Image>` do `AuthLayout`. | `app/(auth)/layout.tsx` (linhas 8-17) |
| Login (normal / erro / loading) | Ícone "olho" no campo senha transcrito do `EyeIcon()` do `LoginForm`. | `app/(auth)/login/LoginForm.tsx` (linhas 144-151) |
| MobileMenu — logado | Ordem do drawer era: avatar → links → Explorar → Anunciar → Atividade ("Minhas reservas" + "Mensagens") → divisor → ThemeToggle rotulado "APARÊNCIA" no rodapé → Minha Conta → Sair. Corrigida para: Início → Sobre → **TEMA no topo** (ThemeToggle tri-estado com ícones Sun/Monitor/Moon e rótulos "Claro"/"Sistema"/"Escuro") → divisor → Explorar expansível (sub-items VERBATIM de `EXPLORAR_LINKS`) → Anunciar (pill verde) → divisor → **ATIVIDADE** com 4 links na ordem exata: **Meus Anúncios · Reservas · Mensagens · Dashboard** → divisor → Minha Conta expansível → divisor → Sair → divisor → Central de Ajuda expansível. | `components/layout/MobileMenu.tsx` (linhas 14-33, 229-234, 239-393) + `components/layout/ThemeToggle.tsx` (linhas 56-88) |
| MobileMenu — não logado | Ordem era: CTAs Entrar/Criar conta → Início → "Explorar itens" → divisor → ThemeToggle "APARÊNCIA" → divisor → Central de Ajuda (link simples). Corrigida para: Início → Sobre → **TEMA no topo** → divisor → **Explorar** (expansível, rótulo exato) → Anunciar (pill verde) → divisor → Entrar → divisor → Central de Ajuda (expansível). | `components/layout/MobileMenu.tsx` (linhas 396-435) |
| Home — hero | Faltava barra de busca entre CTAs e stats. Stats eram 3 itens com rótulos inventados ("Proprietários" sem "ativos", números desatualizados). Corrigido: barra de busca `HeroSearch` transcrita (placeholder "O que você precisa alugar?", botão "Buscar", SVG lupa) + **4 stats** na ordem exata: "Itens disponíveis" (97) · "Proprietários ativos" (48) · "Custo para anunciar" (0%) · "Categorias" (7). Font-size 22px, cor accent `#59C686`. | `components/home/HeroSearch.tsx` + `app/page.tsx` (linhas 223-250) |
| Home — hero | Seção "Explorar por categoria" removida da posição imediatamente após o hero (no site real essa seção vem depois do `SimuladorRenda`, não logo após o hero). | `app/page.tsx` (linhas 257-288) |
| BottomNav — todos os frames | Tab bar tinha 4 itens com emoji (`🔍 Explorar · 📦 Reservas · 💬 Mensagens · 👤 Perfil`). Corrigido para **5 itens com SVG** na ordem exata de `BottomNav.tsx`: **Início · Explorar · Anunciar (FAB) · Chat · Perfil**. FAB: círculo 52×52px bg `#007B3C`, elevado -10px, shadow verde. Ícones SVG transcritos literalmente. Rótulo "Mensagens" → **"Chat"** (rótulo exato da tab). | `components/layout/BottomNav.tsx` (linhas 41-116) |

### Elementos não transcritos com certeza (pendência para PO/Designer)

| Frame | Elemento | Motivo |
|---|---|---|
| Perfil — logado | Menu items (Anunciar item · Meus anúncios · Favoritos · Verificação de identidade · Sair) com emojis como ícones | Tela de Perfil nativo do app não existe no site — foi criada pelo designer. Rótulos e ícones não têm arquivo-fonte no site. Pendente confirmação do PO (D2 do handoff). |
| Perfil — logado | Stats rápidos (Anúncios · Locações · Avaliação) | Requer endpoint `/api/users/me` com agregados — não existe hoje. Pendente D2. |
| Anunciar — formulário | Campos e ordem do formulário de anúncio nativo | Site usa `app/itens/novo/page.tsx` (multi-step). Protótipo simplificou para tela única. Diferença intencional (app vs. web) — não é erro, mas não é transcrição literal. |

---

## 1. Componentes UI a criar em `apps/mobile/components/ui/`

Cada componente abaixo é novo (não existe hoje) ou substitui uso ad-hoc espalhado pelo código.

### 1.1 `Button.tsx`

Props: `variant` (`primary` | `secondary` | `ghost` | `danger` | `disabled`), `size` (`sm` | `md` | `lg`), `loading` (boolean), `fullWidth` (boolean), `onPress`, `children`.

Estados a cobrir:
- **default** — background sólido ou outline conforme variant
- **loading** — opacidade 55%, spinner branco inline à esquerda, `disabled` implícito
- **disabled** — background `#CBD5E1`, texto `#94A3B8`, cursor bloqueado
- **pressed** — opacidade 85% via `activeOpacity={0.85}`

Tap target: `minHeight: 44` sempre. Size `lg` usa `minHeight: 52`.

Tokens de cor:
- `primary`: bg `#007B3C`, text `#fff`
- `secondary`: border `#003366`, text `#003366`, bg transparente
- `ghost`: border `#007B3C`, text `#007B3C`, bg transparente
- `danger`: bg `#E74C3C`, text `#fff`

---

### 1.2 `Input.tsx`

Props: `label`, `hint`, `error` (string | undefined), `required` (boolean), `disabled`, `charCount` / `maxLength`, mais todos os props nativos de `TextInput`.

Estados visuais:
- **default**: border `#E2E8F0`, bg `#F8FAFC`
- **focus**: border `#007B3C`, box-shadow `0 0 0 3px rgba(0,123,60,.12)`
- **error**: border `#E74C3C`, bg `#FFF5F5`; exibe `error` string abaixo em vermelho 11px
- **disabled**: bg `#F1F5F9`, text `#64748B`

Label: 11px, semibold, uppercase, `#64748B`. Asterisco de required: `#E74C3C`.
Contador de caracteres (quando `maxLength` fornecido): 10px, muted, alinhado à direita.

---

### 1.3 `Textarea.tsx`

Mesmo contrato de estados que `Input`. Props extras: `numberOfLines` (default 4), `minHeight` (default 100).
`textAlignVertical: 'top'` sempre.

---

### 1.4 `Avatar.tsx`

Props: `name` (string), `imageUrl` (string | null), `size` (`sm` | `md` | `lg` | `xl`).

Tamanhos:
| size | px   | font |
|------|------|------|
| sm   | 32   | 13px |
| md   | 44   | 16px |
| lg   | 72   | 26px |
| xl   | 88   | 32px |

Fallback: inicial maiúscula de `name[0]`, fundo `#003366`, texto branco.
Quando `imageUrl` presente: `Image` do expo-image com `contentFit="cover"`.

---

### 1.5 `Badge.tsx` / `StatusBadge.tsx`

Props: `variant` (`green` | `amber` | `red` | `blue` | `gray` | `navy`), `children`.

Mapeamento semântico de status de reserva (wrapper `BookingStatusBadge`):

| Status Prisma | variant | label               |
|---------------|---------|---------------------|
| PENDING       | amber   | Aguardando aprovação|
| ACTIVE        | blue    | Em andamento        |
| COMPLETED     | green   | Concluída           |
| CANCELLED     | gray    | Cancelada           |
| DISPUTED      | red     | Em disputa          |

Status de anúncio (`ItemStatusBadge`):

| Status Prisma | variant | label      |
|---------------|---------|------------|
| AVAILABLE     | green   | Disponível |
| RENTED        | amber   | Alugado    |
| DRAFT         | gray    | Rascunho   |
| UNDER_REVIEW  | blue    | Em análise |

---

### 1.6 `EmptyState.tsx`

Props: `icon` (string emoji), `title`, `description`, `action` (`{ label, onPress }` | undefined), `secondaryAction` (idem, opcional).

Layout: coluna centralizada, padding 48px vertical. Icon 52px, título Montserrat 18px bold navy, descrição Inter 13px muted, max-width 220px, botão primário se `action` fornecido.

---

### 1.7 `Alert.tsx`

Props: `variant` (`success` | `error` | `warning` | `info`), `title` (opcional), `children`, `action` (`{ label, onPress }` | undefined).

Tokens:
| variant | bg       | border   | text     |
|---------|----------|----------|----------|
| success | #D1FAE5  | #A7F3D0  | #065F46  |
| error   | #FEE2E2  | #FECACA  | #991B1B  |
| warning | #FEF3C7  | #FDE68A  | #92400E  |
| info    | #EFF6FF  | #BFDBFE  | #1E40AF  |

---

### 1.8 `SkeletonBox.tsx`

Props: `width`, `height`, `borderRadius` (default 8), `style`.

Animação: `useSharedValue` + `withRepeat(withTiming(...))` via Reanimated interpolando de `#E2E8F0` para `#F1F5F9`.

Compostos a criar: `ItemCardSkeleton` (replica o layout do card de item), `CategoryChipSkeleton`.

---

### 1.9 `ItemCard.tsx`

Props: `item` (tipo `ItemSummary`), `onPress`, `onFavoriteToggle`, `isFavorited`.

Estrutura:
- Imagem `4:3` com `expo-image`, fallback emoji por categoria
- Badge "Eco" canto superior direito (bg `rgba(0,123,60,.88)`)
- Botão favoritar canto superior esquerdo: área 44×44px, heart emoji ou SVG
- Corpo: categoria (10px uppercase green), título (14px bold navy, 2 linhas), preço (20px Montserrat bold) + "/dia" (11px muted), localização (11px muted, alinhada à direita)
- Stars opcionais se `reviewCount > 0`

---

### 1.10 `CategoryChip.tsx`

Props: `iconSlug` (string — slug da categoria para selecionar o ícone SVG correto), `label`, `active`, `onPress`.

Layout: coluna, padding 10px 14px, min 68×68px (tap target), border 1.5px. Ativo: border `#007B3C`, bg `#D1FAE5`, label verde.

**Ícone:** usar ícone SVG ilustrado por slug (fundo colorido arredondado 36×36px, SVG 18–20px interno) — igual a `CategoryIcon` do site. Nunca usar emoji. Paleta de fundo por categoria:

| slug | fundo | stroke |
|---|---|---|
| ferramentas | `#DBEAFE` | `#1D4ED8` |
| eletronicos | `#EDE9FE` | `#7C3AED` |
| casa-jardim | `#DCFCE7` | `#16A34A` |
| construcao | `#FEF9C3` | `#CA8A04` |
| esporte | `#FEE2E2` | `#DC2626` |
| moda | `#FDF4FF` | `#9333EA` |
| festas | `#FFF7ED` | `#EA580C` |

---

### 1.11 `ScreenHeader.tsx`

Props: `title`, `onBack` (opcional — se ausente, sem botão voltar), `rightAction` (ReactNode opcional).

Back button: 44×44px, exibe "‹" em 22px. Altura total do header: 56px + safe-area top.

---

### 1.12 `StickyFooter.tsx`

Props: `children`, transparente ao safe-area bottom via `useSafeAreaInsets`.

Uso: CTA fixo em detalhe do item, anunciar e checkout.

---

### 1.13 `PriceTag.tsx`

Props: `pricePerDay`, `pricePerWeek?`, `pricePerMonth?`.

Exibe valor principal em Montserrat 30px bold + "/dia". Se houver semanal/mensal, exibe chips secundários menores abaixo.

---

### 1.14 `ModeSelector.tsx` (checkout)

Props: `modes` (array de `{ key, label, price, unit }`), `value`, `onChange`.

Cada opção: coluna com label (10px uppercase), preço (18px Montserrat bold), unidade (10px). Ativo: border 2px verde, bg `#D1FAE5`. Tap target: `minHeight: 60`.

---

### 1.15 `StepperInput.tsx` (checkout — quantidade de dias)

Props: `value`, `onChange`, `min` (default 1), `max` (default 365).

Botões − e + : 44×44px, border, rounded. Input central flex-1, text center, border verde quando ativo.

---

### 1.16 `BottomNav.tsx` (CORRETO — 5 itens com SVG)

Replicar exatamente `components/layout/BottomNav.tsx` do site. **Nunca usar emoji.**

Estrutura: 5 itens em linha flex, altura 72px, `border-top: 1px solid border`, bg `surface`.

| # | key | label | ícone SVG (viewBox 0 0 24 24) | comportamento |
|---|-----|-------|-------------------------------|---------------|
| 1 | home | Início | `<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>` | Link → `/` |
| 2 | explorar | Explorar | `<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>` | Link → `/itens` |
| 3 | fab | Anunciar | `<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>` | **FAB elevado** — círculo 52×52px bg `#007B3C`, `marginTop: -10`, shadow verde |
| 4 | chat | Chat | `<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>` | Link → `/mensagens` |
| 5 | perfil | Perfil | `<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>` | Link → `/dashboard` |

Indicador ativo: barra `2.5px` no topo do item (`position: absolute; top: 0; left: 18%; right: 18%; height: 2.5px; background: #003366`). Cor do ícone+label ativo: `#003366`. Cor inativa: `#64748B`.

SVG: `width=22 height=22`, `stroke-width={active ? 2.5 : 2}`.

---

### 1.17 `ThemeToggle.tsx` (mobile — dentro do MobileMenu)

Props: `value` (`"light"` | `"system"` | `"dark"`), `onChange`.

3 botões lado a lado (flex-row, gap 6px), cada um `flex: 1`, altura 36px, border-radius 8px.

Estado ativo: bg `#007B3C`, border `#007B3C`, text `#fff`.
Estado inativo sobre fundo navy do menu: bg transparente, border `rgba(255,255,255,.3)`, text `rgba(255,255,255,.7)`.

Integrar com `Appearance` do React Native + `AsyncStorage` para persistir preferência.

---

## 2. Tokens a portar para `apps/mobile/tailwind.config.js`

```js
// tailwind.config.js — extensões necessárias
module.exports = {
  theme: {
    extend: {
      colors: {
        // Já existem no código como classes — formalizar aqui:
        primary:    '#003366',   // navy
        brand:      '#007B3C',   // verde ação
        'brand-light': '#59C686', // NUNCA com texto branco
        'blue-mid': '#144D81',

        // Superfícies
        background: '#F8FAFC',
        surface:    '#FFFFFF',

        // Texto
        foreground: '#0F172A',
        muted:      '#64748B',

        // Borda
        border:     '#E2E8F0',

        // Semânticos
        success:    '#007B3C',
        error:      '#E74C3C',
        warning:    '#F59E0B',
      },
      fontFamily: {
        // Inter já configurada; adicionar Montserrat:
        heading: ['Montserrat_700Bold', 'Montserrat_800ExtraBold', 'sans-serif'],
      },
      borderRadius: {
        sm:   '6px',
        md:   '8px',
        lg:   '12px',
        xl:   '16px',
        '2xl':'20px',
      },
      // Tap targets — usar min-h-11 (44px) como padrão mínimo
      minHeight: {
        11: '44px',
        13: '52px',
      },
    },
  },
}
```

Fonte Montserrat no Expo: instalar `@expo-google-fonts/montserrat` e carregar `Montserrat_700Bold` e `Montserrat_800ExtraBold` no `_layout.tsx` raiz com `useFonts`.

---

## 3. Padrões de interação mobile (diferenças do site web)

| Padrão web (v3b.html)        | Equivalente mobile                                      |
|------------------------------|---------------------------------------------------------|
| `AppHeader` + nav links      | `BottomNav` 5 itens (Início · Explorar · Anunciar FAB · Chat · Perfil) |
| `MobileMenu` (hamburger)     | Mesmo padrão — drawer navy cobrindo tela, com ThemeToggle tri-estado |
| Dropdown / popover           | Bottom Sheet (react-native)                             |
| Hover state                  | `activeOpacity={0.85}`                                  |
| Breadcrumb / link "Voltar"   | `ScreenHeader` com back button 44×44px                  |
| Sidebar de filtros           | Bottom Sheet de filtros (futuro)                        |
| Galeria com nav arrows       | Swipe horizontal + dots                                 |
| Toast no canto da tela       | `Alert` inline ou modal                                 |
| `LoginForm` — "← Voltar"     | Link no topo da tela de auth (sem header/nav)           |
| Explorar — grid 2 colunas    | `FlatList numColumns={2}` com `ItemCard` compacto       |
| Chips de categoria com ícone | `CategoryChip` com SVG ilustrado por slug (não emoji)   |

---

## 4. Dark Mode — estrutura de tokens CSS (MOB-BL3)

O protótipo define variáveis CSS em `:root` e sobrescreve em `[data-theme="dark"]`. No React Native, a mesma lógica se aplica via `Appearance.getColorScheme()` + contexto de tema.

### 4.1 Tokens light (padrão)

```
--bg:      #F8FAFC    → background geral de telas
--surface: #FFFFFF    → cards, inputs, headers
--text:    #0F172A    → texto primário
--muted:   #64748B    → texto secundário, labels
--border:  #E2E8F0    → bordas
--navy:    #003366    → primary, header
--green:   #007B3C    → brand, CTAs
--error:   #E74C3C    → erro (não #EF4444)
```

### 4.2 Tokens dark (override — MOB-BL3, não implementar antes do D4)

```
--bg:      #0F172A
--surface: #1E293B
--text:    #F1F5F9
--muted:   #94A3B8
--border:  #334155

Estados semânticos em dark:
--success-bg:   #064E3B   --success-text: #6EE7B7
--error-bg:     #450A0A   --error-text:   #FCA5A5
--warning-bg:   #451A03   --warning-text: #FCD34D
```

**Regra de contraste:** `#59C686` (verde claro) nunca é usado como cor de texto sobre fundo claro (contraste 2.07:1 — reprovado WCAG AA). Em dark mode é igualmente proibido sobre `--surface` `#1E293B` (contraste insuficiente). Usar apenas como cor decorativa/badge sem texto branco por cima.

### 4.3 Implementação no React Native

```typescript
// apps/mobile/lib/theme.ts
import { Appearance, useColorScheme } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

export type ThemePreference = 'light' | 'system' | 'dark'

export const LIGHT_TOKENS = {
  bg: '#F8FAFC', surface: '#FFFFFF', text: '#0F172A',
  muted: '#64748B', border: '#E2E8F0', navy: '#003366', green: '#007B3C',
}
export const DARK_TOKENS = {
  bg: '#0F172A', surface: '#1E293B', text: '#F1F5F9',
  muted: '#94A3B8', border: '#334155', navy: '#003366', green: '#007B3C',
}

// Usar ThemeContext para distribuir tokens para todos os componentes
// ThemeToggle persiste preferência em AsyncStorage ('theme-preference')
```

---

## 5. Decisões de design que merecem confirmação do dono do produto

### ~~D1 — Cadastro redireciona para o site~~ ✅ RESOLVIDO (PR #208, 2026-07-05)
Decisão: formulário de cadastro nativo, não redirect. `register.tsx` transcreve `RegisterForm.tsx` campo a campo (nome, e-mail, senha com força + mostrar/ocultar, cidade/estado, aviso LGPD, consentimento Termos+Privacidade+versão, confirmação de idade 18+, banner de indicação `?ref=`). Chama a mesma rota server-side (`POST /api/auth/register`) — sem duplicar validação. O "auto-login" pós-cadastro usa o login JWT nativo já existente (`useAuth().login`), navegando para `/(tabs)` em vez de `/bem-vindo` (rota web sem equivalente nativo) — evitando a duplicação de lógica que motivava a hesitação original.

### D2 — Tela de Perfil com stats rápidos (anúncios / locações / avaliação)
O código atual mostra apenas o menu de itens. O protótipo propõe uma faixa de 3 métricas rápidas (anúncios ativos, locações feitas, avaliação média) antes do menu. **Confirmar:** desejado? Requer endpoint `/api/users/me` retornando esses agregados.

### D3 — Detalhe do item tem dois modos visuais (locatário vs. proprietário)
Quando o usuário logado é o dono do item, o protótipo exibe: badge "Seu anúncio", botões "Editar anúncio" / "Pausar" e bloco de solicitações pendentes — em vez do CTA "Reservar item". O código atual apenas oculta o CTA (`!isOwner`). **Confirmar:** o modo proprietário expandido é escopo do MVP mobile ou fica para depois?

### D4 — Chip de categoria na Home com scroll horizontal
O código atual não tem chips de categoria — é só busca + lista. O protótipo propõe chips horizontais de categoria como filtro rápido (padrão comum em marketplaces mobile). **Confirmar:** entra no MVP ou é H2?

### D5 — Tela de sucesso pós-checkout (em vez de redirect imediato)
O código atual faz `router.replace('/reservas/${id}')` imediatamente após criar a reserva. O protótipo propõe uma tela de confirmação visual ("Solicitação enviada!") com resumo da reserva antes de navegar para o detalhe. **Confirmar:** preferência?

### D6 — Montserrat no app mobile
O site usa Montserrat via `next/font`. O app hoje usa apenas Inter para tudo. O protótipo usa Montserrat nos headings (logo, títulos de seção, preços). Requer instalar `@expo-google-fonts/montserrat` e ajustar o `_layout.tsx`. **Confirmar:** prioritário para MVP ou aceita Inter em tudo por ora?

---

## 6. O que não foi redesenhado (fora do escopo desta versão)

- Tela de mensagens / chat in-app (`mensagens/[id].tsx`) — requer componentes de bolha de chat, não cobertos aqui
- Tela de detalhe de reserva (`reservas/[id].tsx`) — fluxo de pagamento MP pós-confirmação do proprietário
- Tela de favoritos (`favoritos.tsx`) — estrutura idêntica ao feed; reutiliza `ItemCard`
- Tela de KYC (`kyc.tsx`) — upload de documentos, tratado separadamente
- Dark mode — registrado como MOB-BL3 no backlog; tokens `:root` e `[data-theme="dark"]` já definidos no protótipo (ver seção 4 deste handoff); estrutura `ThemeContext` + `AsyncStorage` documentada, não implementar antes do D4
