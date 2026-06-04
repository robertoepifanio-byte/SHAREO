# Handoff de Design — Reestruturação de Navegação ShareO

**Data:** 2026-06-04  
**Versão:** 1.0  
**Designer:** Agente Designer ShareO  
**Escopo:** Nav principal desktop (mega-menu), MobileMenu (gaveta acordeão), Rodapé (3 colunas), Spec de rotas novas  
**Restrições:** Identidade visual inalterada — Navy `#003366` / Verde `#007B3C` / Montserrat headings / Inter UI

---

## Contexto: Estado atual dos componentes

| Componente | Arquivo | Observação |
|---|---|---|
| AppHeader | `components/layout/AppHeader.tsx` | Server Component. Nav desktop plana, 3 links simples (Início, Explorar, Anunciar). Nenhum mega-menu. |
| MobileMenu | `components/layout/MobileMenu.tsx` | Client Component. Gaveta vertical com acordeão para "Minha Conta". Padrão aproveitável. |
| AppFooter | `components/layout/AppFooter.tsx` | 2 colunas de links (Plataforma, Conta, Suporte) + brand. Requer reorganização para 3 colunas. |

---

## 1. Nav Desktop — Mega-menu por seção

### Estrutura de dados (substituir NAV_LINKS em novo componente `NavDesktop`)

```ts
// Nova estrutura — 4 grupos principais
export const NAV_GROUPS = [
  {
    id: "explorar",
    label: "Explorar Itens",
    href: "/itens",
    items: [
      { label: "Categorias",        href: "/itens",              icon: "GridIcon" },
      { label: "Busca no Mapa",     href: "/itens/mapa",         icon: "MapPinIcon" },
      { label: "Filtros de Busca",  href: "/itens?filtros=1",    icon: "SlidersIcon" },
      { label: "Itens Populares",   href: "/itens/populares",    icon: "TrendingUpIcon" },
    ],
  },
  {
    id: "anunciar",
    label: "Anunciar Item",
    href: "/itens/novo",
    highlight: true, // CTA visual — fundo verde no trigger
    items: [
      { label: "Cadastre seu Item",       href: "/itens/novo",             icon: "PlusCircleIcon" },
      { label: "Estimativa de Ganhos",    href: "/anunciar/estimativa",    icon: "CalculatorIcon" },
      { label: "Dicas para Anfitriões",   href: "/anunciar/dicas",         icon: "LightbulbIcon" },
    ],
  },
  {
    id: "experiencias",
    label: "Experiências Locais",
    href: "/comunidade",
    items: [
      { label: "Destaques Locais",    href: "/comunidade/destaques",   icon: "SparklesIcon" },
      { label: "Histórias de Usuários", href: "/comunidade/historias", icon: "BookOpenIcon" },
      { label: "Comunidade",          href: "/comunidade",             icon: "UsersIcon" },
    ],
  },
  {
    id: "ajuda",
    label: "Ajuda e Segurança",
    href: "/ajuda",
    items: [
      { label: "Central de Ajuda",          href: "/ajuda",                     icon: "LifebuoyIcon" },
      { label: "Verificação de Identidade", href: "/perfil/documentos",         icon: "ShieldCheckIcon" },
      { label: "Políticas e Regras",        href: "/politicas",                 icon: "ClipboardListIcon" },
      { label: "Suporte 24/7",              href: "/suporte",                   icon: "HeadphonesIcon" },
    ],
  },
]
```

---

### Componente: NavDesktop (novo — substituir `<nav>` inline no AppHeader)

**Variantes/Estados:** default | hover | active (página atual) | open (dropdown visível)

**Tailwind classes mobile (375px):** `hidden` — não renderizado em mobile

**Tailwind classes desktop (lg 1280px):**

