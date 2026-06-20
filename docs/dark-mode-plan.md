# ShareO — Plano & Especificação do Modo Escuro (Dark Mode)

**Versão:** 0.3 (risco do `@tailwindcss/forms` destacado p/ a Fase 1) · **Data:** 2026-06-19
**Autores/Revisão:** orquestração técnica + papéis `designer-shareo` (UI/UX) e `fullstack-dev-shareo` (front-end). Pendente de validação com usuários e especialistas antes da implementação.
**Escopo:** site web responsivo **mobile-first** (Next.js App Router). O app mobile Expo (`apps/mobile/`) e os e-mails transacionais (Resend) **ficam fora** deste plano.

> Mobile-first é requisito do produto (CLAUDE.md). Toda decisão aqui é validada primeiro em **375px** e só então escalada para 768px/1280px.

---

## 0. Decisões incorporadas na v0.2 (revisão dos especialistas)

Consolidação das duas revisões. **Estas decisões fecham os pontos marcados ⚠️ nas seções abaixo.**

### Tokens fechados (revisão UI/UX)
- **`primary` separado em dois tokens:** `primary` (fill) = `#1E4D80` (texto branco 9.2:1) **e** `primary-text` (navy como texto) = `#4A90D9` (7.1:1 sobre bg). O `#1E4D80` reprova como texto (3.6:1) — usar só como fundo.
- **Status fechados** (texto sobre bg `#0B1524`): `confirmed #5BA3E0` (8.6:1), `returned #B49AF5` (9.2:1), `disputed #F0A35E` (7.8:1) — todos AA. `item.inactive` clareia p/ `#B0BEC5` (5.2:1 sobre surface).
- **Tokens `orange`** entram na paleta dark: `orange.link #9A4700` (9.6:1) e `orange.cta #C05800` (6.7:1) passam como texto; `#F97316` segue só decorativo.
- **`accent #59C686` como texto é permitido SÓ no dark** (8.5:1); em modo claro continua proibido como texto (2.1:1).
- **`ringOffsetColor` dark = a superfície** (`#15233B`), não branco — senão halo branco no foco.
- **`muted` dark:** `muted.DEFAULT #26395A` (skeletons), `muted.foreground #94A3B8`.
- **Header no dark = `surface #15233B` + borda inferior `#26395A`** (NÃO o navy, que some no fundo: navy×bg = 2.1:1).
- **Estados de componente** (antes ausentes): Button hover dark `#008C43`; Button disabled `bg #26395A`/`text #4A5E7A`; Input erro usa borda `#F08C84`; ItemCard hover = borda `#26395A`→`#4A90D9` (sombra some no dark).

### Arquitetura fechada (revisão front-end)
- **~40 CSS variables** no total: tokens-objeto (`brand`*5, `primary`*3, `booking`*7, `orange`*5, `destructive`*4, `success`*3, `item`*3, `disabled`*3, `muted`*2…) viram **uma var por sub-chave** em canais RGB. A Fase 1 precisa da tabela exaustiva, não "idem para os demais".
- **`@tailwindcss/forms` → `{ strategy: 'class' }`** na Fase 1: por padrão o plugin injeta `background/border/color` hex fixos em `[type=...]` e **ignora CSS vars** → inputs ficariam brancos no dark.
- **CSP/no-FOUC — a infra de nonce já existe** (`middleware.ts`: `generateNonce`/`buildCsp(nonce)`/header `x-nonce`; `app/layout.tsx` lê o nonce e já passa p/ `GoogleAnalytics`). Fix concreto: `<ThemeProvider nonce={nonce} attribute="class" …>` com `nonce = headers().get("x-nonce")`. Prod tem `script-src 'self' 'nonce-…'` **sem** `'unsafe-inline'` → sem o nonce o script do `next-themes` é bloqueado. Dev já tem `'unsafe-inline'`.
- **`suppressHydrationWarning` no `<html>`** (hoje só está no `<body>`, `app/layout.tsx`) — é no `<html>` que o `next-themes` troca a classe.
- **Mapbox** (`components/items/ItemsMap.tsx:94`, hoje `streets-v12` fixo): `const mapStyle = (resolvedTheme ?? "light") === "dark" ? "…/dark-v11" : "…/streets-v12"` via `useTheme()` (já é client). `?? "light"` evita flash no 1º render SSR.
- **Sonner** (`<Toaster>` em `app/layout.tsx`, Server Component): mover p/ um **client leaf** que use `useTheme()` e passe `theme={resolvedTheme}` (ou `theme="system"` com a ressalva de ignorar o toggle manual).
- **Dívida de cor fixa medida:** **~383 ocorrências em 45+ arquivos** (75 hex, 267 `text-white`/`bg-white`, 41 classes arbitrárias). Top ofensores: `AppFooter.tsx` (`bg-[#007B3C]` + 27×`text-white`), `ListaVIP.tsx` (gradiente `to-[#001f40]`→`navy-deep`), `FounderCaptureForm.tsx`, `MobileMenu.tsx`, `ajuda/page.tsx`+`SimuladorRenda.tsx` (`#144D81`→`blue-medium`). A Fase 3 deve ser **subdividida por grupo** (componentes navy-escuros × hex arbitrários × componentes comuns).

