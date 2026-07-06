# META — Revisão de UI/UX, Funcionalidades Nativas e Segurança (App Android + Site mobile-first)

**Estabelecida:** 2026-07-06 · **Sessão:** s41 (cont.)
**Contexto:** o app Android nativo amadureceu muito (redesign por transcrição, dark mode, ~30 telas nativas, mapa nativo Mapbox recém-entregue, cadastro nativo, 0 telas vazando pro navegador). Antes de disponibilizar uma **nova versão para testes externos** (novo APK `preview`), fazer uma **revisão criteriosa por especialistas** cobrindo as três dimensões pedidas pelo fundador — **UI/UX design**, **funcionalidades nativas** e **segurança** — tanto no **app nativo** quanto no **site responsivo mobile-first**.

---

## 🎯 Objetivo

Encontrar e priorizar problemas de **design (UI/UX)**, **funcionalidade/paridade nativa** e **segurança** no app Android (`apps/mobile/`) e no site responsivo (foco mobile-first, 375px), para corrigir os válidos e então **empacotar uma nova versão de testes** (APK `preview` standalone + deploy do site em staging).

## ⚙️ Modo de operação (decidido pelo fundador, 2026-07-06)

1. **Especialistas revisam READ-ONLY.** Cada um entrega um **relatório priorizado de achados** (severidade P0–P3, arquivo:linha, impacto, sugestão). **Nenhum especialista edita código.**
2. **Eu (main) trio cada achado**, descarto falsos positivos, corrijo os válidos e **mostro o diff de cada correção antes de mesclar** (lição registrada: subagente introduz regressão — P19).
3. **Verificação obrigatória** após cada lote de correção: `tsc` + `jest` (mobile e web) **verdes antes e depois**.
4. **Ao final:** disparar **novo build EAS `preview`** (APK autônomo, distribuível a testers externos por link) + deploy do site em staging.

## 🚫 Regras invioláveis

1. **Nada de produção** (gated **D4**). Sem Supabase prod, deploy live de produção, DNS, ativação de flags que estão OFF.
2. **Regra de transcrição literal** (CLAUDE.md): o app **replica** o site em 375px — achado de "divergência com o site" é bug; achado de "melhorar além do site" vira decisão do fundador, **não** correção autônoma.
3. **Taxa dinâmica sempre** (`getPlatformFeeRate()`), nunca hardcode.
4. **Não inventar funcionalidade nova.** Correção ≠ feature. Feature nova → backlog (`docs/backlog-atividades-priorizadas.md`).
5. **PII e segredos:** nenhum achado pode propor logar/expor PII, token, chave PIX, CPF/CNPJ em claro.

## 🔍 Escopo

**Superfícies:** `apps/mobile/` (app Android nativo) + site responsivo (`app/`, `components/`) no recorte **mobile-first (375/768px)**.

**Foco especial nas áreas mexidas recentemente** (maior risco de regressão): Explorar (`explorar.tsx`, `CategoryChip`), mapa nativo (`components/map/`, `itens/mapa.tsx`), KYC/Documentos (`kyc.tsx` + `GET /api/users/me/id-verification`), Sobre + `GET /api/stats/public`, MobileMenu (reordenação Tema/Sobre + aliases de rota), banner "Como alugar" (`?intent=rent`), rename categoria Esporte/Lazer.

---

## 👥 Especialistas e escopos (4 streams read-only, paralelos)

### 1. `designer-shareo` — UI/UX design (app + site mobile)
- Consistência visual app×site (transcrição 375px), tokens, dark mode em **ambos**.
- Contraste WCAG 2.1 AA (mín. 4.5:1 texto), tap targets ≥44×44px, hierarquia, escaneabilidade.
- Estados de UI (loading/empty/error/disabled) presentes e corretos.
- Regressões visuais nas telas recém-tocadas (Explorar, mapa, KYC, Sobre, menu).
- **Entrega:** lista priorizada de achados de design (sem redesenhar — apontar e sugerir).

