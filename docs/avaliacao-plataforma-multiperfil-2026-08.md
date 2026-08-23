# Avaliação Multi-Perfil da Plataforma ShareO

**Data:** 2026-08-19
**Ambiente avaliado:** staging (`https://shareo-rouge.vercel.app`) + código em `main`
**Método:** jornada viva no browser (deslogado) + auditoria de código por 5 especialistas (negócio, segurança/LGPD, QA, UI/UX, arquitetura)
**Autor:** Claude Code (orquestração) + subagentes ShareO

> ⚠️ **Correção de premissa.** `shareo.com.br` aponta hoje para um placeholder ("Em breve"), **não** para a plataforma. A plataforma testável é o staging. Este documento é uma **avaliação interna**, não um teste de produção. Sob **bloqueador D4 (jurídico)**, nenhum go-live público ou pagamento real ocorre antes do sign-off.
>
> **Sobre "feedback de usuário":** este relatório **não fabrica** personas nem métricas de uso. As jornadas foram percorridas de fato no staging; as auditorias citam arquivo:linha reais. Onde há inferência, está marcado como tal.
>
> **Limite de escopo:** os fluxos **autenticados** (anunciar como Proprietário, submeter reserva/pagar como Locatário) **não foram exercidos ao vivo** — regra de segurança impede o assistente de digitar credenciais/logar. Essa camada foi coberta por leitura de código (QA + Design). Recomenda-se validação viva com o fundador logado (ver §6).

---

## 1. Sumário Executivo

**Veredito geral:** o produto está **tecnicamente maduro para um go-live controlado**, com disciplina de engenharia acima da média para o estágio (flags OFF para o não-validado, taxa dinâmica, guards de propriedade sistemáticos, LGPD real, webhooks fail-closed). **O gargalo não é o código — é a sequência de desbloqueios (D4/B1) e dois gaps estruturais de produto** (fricção de onboarding do lado da oferta e confiança sem caução).

**O que já funciona ao vivo (verificado no staging, deslogado):**
- Home, Explorar (78 anúncios, filtros de categoria/preço/distância/avaliação, 6 ordenações), detalhe de item (calendário de disponibilidade, 3 modalidades, comparação comprar-vs-alugar, política de cancelamento), login, cadastro progressivo com consentimento LGPD versionado, Central de Ajuda, layout responsivo mobile 375px (menu hambúrguer + bottom-nav).

**Bloqueadores absolutos (não são código):**
1. **B1 — contrato Mercado Pago** pendente de assinatura (Raimundo). Sem ele, pagamento real fica bloqueado por flag.
2. **D4 — sign-off jurídico.**

**Achados P0 novos desta rodada (corrigíveis já, independentes de D4):** ver §5.1.

---

## 2. Perfil 1 — Proprietário de Itens

Fonte: jornada viva (telas públicas) + auditorias Design/QA/Negócio.

### Pontos positivos
- **Cadastro progressivo bem desenhado:** `/cadastro` pede só o essencial (nome, e-mail, senha, cidade, UF); CPF/pagamento só ao anunciar/alugar. Consentimento LGPD explícito e **versionado** (Termos v1.1, DPO identificado, confirmação 18+).
- **Sugestão de preço inteligente** no formulário de anúncio: combina faixa por % do valor de compra + preço médio da região via API, com autopreenchimento suave e botões "Aplicar/Recalcular" (Design: "fluxo inteligente, ponto forte").
- **Feedback de geocoding completo** (spinner → sucesso com coordenadas → "não encontrado" em amber → erro).
- **Indicador de qualidade do anúncio** (`ListingQualityIndicator`) guia o proprietário.
- Anunciar exige login (**gate ativo** — verificado ao vivo: `/itens/novo` deslogado → `/login`).