### Riscos adicionados
- **Monotonia do verde:** com superfícies navy escuras, o verde de ação vira o único tom quente — validar com **screenshots reais** (hero + página de item), não só swatches.
- **`disableTransitionOnChange` × `slide-up` do MobileMenu:** a supressão de transição na troca de tema pode causar flash de layout se o toggle estiver no menu animado — testar o fluxo abrir-menu→trocar→fechar.

---

## 1. Objetivo

Entregar uma versão dark do ShareO com **consistência visual** com o modo claro, **acessibilidade WCAG 2.1 AA** e **bom desempenho** (sem flash de tema, sem custo de runtime relevante), preservando a identidade de marca (Navy `#003366`, Verde de ação `#007B3C`, "Use Mais. Possua Menos.").

---

## 2. Diagnóstico do estado atual (ponto de partida real)

Levantado no código em 2026-06-19:

| Aspecto | Situação hoje | Implicação para o dark |
|---|---|---|
| Infra de tema | **Inexistente** — sem `next-themes`, sem `darkMode` no Tailwind, sem `dark:`, sem toggle | Precisa ser construída do zero |
| Tokens de cor | **Hex hardcoded** em `tailwind.config.ts` (`background:"#FFFFFF"`, `foreground:"#0F172A"`…) | **Bloqueador estrutural:** cor fixa no build não troca por tema. Tem que virar CSS variable |
| CSS variables | `app/globals.css` tem só `--primary/--brand/--accent/--destructive/--background/--surface/--icon-*`, **não conectadas** ao Tailwind e **divergentes** (Tailwind `background:#FFFFFF` × `--background:#F8FAFC`) | Reconciliar e expandir para a paleta completa |
| Uso nos componentes | **Maioria** já usa tokens semânticos (`bg-surface`, `text-foreground`, `border-border`, `text-brand`) | Virar o valor do token **cascateia** para esses — caminho barato |
| Dívida de cor fixa | Há `text-white`, `bg-white/[0.08]`, `#59C686`, `text-[#9A4700]`, gradientes navy inline (ex.: `FounderCaptureForm`, `ListaVIP`, páginas admin, landings `/pilotos`) | Precisa **migrar para tokens** antes/junto do dark |
| Mapbox | `react-map-gl` com style claro fixo | Trocar para style dark quando tema=dark |
| Sombras | Tokens de sombra são navy translúcido (`rgb(0 51 102 / …)`) | Quase invisíveis no dark → elevação por **superfície + borda**, não sombra |

**Conclusão:** o trabalho é **70% arquitetura de tokens** (mover hex→CSS vars e migrar cor fixa) e **30% design da paleta dark**. A boa notícia é que a adoção de tokens semânticos já existente faz a cascata trabalhar a nosso favor.

---

## 3. Arquitetura de theming proposta

### 3.1 Estratégia: CSS variables + `darkMode: 'class'`