### 2. `fullstack-dev-shareo` — Funcionalidades nativas / paridade (app)
- **Sweep de navegação:** confirmar que **nenhuma** tela/link do app vaza pro navegador indevidamente (padrão `EXTERNAL_ONLY_ROUTES`/`ROUTE_ALIASES` em `MobileMenu.tsx` + `CONFIG_LINKS` em `perfil.tsx`).
- **Auth:** todas as rotas consumidas pelo app usam `resolveUserId()` (Bearer+cookie), não `auth()` cookie-only (padrão sistêmico já corrigido 8×+; procurar remanescentes).
- Paridade de fluxos com o site; tratamento de erro/estado obsoleto; `fetch` fire-and-forget.
- Mapa nativo: robustez (permissão negada, sem itens, token ausente, cluster/tap).
- **Entrega:** lista priorizada de bugs/divergências de funcionalidade.

### 3. `qa-shareo` — QA, a11y e cobertura de testes (app + site)
- Responsividade nos breakpoints 375/768px; a11y (jest-axe no site; roles/labels no app).
- **Gaps de teste** do código novo/mexido: mapa (`ItemsMapNative`/`mapa.tsx` sem cobertura RNTL), `GET /api/stats/public`, `GET /api/users/me/id-verification`, card de doc do KYC, banner intent=rent.
- Riscos de regressão nas suítes existentes.
- **Entrega:** matriz de gaps de teste + achados de a11y/responsividade priorizados.

### 4. `seguranca-shareo` — Segurança (app + backend das rotas do app)
- **Novos endpoints:** `GET /api/users/me/id-verification` (decripta CPF/CNPJ — confirmar que só devolve mascarado, guard de auth, sem vazamento) e `GET /api/stats/public` (público — confirmar que não expõe nada sensível).
- **Token Mapbox:** público (`pk.`) no cliente OK; secret (`sk.`/downloads) **nunca** no bundle — confirmar que só vive em EAS secret.
- OWASP Top 10 nas rotas consumidas pelo app; IDOR entre usuários; LGPD (PII em logs/Sentry).
- **Entrega:** achados de segurança por severidade (CVSS-like), com PoC textual quando aplicável.

---

## ✅ Definition of Done

1. 4 relatórios de achados entregues e triados por mim.
2. Achados válidos P0/P1 corrigidos, diff revisado, `tsc`+`jest` (mobile+web) verdes.
3. Achados que são feature nova / dependência externa → backlog, não bloqueiam.
4. Novo build EAS `preview` (APK standalone) disparado + link pronto pra testers.
5. Site atualizado em staging (se houver correção de site).
6. STATUS.md e este doc atualizados com o resultado.
7. **Nada de produção** (gated D4).

## 📌 Rastreabilidade

Correções desta sessão que serão incluídas na revisão (já feitas, `tsc`+594 testes verdes): mapa nativo Mapbox (ADR-027), fix fundo ícones categoria dark mode, "Documentos"→tela nativa `/kyc` + endpoint id-verification, Sobre stat dinâmico + `/api/stats/public`, rename Esporte/Lazer, banner "Como alugar", reordenação do menu, logo Pratika transparente.

---

## ✅ Resultado da execução (2026-07-06)

Os **4 especialistas read-only** rodaram (após a interrupção por queda de energia — os relatórios anteriores não haviam sido persistidos e a rodada foi refeita). Cada achado foi **triado no código** por mim (main): falsos positivos descartados, duplicados unificados, válidos corrigidos, com `tsc`+`jest` (mobile e web) **verdes antes e depois**. **Nada commitado** (working tree) — mudanças de UI mobile pendem **validação em device** (regra do fundador).

### Aplicado

**🟠 Segurança**
- `bookings/[id]/reminder`: `checkRateLimit` movido para **depois** do check de propriedade (fechava DoS 1-a-1 da janela de 24h por bookingId conhecido).
- `auth/mobile/refresh`: response não devolve mais `isActive`/`deletedAt`.
- `users/me/id-verification` (GET): `checkRateLimit` adicionado (decrypt AES por chamada).
- `auth/mobile/{login,refresh}`: refresh token **30d → 7d** (mitigação interina de refresh roubado; reuse-prevention completa fica no backlog).