### Pontos negativos / necessidades de melhoria
| Sev | Achado | Evidência |
|---|---|---|
| **P0** | **Campos de localização (Cidade/Estado/Bairro/Endereço) em modo *create* parecem editáveis mas ignoram o input silenciosamente** (`onChange` faz `if (mode==="create") return`, sem `disabled`/`readOnly`). Quem não lê o banner tenta digitar e trava. | `components/items/ItemForm.tsx:898-953` (Design P0-02) |
| **P1** | **Seção "Fotos" é a última** do formulário — sendo o maior motor de conversão ("3 fotos = 4× mais contatos", texto do próprio código). Abandono mobile nunca chega lá. | `ItemForm.tsx:956+` |
| **P1** | **Drift do limite de fotos:** UI/copy dizem 3, backend suporta 10–24. 3 é restritivo para itens complexos. | `ItemForm.tsx:385`; corrobora backlog S14-M-15 |
| **P1** | Textos de sugestão de preço em `text-[11px]` (abaixo do mínimo 12px do DS). | `ItemForm.tsx:694,715-735` |
| **P1** | **Fricção de onboarding do Modelo B:** cada proprietário (inclusive PF) precisa conectar conta Mercado Pago via OAuth para receber. Fluxo existe na API, mas a **UX do proprietário novo não foi validada**. É a maior barreira do lado da oferta. | backlog:159; Negócio |
| **P2** | Sem indicador de progresso/etapas no formulário longo (4 seções, scroll extenso em mobile). | `ItemForm.tsx` |
| **P2** | CPF/CNPJ validados só como "não-vazio" no cliente — dígito verificador inválido só falha no servidor, com erro genérico. | `CompleteRegistrationForm.tsx:108` |
| **P2** | `ItemForm.tsx` **sem teste unitário**; upload de fotos e transição DRAFT→AVAILABLE **sem teste de integração**. | QA §1.3 |

---

## 3. Perfil 2 — Locatário (necessidade de alugar)

Fonte: jornada viva completa (deslogado) + auditorias.

### Pontos positivos
- **Explorar rico e funcional (ao vivo):** 78 anúncios, filtros de categoria/preço/distância/avaliação, 6 ordenações (recentes, próximos, menor/maior preço, mais vistos, mais alugados), paginação.
- **Página de item forte (ao vivo):** calendário de disponibilidade (disponível/ocupado/passado), 3 modalidades (diária/semanal/mensal), **comparação comprar-vs-alugar** ("economia de 97% vs comprar novo"), política de cancelamento, dados do dono, itens relacionados, carrinho multi-item.
- **Acessibilidade parcial boa:** `aria-live="polite"` no cálculo de preço, `role="alert"` no aviso de teto, focus rings, breadcrumb com `aria-current`.
- **Tap targets corretos no núcleo do PriceCalc:** tabs de modalidade (~52px), input de data (`h-11`), botões +/- (`h-11 w-11` = 44px).

### Pontos negativos / necessidades de melhoria
| Sev | Achado | Evidência |
|---|---|---|
| **P0** | **Chips de categoria no `/itens` mobile com ~30–34px de altura** (`py-1.5 text-xs`), abaixo dos 44px obrigatórios. Filtrar por categoria fica difícil no mobile. | `app/itens/page.tsx:370-409` (Design P0-01) |
| **P0 (visível ao usuário)** | **Política de cancelamento contraditória entre telas:** a página do item mostra 3 faixas (100% >24h / 70% <24h-6h / 50% <6h); a `/ajuda` diz "100% >24h / 30% de multa <24h". Contradição direta. | Jornada viva (item Andaime vs /ajuda) |
| **P1** | **Sem nota (rating) no card da listagem** — sinal de confiança removido por trade-off de performance. Locatário não compara qualidade sem entrar item a item. | `ItemCard.tsx:121-125` |
| **P1** | Erro de reserva **sem `role="alert"`** — screen reader não anuncia a falha ao clicar "Solicitar locação". (Corroborado por 2 auditorias.) | `_PriceCalc.tsx:448` (Design P1-02, QA P1-01) |
| **P1** | Tabs de modalidade **sem semântica ARIA** (`role="tab"`/`radiogroup`, `aria-selected`). | `_PriceCalc.tsx:215` |
| **P1** | Hierarquia de CTA na home empurra o fluxo de **proprietário** (H1 + botão verde primário), deixando "Quero Alugar" em segundo/outline. Locatário que chega para alugar é subvalorizado. | `app/page.tsx:150-153` |
| **P2** | **Rótulos divergentes p/ a mesma ação:** CTA fixo mobile diz "Reservar agora"; PriceCalc diz "Solicitar locação". Cria expectativa de reserva confirmada quando é solicitação. | `_StickyBookingCTA.tsx:65` vs `_PriceCalc.tsx:468` |
| **P2** | Usuário deslogado vê "Solicitar locação" idêntico ao logado, sem aviso de que login é necessário → redirect inesperado. | `_PriceCalc.tsx:473-479` |
| **P2** | `?ulat=abc` malformado propaga `NaN` no Haversine → **lista vazia sem mensagem de erro**. | `app/itens/page.tsx:163` (QA P2-03) |
| **P2** | Range de preço fixo em R$500, não adapta à categoria. | `_FilterForm.tsx:109` |