1. **Definir todos os tokens semânticos como CSS variables** em `app/globals.css`, em dois blocos:
   - `:root { … }` → valores do **modo claro** (default).
   - `.dark { … }` → overrides do **modo escuro**.
2. **Apontar o Tailwind para as variables** (em vez de hex). Para suportar opacidade do Tailwind (`bg-surface/50`), usar canais RGB:
   ```css
   :root { --background: 255 255 255; --foreground: 15 23 42; /* … */ }
   .dark { --background: 11 21 36; --foreground: 232 238 246; /* … */ }
   ```
   ```ts
   // tailwind.config.ts
   colors: {
     background: "rgb(var(--background) / <alpha-value>)",
     foreground: "rgb(var(--foreground) / <alpha-value>)",
     surface:    "rgb(var(--surface) / <alpha-value>)",
     // … idem para brand, primary, accent, border, muted, destructive, ring, status…
   }
   ```
3. **Ativar a estratégia de classe** no Tailwind: `darkMode: 'class'` (o `next-themes` adiciona/remove `.dark` no `<html>`).

> **Por que `class` e não `media`:** o requisito de produto inclui um **toggle manual** (claro/escuro/sistema). `class` permite override do usuário sobre a preferência do SO. A preferência do sistema continua respeitada via `defaultTheme="system"`.

### 3.2 Provider e ausência de flash (no-FOUC)

- Usar **`next-themes`** (`attribute="class"`, `defaultTheme="system"`, `enableSystem`, `disableTransitionOnChange`).
- App Router: `ThemeProvider` é client component, envolve `children` no `app/layout.tsx`; adicionar `suppressHydrationWarning` no `<html>`.
- `next-themes` injeta um **script inline bloqueante** que aplica a classe **antes da pintura** → elimina o flash de tema.

### 3.3 ⚠️ Gotcha ShareO — CSP do middleware

O `next-themes` injeta um **`<script>` inline** no `<html>`. O `middleware.ts` do ShareO já tem **infra de nonce completa** (`generateNonce`, `buildCsp(nonce)`, header `x-nonce`) e o `app/layout.tsx` já lê o nonce e o passa para o `GoogleAnalytics`. Em **produção** o `script-src` é `'self' 'nonce-…'` **sem** `'unsafe-inline'` → sem o nonce o script do `next-themes` é bloqueado (em **dev** há `'unsafe-inline'`, então o problema só aparece no staging/prod).

**Fix concreto (não afrouxar a CSP):** passar o nonce ao provider — `<ThemeProvider nonce={nonce} attribute="class" …>`, com `nonce = headers().get("x-nonce")` (mesmo mecanismo já usado pelo GA). `next-themes` ≥ 0.3 injeta o `nonce` no script inline. **Validar no staging** (console limpo, sem bloqueio de script).

### 3.4 Persistência e SSR

- `next-themes` persiste em `localStorage` (`theme`) e reidrata sem flash.
- Componentes Server (ex.: `AppHeader`) **não leem o tema** — o tema é puramente CSS (classe no `<html>`), então SSR continua agnóstico. O **toggle** é um client leaf (igual ao padrão `NavLinks`).

---

## 4. Paleta dark — tokens (contrastes verificados)

Valores de partida, com contraste **computado** (algoritmo WCAG 2.1). Marcados ⚠️ os que pedem validação fina do `designer-shareo`. Princípios: **base navy-tintada** (não preto puro) para herdar a identidade; **elevação por luminância** (superfícies mais claras = mais "altas"); **verde de texto diferente do verde de fill**.

### 4.1 Superfícies e texto

| Token | Claro | Escuro | Contraste no escuro (verificado) |
|---|---|---|---|
| `background` (base) | `#FFFFFF`* | `#0B1524` | — (base) |
| `surface` (cards/modais) | `#FFFFFF` | `#15233B` | foreground 13.5:1 ✅ |
| `surface-elevated` (popover/sheet) **novo** | `#FFFFFF` | `#1C2E4A` | — |
| `foreground` (texto principal) | `#0F172A` | `#E8EEF6` | **15.7:1** sobre bg ✅ |
| `muted-foreground` (texto secundário) | `#64748B` | `#94A3B8` | **7.1:1** sobre bg ✅ |
| `border` / `input` | `#E2E8F0` | `#26395A` | divisor navy-tintado |
| `ring` (foco) | `#007B3C` | `#5BD08B` | foco visível no escuro ✅ |