```
/* Wrapper do nav */
hidden md:flex items-center gap-1 ml-6

/* Trigger — item padrão (default) */
relative group
rounded-md px-3 py-1.5 text-sm font-medium
text-white/75 hover:bg-white/10 hover:text-white
transition-colors outline-none
focus-visible:ring-1 focus-visible:ring-white
flex items-center gap-1.5 cursor-pointer
min-h-[44px]

/* Trigger — item ativo (rota atual) */
text-white bg-white/15

/* Trigger — item "Anunciar Item" (highlight CTA) */
bg-[#007B3C] text-white hover:bg-[#005e2d]
rounded-md px-3 py-1.5 text-sm font-semibold

/* Chevron no trigger */
w-3 h-3 transition-transform group-data-[open=true]:rotate-180

/* Painel dropdown */
absolute left-0 top-full mt-1
min-w-[220px] max-w-[280px]
bg-white rounded-xl shadow-xl border border-gray-100
z-[210] overflow-hidden
animate-in fade-in slide-in-from-top-2 duration-150

/* Sub-item no painel */
flex items-center gap-3
px-4 py-3 min-h-[44px]
text-sm font-medium text-gray-700
hover:bg-gray-50 hover:text-[#003366]
transition-colors

/* Ícone no sub-item */
w-5 h-5 text-[#007B3C] flex-shrink-0

/* Separador entre grupos no painel (caso multi-coluna futura) */
border-t border-gray-100 my-1
```

**Posicionamento e z-index:**
- O `<nav>` no `AppHeader` tem `z-[200]`. O painel dropdown deve usar `z-[210]` para emergir sobre o cabeçalho.
- Estratégia de posicionamento: cada trigger tem `position: relative`. O painel tem `position: absolute; top: 100%; left: 0`.
- Para itens próximos à borda direita (ex: "Ajuda e Segurança"), usar `right-0` em vez de `left-0` no painel para evitar overflow.
- Overlay invisível (para fechar ao clicar fora): `fixed inset-0 z-[205]` quando dropdown aberto.

**Comportamento de abertura:**
- Abrir no `onMouseEnter` do trigger (desktop), fechar no `onMouseLeave` do grupo (trigger + painel).
- Adicionar delay de 150ms no fechamento para evitar fechamento acidental ao mover o cursor.
- Suporte a teclado: `Enter`/`Space` no trigger abre/fecha; `Escape` fecha; `Tab` percorre sub-itens.

**Tokens usados:**
- `bg-primary` = `#003366` (herdado do header)
- `text-brand` / `bg-brand` = `#007B3C`
- `white/10`, `white/15`, `white/75` — overlays sobre navy
- Sombra do painel: `shadow-xl` (Tailwind padrão)

**Acessibilidade:**
- Trigger: `role="button"` (ou `<button>`), `aria-haspopup="true"`, `aria-expanded={open}`, `aria-controls="menu-{id}"`
- Painel: `role="menu"` com `id="menu-{id}"`, `aria-label="{label} — submenu"`
- Sub-itens: `role="menuitem"`, `tabIndex={open ? 0 : -1}`
- Ícones decorativos: `aria-hidden="true"`
- Foco retorna ao trigger ao fechar com `Escape`

**Notas:**
- O `AppHeader` é Server Component. O `NavDesktop` deve ser extraído como `"use client"` separado (apenas ele tem estado de hover/open).
- Não usar `#59C686` como fundo com texto branco — contraste insuficiente (2.07:1).
- O trigger "Anunciar Item" mantém visual de CTA mesmo no desktop — diferenciação clara do restante.

---

## 2. Nav Mobile — MobileMenu (gaveta acordeão)

### Estrutura dos grupos na gaveta

Os 4 grupos principais entram como seções expansíveis (acordeão), seguindo o padrão já implementado para "Minha Conta". Manter a estrutura de `<ul>/<li>` existente.

**Ordem na gaveta (de cima para baixo):**
1. Logo / tagline (já no header — não na gaveta)
2. **Anunciar Item** — CTA destacado (topo, sempre visível, sem acordeão)
3. Separador
4. **Explorar Itens** — acordeão expansível
5. **Experiências Locais** — acordeão expansível
6. **Ajuda e Segurança** — acordeão expansível
7. Separador
8. Links autenticados (Reservas, Mensagens, Dashboard) — se logado
9. **Minha Conta** — acordeão (já existente, manter)
10. Sair — se logado
11. Entrar — se não logado

**Razão do CTA "Anunciar" no topo:** Em mobile, o objetivo principal de conversão é o anúncio. Posicionar acima do fold garante visibilidade máxima.

---

### Componente: MobileMenu (refatorar grupos)

**Variantes/Estados:** closed | open | group-collapsed | group-expanded