---

## 4. Perfil 3 — Equipe Interna (suporte, técnico, gestão, sócios)

### 4.1 Suporte técnico / Segurança & LGPD

**Pontos fortes (verificados em código):**
- **IDOR:** cobertura **sistemática** — amostra de ~15 endpoints sensíveis (bookings, conversations, items, payments, admin) todos com guard `ownerId/borrowerId === userId → 403` via `resolveUserId`. Nenhum endpoint sensível sem guard encontrado. Admin: 16/16 arquivos com `requireAdminRole`.
- **XSS baixo:** só 3 `dangerouslySetInnerHTML`, todos JSON-LD controlado; chat aplica `stripHtml()` server-side.
- **SQLi muito baixo:** `$queryRaw` sempre parametrizado; `$executeRawUnsafe` só em `scripts/`.
- **LGPD real (não promessa):** consentimento versionado em 3 eixos (termos/biometria/marketing) com prova (IP+UA+hash); export de dados (11 tabelas); minimização (coordenadas truncadas e endereço nulificado para não-donos).
- **Webhook MP fail-closed** pós-correção 13-14/08 (HMAC `timingSafeEqual`, idempotência, design de 2 tempos).

**Riscos priorizados:**
| Sev | Achado | Evidência |
|---|---|---|
| **P0 (gated D4)** | **Chave PIX pessoal do fundador** no fluxo de recebimento — risco fiscal (renda PF) + fraude por declaração falsa (admin confere extrato manualmente). Trocar por chave PJ (CNPJ 68.512.556/0001-09) antes de qualquer transação real. | `declare-pix` + `getPlatformPixConfig` |
| **P0/P1** | **`pixKey` do locador em texto claro no banco**, enquanto CPF/CNPJ/tokens MP são AES-256-GCM. Migrar p/ `pixKeyEncrypted`. | `prisma/schema.prisma:878-879, 1157-1158` |
| **P1 (verificar)** | Rate limit em rotas de auth (`phone/send-otp`, `forgot-password`, `register`) **não confirmado** — risco de enumeração + custo SMS. | Security §1 |
| **P1 (verificar)** | Reaceite de `CONSENT_VERSION` v1.0→v1.1 para usuários antigos — confirmar prompt na UI. | `lib/legal-config.ts` |
| **P1 (verificar)** | Sentry `beforeSend` scrubbing de PII — confirmar. (Arquitetura viu `scrubEvent` configurado; Segurança pediu confirmação do alcance.) | `sentry.*.config.ts` |

> ✅ **Resolvido (fonte da verdade = código, decisão do fundador 2026-08-19) — DELETE de conta / LGPD art. 18.**
> O código atual (`app/api/users/me/route.ts`) faz DELETE **atômico** com scrub de `cpfEncrypted`, `cnpjEncrypted`, `idDocumentUrl`, mensagens (soft-delete + placeholder), notas e chave PIX, com remoção best-effort dos arquivos de `id-docs`, preservando apenas o exigido pela retenção fiscal (CTN 173, 5 anos) com aviso claro ao titular. **Não há violação.** O item de backlog SEC-MAJ-06 (que dizia persistir selfie/KYC/comentários) está **desatualizado** — dar baixa. A auditoria de Negócio partiu do backlog velho; prevalece o código.

### 4.2 Técnico / Arquitetura & Operação

**Pontos fortes:** bounding box reduz carga do Haversine antes do filtro; `concurrency` no CI (lição da corrida de deploy aplicada); idempotência em ambos os webhooks; Sentry com sample-rate + scrub; migrations recentes seguem as lições (nenhuma mistura `ALTER TYPE + UPDATE`); health check cobre DB + 2 buckets; nenhum `"use client"` escondendo Server Component (113 arquivos, todos legítimos).