\* Reconciliar a divergência atual: Tailwind `background:#FFFFFF` vs `--background:#F8FAFC`. Proposta: `background` claro = `#FFFFFF`, e usar `surface-muted #F8FAFC` para seções alternadas (como hoje).

### 4.2 Marca e ação

| Token | Claro | Escuro | Nota de contraste |
|---|---|---|---|
| `brand` (fill de botão) | `#007B3C` | **`#007B3C`** | texto branco = **5.39:1** ✅ (manter; o verde mais claro `#0E9F57` reprova com branco = 3.43:1) |
| `brand-hover` | `#005F2E` | `#00692F` | — |
| `brand-link` (verde como **texto/link**) **novo** | `#005F2E` | `#5BD08B` | **9.45:1** sobre bg ✅ |
| `accent` (verde claro decorativo/ícone) | `#59C686` | `#59C686` | como texto no escuro = **8.58:1** ✅ |
| `accent-foreground` (texto sobre accent) | `#003366` | `#003366` | manter texto escuro sobre verde claro |
| `primary` (navy — **fill** chips/badges) | `#003366` | `#1E4D80` | texto branco sobre ele = 9.2:1 ✅ |
| `primary-text` (navy como **texto**) **novo** | `#003366` | `#4A90D9` | 7.1:1 sobre bg ✅ (o `#1E4D80` reprova como texto: 3.6:1) |
| `primary-foreground` | `#FFFFFF` | `#FFFFFF` | — |
| `destructive` (fill) | `#C0392B` | `#D14438` | texto branco = **4.57:1** ✅ |
| `destructive-text` (vermelho como texto) **novo** | `#C0392B` | `#F08C84` | **7.66:1** sobre bg ✅ |

### 4.3 Status (booking/item) — versões de texto clareadas no dark

No claro são fills/badges; no dark, quando usados como **texto**, precisam clarear. Exemplos verificados:

| Status | Claro | Texto no escuro (sugerido) | Contraste |
|---|---|---|---|
| pending (amber) | `#F59E0B` | `#FBBF77` | 11.2:1 ✅ |
| active (verde) | `#007B3C` | `#5BD08B` | 9.45:1 ✅ |
| confirmed (azul) | `#144D81` | `#5BA3E0` | 8.6:1 ✅ |
| returned (violet) | `#8B5CF6` | `#B49AF5` | 9.2:1 ✅ |
| disputed (laranja) | `#C05800` | `#F0A35E` | 7.8:1 ✅ |
| inactive (item) | `#94A3B8` | `#B0BEC5` | 5.2:1 sobre surface ✅ |

> Toda a tabela completa de tokens entra no arquivo de design tokens na implementação; aqui ficam os representativos + os que já têm contraste fechado.

---

## 5. Guidelines de design responsivo (mobile-first)

1. **Toggle de tema — onde:**
   - **Mobile (375px):** dentro do `MobileMenu` (seção "Aparência") e/ou no `/perfil` → tri-state **Claro / Escuro / Sistema** (44×44px tap target).
   - **Desktop (≥1280px):** ícone (sol/lua) no `AppHeader`, à esquerda do sino/avatar.
   - Default = **Sistema**. Persistência via `next-themes`.
2. **Elevação:** no dark, hierarquia por **superfície mais clara + borda sutil**, não por sombra (sombras navy somem). `background` < `surface` < `surface-elevated`.
3. **Imagens e mídia:** fotos de item são neutras → ok. **Logos/ilustrações com fundo branco transparente** precisam de variante ou container com padding tonal. Definir o logo do header para o dark (versão clara do wordmark).
4. **Mapbox:** trocar `mapStyle` para `mapbox://styles/mapbox/dark-v11` quando tema=dark (ver §6).
5. **Estados de foco:** ring `#5BD08B` (verde claro) — foco **sempre visível** em ambos os temas (tap/teclado).
6. **Contraste mínimo mantido:** texto normal ≥ 4.5:1, texto grande/UI ≥ 3:1 — em **todas** as superfícies (bg, surface, surface-elevated).
7. **Sem depender de cor sozinha:** status (pending/active/disputed) sempre com **ícone + rótulo**, não só cor (já é o padrão; manter no dark).