**Tailwind classes mobile (375px):**

```
/* Botão trigger do grupo (acordeão) */
flex h-12 w-full items-center justify-between
rounded-lg px-4
text-base font-semibold text-white/90
hover:bg-white/10 transition-colors
/* tap target: h-12 = 48px > 44px mínimo ✓ */

/* Sub-itens dentro do acordeão */
flex h-11 items-center gap-3
rounded-lg pl-8 pr-4
text-sm font-medium text-white/70
hover:bg-white/10 hover:text-white transition-colors
/* tap target: h-11 = 44px — mínimo exato ✓ */

/* CTA "Anunciar Item" — sempre visível, sem acordeão */
flex h-12 items-center rounded-lg px-4
text-base font-bold
bg-[#007B3C] text-white hover:brightness-105
/* NÃO usar bg-accent se accent = #59C686 — contraste inválido com branco */

/* Chevron do acordeão */
w-4 h-4 transition-transform
/* rotacionado 180° quando expandido: rotate-180 */

/* Separador */
my-1 h-px bg-white/10

/* Label da seção (não clicável) */
px-4 pt-2 pb-1
text-xs font-semibold text-white/50
uppercase tracking-wider
```

**Tailwind classes desktop (lg 1280px):** `md:hidden` — componente não aparece em desktop

**Nova estrutura de dados sugerida para MobileMenu.tsx:**

```ts
const MOBILE_NAV_GROUPS = [
  {
    id: "explorar",
    label: "Explorar Itens",
    items: [
      { href: "/itens",             label: "Categorias",         icon: "🏷️" },
      { href: "/itens/mapa",        label: "Busca no Mapa",      icon: "🗺️" },
      { href: "/itens?filtros=1",   label: "Filtros de Busca",   icon: "🎛️" },
      { href: "/itens/populares",   label: "Itens Populares",    icon: "🔥" },
    ],
  },
  {
    id: "experiencias",
    label: "Experiências Locais",
    items: [
      { href: "/comunidade/destaques", label: "Destaques Locais",     icon: "✨" },
      { href: "/comunidade/historias", label: "Histórias de Usuários", icon: "📖" },
      { href: "/comunidade",           label: "Comunidade",            icon: "👥" },
    ],
  },
  {
    id: "ajuda",
    label: "Ajuda e Segurança",
    items: [
      { href: "/ajuda",              label: "Central de Ajuda",          icon: "🎧" },
      { href: "/perfil/documentos",  label: "Verificação de Identidade", icon: "🪪" },
      { href: "/politicas",          label: "Políticas e Regras",        icon: "📋" },
      { href: "/suporte",            label: "Suporte 24/7",              icon: "🔔" },
    ],
  },
]
```

**Estado expandido por grupo:** `expandedGroups: Set<string>` — múltiplos grupos podem estar abertos simultaneamente (diferente do accordion exclusivo). Isso melhora a UX em mobile ao permitir comparar sub-itens.

**Tokens usados:**
- `bg-primary` herdado da gaveta (`bg-primary` = `#003366`)
- `bg-[#007B3C]` para CTA Anunciar (não usar `bg-accent` se mapeado para `#59C686`)
- `text-brand` = `#007B3C` para links "Ver tudo →"
- `white/10`, `white/50`, `white/70`, `white/90` — overlays

**Acessibilidade:**
- Botão do acordeão: `aria-expanded={open}`, `aria-controls="group-{id}"`
- Lista de sub-itens: `id="group-{id}"`, `role="list"`
- Ícones: `aria-hidden="true"`
- Todos os links e botões: `min-h-[44px]` (tap target WCAG 2.5.5)
- Foco trapped na gaveta enquanto aberta: usar `focus-trap` ou gerenciar `tabIndex` manualmente
- `aria-label="Navegação mobile"` no `<nav>` (já existente)

**Notas:**
- Manter `useEffect` de fechamento ao mudar de rota (`pathname`) — já implementado.
- Manter `document.body.style.overflow = "hidden"` ao abrir — já implementado.
- O estado de cada grupo pode ser inicializado com o grupo ativo (rota atual) pré-expandido.

---

## 3. Rodapé — 3 colunas reestruturadas

### Componente: AppFooter (refatorar `<nav>` interno)

**Variantes/Estados:** static (sem interatividade de estado)