| Sev | Achado | Evidência |
|---|---|---|
| **P1** | **Void promise em `geocodeItem`** no PATCH de item (`.then(...)` sem `await`/`after()`) — pode morrer se a lambda congelar. O POST já usa `after()` corretamente. | `app/api/items/[id]/route.ts:266-267` |
| **P1** | **`sort=nearest` sem bbox** puxa 500 itens e ordena tudo em JS — degrada com catálogo grande. | `app/itens/page.tsx:181,258` |
| **P2** | Formatador BRL duplicado em ~8–10 componentes — falta `lib/format.ts` (`formatBRL(cents)`). | 8 arquivos (Arquitetura §3) |
| **P2** | Cron de lembretes sem retry (só registra `failed`). | `app/api/cron/reminders/route.ts` |
| **P2** | Health não cobre MP nem Resend. | `app/api/health/route.ts` |
| **P2** | Falta índice composto p/ Explorar `(status, isApproved, deletedAt, latitude, longitude)`. | `schema.prisma:441` |

### 4.3 Gestão / Sócios — Viabilidade do modelo

- **Unit economics estreito em itens de baixo valor:** taxa 15% sobre diária de furadeira (~R$15) = ~R$2,25; ~R$6,75 numa locação de 3 dias, o que não cobre suporte/fraude. **Viabilidade depende do mix** (eletrônicos R$100/dia → R$45 em 3 dias) e da recorrência do catálogo.
- **Chicken-and-egg agravado pelo lançamento nacional disperso:** densidade de oferta e demanda precisam coincidir geograficamente; risco alto de busca "Mais próximos" retornar vazio nos primeiros meses.
- **Confiança sem caução (decisão D2):** único mecanismo de dano é a disputa por fotos; em base nova a reputação é zero. Risco de não-adoção por proprietários receosos. Considerar garantia mínima (retenção temporária via Modelo B) como H2 prioritário.
- **Gaps regulatórios que podem parar o go-live independentemente do D4:**
  - **Textos legais (`/termos`, `/privacidade`) não identificam a ShareO como PJ** (razão social/CNPJ/sede) — obrigação CDC/Marco Civil. **P0.**
  - `/ajuda` — ver nota de verificação abaixo.

> ✅ **Verificação ao vivo — `/ajuda` já descreve Mercado Pago, não Stripe.** A `/ajuda` no staging mostra "Repasse ao locador — Via Mercado Pago". A nota de memória/backlog de que descreve Stripe está **desatualizada** (drift doc↔realidade). **Ação:** dar baixa no item de backlog; não é mais P0. (Persistem, porém, os textos legais sem PJ — esses sim P0.)

---

## 5. Plano de Execução

Priorização consolidada e **deduplicada** entre as 5 auditorias + jornada viva. Severidade = impacto no go-live seguro e na experiência.

### 5.1 P0 — Correções prioritárias (antes de qualquer go-live público)

**Bloqueadores de negócio/jurídico (não-código):**
1. **Fechar B1** — assinatura do contrato Mercado Pago (Raimundo). *Sem isso, todo o resto é teórico.*
2. **D4** — sign-off jurídico.

**Correções de código/produto (independentes de D4, podem começar já):**
3. **Identificar a ShareO como PJ** em `/termos` e `/privacidade` (razão social + CNPJ + sede). *Risco de nulidade dos termos no dia 1.*
4. **Campos de localização em create mode:** adicionar `readOnly`/`disabled` para não parecerem editáveis. `ItemForm.tsx:898-953`.
5. **Chips de categoria mobile ≥44px** em `/itens`. `app/itens/page.tsx:370-409`.
6. **Unificar política de cancelamento** entre página de item e `/ajuda` (hoje se contradizem). *Fonte única da verdade.*
7. **Teste de integração para `declare-pix`** — caminho central do único fluxo de pagamento do MVP, hoje **sem nenhum teste**. `app/api/bookings/[id]/declare-pix/route.ts`.
8. **Trocar chave PIX pessoal do fundador por chave PJ** antes de ligar pagamento real (gated D4, mas é pré-requisito de ligar).
9. **`SKIP_RATE_LIMIT` com guarda de `NODE_ENV`** — se vazar para prod, derruba todos os rate limits em silêncio. (backlog SEC-MAJ-07)