---

## 6. Mapa de componentes e variações no dark

Inventário priorizado (P0 = aparece em quase toda tela). Cada item indica a ação principal.

| Componente | Arquivo(s) | Ação no dark |
|---|---|---|
| **AppHeader / NavLinks** | `components/**/AppHeader*`, `NavLinks.tsx` | tokens + toggle; logo variante clara |
| **MobileMenu / BottomNav** | nav mobile | seção "Aparência"; superfícies/borda |
| **Button** (todas variantes) | design system | fill `brand` mantém; outline/ghost via tokens |
| **ItemCard** | cards de item | `surface` + `border`; preço em `brand-link` |
| **SearchBar / FilterPanel** | busca | input tokens; chips ativos |
| **Forms / inputs** (`@tailwindcss/forms`) | formulários | bg `surface`, borda `input`, placeholder `muted-foreground`, estados de erro `destructive-text` |
| **PriceCalc** | `app/itens/[id]/_PriceCalc.tsx` | superfícies + CTA |
| **BookingCard / status badges** | reservas | mapa de status §4.3 |
| **MapView** | `ItemsMap` (`react-map-gl`) | `mapStyle` dark + cor do pin/marker |
| **Toasts (Sonner)** | layout | tema escuro do Sonner (`theme` prop) |
| **Modais / BottomSheet / Dropdown** | overlays | `surface-elevated`; overlay/backdrop translúcido |
| **Hero / ListaVIP / landings `/pilotos`** | `components/home/*`, `app/pilotos/[cidade]` | **já são navy-escuros** — migrar `text-white`/`bg-white/[0.08]`/hex fixos para tokens p/ não "brilharem" duas vezes no dark |
| **Admin** (`/admin/*`) | painel | maior dívida de cor fixa (`text-[#9A4700]` etc.) → migrar |
| **Skeletons** | loading | `muted` token |

**Dívida de cor fixa a migrar (abordagem):** rodar uma varredura (`rg` por `#[0-9A-Fa-f]{3,6}`, `text-white`, `bg-white`, `text-\[#`) e converter para token equivalente. É pré-requisito de qualidade — sem isso, o dark fica "remendado".

---

## 7. Plano de implementação (fases, responsáveis, prazos)

> Prazos em **estimativas de esforço** (não compromissos de calendário); responsáveis por **papel** (`arquiteto-shareo`, `designer-shareo`, `fullstack-dev-shareo`, `qa-shareo`). Tudo **gated por D4** apenas para produção — staging pode receber normalmente.

| Fase | Entrega | Responsável | Esforço |
|---|---|---|---|
| **0. Design da paleta** | Validar/fechar tokens §4 (incl. status/primary marcados ⚠️), aprovar contrastes, protótipo Figma (§8) | `designer-shareo` | ~2–3 dias |
| **1. Fundação de tokens** | `globals.css` com `:root`+`.dark` (canais RGB); `tailwind.config.ts` apontando p/ vars; `darkMode:'class'`. **Sem mudança visual no claro** (refactor puro) | `arquiteto-shareo` + `fullstack-dev-shareo` | ~2 dias |
| **2. Provider + toggle + no-FOUC** | `next-themes`, `ThemeProvider`, `suppressHydrationWarning`, toggle mobile/desktop, **ajuste de CSP** (nonce p/ inline) | `fullstack-dev-shareo` | ~1–2 dias |
| **3. Migração de cor fixa** | Varredura e conversão de hex/`text-white`/`bg-white` → tokens (hero, landings, admin, forms) | `fullstack-dev-shareo` | ~3–4 dias |
| **4. Componentes especiais** | Mapbox dark style, Sonner dark, logo variante, sombras→elevação, skeletons | `fullstack-dev-shareo` + `designer-shareo` | ~2 dias |
| **5. QA e acessibilidade** | Checklist §9 nos 3 breakpoints, axe/jest-axe, Lighthouse, validação com usuários | `qa-shareo` | ~2 dias |
| **6. Rollout** | Deploy staging → validação fundadores → (produção pós-D4) | `devops-shareo` | ~0,5 dia |