**Tailwind classes mobile (375px) — layout 1 coluna:**

```
/* Grid de links — mobile: 1 coluna */
grid grid-cols-1 gap-8

/* Cada coluna */
flex flex-col gap-2

/* Título da coluna */
mb-1 text-[11px] font-bold uppercase tracking-widest text-white/90
/* Fonte: Inter (UI) — não Montserrat aqui, pois é label pequeno */

/* Link */
text-sm text-white/90 hover:text-white transition-colors
/* min tap target em mobile: adicionar py-1 para atingir ~32px de altura */
/* Links de rodapé não precisam de 44px rigorosos (WCAG 2.5.5 aplica-se a controles interativos principais) */
/* Mas recomenda-se py-1.5 para conforto: h-aprox 32px */
```

**Tailwind classes desktop (lg 1280px) — layout 3 colunas:**

```
/* Grid de links — desktop: 3 colunas */
grid grid-cols-3 gap-12

/* Alternativa com flex (equivalente ao padrão atual) */
md:flex md:gap-12
```

**Nova estrutura das 3 colunas:**

```tsx
// Coluna 1 — Plataforma
{
  title: "Plataforma",
  links: [
    { href: "/",           label: "Início" },
    { href: "/itens",      label: "Explorar Itens" },
    { href: "/itens/novo", label: "Anunciar Item" },
    { href: "/sobre",      label: "Sobre Nós" },
    { href: "/sobre#missao", label: "Nossa Missão" },
    { href: "/sobre#contato", label: "Contato" },
  ]
}

// Coluna 2 — Legal (renomeada de "Conta")
{
  title: "Legal",
  links: [
    { href: "/privacidade", label: "Privacidade" },
    { href: "/termos",      label: "Termos de Uso" },
    { href: "/politicas",   label: "Políticas e Regras" },
  ]
}

// Coluna 3 — Suporte (reorganizada)
{
  title: "Suporte",
  links: [
    { href: "/ajuda",              label: "Central de Ajuda" },
    { href: "/suporte",            label: "Suporte 24/7" },
    { href: "/perfil/documentos",  label: "Verificação de Identidade" },
    { href: "/comunidade",         label: "Comunidade" },
  ]
}
```

**Tokens usados:**
- `bg-[#007B3C]` — fundo do rodapé (mantido)
- `text-white`, `text-white/90`, `text-white/20` — textos e separadores
- `border-white/20` — barra bottom

**Acessibilidade:**
- `aria-label="Rodapé ShareO"` no `<footer>` (já existente)
- `aria-label="Links do rodapé"` no `<nav>` (já existente)
- Títulos de coluna: usar `<p>` ou `<h3>` conforme hierarquia da página
  - Preferir `<h3>` se o rodapé for a única seção com headings nesse nível
  - Manter consistência com o restante da página

**Notas:**
- O grid `grid-cols-2` atual (mobile) deve mudar para `grid-cols-1` em 375px para evitar textos cortados na coluna 1 com links mais longos ("Nossa Missão", "Verificação de Identidade").
- Em tablet (768px): `grid-cols-2` com a coluna 3 quebrando em nova linha, ou `grid-cols-3` se o viewport comportar.
- Sugestão de breakpoint intermediário: `sm:grid-cols-2 lg:grid-cols-3`
- Manter brand block (logo + tagline) à esquerda em desktop, acima das colunas em mobile.

---

## 4. Rotas novas — Spec de entrada (não implementar agora)

### `/anunciar/estimativa`
**Título:** Estimativa de Ganhos  
**Propósito:** Calculadora de renda potencial para anfitriões. Convencer usuários a anunciar.  
**Conteúdo mínimo:**
- Hero com headline Montserrat: "Quanto você pode ganhar com o ShareO?"
- Formulário de inputs: categoria do item, valor estimado do produto, dias disponíveis/mês
- Resultado dinâmico: ganho estimado diário / semanal / mensal (usar tabela de `pricing_reference_brasil.md`)
- CTA final: "Cadastrar meu item agora" → `/itens/novo`
- Seção secundária: comparativo com outros modelos de renda passiva
- Renderização: **CSR** (calculadora interativa) dentro de shell **SSG** (landing institucional)

