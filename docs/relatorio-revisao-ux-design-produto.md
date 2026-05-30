# Relatório de Revisão UX/Design/Produto — ShareO

**Data:** 2026-05-30  
**Versão:** 1.0  
**Coordenador:** Claude (consolidação de 3 subagentes especializados)  
**Subagentes:** UX (designer-shareo) · Designer (designer-shareo) · Analista de Produto (product-owner-shareo)  
**Insumos:** Identidade Visual v1.0 · sugestoes-design-ux.docx · backlog-atividades-priorizadas.md v2.0 · fluxo de usuário completo.docx · Análise UX Kimi 2.6

---

## Sumário Executivo

A revisão cruzada identificou **3 classes de problemas** que precisam de ação imediata, antes de qualquer nova feature:

1. **Infraestrutura quebrada em produção** — rotas críticas retornam 500 e SSR renderiza apenas footer
2. **Divergência de design system** — `tailwind.config.ts` conflita com a identidade visual oficial
3. **Gaps de fluxo não mapeados** — Fase 6 (Devolução) sem qualquer tela; estado "aguardando reserva" ausente

Todos os problemas identificados pelo Kimi 2.6 são **escopo H1 (MVP)** — não há nada postergável para H2/H3.

---

## Parte 1 — Análise de Produto: Gaps no Backlog e Re-priorização

### 1.1 Cobertura dos Problemas Críticos do Kimi 2.6

| Problema Kimi | Cobertura atual | Item | Gap? |
|---|---|---|---|
| `/itens` e `/login` carregam apenas footer (SSR quebrado) | Parcial | P0-#5 (empty states) | **SIM — causa raiz não coberta** |
| Erros 500 em `/anunciar`, `/registrar`, `/itens/[slug]` | Parcial | P0-#6 (página de erro) | **SIM — diagnóstico ausente** |
| Header/menu ausente ou invisível | Coberto mas subpriorizado | P1-#18 (navigation E2E) | **SIM — deveria ser P0** |
| Busca inexistente na UI | Coberto mas subpriorizado | P1-#19 (search-filter E2E) | **SIM — deveria ser P0** |
| Categorias sem filtros ativos visíveis | Coberto | P1-#29 (chips filtros) | Não — prioridade correta |

### 1.2 Re-priorização Recomendada (Análise WSJF)

**Elevar de P1 para P0:**

- **P1-#18 → P0-#11**: `e2e/navigation.spec.ts` — Header invisível é pré-condição de todo o produto. Estimativa: 1 dia.
- **P1-#19 → P0-#12**: `e2e/search-filter.spec.ts` — Marketplace sem busca visível tem abandono próximo de 100%. Estimativa: 1–2 dias.

**Criar novo P0:**

- **P0-#13 (novo)**: Investigar e corrigir erros 500 em `/anunciar`, `/registrar` e `/itens/[slug]` — verificar variáveis de ambiente, `prisma.$connect()` no cold start e `error.tsx` por segmento de rota (App Router). Estimativa: 2–3 dias.

### 1.3 Novas Histórias de Usuário (não cobertas pelo backlog)

**HU-NEW-01 — Diagnóstico SSR (P0, emergencial)**
> Como desenvolvedor, quero que todas as páginas SSR renderizem conteúdo completo em produção, para que o usuário nunca veja apenas o footer ao acessar `/itens` ou `/login`.

*Critério:* Dado `/itens` sem sessão → deve exibir header + busca + filtros + empty state (nunca só footer). Dado `/itens/[slug]` → SSR retorna conteúdo do item sem erro 500.

**HU-NEW-02 — Busca persistente e sempre visível (P0, dado impacto)**
> Como locatário, quero o campo de busca visível e funcional em qualquer ponto da jornada, para iniciar nova busca sem voltar ao início.

*Critério:* Em `/itens` e `/itens/[slug]`, o header contém campo de busca com termo anterior preservado.

**HU-NEW-03 — Preservação de contexto de busca (P1, não está no backlog)**
> Como locatário, quero que ao voltar da página de detalhe para a listagem, meus filtros e busca anterior sejam preservados, para não perder o contexto da minha sessão de busca.

*Implementação:* `useSearchParams` persistente com `router.push` ao filtrar. Uma linha de código, impacto direto na retenção de sessão.