**🔵 Paridade + Mapbox**
- `(tabs)/perfil.tsx`: entrada de KYC duplicada removida ("Verificação de identidade" + "Documentos" → só "Documentos").
- `layout/MobileMenu.tsx`: menu de admin passa a usar `ADMIN_ATALHOS_LINKS` (Visão Geral/Usuários/Disputas, verbatim do site) em vez dos links de Atividade; ícones `home`/`users` adicionados; `/admin/*` roteado para o navegador (painel web-only) via `EXTERNAL_ONLY_PREFIXES`.
- `map/ItemsMapNative.tsx`: **Mapbox ToS §4.2** — `logoEnabled`/`attributionEnabled` reabilitados (estavam `false` → risco de revogação da key).

**🎨 Design (dark mode / contraste / tap targets)**
- **Descoberta-chave:** o token `navy` estava **congelado em `#003366` nos dois modos**, enquanto o `--primary` do site **flipa para `#1E4D80` no dark**. Corrigido com **1 linha** (`navy` dark → `#1E4D80` em `lib/theme.tsx`) — isso levou **todo** o navy-as-text/fill do app (~50 usos) à **paridade com o site** no dark, **sem mudança no light** e sem varrer ~20 arquivos. Token `accent` (`#59C686`) adicionado.
- `sobre.tsx`: **[P0]** label do hero (verde-sobre-navy 2,27:1) → `accent`; stats 3→2 colunas (site = `grid-cols-2`).
- Tap targets ≥44px: `favBtn` (hitSlop), `radioRow`/`gpsBtn` (FilterBottomSheet), `sortMenuItem` (explorar).

**🌓 Rewrites (dark mode quebrado) + testes**
- `perfil/repasses.tsx` e `perfil/seguranca.tsx` reescritos de NativeWind `className` → `StyleSheet`+`useTheme()`. Motivo confirmado no `tailwind.config.js`: as cores do NativeWind são hex fixo de light, sem wiring ao ThemeContext → dark mode preso no claro. Lógica/rótulos preservados verbatim.
- Testes: guard de regressão do menu admin (`MobileMenu.test.tsx`) + suíte nova `GET /api/stats/public` (6 casos).

**Decisão liberada pelo fundador — `minRating` escondido:** o filtro "Mais bem avaliados" acendia o badge "Filtros ativos" mas **nunca era aplicado** (a média não vem de `/api/items` e a API não suporta o parâmetro). Removido: link do menu, seção "AVALIAÇÃO MÍNIMA" do FilterBottomSheet, campo do tipo e uso no badge do explorar.

### Deliberadamente NÃO aplicado (seria divergir do site / decisão do fundador)
- **Badges de status** (dashboard/repasses) e **sweep `green`→`success`**: o `BookingStatusBadge` do site é light-only (sem `dark:`) e o `green` do app já casa com o `text-brand` do site → o app já está em **paridade**. "Corrigir" divergiria.
- ⚠️ O dark mode do **próprio site** é sub-WCAG para texto primary/brand (`#1E4D80` ≈1,9:1; `#007B3C` ≈2,9:1). Torná-lo realmente WCAG é **"melhorar além do site"** = decisão do fundador (afetaria site **e** app juntos, para manter paridade).

### Verificação final
`tsc` mobile **0** · `tsc` root **0** · `jest` mobile **607/607** · `jest` web **872 + 2 todo**.

### Backlog / decisões em aberto
- **minRating como feature real:** estender `/api/items` para aceitar `minRating` + expor a média (paridade total com o site).
- **Refresh reuse-prevention:** `jti`/blocklist (Redis/tabela) + ADR.
- **Token Mapbox:** separar em duas chaves (`pk` URL-restrita para o site + `pk` própria para o app, monitorada) — restrição por URL não protege app nativo e quebraria o mapa se aplicada à chave compartilhada.
- **Gaps de teste restantes (matriz do QA):** `GET id-verification` e a tela `explorar.tsx` inteira.

### Pendente para fechar o DoD
Novo build EAS `preview` + deploy do site em staging + **validação em device** → então commit/PRs.