### `/anunciar/dicas`
**Título:** Dicas para Anfitriões  
**Propósito:** Conteúdo editorial para onboarding de novos anunciantes.  
**Conteúdo mínimo:**
- Checklist de preparo do item para locação (fotos, descrição, limpeza)
- Guia de precificação com referência à tabela Brasil (diária ≈ 5% do produto)
- Dicas de comunicação com locatários
- FAQ: dúvidas frequentes de anfitriões
- CTA: "Cadastrar meu item" + "Calcular minha estimativa" → `/anunciar/estimativa`
- Renderização: **SSG** (conteúdo estático editorial)

### `/politicas`
**Título:** Políticas e Regras  
**Propósito:** Central de políticas legais e de uso da plataforma.  
**Conteúdo mínimo:**
- Âncoras: Política de Cancelamento, Regras de Uso, Política de Disputas, Política de Itens Proibidos
- Seção de versionamento (data da última atualização)
- Links para `/privacidade` e `/termos`
- Renderização: **SSG**

### `/suporte`
**Título:** Suporte 24/7  
**Propósito:** Canal de contato direto.  
**Conteúdo mínimo:**
- Formulário de contato (Nome, E-mail, Assunto, Mensagem) — ação via API route
- Status do suporte (online/offline) — CSR ou Server Component com revalidação
- Link para WhatsApp ou chat ao vivo (placeholder)
- FAQ rápido das 5 perguntas mais frequentes
- Link para Central de Ajuda completa → `/ajuda`
- Renderização: shell **SSG** + formulário **CSR**

### `/sobre`
**Título:** Sobre Nós / Nossa Missão  
**Propósito:** Página institucional. Constrói confiança e credibilidade.  
**Conteúdo mínimo:**
- Hero com missão: "Transformar itens parados em renda e construir comunidades mais sustentáveis"
- Timeline ou narrative da origem do ShareO
- Âncoras: `#missao`, `#time`, `#contato`
- Seção de valores (Sustentabilidade, Confiança, Comunidade, Economia Circular)
- Formulário de contato ou link para `/suporte`
- Renderização: **SSG**

### `/comunidade`
**Título:** Experiências Locais / Comunidade  
**Propósito:** Social proof e engajamento. Vitrine de histórias reais.  
**Conteúdo mínimo:**
- Seção "Destaques Locais": cards de itens/experiências com alta avaliação na região
- Seção "Histórias de Usuários": depoimentos em formato de cards ou mini-artigos
- Feed de atividade recente da comunidade (opcional — fase posterior)
- CTA duplo: "Explorar itens" + "Anunciar item"
- Renderização: **ISR** (revalidar a cada 1h) — conteúdo dinâmico mas não em tempo real

---

## Resumo de Impacto nos Componentes Existentes

| Componente | Ação | Complexidade |
|---|---|---|
| `AppHeader.tsx` | Substituir `<nav>` inline por `<NavDesktop />` (novo client component) | Baixa — apenas extração |
| `MobileMenu.tsx` | Refatorar arrays de dados para nova estrutura de 4 grupos; adicionar accordion para cada grupo | Média — lógica de estado cresce |
| `AppFooter.tsx` | Trocar grid 2 colunas por 3 colunas; atualizar links conforme spec | Baixa — HTML/Tailwind |
| `NavDesktop.tsx` | Criar novo componente "use client" com hover/focus dropdown | Média-Alta — gestão de estado + a11y |

## Checklist de validação antes de implementar

- [ ] `NavDesktop`: testar navegação por teclado (Tab → Enter → Escape → retorno ao trigger)
- [ ] `NavDesktop`: testar com leitor de tela (NVDA/VoiceOver) — anunciar "submenu expandido/recolhido"
- [ ] `MobileMenu`: verificar tap targets ≥ 44px em todos os sub-itens
- [ ] `AppFooter`: verificar contraste de todos os textos sobre `#007B3C` (mínimo 4.5:1 para texto normal)
- [ ] `AppFooter`: `text-white` sobre `#007B3C` = contraste ~8.6:1 — aprovado WCAG AAA
- [ ] Validar que nenhum uso de `#59C686` carrega texto branco (viola contraste)
- [ ] Testar dropdown em viewport 1280px com `overflow: hidden` no `<html>` — garantir que painel não seja clipped