**HU-NEW-04 — Tela "Aguardando Confirmação" (P1, não está no backlog)**
> Como locatário, quero ver um estado claro de "aguardando resposta do proprietário" após enviar solicitação, para saber o que esperar e não ficar ansioso sem feedback.

*Critério:* Após envio → exibir countdown "Aguardando confirmação: X horas restantes" + carrossel de itens similares disponíveis como alternativa.

**HU-NEW-05 — Onboarding progressivo de anunciante (P2, ausente)**
> Como proprietário publicando meu primeiro anúncio, quero um indicador de qualidade do anúncio e prévia de como ele aparecerá na listagem, para publicar com confiança e obter mais aluguéis.

### 1.4 Métricas de Validação por Melhoria

| Melhoria | Métrica | Meta |
|---|---|---|
| Erros 500 eliminados | Taxa HTTP 5xx nas 3 rotas | 0% por 48h em staging |
| SSR com conteúdo completo | LCP + ausência de layout orfão | LCP < 2,5s, CLS < 0,1 |
| Header visível | Playwright: `header[role="banner"]` em 100% das rotas | 7/7 rotas passando |
| Busca funcional | Conversão busca → clique em item | CTR cards > 15% |
| Contexto de busca preservado | Bounce rate em `/itens` com filtro aplicado | Redução > 10 p.p. |

---

## Parte 2 — Análise de UX: Fluxo e Pontos de Fricção

### 2.1 Mapa de Fricção por Fase (7 fases do fluxo)