**A verificar antes de classificar (podem já estar resolvidos):**
- Rate limit nas rotas de auth; reaceite de consentimento v1.1; scrubbing do Sentry.

> ✅ DELETE de conta / LGPD art. 18 — **resolvido pelo código** (ver §4.1). Não é P0; backlog SEC-MAJ-06 desatualizado.

### 5.2 P1 — Melhorias incrementais (antes de escalar aquisição)

| # | Item | Onde |
|---|---|---|
| 1 | `pixKey` do locador → criptografia + retrofill | `schema.prisma` |
| 2 | `role="alert"` no erro de reserva + semântica ARIA nas tabs de modalidade | `_PriceCalc.tsx:448,215` |
| 3 | Void promise do geocode no PATCH → `after()` | `items/[id]/route.ts:266` |
| 4 | `sort=nearest`: exigir origem válida / aplicar bbox sempre | `itens/page.tsx` |
| 5 | Mover "Fotos" p/ 2ª seção do formulário + subir limite de 3→10 fotos | `ItemForm.tsx` |
| 6 | Mostrar rating no card da listagem (denormalizar `avgRating`) | `ItemCard.tsx` |
| 7 | Validar UX de onboarding MP do proprietário (fricção da oferta) | fluxo OAuth |
| 8 | Corrigir validação de e-mail no cliente (`includes("@")` → regex/Zod) | `RegisterForm.tsx:69` |
| 9 | Threshold de cobertura de teste real (hoje 1% ≈ sem guardrail) | `jest.config.ts:56` |
| 10 | Slugs nas URLs de item + ISR (pré-requisito de SEO nacional) | ADR-007 / backlog |

### 5.3 P2 / Expansão — Ajustes de modelo e escala

- **Densidade antes de dispersão:** apesar do lançamento nacional, priorizar concentração de oferta/demanda por praça (cidades-piloto) para vencer o chicken-and-egg — sem contrariar a regra de não fixar Natal/RN como default na UI.
- **Garantia/caução mínima (H2):** avaliar retenção temporária via Modelo B para destravar confiança de proprietários.
- **SEO/aquisição orgânica:** slugs + ISR/SSG nas páginas de item e categoria (`/categoria/[slug]` do ADR-007 ainda não existe).
- **Polish de DS:** `lib/format.ts` (BRL), diferenciar `--success` de `--brand`, mover `amber-*`/`red-*` hardcoded para tokens, indicador de progresso no formulário de anúncio.
- **Observabilidade:** health check cobrir MP/Resend; cron com retry; índice composto de Explorar.

---

## 6. Recomendação de Decisão — Executar ou Não

**Recomendação: EXECUTAR o plano, em fases, com D4/B1 como portão.**

O código não é o risco. A engenharia demonstrou disciplina (segurança sistemática, LGPD real, flags OFF, taxa dinâmica). O plano acima é majoritariamente **hardening e polish**, não reconstrução.

**Sequência sugerida:**
1. **Agora (não espera D4):** P0 itens 3–7 e 9 (jurídico-texto, UX de create, chips mobile, política de cancelamento, teste de declare-pix, guarda de rate-limit) + as verificações da §5.1. São baratos e removem riscos reais.
2. **Portão B1/D4:** fechar contrato MP e sign-off jurídico. Só então trocar chave PIX para PJ e ligar pagamento real.
3. **Pós-desbloqueio:** P1 (confiança, SEO, onboarding MP) → validar unit economics numa praça piloto densa antes de acelerar aquisição nacional.

**Validação viva pendente (requer o fundador logado):** anunciar um item ponta-a-ponta e submeter uma reserva/pagamento PIX no staging — a única parte que o assistente não pôde exercer por regra de segurança. Recomendo fazer isso antes de marcar os fluxos autenticados como ✅ (regra de verificação por evidência).

---

### Anexo — Rastreabilidade
Cada achado deste documento tem origem em: (a) jornada viva no staging (telas públicas), ou (b) uma das 5 auditorias de código com citação arquivo:linha. Conflitos entre fontes (ex.: DELETE de conta) e drifts doc↔realidade (ex.: /ajuda MP) foram sinalizados explicitamente para verificação, não silenciados.