**Sequência crítica:** Fase 1 **antes** de qualquer `dark:` — sem a fundação de tokens, nada cascateia. Fase 3 pode rodar em paralelo a 4.

> ### ⚠️ ATENÇÃO FASE 1 — o `@tailwindcss/forms` é o maior risco de regressão no **modo claro**
>
> Trocar o plugin para `{ strategy: 'class' }` faz ele **deixar de injetar estilos globais** em `[type=...]`/`select`/`textarea`. Hoje vários campos dependem desse reset automático — sem ele, inputs **sem classe explícita podem mudar de aparência no claro** (não só no escuro). Este é o único passo da Fase 1 que pode quebrar o claro; o resto é troca de valor idêntico.
>
> **Antes de mergear a Fase 1, obrigatório:**
> 1. **Varrer todos os formulários** (login, cadastro, cadastro/completar, recuperar senha, anunciar item, `_PriceCalc`, filtros de `/itens`, admin, `FounderCaptureForm`, `ListaVIP`) e garantir que cada `input/select/textarea` tenha estilo explícito (classe `form-input`/`form-select`/`form-textarea` do plugin **ou** classes Tailwind próprias).
> 2. **Diff visual dos campos no claro antes/depois** — qualquer diferença de borda, padding, cor de fundo ou foco é regressão, não feature.
> 3. Conferir os componentes shadcn/ui que envolvem inputs (`Input`, `Select`, `Checkbox`, `Switch`) — confirmar que já trazem classes próprias e não herdam só do plugin.

---

## 8. Protótipos (Figma) — processo de validação

- A **fonte de verdade visual** segue sendo o `shareo-prototipo-v3b.html` + este spec. O `designer-shareo` produz no **Figma**:
  1. **Estilos/variáveis de cor** espelhando os tokens §4 (modo claro + escuro como *modes* de variável).
  2. Telas-chave em dark a **375px** (mobile-first): Home/Hero, `/itens` (grid + filtros), página do item + `PriceCalc`, fluxo de reserva, `/admin` (1 tela), uma landing `/pilotos`.
  3. Variantes de componente (Button, ItemCard, inputs, badges de status) com estados (default/hover/active/disabled/focus/error).
- **Validação com usuários** (5–7) e especialistas **antes** da Fase 3: preferência de tema, legibilidade percebida, descoberta do toggle.
- *(Opcional)* posso gerar um **preview HTML interativo** da paleta/componentes dark aqui no chat para acelerar a discussão antes do Figma — só pedir.

---

## 9. Checklist de acessibilidade e testes

> **Status (2026-06-20):** dark mode implementado (Fases 1–5 + elevação) e **no ar no staging**; itens abaixo verificados, exceto a execução do teste de usabilidade (roteiro pronto).

**Acessibilidade (WCAG 2.1 AA):**
- [x] Texto normal ≥ **4.5:1** e texto grande/UI ≥ **3:1** em `background`/`surface` (dark **e** claro) — axe 0 violações de contraste nos dois temas; navy/verde/azul como texto clareados no dark (Fase 5).
- [x] Foco **sempre visível** (ring `#5BD08B`) em tap e teclado; ordem de tabulação intacta — verificado no teste E2E de teclado.
- [x] Nenhuma informação **só por cor** — status de booking/item usam ícone + rótulo textual.
- [x] Tap targets ≥ **44×44px** (toggle incluso) — `ThemeToggle` com `h-11`/`min-h-[44px]`.
- [x] `prefers-reduced-motion` respeitado na transição de tema (`disableTransitionOnChange`).
- [x] `axe`/`jest-axe` = **0 violações** nas telas-chave, nos dois temas — teste automatizado em `e2e/e2e-a11y-plan.spec.ts` (passou na regressão pós-deploy do staging).
- [x] Imagens/ícones com contraste no fundo escuro — logo em caixa branca; pin do mapa é imagem; Mapbox `dark-v11`.