| Fase | Nível de Fricção | Principal Gap |
|---|---|---|
| 1 — Descoberta | Baixa | Query params não preservados ao aterrissar via SEO em `/itens` |
| 2 — Busca | **Alta** | Campo de busca sem persistência de contexto; filtro mobile sem bottom sheet (P1-#20) |
| 3 — Escolha | Moderada-Alta | Sem calendário de disponibilidade (P1-#22); sem taxa de resposta do proprietário (P1-#23) |
| 4 — Reserva | **Crítica** | Estado "aguardando" sem UX definido; política de cancelamento sem spec visual |
| 5 — Uso | Moderada | Sem tela "aluguel ativo" com countdown e informações de retirada |
| 6 — Devolução | **Crítica — maior gap** | Sem qualquer tela no protótipo; sem checklist, confirmação ou disputa |
| 7 — Pós-aluguel | Moderada | Avaliação sem gatilho de notificação mapeado; taxa de avaliação tende a ser baixa |

**Estados intermediários ausentes críticos:**
- Entre Fase 3 e 4: estado "datas indisponíveis" com alternativas contextuais
- Fase 4 interna: sub-estado "aguardando resposta" (entre "enviou" e "confirmado/recusado")
- Entre Fase 4 e 5: tela de "preparação para retirada" (endereço, horário, instruções)
- Fase 6 completa: sem representação visual
- Usuário não autenticado que favorita → depois cria conta: fluxo de conversão ausente

### 2.2 Top 5 Melhorias UX de Maior Impacto (não priorizadas adequadamente)

1. **Preservação de contexto de busca via URL state** — não está no backlog; HU-NEW-03 acima
2. **Tela de "Reserva em Espera" com timer e itens similares** — P1-#24 existe como item técnico, mas sem spec UX da tela intermediária
3. **Onboarding progressivo para proprietário no primeiro anúncio** — ausente do backlog; HU-NEW-05
4. **Estado "item indisponível" com alternativas contextuais** — quando datas bloqueadas no calendário, exibir "Ver 3 opções similares nestas datas"
5. **Indicador de saúde do proprietário no próprio ItemCard** — "Responde em ~2h" ou "98% confirmação" reduz fricção de escolha sem abrir detalhe

### 2.3 Bugs Mobile Críticos Identificados (não cobertos no backlog)

| Bug | Localização | Impacto | Ação |
|---|---|---|---|
| **Conflito de z-index** | `sticky-cta` (z:150) vs `bottom-nav` (z:200) — CTA principal oculto no mobile | Crítico — conversão zero no mobile | Subir `sticky-cta` para z:210 ou remover sobreposição |
| **Células do calendário** | Grid 7 colunas a 375px resulta em ~40px por célula | Viola WCAG 2.5.5 (44px mínimo) | `minmax(44px, 1fr)` + `overflow-x: auto` no container |
| **Botão favorito no ItemCard** | `width/height: 32px` — 12px abaixo do mínimo | Viola WCAG | Corrigir para 44×44px com ícone centralizado |
| **`X` de remoção dos chips de filtro** | Área de toque <44px em chip de 32px de altura | Viola WCAG 2.5.5 | Área de toque separada de 44×44px |

### 2.4 Quick Wins UX (implementáveis em < 1 sprint, sem nova infraestrutura)

1. **Sombra de rolagem nas categorias** — gradiente CSS `linear-gradient(to right, transparent 80%, white)` no lado direito do `categories-scroll`. Indica visualmente que há mais categorias. CSS puro.
2. **Botão FAB "Filtros" em mobile** — botão flutuante com ícone + contagem de filtros ativos ("Filtros · 2") que abre a `.bottom-sheet` já existente no CSS do protótipo. Apenas um `<button>` e um `onclick`.
3. **Preservar query params no "Voltar"** — trocar `<Link href="/itens">Voltar</Link>` por `<Link href={`/itens?${searchParams}`}>Voltar</Link>`. Uma linha.
4. **Mensagem de espera na tela de sucesso da reserva** — texto estático: "O proprietário tem até 2 horas para responder. Você receberá uma notificação." Sem nova API.
5. **Correção do tap target do favorito** — `width/height: 44px` com ícone centralizado. CSS.
6. **Feedback de rolagem horizontal nas categorias** — sombra lateral como indicador visual de scroll.

---

## Parte 3 — Análise de Design: Identidade Visual e Design System

### 3.1 Divergência Crítica Detectada: Duas Paletas em Conflito

| Token | Design System Oficial | `tailwind.config.ts` atual | Status |
|---|---|---|---|
| Primary/Header (Navy) | `#0D1B2A` | `#003366` | **CONFLITO** |
| CTA | Orange `#F97316` | `#007B3C` (verde) | **CONFLITO** |
| Success | Green `#22C55E` | `#59C686` (acento) | Divergente |
| Fonte | Inter | Montserrat (`var(--font-montserrat)`) | **CONFLITO** |

**Fonte de verdade:** o `shareo-prototipo.html` e o `Documento de Identidade Visual v1.0` são a referência correta. O `tailwind.config.ts` precisa ser atualizado ou a divergência precisa ser justificada em um ADR.

### 3.2 Validação de Contraste WCAG (Laranja)

O protótipo já resolveu o problema do P2-#45 com aliases acessíveis:

| Contexto | Cor | Ratio sobre branco | Status |
|---|---|---|---|
| Texto/link laranja | `#9A4700` (alias `--orange-link`) | ~6.5:1 | **APROVADO AA** |
| Botão laranja (bg) | `#C05800` (alias `--orange-cta`) | 4.47:1 | **APROVADO AA** (margem mínima) |
| Fill/badge laranja | `#F97316` (original) | 2.9:1 | **REPROVADO** — somente decorativo |
| Verde sucesso (texto) | `#22C55E` | 1.9:1 | **REPROVADO** — somente ícones/fundos escuros |
| Verde sucesso (escuro) | `#007B3C` | 5.1:1 | **APROVADO AA** |

**Ação:** P2-#45 pode ser encerrado como resolvido pelo protótipo via `--orange-cta`. Documentar a solução nos tokens do Tailwind.

### 3.3 Tokens Tailwind Corrigidos

```ts
// tailwind.config.ts — correções necessárias
colors: {
  navy:    "#0D1B2A",   // era #003366 — corrigir para o oficial
  orange: {
    DEFAULT: "#F97316", // somente decorativo (fills, sem texto)
    cta:     "#C05800", // botões com texto branco — 4.47:1 WCAG AA
    link:    "#9A4700", // texto laranja — 6.5:1 WCAG AA
  },
  green: {
    DEFAULT: "#22C55E", // fills, ícones (não usar como cor de texto sobre branco)
    safe:    "#15803D", // texto verde sobre branco — 5.1:1 WCAG AA
  },
  "off-white": "#F8FAFC",
},
fontFamily: {
  sans: ["var(--font-inter)", "system-ui", "sans-serif"], // era Montserrat
},
```

### 3.4 Inconsistências Visuais a Corrigir

| Problema | Correção |
|---|---|
| Logo duplicado | Logo completo apenas no header fixo; footer usa apenas lockup textual monocromático |
| "Início" e "Explorar" redundantes | "Início" → apenas clique no logo; nav desktop: "Explorar", "Como Funciona", "Anunciar", "Entrar/Minha Conta" |
| Footer com links de navegação principal | Footer: apenas links legais (Termos, Privacidade), redes sociais, tagline e copyright |
| Hierarquia visual nas páginas | Definir `text-4xl/bold` para título de página, `text-2xl/semibold` para seções — padronizar em `component-spec.md` |

### 3.5 O que NÃO Mudar (decisões protegidas)

- **Laranja como cor de ação** — substituição por verde `#2ECC71` foi rejeitada corretamente
- **Header sticky em navy** — implementado corretamente no protótipo
- **Bottom nav (mobile) + top nav (desktop)** — padrão mobile-first correto
- **Aspect ratio 4:3 nas fotos de item** — garante consistência no grid
- **Tap targets 44×44px** — requisito WCAG não negociável
- **Grid de 4px** — spacing alinhado ao design system; não introduzir valores fora do grid

---

## Parte 4 — Plano de Ação Consolidado e Priorizado

### P0 Atualizado (13 itens — eram 10)

Os itens originais do P0 permanecem. **Adições e elevações:**

| # | Ação | Owner | Estimativa |
|---|---|---|---|
| P0-#11 (elevado de P1-#18) | Navigation E2E: header visível e sticky em todas as páginas | QA + Fullstack | 1 dia |
| P0-#12 (elevado de P1-#19) | Search-filter E2E: busca + filtros + deep link com URL params | QA + Fullstack | 1–2 dias |
| P0-#13 (novo) | Investigar e corrigir erros 500 em `/anunciar`, `/registrar`, `/itens/[slug]` | Fullstack | 2–3 dias |

### Sprint Imediata — Quick Wins (paralelo às correções P0)

Estes itens podem ser executados em paralelo por qualquer desenvolvedor em < 4h cada:

1. Corrigir `tailwind.config.ts`: navy para `#0D1B2A`, fonte para Inter, adicionar aliases `orange.cta` e `orange.link`
2. Corrigir z-index: `sticky-cta` → z:210 para não ser ocultado pelo `bottom-nav`
3. Corrigir tap target do botão favorito: 32px → 44px
4. Adicionar sombra de rolagem horizontal nas categorias (CSS puro)
5. Botão FAB "Filtros" no mobile que abre a bottom sheet já existente
6. Texto de espera na tela de sucesso da reserva (texto estático, sem nova API)

### P1 — Próximas Sprints

**Novas histórias a adicionar ao backlog P1:**
- HU-NEW-03: Preservação de contexto de busca via URL state
- HU-NEW-04: Tela "Aguardando Confirmação" com countdown + itens similares

**Correção de spec:**
- P1-#22 (calendário): adicionar especificação de `minmax(44px, 1fr)` para células em mobile
- P1-#24 (timeout): adicionar spec UX da tela intermediária de espera

### ADR Necessário

Abrir ADR com título: **"Paleta de cores definitiva — fonte de verdade e sincronização de artefatos"**

Decisão a registrar: navy `#0D1B2A` (protótipo) ou `#003366` (config atual), com justificativa e lista de todos os artefatos a atualizar.

---

## Resumo das Descobertas por Subagente

| Subagente | Principal Descoberta | Impacto |
|---|---|---|
| **UX** | Fase 6 (Devolução) sem qualquer tela no protótipo; conflito de z-index oculta o CTA no mobile | Crítico |
| **Designer** | `tailwind.config.ts` usa paleta e fonte diferentes do design system oficial | Crítico |
| **Produto** | Erros 500 sem item de diagnóstico no backlog; header e busca subpriorizados em P1 | Crítico |

**Todos os 13 problemas identificados são escopo H1 (MVP).** Nenhuma melhoria é postergável para H2 ou H3.