**Funcional / desempenho:**
- [x] **Sem flash de tema** (FOUC) — `next-themes` com nonce CSP + `suppressHydrationWarning`; Lighthouse staging **CLS 0**.
- [x] Toggle **persiste** entre navegações e reload; "Sistema" segue o SO ao vivo — verificado (localStorage + `colorScheme`).
- [x] CSP **não bloqueia** o script do `next-themes` — console limpo no staging.
- [x] SSR não quebra (hydration sem warning além do `suppressHydrationWarning`).
- [x] Mapbox carrega o style dark; markers/popups legíveis — `dark-v11` confirmado via rede.
- [~] Lighthouse mobile (staging): **A11y 100 ✅**, BP 96, **Perf 86** (LCP 2.4s · CLS 0 · TBT 450ms). A11y ≥ 95 atendido; Perf < 90 puxado por TBT — **não atribuível ao dark** (bundle idêntico entre temas); investigar perf à parte. Dark é theme-independent em perf.
- [x] Responsivo validado em **375 / 768 / 1280**.
- [x] **`@tailwindcss/forms` em `strategy:'class'`** — auditoria de inputs concluída (Fase 2); claro sem regressão (axe + diff visual).
- [x] Regressão visual do **modo claro** = zero — confirmado por estilos computados (footer/superfícies idênticos) e auditoria.

**Testes de usabilidade:** *(roteiro pronto em [`docs/dark-mode-teste-usabilidade.md`](dark-mode-teste-usabilidade.md) — execução pelos fundadores no staging)*
- [ ] Usuários encontram o toggle sem ajuda (mobile e desktop).
- [ ] Legibilidade percebida e conforto em ambiente de pouca luz.
- [ ] Preferência declarada (claro/escuro/sistema) coletada.

---

## 10. Riscos e considerações

| Risco | Mitigação |
|---|---|
| **🔴 `@tailwindcss/forms` → `strategy:'class'` muda inputs no CLARO** (maior risco de regressão da Fase 1) | Varredura de **todos** os formulários + visual diff dos campos no claro antes/depois; adicionar `form-input`/`form-select`/`form-textarea` (ou classes próprias) onde o estilo automático era usado; conferir wrappers shadcn/ui antes de mergear |
| **Cor fixa espalhada** deixa o dark "remendado" | Fase 3 obrigatória (varredura + migração para tokens) antes do go-live do dark |
| **CSP bloquear** o no-FOUC | Nonce no `script-src`; validar no staging |
| **Mapbox** ilegível no dark | Style `dark-v11` + cor de pin própria |
| **Regressão no modo claro** | Fase 1 é refactor puro (mesmos valores); snapshot/visual diff antes/depois |
| **OG/redes sociais / e-mails** | Permanecem no tema claro (fora de escopo) — garantir que não herdam dark |
| **Divergência de tokens** (Tailwind × globals.css) | Reconciliar na Fase 1 (fonte única = CSS vars) |
| **Manutenção futura** | Lint/regra para barrar hex fixo novo fora dos tokens (ex.: ESLint custom ou code review) |

---

## 11. Definição de pronto (DoD)

Dark mode considerado pronto quando: tokens em CSS vars (claro+escuro), toggle tri-state funcional e persistente sem FOUC, **0 violações axe** e contraste AA verificado nas telas-chave nos 3 breakpoints, Mapbox/Sonner/logo adaptados, **regressão zero no claro**, Lighthouse dentro do baseline, e validação com usuários concluída. Deploy em staging aprovado pelos fundadores (produção segue gated por **D4**).

> **Status 2026-06-20:** ✅ implementado (Fases 1–5 + elevação) e mesclado na `main`; **live no staging** (`staging.shareo.com.br`), E2E de regressão verde pós-deploy. Falta apenas: **execução** do teste de usabilidade (roteiro pronto) e, opcionalmente, investigar o Perf do Lighthouse (não relacionado ao dark). Go-live em produção segue bloqueado por **D4** (jurídico).
