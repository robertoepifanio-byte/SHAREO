# Backlog de Atividades Priorizadas — ShareO

**Versão:** 3.9  
**Atualizado em:** 2026-06-16 (sessão 19 — deltas s15–s19: staging desbloqueado e ao vivo, e-mail do app funcionando, domínio próprio do staging, categoria Eletrodomésticos, ícones PWA)  
**Responsável:** Roberto Epifânio

> Verificação feita diretamente no código — cada item foi confirmado por arquivo/componente.

---

## 🔎 Painel de dois atores — achados da sessão de 2026-08-23 (locação viva no staging)

> Origem: o fundador percorreu o ciclo completo de locação no staging como locador (Carlos) e locatária (Joana). Cada item abaixo foi **verificado no código E no banco**, não inferido.

### ✅ Resolvidos nesta sessão

| Achado | Evidência | Onde ficou o conserto |
|---|---|---|
| **Devolução sem foto, disputa sem prova.** A locatária marcou "item limpo e no estado recebido", devolveu e abriu disputa dizendo que não funciona. A reserva percorreu o ciclo com **zero fotos** — nada para o time de mediação arbitrar. | `bookingPhoto` = 0 na reserva `cmt5vrlvt…`; `MIN_CHECKED = 3` de 4 itens, e o upload era opcional — apesar de `ReturnChecklist.tsx:6` já dizer "+ upload de foto" | `mark_returned` → 422 `RETURN_PHOTO_REQUIRED` (API, não só a tela). Decisão do fundador, 23/08 |
| **Retirada sem contrato assinado.** O portão do aceite existia só na criação da reserva; `mark_active` nunca lia `contractSignedAt`. | `activatedAt` 14:15:24 · `contractSignedAt` 14:18:14 — assinou 3 min **depois** de estar com o item | `mark_active` → 422 `CONTRACT_NOT_SIGNED`, **atrelado à mesma flag** `rentalContractAcceptanceEnabled`. Com ela OFF (padrão, gated D4) nada muda |
| **Disputa resolvida a favor do proprietário nunca pagava.** `resolve_completed` leva ao mesmo estado terminal que `confirm_return` (COMPLETED), mas não criava `Payout`. Sem erro, sem log, sem registro. | `admin/disputes/[id]/route.ts` alterava só `status`; o bloco FIN-3.3 do repasse vivia dentro do `confirm_return` | Repasse extraído para `lib/payout.ts` e chamado nos **dois** caminhos. Não é política nova — é aplicar no caminho da disputa a regra que já valia fora dela |
| **Repasse sumia em silêncio sem conta de recebimento.** `if (ownerAccount && …)` sem `else`: a reserva concluía, o dinheiro ficava com a plataforma e nada registrava que um repasse deixou de existir. | mesmo bloco FIN-3.3 | Aviso estruturado em `lib/payout.ts`. **Não resolve o caso** — só tira do escuro. Notificar o proprietário exigiria um valor novo no enum `NotificationType` (migração) |
| **Disputa a favor do locatário não registrava estorno.** `resolve_cancelled` terminava em CANCELLED sem gravar `refundAmount` — e o estorno é executado à mão no painel da Stripe, então não havia o que executar. | `admin/disputes/[id]/route.ts` alterava só `status` e `cancelReason` | Grava estorno **INTEGRAL**, de propósito SEM `calcRefund`: a escada (100/70/50%) pune quem desiste em cima da hora, mas em disputa a demora é da mediação e o caso só existe depois da retirada — daria 50% a quem acabou de ganhar. Decisão do fundador, 23/08. Só grava se `paymentStatus = PAID` |
| **"Motivo do cancelamento" numa reserva "Em disputa".** O #343 passou a gravar o motivo da disputa em `cancelReason`; a tela rotulava sempre como cancelamento. | print da reserva `DISPUTED` com o rótulo errado | Rótulo passa a seguir o `status`, na web e no app. O painel do admin já distinguia |

### 🟠 Abertos — dependem de decisão, não de código

| ID | Achado | Por que não implementei |
|---|---|---|
| **ATOR-02** | `mark_active` não confere pagamento. Item pode ser retirado sem a reserva estar `PAID`. | Não dá para consertar antes de decidir **como o E2E paga**: a suíte não tem caminho de pagamento (`x-e2e-token` é só bypass de rate limit), então todo spec vai de `confirm` direto para `mark_active`. Um guard aqui quebra a suíte inteira sem alternativa. |
| **ATOR-03** | Extensão de prazo aprovada **não cobra nada**. O locatário fica mais dias sem pagamento adicional. | Produto: define preço da extensão, se cobra no ato ou no fim, e o que acontece se falhar. |
| **ATOR-04** | Notificação de extensão usa o tipo `BOOKING_CONFIRMED`. | Corrigir exige valor novo no enum `NotificationType` — migração, que não rodo sem o fundador presente. |
| **PSP-01** ⚠️legal | **Stripe como operador é transferência internacional de dados** (LGPD art. 33). O parecer e o RIPD foram escritos com o Mercado Pago — entidade **brasileira**. Com o MP descartado (24/08), a hipótese de base muda. | Não se resolve trocando o nome nos documentos: é análise jurídica, matéria de **D4**. Atinge `transferencia-internacional-dados.md`, `rascunho-ripd.md` e o item **C4** do checklist. |
| **PSP-02** | **Código do Mercado Pago virou peso morto.** OAuth, checkout e webhook seguem no repo atrás de `mercadoPagoEnabled` (default OFF), preservados pela decisão nº 6 do ADR-028 "caso fosse preciso reavaliar". Não é mais o caso. | Remover mexe em schema, flag, rotas e testes — decisão explícita do fundador, não efeito colateral. Manter dormente também é resposta válida. |
| **LEGAL-01** ⚠️legal | **Endereço da sede ausente** no bloco de identificação do prestador (`LEGAL_ENTITY.enderecoSede === null`). | Só o fundador tem o endereço registrado na Receita. Uma linha em `lib/legal-config.ts` quando ele confirmar — e o teste passa a cobrá-la. |
| **LEGAL-02** ⚠️legal | **Razão social errada em 2 textos legais congelados.** `lib/rental-contract.ts:56` diz `ShareO Marketplace de Aluguel LTDA (CNPJ a inserir após constituição formal)` e `lib/legal/biometric-consent-text.ts:36` diz `ShareO Marketplace de Aluguel Ltda.` — **nome que nunca existiu no registro**. A Receita emitiu `SHAREO MARKETPLACE DE INTERMEDIACAO DE NEGOCIOS LTDA` (CNPJ 68.512.556/0001-09, 11/08/2026). O placeholder do contrato espera exatamente esse dado, que agora existe. | Não corrigi: os dois textos são **versionados e hasheados** (`RENTAL_CONTRACT_VERSION`, `BIOMETRIC_CONSENT_VERSION`) — editar exige bump de versão e invalida aceites anteriores. Ambos são rascunho gated D4, e o texto de um contrato é matéria do jurídico, não de refactor. Custo de esperar é baixo (as duas flags estão OFF); custo de errar é um contrato que nomeia empresa inexistente. |
| **LEGAL-03** | `lib/legal-config.ts` está **duplicado byte-a-byte** em `apps/campanha/lib/legal-config.ts`, e este diff é a primeira divergência real (o bloco `LEGAL_ENTITY` só existe no site). | Hoje sem impacto — `apps/campanha` não tem página de termos/privacidade/políticas. Registrado porque o espelho começou a mentir e não há mecanismo que garanta a paridade. |

### 🧹 Higiene de ambiente

- **🔴 Preview de PR não tem banco — `NO_DATABASE_URL`.** Verificado em 23/08 no `/api/health` do preview do #350: `"db":"error"`, `"dbUrl":{"presente":false}`. O `Preview Deploy (PR)` do `deploy.yml` injeta só variáveis de BUILD (`NEXT_PUBLIC_*`); as de runtime teriam que vir do ambiente **Preview** do Vercel, onde não existem. Efeito: **nenhum preview abre página com dados** — item, listagem, reservas, perfil, admin. Sobram as estáticas.
  - **Por que ninguém viu:** o E2E aponta para o STAGING (`BASE_URL: secrets.STAGING_URL`, `main.yml:283`), nunca para o preview. O preview só era exercitado por build, que passa.
  - **Custo real:** revisar mudança de UI num PR é impossível — a verificação viva só acontece depois do merge, no staging. Foi o que barrou a checagem do calendário em 23/08.
  - **Conserto:** acrescentar `DATABASE_URL`, `DIRECT_URL` e `SUPABASE_SERVICE_ROLE_KEY` (apontando para o **staging**) ao escopo *Preview* no painel do Vercel. É ação do fundador — envolve credencial, que o assistente não manuseia.
- **✅ Lixo de E2E — causa atacada em 23/08.** Até então a suíte deixava ~2 itens + 2 reservas por rodada; tinham chegado a **183 itens e 186 reservas**, afogando as reservas reais na lista do usuário. A causa: o spec JÁ chamava `DELETE /api/items/{id}`, mas esse DELETE é **soft** (grava `deletedAt`, a linha fica) e a **reserva não era apagada por nada** — não há endpoint para isso, nem deveria. Sem caminho por HTTP, a limpeza precisa do banco: novo passo `Limpar dados criados pelo E2E` no job de E2E (`always()` + `continue-on-error`), rodando `scripts/limpar-lixo-teste-staging.ts --escopo=e2e --apply`.
  - 🪤 **Foto de reserva NÃO pode entrar na trava de dependentes financeiros.** Entrou na 1ª versão e o script abortava sempre, porque desde que a foto de devolução virou obrigatória toda reserva do E2E tem uma. Foto é prova, não dinheiro, e some por cascata.
  - ⚠️ **Sobra pendente: arquivos órfãos no bucket `booking-photos`.** A cascata é só do banco; cada rodada deixa um blob. Pequeno, mas acumula — resolver com a service role key.
  - ⚠️ **Outros specs também criam itens** (ex.: `anuncio.spec`). O escopo `e2e` mira só `"Devolução E2E …"`; o staging tinha 1.320 itens depois da faxina, então há outra fonte de acúmulo não investigada.
- **Período invertido confirmado ao vivo.** Reservas criadas antes do deploy do #345 têm `2028-02-27 → 2026-08-24`; as criadas depois saem corretas. As ~177 antigas **não se autocorrigem**.
- **Atributo Hidden do Windows** em 5 specs e 3 scripts bloqueava escrita com EPERM. Limpo — são fontes versionados comuns e o Git não rastreia o atributo.

---

## 🧭 Avaliação multi-perfil da plataforma (2026-08-19) — pendências registradas

> Origem: [`avaliacao-plataforma-multiperfil-2026-08.md`](avaliacao-plataforma-multiperfil-2026-08.md) — jornada viva no staging (telas públicas) + auditoria de 5 especialistas (negócio, segurança/LGPD, QA, UI/UX, arquitetura). Achados **verificados por arquivo:linha** ou pela jornada viva; onde há inferência, está marcado.
>
> **Processo ENCERRADO** quanto à avaliação. Itens abaixo ficam para deliberação/execução. IDs `EVAL-*` são inéditos desta rodada; itens já existentes são **referenciados**, não duplicados. **Nada foi corrigido** aqui (exceto a baixa do SEC-MAJ-06, já aplicada abaixo na tabela MAJOR).
>
> ⛔ **Fluxos autenticados NÃO validados ao vivo** (anunciar → reservar → pagar): o assistente não pode digitar credenciais. **Pendente:** validação viva com o fundador logado antes de marcar esses fluxos como ✅ (regra de verificação por evidência).
>
> 🔁 **Reverificação em 2026-08-23** (coluna "Status 23/08"): cada P0 foi reconferido contra o código do `main` em `e6af9d6`. A ADR-028 (reversão para Stripe Connect, 19/08) tornou **dois** itens sem objeto. Os P1/P2 **não** foram reverificados — continuam como estavam em 19/08.

### 🔴 P0 — corrigir antes de qualquer go-live público

| ID | Achado | Local | Status 23/08 | Nota |
|---|---|---|---|---|
| ~~**EVAL-P0-01**~~ ⚠️legal | ~~`/termos` e `/privacidade` **não identificam a ShareO como PJ**.~~ | `lib/legal-config.ts` (`LEGAL_ENTITY`), `components/legal/IdentificacaoPrestador.tsx` | 🟢 **RESOLVIDO em 2026-08-24** — bloco de identificação (razão social + CNPJ + contato) em `/termos`, `/privacidade` e `/politicas`, mais as duas telas do app. Fonte única; teste tranca as 5 telas. | ⚠️ **Falta o endereço da sede**: `LEGAL_ENTITY.enderecoSede` está `null` e a linha é omitida — endereço inventado num documento legal é pior que ausente. **Preencher antes do go-live**: sem ele o Decreto 7.962/2013, art. 2º, I não está cumprido. |
| **EVAL-P0-02** | Campos de localização (Cidade/Estado/Bairro/Endereço) no **modo create** parecem editáveis mas ignoram o input silenciosamente (`onChange` faz `if (mode !== "create") …`, sem `disabled`/`readOnly`). | `components/items/ItemForm.tsx` | 🔴 **ainda vale** | Proprietário que não lê o banner tenta digitar e trava. Fix: `readOnly`/`disabled` quando `mode==="create"`. |
| **EVAL-P0-03** | **Chips de categoria no `/itens` mobile ~30-34px** (`py-1.5 text-xs`), abaixo dos 44px do DS. | `app/itens/page.tsx:370,387` | 🔴 **ainda vale** | Filtrar por categoria fica difícil no mobile (tap target). |
| **EVAL-P0-04** | **Política de cancelamento contraditória entre telas:** página do item mostra faixas hardcoded; `/ajuda` diz outra coisa. | `app/itens/[id]/page.tsx:625`, `app/reservas/sucesso/page.tsx:171` | 🔴 **ainda vale — e piorou em contraste**: `/ajuda` e `/politicas` passaram a ler a config (reescrita de 20/08), mas esses **2 pontos seguem hardcoded** | A divergência agora é entre config e código, não entre dois textos. Fonte única da verdade = `lib/platform-config.ts`. Achado da **jornada viva**. |
| ~~**EVAL-P0-05**~~ | ~~Endpoint `declare-pix` sem nenhum teste de integração.~~ | ~~`app/api/bookings/[id]/declare-pix/route.ts`~~ | ⚫ **OBSOLETO** — a rota não existe mais; o PIX manual da plataforma foi removido pela [ADR-028](adr/ADR-028-reversao-stripe-connect.md) (Stripe Connect). Zero ocorrências de `declare-pix` no código. | Sem objeto. A cobertura do **checkout Stripe** é uma pendência nova e separada. |
| **EVAL-P0-06** | Threshold de cobertura global em **1% de linhas** — sem enforcement real; meta H1 de 70% sem guardrail no CI. | `jest.config.ts` | 🔴 **ainda vale** (`lines: 1`) | Regressão de cobertura passa despercebida. |
| ref **SEC-MAJ-07** | `SKIP_RATE_LIMIT`/`x-e2e-token` sem guarda de `NODE_ENV` — ver tabela MAJOR. | `lib/rateLimit.ts` | 🔴 aberto | Já no backlog; reconfirmado pela auditoria. Condicionar a `NODE_ENV !== production`. |
| ~~ref (PIX pessoal)~~ | ~~Trocar chave PIX pessoal do fundador → chave PJ antes de ligar pagamento real.~~ | ~~`getPlatformPixConfig`~~ | ⚫ **OBSOLETO** — helper e fluxo removidos pela ADR-028. | Sem objeto. (O `pixKey` do **proprietário**, usado em repasse, continua existindo — ver SEC-BL2, que **não** é afetado.) |

### 🟠 P1 — melhorias incrementais (antes de escalar aquisição)

> Não reverificados em 23/08 — estado conforme apurado em 19/08.

| ID | Achado | Local |
|---|---|---|
| **EVAL-P1-01** | `role="alert"` ausente no erro de reserva + tabs de modalidade sem semântica ARIA (`role="tab"/radiogroup`, `aria-selected`). Corroborado por 2 auditorias. | `_PriceCalc.tsx:448,215` |
| **EVAL-P1-02** ⚠️verificar | Void promise em `geocodeItem` no PATCH de item (`.then(...)` sem `await`/`after()`) — pode morrer se a lambda congelar. (S14-M-19 resolveu o PATCH `/me`; este é o PATCH de **item**.) | `app/api/items/[id]/route.ts:266-267` |
| **EVAL-P1-03** | `sort=nearest` sem bbox puxa 500 itens e ordena em JS — degrada com catálogo grande. | `app/itens/page.tsx:181,258` |
| **EVAL-P1-04** | Seção "Fotos" é a última do formulário (maior motor de conversão) + limite de 3 na UI. (Ver S14-M-15: "3 é dica" — mas a UI faz cap em 3; backend suporta 10-24.) | `ItemForm.tsx:385,956+` |
| **EVAL-P1-05** | Sem nota (rating) no card da listagem — sinal de confiança removido por trade-off de performance. Denormalizar `avgRating`. | `ItemCard.tsx:121-125` |
| **EVAL-P1-06** | Validação de e-mail no cliente usa `!email.includes("@")` (aceita `"a@"`). | `RegisterForm.tsx:69` |
| **EVAL-P1-07** | Textos de sugestão de preço em `text-[11px]` (abaixo do mínimo 12px do DS). | `ItemForm.tsx:694,715-735` |
| ref **SEC-BL2** | `pixKey` do locador em texto claro no banco (enquanto CPF/CNPJ são AES-256-GCM). | `prisma/schema.prisma` |
| ref **ARQ-A-01/M-04/M-05** | Slugs nas URLs de item + ISR/SSG + `/categoria/[slug]` — pré-requisito de SEO nacional. | ADR-007 |

### 🟡 P2 / Expansão — ajustes de modelo e polish

> Não reverificados em 23/08 — estado conforme apurado em 19/08.

| ID | Achado | Local |
|---|---|---|
| **EVAL-P2-01** | Rótulos divergentes p/ a mesma ação: "Reservar agora" (sticky CTA) vs "Solicitar locação" (PriceCalc). | `_StickyBookingCTA.tsx:65` vs `_PriceCalc.tsx:468` |
| **EVAL-P2-02** | Deslogado vê "Solicitar locação" sem aviso de que login é necessário → redirect inesperado. | `_PriceCalc.tsx:473-479` |
| **EVAL-P2-03** | `?ulat=abc` malformado propaga `NaN` no Haversine → lista vazia sem mensagem de erro. | `app/itens/page.tsx:163` |
| **EVAL-P2-04** | Formatador BRL duplicado em ~8-10 componentes — falta `lib/format.ts` (`formatBRL(cents)`). | 8 arquivos (ver relatório §4.2) |
| **EVAL-P2-05** | Cron de lembretes sem retry; health check não cobre PSP/Resend; falta índice composto `(status,isApproved,deletedAt,latitude,longitude)`. | `cron/reminders`, `api/health`, `schema.prisma` |
| **EVAL-P2-06** | DS: `--success` idêntico a `--brand`; `amber-*`/`red-*` hardcoded fora dos tokens; sem indicador de progresso no formulário longo. | `globals.css`, `ItemCard.tsx`, `ItemForm.tsx` |
| **EVAL-P2-07** (modelo) | Confiança sem caução (D2): avaliar **garantia mínima** (retenção temporária) como H2. Priorizar **densidade por praça** antes de dispersão nacional (chicken-and-egg). | decisão de produto |

### A verificar (podem já estar resolvidos — não classificar sem confirmar)

- Rate limit nas rotas de auth (`phone/send-otp`, `forgot-password`, `register`) — enumeração + custo SMS.
- Reaceite de `CONSENT_VERSION` v1.0→v1.1 para usuários antigos (prompt na UI).
- Sentry `beforeSend` scrubbing de PII (Arquitetura viu `scrubEvent`; confirmar alcance).
- ⚠️ **Nota do PR original invertida:** o texto dizia "`/ajuda` já descreve Mercado Pago — a nota antiga de Stripe era drift". Isso **deixou de valer**: a ADR-028 (19/08) reverteu o PSP para Stripe Connect e a reescrita de 20/08 alinhou `/ajuda` e `/politicas` ao código. Hoje o Mercado Pago está dormente. Sem ação.

---

## 🧪 QA pré-lançamento (s36, 2026-06-23) — achados para deliberação

> Bateria de validação de qualidade executada na branch `refactor/dedup` (sem criar funcionalidade, sem quebrar nada). **Todos os gates automatizados verdes.** Achados abaixo são **não-bloqueantes** e estão aqui para deliberação **antes** de qualquer execução.

**Resultados verdes (evidência):**
- `tsc --noEmit` ✅ limpo · `next lint` ✅ (só 4 warnings menores, ver QA-LINT-01) · `jest` ✅ **480/480** (26 suites) · `next build` ✅ EXIT 0 (First Load JS compartilhado 104 kB, middleware 45 kB)
- **Headers de segurança do staging** ✅ fortes: CSP com nonce + `frame-ancestors 'self'` + `frame-src 'none'`, HSTS `max-age=63072000; includeSubDomains; preload`, `X-Frame-Options SAMEORIGIN`, `X-Content-Type-Options nosniff`, `Referrer-Policy strict-origin-when-cross-origin`, `Permissions-Policy camera=()/microphone=()/geolocation=(self)`, COOP `same-origin`
- **Duplicação de código** (jscpd) ✅ **2,81%** (75 clones / 1.287 linhas em 349 arquivos) — baixa, coerente com a campanha dedup

| ID | Descrição | Evidência | Sugestão | Impacto |
|---|---|---|---|---|
| **QA-DEP-01** | 12 vulnerabilidades **transitivas** em `pnpm audit --prod` (2 high / 6 mod / 4 low). Nenhuma crítica; nenhuma é dependência direta. | Runtime web real = só `cookie` (low, via `@supabase/ssr`). As "high" são **tooling de build** (`rollup` via `@sentry/nextjs`) ou **mobile-only** (`undici` via `apps/mobile>expo>@expo/cli`). Demais "web" (`@babel/core`, `postcss`, `uuid`, `@opentelemetry/core`) são build-time do `@sentry/nextjs`/`next`. | Bump de `@sentry/nextjs` + `@supabase/ssr`; mobile via `expo` upgrade (trilha separada). Reauditar pós-bump. | **Baixo** |
| **QA-LINT-01** ✅ CORRIGIDO (s36) | 4 warnings `@typescript-eslint/no-unused-expressions` (padrão `ref.current && (ref.current.value = "")`). **Não é bug** — funciona (reset do input file); é code-smell. | `app/perfil/_IdVerification.tsx:158,160,180,182` | ✅ Trocado por `if (cond) x = y` nos 4 pontos. `next lint` agora "No ESLint warnings or errors"; tsc + build verdes. | **Baixo** |
| **QA-DUP-01** | Clones residuais (2,81%) concentrados nos itens **já adiados** da campanha dedup. Maiores: `bookingHistory` mobile×web (135L, cross-package — intencional), payload PIX `declare-pix`×`checkout` (36L), guards admin em route handlers (`payouts`×`pix-accounts`, 25L), boilerplate de forms de auth (`RegisterForm`/`SetPassword`/`Reset`/`Login`), crons `auto-cancel`×`expire-bookings` (33L). | Relatório jscpd (top-25 por linhas). | Cobertos por C3 (guard 401 ~100 rotas) e C6 (boilerplate de fetch ~30 forms) de [[project-dedup-campaign]]. `bookingHistory` → avaliar pacote `@shareo/shared` (baixa prioridade). | **Baixo** |
| **QA-SEC-HDR-01** ✅ CORRIGIDO (s36) | Header `X-Powered-By: Next.js` exposto no staging (info disclosure menor). | `curl -D - https://staging.shareo.com.br/` | ✅ `poweredByHeader: false` adicionado ao `next.config.ts`. (efeito visível no staging após o próximo deploy.) | **Muito baixo** |

**Escopo da meta que NÃO é executável neste ambiente (requer validação manual/externa — registrar como tarefa de bancada):**
- **Responsividade real** (320/480/768/1024px), **gestos** (pinch/swipe/rotação): cobertura automatizada existe via regressão visual Playwright (`test:visual`, 18 baselines win32) — rodar sob demanda. Validação tátil em **device Android real** segue manual.
- **Leitores de tela** (NVDA/VoiceOver) e **navegação por teclado** ponta-a-ponta: axe automatizado roda em `e2e/e2e-a11y-plan.spec.ts` (claro+escuro, 0 violações na última corrida); SR manual é de bancada.
- **Compatibilidade multi-browser/OS** (Safari/Firefox/Edge, iOS/macOS): não há matriz BrowserStack — manual.
- **Carga/stress:** k6 disponível (`test:load`), porém **`BASE_URL` = localhost por regra do projeto — NUNCA rodar load/stress no staging** (rate limit/testers). Medição de escala fica para ambiente dedicado pós-D4.

---

## ⏭️ Pendências imediatas (reconciliado 2026-08-13)

> **Por que a data importa.** Em 13/08 uma varredura encontrou **4 entradas que descreviam o mundo errado** — 2 aqui e 2 no `checklist-go-live.md`: itens marcados como pendentes que já estavam feitos (parecer D4, projeto `shareo-prod`, GAP-CRIT-04b) e uma descrição obsoleta de comportamento de código (`MP_WEBHOOK_SECRET`). Todas foram corrigidas contra o código/estado atual, não contra memória.
>
> O risco de um registro assim não é ficar bonito: **um checklist que lista como pendente o que já foi feito treina quem lê a ignorá-lo**, e aí os itens que importam de verdade somem no ruído. Ao dar baixa em algo, dar baixa AQUI também — e ao mudar comportamento de código citado por uma linha, atualizar a linha no mesmo PR.

| Item | Status | Ação |
|---|---|---|
| 🆕 **Copy de pagamento desatualizada: checkout já aceita Pix e boleto** | 🔴 **texto × código divergindo AGORA** (registrado 20/08) | O [#325](https://github.com/robertoepifanio-byte/SHAREO/pull/325) ligou `payment_method_types: ["card", "boleto", "pix"]` em `app/api/payments/checkout/route.ts` **horas depois** do [#324](https://github.com/robertoepifanio-byte/SHAREO/pull/324) publicar a copy dizendo "**apenas cartão de crédito à vista**" — que era verdade quando foi escrita. **5 pontos a corrigir:** 3 em `app/ajuda/page.tsx` (passo 5 do locatário, FAQ "Como funciona o pagamento?", FAQ "Quais formas de pagamento são aceitas?") e 2 em `app/politicas/page.tsx` (§1.7 e §4.3), mais `docs/juridico/copy-pagamento-stripe-connect.md`, que afirma que Pix/boleto não estão implementados. ⚠️ **NÃO trocar a frase ainda:** a [ADR-028](adr/ADR-028-reversao-stripe-connect.md) registra pendência aberta de que **Pix e boleto precisam estar habilitados no Dashboard da Stripe** (`payment_method_types` no código não basta — sem isso a Checkout Session **falha ao ser criada**), e isso **não foi verificado**. Publicar "aceitamos Pix" antes da confirmação é a mesma oferta vinculante (CDC art. 30) que motivou escrever "só cartão". **Ordem: confirmar no Dashboard → atualizar os 6 arquivos.** ⚠️ O §4.3 exige mais que troca de frase: o texto de estorno raciocina "como o checkout aceita apenas cartão, o crédito aparece na fatura" — reembolso de boleto/Pix não volta em fatura, a Stripe pede dados bancários. "Sem parcelamento" **continua correto** (não há `payment_method_options.card.installments`). |
| **📱 Distribuir build preview do app aos testers** | ✅ **RESOLVIDO — build grátis no GitHub Actions** | Contornada a cota Free do EAS: workflow **`.github/workflows/apk-build.yml`** (#234/#235) builda o APK no runner do GitHub (grátis/ilimitado em repo público) via `expo prebuild` + Gradle `assembleRelease` e publica num **Release público**. Disparo: `gh workflow run apk-build.yml --ref main` (ou aba Actions). **APK sempre em:** https://github.com/robertoepifanio-byte/SHAREO/releases/tag/apk-preview (link direto p/ testers, sem login). Variante padrão sem mapa nativo (adiado); `include_mapbox=true` + secret `MAPBOX_DOWNLOADS_TOKEN` inclui o mapa. Só arm64-v8a. Assinatura debug → desinstalar a versão anterior antes de atualizar. |
| **Copy de pagamento p/ validação jurídica** | 🟣 **para a advogada** (doc trocado em 20/08) | ⚠️ O documento do Mercado Pago (`juridico/copy-pagamento-validacao-juridica.md`) **ficou obsoleto** com a ADR-028 — **não enviar**. O vigente é [`juridico/copy-pagamento-stripe-connect.md`](juridico/copy-pagamento-stripe-connect.md), que o substitui. **Mudança material a destacar para a advogada:** o parecer D4 validou *"a ShareO não retém nem custodia o valor devido ao locador"* para o desenho do MP, mas a implementação escolhida é *separate charges and transfers* — **a cobrança cai na conta ShareO na Stripe** e o `Transfer` só sai no cron de repasse. A copy publicada não afirma mais quem custodia (diz só que o valor "fica retido"), mas a pergunta de fundo continua aberta: isso muda a conclusão sobre a Lei 12.865? Se mudar, é decisão de engenharia migrar para *destination charge*. Outros pontos: enquadramento/denominação da Stripe no Brasil (removemos a afirmação de licença BACEN que existia p/ o MP) e transferência internacional (Stripe Inc. é americana, art. 33 LGPD). Sem o aval, Ajuda/Termos não vão a público. Gated D4. |
| **~~🔴 N1 — CTA de reserva mobile aponta p/ rota inexistente (404)~~** | ✅ **RESOLVIDO (#142)** | Revisão de navegabilidade s41 (CONFIRMADO): `_StickyBookingCTA.tsx` mandava usuário logado p/ `/reservas/nova` (inexistente) → 404. **Fix:** logado rola até `#price-calc`; não logado segue `/login`. |
| **~~a11y do modal de KYC~~** | ✅ **RESOLVIDO (#143)** | `role="dialog"` + `aria-modal` + `aria-labelledby`, foco no diálogo, Escape, focus trap, scroll-lock; tap targets ≥44px (botão Verificar/Reenviar h-11, 4 uploads +min-h-11, CTAs rodapé py-3). |
| **~~Dark mode da Central de Ajuda~~** | ✅ **RESOLVIDO (#144)** | Overrides `dark:` nas 5 seções de FAQ + 3 callouts; status PENDING → token `text-booking-pending`. Verificado no preview (/ajuda escuro). |
| **Prep pró-flag de biometria** | 🟡 **parcial (#145)** | ✅ FEITO: (1) botão "Revogar consentimento biométrico" na UI (só com flag ON + consentimento) + (2) export art.20 inclui `idSelfieConsentAt/Version/TextHash` (não `...Ip`). ⏳ RESTA (pós-D4, precisa DPO): (3) log `kyc.selfie.view` no admin; (4) adendo à Política citando art.11 II "a". Ver `docs/juridico/spec-consentimento-biometria-c1.md` (DoD). |
| **Mercado Pago — validação humana (testers)** | 🟢 **EM ANDAMENTO** | Ciclo E2E já validado tecnicamente (reserva PAID + split + webhook real). Roteiro para testers entregue (`docs/guias/roteiro-teste-mercadopago.md`/`.pdf`, regra única = pagar como convidado). Aguardando retorno dos testers (canal WhatsApp 84 99662-2346). |
| **Mercado Pago — `MP_WEBHOOK_SECRET`** | 🔴 **PRÉ-REQUISITO, não mais opcional** (atualizado 13/08) | Falta **obter o valor no painel do MP (Webhooks)** e adicioná-lo no Vercel. ⚠️ **A descrição antiga ("o webhook funciona mas pula a validação, aceitável no sandbox") ficou obsoleta com o PR #305:** o webhook agora **falha fechado (503)** quando o `MP_ACCESS_TOKEN` NÃO é de sandbox (prefixo `TEST-`) e o secret está ausente. Sandbox segue pulando a validação; com credencial real, sem o secret não há pagamento — de propósito, para a falha aparecer no painel de webhooks do MP em vez de a rota aceitar requisição não autenticada. |
| **Mercado Pago — remover override de sandbox (#122)** | 🔴 **antes do go-live** | Remover env `MP_SANDBOX_SELLER_TOKEN` + helper `sandboxSellerTokenOverride()` + 2 call sites (checkout/webhook). É bypass de teste. Fazer quando a validação humana fechar. |
| **Mercado Pago — desacoplar PIX NOT NULL** | 🔵 **adiado p/ remoção do legado** | Callback OAuth é *update-only* (locador precisa ter PIX antes de conectar MP). Tornar `pixKey`/`holderName`/`pixKeyType` nullable toca ~25 call sites do modelo financeiro; sem benefício hoje (ninguém conecta MP sem PIX). PR dedicado quando removermos o PIX-manual/Stripe. |
| **~~Central de Ajuda (`/ajuda`) — revisão dos especialistas~~** | ✅ **RESOLVIDO (#324, 20/08)** | A meta original era reescrever de Stripe → **Mercado Pago**; a [ADR-028](adr/ADR-028-reversao-stripe-connect.md) reverteu o PSP, então a reescrita acabou sendo de MP → **Stripe**. `/ajuda` e `/politicas` alinhadas ao **código** (não à política), com todos os números vindo do `PlatformConfig` em runtime. **Achado que sobra como decisão do fundador:** três itens que este backlog listava como "modelo atual" — **repasse semanal**, **multa de 1 diária** e **teto de R$ 1.000 por bem** — são políticas **decididas que o código nunca implementou** (o código faz: elegível N dias após a devolução em cron diário, multa de 1,5 diária, e **nenhuma validação** de valor do bem). Manter as políticas exige **mudar o código primeiro** e reverter a copy depois. Detalhe e tabela em [`juridico/copy-pagamento-stripe-connect.md`](juridico/copy-pagamento-stripe-connect.md). **Gated D4** para publicação em produção. |
| ✅ **KYB PJ — PR #64 (H2)** | ✅ MESCLADO (#63 + #64) | Circuit breaker + cron `/api/cron/kyb`. No ar. |
| ✅ **KYB PJ — cron de revalidação de PJs verificadas** | ✅ FEITO (s34) | Bloco no cron `/api/cron/kyb` re-consulta PJs verificadas há +30 dias. |
| ✅ **Termos — cláusula explícita da taxa (#4 do D4)** | ✅ MESCLADO (#42) | Seção 6 dos Termos com taxa 15% dinâmica + repasse semanal + teto R$500. |
| **`/bem-vindo` — generalizar a copy (PÓS lançamento)** | 🔵 pós-lançamento | Remover o tom de piloto ("Você é um dos primeiros 🎉") após o go-live. Arquivo: `app/bem-vindo/page.tsx`. |
| 🆕 **`NEXT_PUBLIC_APP_URL` não definida no staging** | 🟡 config de infra | O `sitemap.xml` do staging declara `shareo-rouge.vercel.app` enquanto o host servido é `staging.shareo.com.br`. **Inerte hoje** (robots devolve `Disallow: /`, nada é indexado) — mas **corrigir antes de tornar qualquer ambiente indexável**. O E2E de governança anota a divergência em vez de reprovar, de propósito: é env var de deploy, não código. Registrado 13/08. |
| 🆕 **Dívida do meta-teste E2E (13/08)** | 🟡 qualidade | Levantada pela auditoria da suíte e ainda não atacada: (1) 6 testes do fluxo de reserva por UI em `test.skip` PERMANENTE (`booking-flow.spec.ts:290-417`, corpo implementado); (2) sem cobertura E2E para raio de proximidade, `ResendVerificationButton` na tela de reserva e tiers de embaixador 2/3/5%; (3) 10 `waitForTimeout` fixos em 6 arquivos (2-3s no `mapbox.spec.ts`); (4) dependência de ordem via `test-item-id.json`/`test-booking-id.json` com `fullyParallel: true` no config local. Detalhe em [[project-e2e-veredito-parcial]]. |
| **KYB PJ — feedback dos testers do cadastro** | ⏳ aguardando | Tratar achados do roteiro `docs/roteiro-teste-cadastro-pj.pdf` quando os testers devolverem. |
| **Verificar geocode automático no fluxo de criar item em produção** | ✅ **RESOLVIDO (06/08)** | PR #265 (05/08) corrigiu o `ItemForm` pra geocodificar automaticamente o endereço do perfil ao criar item. Roberto criou um item de teste em `shareo-prod` (após o fix das env vars do Vercel destravar o cadastro) — coordenada salva confere com o endereço do perfil, não com o centro do Brasil. |
| **`DATABASE_URL_PROD` sem `connection_limit=1`** | ✅ **RESOLVIDO (06/08)** | Roberto atualizou os dois lados — GitHub Secret `DATABASE_URL_PROD` (build+migrate) e a env var `DATABASE_URL` no Vercel `shareo-prod` (runtime) — sem o valor passar pelo Claude. Deploy de produção disparado (`workflow_dispatch`, run `31099273959`, 3m57s) confirmando build/migrations/health check todos verdes com o novo parâmetro. |

---

## 🧪 Painel de Testes Não-Funcionais em produção (05/08/2026) — backlog dos achados

> Origem: painel de especialistas (qa/devops/arquiteto/segurança/designer) sobre os 5 eixos de teste não-funcional (desempenho/carga/estresse/segurança/usabilidade) contra o `shareo-prod` real, com verificação adversarial. 28 achados confirmados. **Já corrigido + mesclado:** PR #265 (4 achados Alto), PR #266 (11 achados Médio/Baixo mecânicos), e PRs #267–#271 (`NFR-BL1`–`7` abaixo — cada um implementado em worktree isolado, revisado e verificado manualmente antes do merge). **✅ 06/08: os 28 achados estão todos endereçados, sem pendências** — `connection_limit=1` no `DATABASE_URL_PROD` foi o último item, resolvido pelo Roberto (GitHub Secret + Vercel) e verificado com deploy de produção verde.

| ID | Item | Status | Sev. |
|---|---|---|---|
| NFR-BL1 | Filtro de distância carrega até 500 itens na lambda antes de paginar (`app/itens/page.tsx:127-134`, `ARQ-ALTO-09`) | ✅ RESOLVIDO (#271) — bounding box no `WHERE` do Prisma antes da Haversine em JS, aproveitando o índice `latitude+longitude` existente. | Médio |
| NFR-BL2 | `viewCount` incrementado via `UPDATE` síncrono por visualização, sem batching (`app/api/items/[id]/route.ts:62`, `app/itens/[id]/page.tsx:184`) | ✅ RESOLVIDO (#269) — acumula em Redis (Upstash) + cron `flush-view-counts` faz o flush em lote. | Médio |
| NFR-BL3 | 5 queries em paralelo por detalhe de item pressionam o pool (`app/api/items/[id]/route.ts:82-129`) | ✅ RESOLVIDO (#269) — `unstable_cache` (5 min) nas 3 queries auxiliares; query principal e `ownerStats` continuam live. | Médio |
| NFR-BL4 | Paginação + `orderBy bookings._count` sem índice de suporte (`app/api/items/route.ts:26-35`) | ✅ RESOLVIDO (#271) — `bookingsCount` denormalizado em `Item`, incrementado atomicamente na transação de criação da reserva. | Médio |
| NFR-BL5 | Cron `/api/cron/reminders` processa reservas do dia em loop `for..of` sequencial dentro de `maxDuration=60s` | ✅ RESOLVIDO (#267) — paraleliza em lotes de 10 (`Promise.allSettled`), com contagem de falhas na resposta. | Médio |
| NFR-BL6 | Mapbox como ponto único de falha na geocodificação — falha silenciosa, sem retry nem reprocessamento automático (`lib/geocodeItem.ts`) | ✅ RESOLVIDO (#268) — coluna `geocodeStatus` (`PENDING`/`OK`/`FAILED`) + cron `geocode-retry` com backoff. Backfill retroativo pros itens já com `0,0`. | Médio |
| NFR-BL7 | E-mails via Resend com só 2 tentativas / 400ms, sem fila de retry nem DLQ (`lib/email.ts:38-60`) | ✅ RESOLVIDO (#270) — tabela `EmailQueue` + cron `email-retry` (15 em 15 min), escopo nos 4 templates críticos (verificação/reset/cobrança/convite fundador). | Médio |
| NFR-BL8 | Deployment Protection do Vercel bloqueia qualquer teste de carga/estresse real contra `shareo-prod` vindo de fora | Não é um bug — é a própria proteção fazendo o trabalho dela. Não tem "correção"; só registrar que medição de carga real fica pra um ambiente dedicado pós-D4 (mesma nota já em `docs/backlog-atividades-priorizadas.md:31`). | — |

---

## 🧹 Sprint de Endurecimento Zero-Dependência (s41, 2026-07-01) — backlog dos achados

> Origem: META `planos/meta-hardening-zero-dependencia-s41.md`. 5 especialistas auditaram/desenvolveram o que **não tem dependência externa** e **não é feature nova**. **Já aplicado + mesclado:** PR #152 (mobile/hardening), #153 (+309 testes + a11y `RatingStars`), #154 (segurança A1/A2/M1–M5), e o PR de a11y do designer. **Abaixo: tudo que os agentes marcaram para ANÁLISE** (exige feature nova, decisão de negócio/design, migração de dados, ou mudança de comportamento com risco). Nada aqui foi executado.

### 🔐 Segurança — backlog (auditoria `seguranca-shareo`)

| ID | Item | Por que é backlog | Sev. |
|---|---|---|---|
| SEC-BL1 | `passwordResetToken.token` gravado em **claro** no banco (`forgot-password`/`reset-password`) | Fix exige migração dupla-leitura (aceitar claro OU hash por 1h) → tokens de reset em voo falham no deploy. Precisa decisão + release note. | Alto |
| SEC-BL2 | Chave PIX (`ownerPaymentAccount.pixKey`) em **texto claro** | `encryptPII` já existe (usado em `mpAccessToken`), mas exige migração de dados legado (staging tem chaves de teste) + mudança em vários call-sites (API/admin/informe) + cuidado com consulta por valor. Refator próprio. | Alto |
| SEC-BL3 | `outboundWebhook.secret` HMAC em **claro** | Precisa ser recuperável p/ assinar → `encryptPII` + migração dupla-leitura. | Alto |
| SEC-BL5 | Mensagens de chat (`Message.content`) sem criptografia em repouso | Criptografar quebra o Supabase Realtime (streama `content`) e busca textual futura. Decisão de arquitetura. | Médio |
| SEC-BL6 | Sem rate-limit em `PATCH /api/bookings/[id]` (transições) e `POST /conversations/[id]/messages` | Exige o PO definir budgets (msgs/min entre 2 partes; transições/min). Não é "correção óbvia". | Médio |
| SEC-BL4 | `X-Frame-Options: SAMEORIGIN` × CSP `frame-ancestors 'self'` divergem de fonte | Equivalentes hoje; só tech-debt de fonte-única. | Baixo |
| SEC-BL7 | Registro de consentimento desigual (cookies/marketing implícitos) | Depende do que o PO/jurídico quer coletar. | LGPD |
| SEC-BL8 | Documentar janela de retenção `access_logs`/IPs de consentimento + checar `legalHold` no purge | Revisão, não correção; crons já existem. | LGPD |

### ♿ Acessibilidade — backlog (auditoria `designer-shareo`)

| ID | Item | Por que é backlog |
|---|---|---|
| A11Y-BL1 | `NotificationBell` — `role="dialog"`+focus-trap p/ o painel | Muda comportamento de foco (teclado). |
| A11Y-BL2 | `UserDropdown` `role="menu"` sem navegação por seta ↑↓ | Refator de gestão de foco, risco de regressão. |
| A11Y-BL3 | Botões de ação de reserva sem `min-h-[44px]` (~34px) | Adicionar altura mínima muda o layout do grid de ações. |
| A11Y-BL4 | Emojis nos labels dos botões de reserva (`✅`/`📦`/`⚠️`) lidos por leitor de tela | Exige separar emoji em `aria-hidden` em todo o array de labels. |
| A11Y-BL5 | `HelpButton`/`FilterBottomSheet` sem focus-trap completo | Muda comportamento de teclado. |
| A11Y-BL6 | `CasosRenda` — cards ilustrativos soam como depoimentos reais p/ leitor de tela | Decisão de produto sobre semântica de conteúdo fictício. |
| A11Y-BL7 | `BottomNav` sem `focus-visible:ring` | Perceptível quando focado por teclado. |
| A11Y-BL8 | Cabeçalhos de seção do `MobileMenu` sem `role="group"` | Muda estrutura HTML; cuidado com o flex. |
| A11Y-BL9 | Ordem "Central de Ajuda" depois de "Sair" no menu | Decisão de UX. |

### 🔁 DRY / tech-debt — backlog (auditoria `arquiteto-shareo`)

| ID | Item | Por que é backlog |
|---|---|---|
| DRY-BL1 | Dois `EmptyState` (`components/ui` × `components/shared`) com layouts/API diferentes | Consolidar muda layout observável em ~6 telas; decisão de qual é canônico (alinhar c/ designer). |
| DRY-BL2 | `dashboard/page.tsx` reimplementa cores de status de reserva divergindo do `BookingStatusBadge` (`CONFIRMED` blue-100/700 × blue-medium; `ACTIVE` success × brand) | Adotar o badge **muda cores observáveis**; precisa canonizar a fonte da verdade. |
| DRY-BL3 | `STATUS_LABEL` de Payout/PixAccount/Verification/Booking espalhados | Domínios distintos; criar `lib/statusMaps.ts` unificado usando variants do `StatusBadge`. |
| DRY-BL4 | 4 rotas admin retornam **403** p/ não-autenticado; `requireAdminApi` retorna **401** | Adotar muda status HTTP → risco de quebrar E2E/contratos. Alinhar padrão. |
| DRY-BL5 | `apps/mobile/lib/bookingHistory.ts` é cópia byte-a-byte de `lib/bookingHistory.ts` + formatters duplicados no mobile | Pede pacote `packages/shared` (setup de workspace) — refator de tooling. |
| DRY-BL6 | `utils/cn.ts` (clsx+tailwind-merge) com **0 uso** | Adotar mexe em centenas de linhas; migrar UI primeiro via ADR. |
| DRY-BL7 | `condition_label` (NEW/EXCELLENT/…) repetido em 4 lugares com conjuntos diferentes | Precisa decidir enum canônico × valores importáveis. |
| DRY-BL8 | Estrelas `★☆` inline em vez do `RatingStars` em alguns lugares | Trocar muda markup/aria; validar visual/teste. |
| DRY-BL9 | `rounded-xl border border-border bg-surface p-4` em 23+ lugares (primitivo `Card`) | Refator amplo (30+ arquivos); alinhar c/ designer. |
| DRY-BL10 | `relativeTime` triplicado com granularidades diferentes ("semana(s)" × "semanas", meses) | Canonizar muda copy sutil numa tela. |
| DRY-BL11 | Dedup de formatadores **bit-idêntica** (`formatPrice`/`formatDate*`/`formatNumber` inline em ~15 arquivos) | **Seguro, mas toca ~15 arquivos** — fazer como PR de limpeza dedicado e revisável (ressalva: `_PriceCalc` usa reais, não centavos → não trocar por `formatPrice` sem ajustar unidade). |

### 🧪 Cobertura de testes — backlog (auditoria `qa-shareo`)

| ID | Item | Por que é backlog |
|---|---|---|
| **~~TEST-BL1~~** | ✅ **RESOLVIDO (#168, 04/07)** — `__tests__/unit/lib/booking-availability.test.ts`, 21 casos (sem sobreposição, status bloqueante/não-bloqueante, datas adjacentes, `excludeBookingId`, múltiplos itemIds, soft-delete). A ressalva original ("pede teste de integração") não se confirmou: bastou mockar `Prisma.TransactionClient`. |
| **~~TEST-BL2~~** | ✅ **RESOLVIDO (#168, 04/07)** — `coupons.test.ts` (21 casos) + `referral.test.ts` (22 casos). A ressalva original ("testar exige extração/refator") **não se confirmou**: mockar `@/lib/prisma` no nível do Jest resolveu, zero linha de produção alterada. |
| TEST-BL3 | `calcBookingTotal` aceita `days` não-inteiro sem validar | **Aberto** (confirmado 22/07: nenhum guard em `lib/pricing.ts`; os testes só asseguram que a *saída* é inteira). Adicionar guard muda comportamento observável — **decisão dos fundadores**, não trabalho técnico. |
| TEST-BL4 | ~~E2E de cancelamento~~ · **resta:** E2E de **reembolso** + axe dos forms de anúncio/reserva | 🟡 **Parcial** (confirmado 22/07). ✅ Cancelamento coberto: `e2e/booking-cancel-ui.spec.ts`, 6 testes (401 sem auth, `reason` obrigatório, locatário e proprietário cancelam PENDING). ⏳ Reembolso: 0 ocorrências no spec. ⏳ Axe: cobre componentes isolados (Button/Input/Select/Textarea/RatingStars/Avatar/StatCard/Skeleton/EmptyState), **não** os forms de `/itens/novo` nem de reserva. |

### 📱 Mobile — backlog

| ID | Item | Por que é backlog |
|---|---|---|
| MOB-BL1 | Remover dead-code do bloco de **caução** em `apps/mobile/app/itens/[id].tsx` (`depositAmount > 0` nunca ocorre no MVP — D2) | Limpeza optativa, não bug; revisar quando D2 for reavaliado. |
| MOB-BL2 | Fluxo **reservar+pagar / anunciar / KYC / mapa** no app | **Feature nova** — ver `planos/plano-mobile-lojas.md` (Fases 2 e 5). |
| ~~MOB-BL3~~ | ✅ **RESOLVIDO.** Dark mode ativo: `ThemeProvider`+toggle tri-state (Claro/Sistema/Escuro) em `MobileMenu`, tokens dinâmicos via `useTheme()` em toda a árvore. Migração de ~500 cores hardcoded → tokens dinâmicos em ~33 arquivos (espelhando a Fase 3 do site). | Falta apenas confirmação visual em device real (build EAS supervisionado) — não bloqueia merge, mesmo padrão de outras features mobile recentes. |

---

## 💳 Avaliação: migração de pagamentos Stripe → Mercado Pago (s34, 2026-06-22)

**⚠️ SUPERADO por [ADR-028](adr/ADR-028-reversao-stripe-connect.md) (19/08/2026):** o sócio majoritário reverteu a decisão abaixo — o PSP definitivo passou a ser **Stripe Connect**, não Mercado Pago (o Modelo B exigia que cada proprietário abrisse conta própria no MP, o que gerou forte rejeição comercial). Mercado Pago fica dormente, não removido. A menção a "Stripe Connect ~dez/2026" na linha do Modelo B abaixo também está superada — não é mais reavaliação futura, é a decisão vigente, com construção ainda não iniciada. Seção mantida como registro histórico da decisão de 28/06.

**Status:** ✅ **DECIDIDO (2026-06-28, s39): Mercado Pago — Modelo B (split/marketplace).** Escolhido pelos fundadores e **recomendado pelo parecer D4** (split/escrow afasta o enquadramento da Lei 12.865). **Nenhum código alterado ainda** — a implementação **começa quando os fundadores fornecerem as credenciais de teste do app MP** (marketplace: `Client ID`/`Client Secret`/`Access Token`/webhook). **Nada vai a produção antes do parecer FORMAL (D4).** Ver `docs/juridico/checklist-conformidade-juridica.md` e memória [[project-mercadopago-migration]].

**Por quê:** o Mercado Pago é nativo do Brasil (PIX/cartão/boleto), faz **PIX nativo com confirmação automática** (aposenta o checkout PIX manual temporário) e é **instituição de pagamento licenciada** — pode **amenizar** as questões #1/#5 do D4 (Lei 12.865 / PLD).

**Bifurcação que define tudo (decisão dos fundadores):**
- **Modelo A — gateway simples:** 1 conta MP da ShareO recebe tudo, repasse manual (como hoje). Substituição ~1:1 do Stripe. **~3–5 dias.** Mantém a questão *merchant of record* no D4. **Recomendado começar por aqui.**
- **✅ Modelo B — Marketplace/split (ESCOLHIDO):** cada dono conecta conta MP (OAuth), MP divide e a taxa de 15% vai como `marketplace_fee`. **~2–3 semanas.** Afasta o enquadramento da Lei 12.865 (parecer D4) e alinha com o plano "Stripe Connect ~dez/2026".

**⚠️ Implicação de produto (Modelo B):** cada **proprietário** precisa **conectar uma conta Mercado Pago via OAuth** para receber (inclusive PF) — onboarding novo no fluxo do locador (equivalente ao Stripe Connect). Confirmar com os fundadores se a fricção extra é aceitável.

**▶ Plano faseado** (não toca no PIX/Stripe atuais até validar; tudo em staging/dev, atrás de flag, sem pagamento real):
1. **Fundação MP atrás de flag** — `lib/mercadopago.ts` (SDK `mercadopago` v2) + env `MP_*`; schema aditivo (conta MP do locador + campos `mp*` no booking + `PaymentEventQueue`); **OAuth de onboarding do locador** (`/api/payments/mp/connect` + callback) + UI "Conectar Mercado Pago".
2. **Checkout com split + webhook** — `app/api/payments/checkout` cria preference com `marketplace_fee` (15% via `getPlatformFeeRate()`, `external_reference=bookingId`, guards CONFIRMED/dono/teto R$500/`calcSplit`); webhook MP em 2 tempos (id → `GET /v1/payments/{id}` → `approved`) → PAID/paidAt/pickupToken/comissão embaixador.
3. **Validação no sandbox** — usuários e cartões de teste do MP (passo-a-passo do blog oficial) → ciclo anúncio→split→repasse.
4. **Remoção do legado (SÓ após validar)** — remover `platformPix*` (chave pessoal do Raimundo) + checkout PIX manual; remover Stripe (`lib/stripe.ts`, checkout/webhook Stripe, refs em ambassador/referral/cron/admin).

**Achado do código (2026-06-28):** **não existem "rotinas de Stripe Connect"** — o código usa **Stripe Checkout normal** (o Connect só estava oculto na UI); o pagamento **ATIVO** no staging é o **PIX manual** (chave do Raimundo). Logo, "remover o legado" = retirar o PIX-manual-pessoal + a integração Stripe Checkout.

**Superfície técnica a trocar (modelo A):** `lib/stripe.ts`→`lib/mercadopago.ts`; `app/api/payments/checkout/route.ts` (Preference/`init_point` em vez de `checkout.sessions`); `app/api/webhooks/stripe/route.ts`→`webhooks/mercadopago` (valida `x-signature`, busca pagamento por id, mapeia por `external_reference`); `app/api/cron/reminders` (multa); schema (campos `mp*` aditivos; `StripeEventQueue`→`PaymentEventQueue`); `PayButton.tsx` + cópias (`ajuda`/`politicas`/`termos`/`admin/financeiro`); env `MP_ACCESS_TOKEN`/`MP_WEBHOOK_SECRET`; testes E2E. **CSP NÃO muda** (fluxo é redirect, igual ao Stripe hoje) — só mudaria se usar *Bricks*. Stripe fica preservado atrás de flag durante a transição.

**Gotchas:** webhook do MP é em 2 tempos (recebe id → consulta status `approved`); PIX pode ficar `pending` segundos (UI de "aguardando" — já temos o padrão); validação de assinatura diferente do Stripe; sandbox usa *test users* (não cartões de teste do Stripe).

**Ação dos fundadores (em andamento):** ✅ Modelo decidido (**B**); 🔜 **fornecer as credenciais de teste do app MP (marketplace)** — é o **bloqueador da Fase 1**; conta **PJ** da ShareO como titular. **Procedimentos operacionais detalhados:** `docs/juridico/mercadopago-procedimentos-fundadores.md`. Análise completa: memória [[project-mercadopago-migration]].

---

## 🚀 Deltas s15–s19 (2026-06-14 → 2026-06-16) — CONCLUÍDOS

> Resumo do que andou desde a auditoria s14. Tudo já mesclado em `main` e validado no staging.

| Item | Status | Evidência |
|---|---|---|
| **Deploy staging desbloqueado e AO VIVO** | ✅ 2026-06-15 | PR #17 + #18 + #19 mesclados → staging ao vivo via GH Actions (Deploy Staging por token, sem dashboard Vercel). `/seguranca` + `/.well-known/security.txt` + `/api/items` = 200. CI da main: Lint/Tests/Security ✅ |
| **Migration `ItemStatus` DELETED** | ✅ #18 | `ALTER TYPE ... ADD VALUE 'DELETED'` separado em migration própria (não pode coexistir com `UPDATE` na mesma transação PG) — desbloqueia DB novo pós-D4 |
| **E-mail transacional do app funcionando** | ✅ 2026-06-15 | Domínio `shareo.com.br` verificado no Resend (DKIM+SPF via GoDaddy) + `EMAIL_FROM=noreply@shareo.com.br` (Production) + redeploy → sandbox liberado, entrega p/ **qualquer** destinatário (antes só e-mails de teste do dono) |
| **Welcome email removido + reengajamento unificado** | ✅ PR #16 (9ffa609) | `sendWelcomeEmail`/`welcomeHtml` removidos; cron de reengajamento via novo `sendAppEmail()` = 1 ponto de integração; mock `register.test` corrigido |
| **Domínio próprio do staging** | ✅ 2026-06-15 | Staging agora é `https://staging.shareo.com.br` (A staging→76.76.21.21 na GoDaddy + SSL Vercel + `AUTH_URL`/`NEXTAUTH_URL` atualizados + redeploy). `rouge.vercel.app` segue como alias. Apex+www RESERVADOS p/ prod pós-D4 |
| **Bug NextResponse singleton (forgot-password)** | ✅ s17 | 2ª req da lambda quente retornava 200 com body vazio (Response é stream consumível 1×) → função `ok()`; anti-padrão grepado e limpo no app |
| **Categoria "Casa e Cozinha" → "Eletrodomésticos"** | ✅ s19 (064fb74) | Rename do rótulo (slug `casa-jardim` preservado) nos 2 Supabase + deploy; `CategoryIcon` resolve ícone por **slug** (não pelo nome) → renomear rótulo nunca derruba ícone |
| **Ícones PWA / apple-touch** | ✅ s19 | `scripts/generate-pwa-icons.mjs` gera 192/512/maskable-512 + apple-touch (estava 404); fonte `public/logos/pwa-icon-source.png`; `app/manifest.ts` |
| **Higiene de repo (.obsidian)** | ✅ s19 (064fb74) | `.obsidian` removido do versionamento + adicionado ao `.gitignore` |
| **Suíte E2E — bateria geral** | ✅ s17 | 255✅ / 16❌ / 19skip (290 testes, 8.6min), **0 bugs de app** — 16 falhas = rate-limit/locators obsoletos/contaminação de dados de teste; PR #15 (forgot-password + correções de spec) |

---

## 🔬 Auditoria Crítica s14 (2026-06-14) — PARA DELIBERAÇÃO COM O FUNDADOR

> 2ª auditoria multi-aspecto (`qa-shareo`, `seguranca-shareo`, `arquiteto-shareo`) sobre o commit `21ecc69`. **READ-ONLY — nenhum código alterado.** Evidência QA: `docs/auditorias/auditoria-s14-qa.txt`.
> **✅ Resultado-chave:** os 6 fixes do s13 estão tecnicamente corretos e **NENHUMA regressão funcional** foi introduzida (QA validou todos no staging: XSS escape, MIME/magic-bytes, invalidação de sessão, headers, truncamento coord, groupBy). Suíte real ~255/290 — as "65 falhas" do run foram **artefato** (propagação de `BASE_URL` no PowerShell + spec-bugs já conhecidos), não bugs do app.
> **PORÉM:** 2 fixes do s13 têm cobertura **incompleta**, e há **3 Critical novos**. Quase todos os achados foram **reverificados e CONFIRMADOS** pelo orquestrador lendo o código (a precisão do s14 foi alta — bem melhor que o s13). IDs cruzados deduplicados (⊕).
> ⚠️ NÃO corrigir sem deliberação. Novas **funcionalidades** exigem aprovação prévia do fundador.
>
> ✅ **RESOLVIDOS após deliberação (commit desta sessão):** os **3 Critical** — S14-A-04 (idempotência Stripe via `StripeEventQueue`, dedup por `event.id`), S14-A-05 (confirm de booking em `$transaction` serializável + 409 em P2034), S14-A-06 (`mark_active` via `updateMany` condicional em `pickupTokenUsedAt:null`) — **e os gaps de cobertura dos meus fixes:** lat/lng truncado (~110m) + `address` omitido em `/api/items/[id]` para não-dono/não-admin e nos pins da página SSR `/itens`; invalidação de sessão estendida a **mobile/Bearer** (`resolveUserId` + `mobile/refresh` checam `isSessionStale` via `iat`) e a **reset-password** (`invalidateUserSessions`). `tsc`+`build` verdes.
>
> ✅ **RESOLVIDOS na 2ª onda (commit desta sessão):** **S14-SEC-03** (SSRF — `lib/ssrfGuard.ts` bloqueia IP literal privado/loopback/metadata `169.254.169.254` em webhooks PJ, na criação e no disparo; DNS-rebinding domínio→IP-privado fica como follow-up por restrição de bundler do Next com `node:dns`), **S14-SEC-06** (CSV formula-injection — `escape()` do export prefixa células iniciadas por `=`/`+`/`-`/`@`/TAB/CR), **S14-M-14** (admin-role granular em `items/[id]` e `geocode-items` → `hasAdminRole(SUPERADMIN, OPERACIONAL)`; disputes mantém coarse pois os 3 roles tratam disputas), **S14-M-19** (`geocodeUserLocation` via `after()` no PATCH /me). SSRF testado por unidade (9 casos verde).
>
> **Permanecem para decisão:** GAP-M-07b (`take` SSR — baixo impacto), PlatformConfig cache (staleness×perf), `pickupToken @unique` (migration), error-envelopes + ownership-helper (refactor amplo), upload-limit drift (copy/produto), e os com dependência externa (SEC-CRIT-02 rotação Vercel, SEC-MAJ-04 deps, ARQ-A-01/M-04/M-05 produto, NextAuth GA). ~~SEC-MAJ-06+LGPD/D4~~ ✅ **RESOLVIDO** (verificado 2026-08-19, reconfirmado 2026-08-23 — ver tabela MAJOR).

### 🟠 Cobertura INCOMPLETA de fixes do s13 (corrigir o que foi marcado "resolvido")

| ID | O quê falta | Local | Status |
|---|---|---|---|
| **GAP-MIN-06b** (⊕ MAJ-S14-04 / REG-06) | Truncamento de lat/lng foi só na listagem `/api/items`. **`/api/items/[id]` (público) e a página SSR `/itens` ainda expõem coords exatas** (~10m) do dono | `app/api/items/[id]/route.ts:17`, `app/itens/page.tsx` | ✅ confirmado |
| ~~**GAP-CRIT-04b**~~ ✅ **FECHADO** (reconciliado 13/08) | Era: invalidação de sessão não cobria mobile/Bearer nem reset-password. **Verificado no código atual:** `lib/resolveUserId.ts` chama `isSessionStale` para o Bearer (usando `iat`, renovado a cada refresh) e `app/api/auth/reset-password/route.ts:82` chama `invalidateUserSessions`. A invalidação está ligada em 4 pontos: senha, e-mail, reset e mudança de role de admin. O registro é que envelheceu — o gap foi fechado sem alguém dar baixa aqui | `lib/resolveUserId.ts`, `app/api/auth/reset-password/route.ts:82` | ✅ resolvido |
| **GAP-M-07b** (⊕ REG-05) | `take:24` foi só em `/api/items/[id]/route.ts`, **não na página SSR `app/itens/[id]/page.tsx:98`** (consumidor de maior tráfego) | `app/itens/[id]/page.tsx:98` | ✅ confirmado (impacto baixo: `select` granular + MVP 3 fotos) |

### 🔴 CRITICAL novos

| ID | Achado | Local | Status |
|---|---|---|---|
| **S14-A-04** (⊕ SEC-MAJ-05) | Webhook Stripe **sem idempotência** — não consulta `StripeEventQueue`/`event.id` (existe no schema, ADR-013). Retry do Stripe reprocessa: comissão de embaixador duplicada, `paidAt`/`pickupToken` regravados, late fee em dobro, notificações duplicadas | `app/api/webhooks/stripe/route.ts:34` | ✅ confirmado (entra no `switch` direto após validar assinatura) |
| **S14-A-05** | **TOCTOU no `confirm` de booking** — conflict-check (`findFirst`) + `update` em awaits **separados, fora de `$transaction`** (o comentário linha 271 diz "dentro de uma transação" mas NÃO é). Dois confirms paralelos no mesmo item/período → **double-booking** | `app/api/bookings/[id]/route.ts:273-304` | ✅ confirmado |
| **S14-A-06** | **TOCTOU no `mark_active`** — valida `pickupToken`/`pickupTokenUsedAt` e depois faz `update` separado. Retry/duplo-clique → ativação dupla | `app/api/bookings/[id]/route.ts:233-294` | ⏳ padrão idêntico ao A-05 (alta probabilidade) |

### 🟠 MAJOR novos

| ID | Achado | Local | Status |
|---|---|---|---|
| **S14-SEC-03** | **SSRF** nos webhooks outbound de PJ — `fetch(url)` com URL configurável, sem bloquear IP privado/loopback/link-local (`169.254.169.254` metadata) | `lib/outboundWebhooks.ts:39`, `app/api/pj/webhooks/route.ts:16` | ✅ confirmado |
| **S14-SEC-06** | **CSV formula injection** na exportação financeira — `escape()` trata só `,`/`"`/`\n`, não prefixos `=`/`+`/`-`/`@`. Título de item com `=cmd\|...` executa no Excel do admin | `app/api/admin/export/route.ts:29` | ✅ confirmado |
| **S14-M-11** (⊕ ARQ-M-06 s13) | `PlatformConfig` **sem cache** — ~59 call-sites fazem `prisma.find*` por request (reafirmado com evidência); middleware ainda soma 1-2 round-trips Upstash por request protegido | `lib/platform-config.ts` | ✅ (decisão de cache: `unstable_cache`+`revalidateTag` vs staleness) |
| **S14-M-12** | Envelopes de erro JSON **inconsistentes** (`{error:"str"}` vs `{error:{code,message}}`) em ~25 rotas | crons, webhooks, admin/* | ✅ confirmado |
| **S14-M-14** (⊕ SEC-MIN-S14-08) | Dois padrões de auth admin: `requireAdminRole` (17 rotas) vs `role==="ADMIN"` (12+: disputes, items, geocode-items). Quebra segregação de função (ex.: FINANCEIRO aprova item) | `app/api/admin/items/[id]`, `disputes/[id]`, `geocode-items` | ✅ confirmado |
| **S14-M-16** | `Booking.pickupToken` **sem `@unique`** no schema — o loop `findFirst` por colisão tem race (mesmo nº no mesmo ms) | `prisma/schema.prisma` + `bookings/[id]/route.ts:263` | ⏳ a confirmar no schema |
| **S14-M-15** | Drift: `getUploadLimits` default **10 fotos** mas UI/copy diz **3** | `lib/platform-config.ts:150` vs `components/items/ItemForm.tsx:521` | ✅ confirmado |
| **S14-M-18** | `admin/geocode-items` carrega **todos os itens em memória** + loop síncrono; trava em timeout pós-escala | `app/api/admin/geocode-items/route.ts:46-87` | ✅ confirmado |
| **S14-M-19** (⊕ ARQ-Mi-08 s13) | `geocodeUserLocation` com `await` **bloqueia** `PATCH /api/users/me` (3-5s) — devia ser `after()` | `app/api/users/me/route.ts:235` | ✅ confirmado |
| **S14-M-13** | Owner-guard (`ownerId!==session.user.id→403`) duplicado em 30+ rotas, sem helper | múltiplas | ✅ (refactor; risco se regra mudar) |
| **S14-M-17** (⊕ REG-04) | Os **3 specs E2E novos** repetem o anti-padrão `BASE_URL ?? localhost` que o s13 flagou como raiz das falsas-falhas; + a env não propaga no PowerShell (`$env:`) | `e2e/{session-invalidation,audit-gaps-s13,price-suggestion}.spec.ts` | ✅ confirmado (é a convenção atual de TODOS os specs — fix = helper) |

### 🟡 MINOR / spec-bugs (backlog)

| ID | Achado |
|---|---|
| **S14-MIN-07** | `/api/health` vaza `e.message` interno (hostname/driver) em falha — recon de infra |
| **S14-MIN-11** | `consentIp` em texto claro (`User`/`FounderLead`/`ContractAcceptance`) — minimização LGPD |
| **S14-MIN-10** | `pnpm audit`: High em `rollup`/`esbuild` (build), Moderate `postcss`, Low `cookie` — = SEC-MAJ-04 (deferido) |
| **S14-MIN-12** | Refresh token mobile sem rotação/detecção de reuso (sem `jti`/blocklist) |
| **S14-MIN-Mi13** | `hooks/useAuth.ts` código morto (sem call-site) — como o `useChat` removido no s13 |
| **S14-MIN-Mi14** | Promoção/rebaixamento de admin não revoga sessões antigas (role antiga persiste no JWT) |
| **S14-MIN-Mi15** | `COEP` não adicionado junto do `COOP` (COOP menos efetivo sem o par) — decidir/ADR |
| **S14-MIN-Mi17** | `matcher` do middleware ainda exclui `icones/` (pasta removida no s13) — drift cosmético |
| **S14-QA-bugs** | 4 spec-bugs (não-app): smoke #21 `mark_active` sem token; `auth` login 2 locators (senha ambígua + logout `role=menuitem`); `email-verification` não aceita 400 ALREADY_VERIFIED. (Confirmam QA-03/04 do s13.) |

### Notas do orquestrador (s14)

- **Reverificados e CONFIRMADOS lendo o código:** S14-A-04, S14-A-05, GAP-MIN-06b, GAP-CRIT-04b (resolveUserId + reset-password), GAP-M-07b, S14-SEC-03, S14-SEC-06, S14-M-14/15/18/19. ⏳ não reverificados a fundo: S14-A-06 (padrão idêntico ao A-05), S14-M-16 (schema).
- **Ao contrário do s13, o s14 teve baixa taxa de falso positivo** — os agentes leram o código de perto.
- **Prioridade sugerida (todos sem dependência externa, mas aguardam SUA deliberação):** (1) os 3 Critical — Stripe idempotência (`StripeEventQueue` já existe) e os 2 TOCTOU (envolver em `$transaction`/`updateMany` discriminante); (2) completar meus fixes do s13 — lat/lng em `/[id]`+SSR, sessão em mobile/reset-password; (3) S14-SEC-03 (SSRF) e S14-SEC-06 (CSV) — fixes pequenos e de alto valor.
- **D4 jurídico** segue bloqueando produção; os 3 Critical + GAP-CRIT-04b deveriam entrar antes de qualquer go-live.

---

## 🔬 Auditoria Crítica s13 (2026-06-13) — PARA DELIBERAÇÃO COM O FUNDADOR

> Auditoria multi-aspecto delegada a 3 subagentes em paralelo (`qa-shareo`, `seguranca-shareo`, `arquiteto-shareo`) sobre o commit `14c51f2`.
> **READ-ONLY — nenhum código/spec/config foi alterado.** Todos os itens aguardam deliberação antes de qualquer ação. NÃO re-reporta QA-01/QA-14 (resolvidos na s12).
> **Run E2E:** 248✅ / 9❌ / 19skip (7m30s, chromium serial). Evidência bruta: `docs/auditorias/auditoria-critica-2026-06-13-qa.txt`.
> **Postura de segurança:** base SÓLIDA — guards `ownerId === session.user.id → 403` consistentes em 30+ rotas (tese do ADR-009 validada; nenhum IDOR explorável em GET/PATCH de bookings/items/users). **Arquitetura:** nota **A−** (disciplina de `after()`, `PlatformConfig` e CSP-com-nonce confirmadas).
> IDs: `SEC-*` segurança · `ARQ-*` arquitetura · `QA-*` qa/e2e. ⊕ = item deduplicado (mesmo achado por +1 eixo).
> ⚠️ Achados são reportados como os subagentes os classificaram. O orquestrador NÃO os reverificou linha-a-linha — ver "Notas do orquestrador" ao final para confiança e ordem sugerida de verificação.

### ✅ Resolvidos na auditoria s13 (código, sem dependência externa)

> Decisão do fundador: "resolva os que não têm dependência externa". Corrigidos e validados (`tsc` + `lint` + `build` ✅):
> - **SEC-MIN-05** (stored XSS) — novo `lib/jsonLd.ts` escapa `<`/`>`/`&`/U+2028-9; aplicado em `app/itens/[id]/page.tsx` (product+breadcrumb) e `app/layout.tsx` (org). Testado: um título com `</script>` é neutralizado (o `<` vira escape unicode), sem quebrar o bloco ld+json; round-trip JSON OK.
> - **SEC-CRIT-01** — crons fail-closed (`if (!secret || ...)`) nas 6 rotas vulneráveis. (geocode-items e middleware já eram fail-closed.)
> - **SEC-CRIT-05 / SEC-MAJ-02 / SEC-MAJ-03** — validação MIME + magic-bytes nos 3 uploads via novo `lib/imageUpload.ts` (booking photos, `/api/upload`, id-verification). `/api/upload` deixou de aceitar `application/octet-stream`.
> - **SEC-CRIT-06** — checagem de prefixo `${id}/` antes do delete no Storage.
> - **SEC-MAJ-09** — `pickupToken` via `crypto.randomInt` (webhook Stripe + bookings PIX).
> - **SEC-MIN-06** — lat/lng truncados a ~110m (3 casas) no GET público `/api/items`. **Caveat p/ deliberar:** a página web `/itens` é SSR e ainda passa coords ao mapa client — avaliar truncar lá também e o nível de precisão (3 vs 2 casas).
> - **ARQ-A-02** — `viewCount` agora em `after()`.
> - **SEC-CRIT-04** (invalidação de sessão pós-senha) — **Caminho B, sem migration**: claim `loginAt` fixado no login + epoch no Redis (`invalidateUserSessions`/`isSessionStale`) checado no middleware; disparado na troca de **senha e de e-mail**; `maxAge` explícito de 30d (alinha o TTL da blocklist — corrige de brinde o gap em que blocks de admin expiravam em 1d com token de 30d). Depende de Upstash ativo (fail-open se ausente).
> - **SEC-MIN-01** (headers) — `Cross-Origin-Opener-Policy: same-origin` no next.config + `frame-ancestors 'self'` na CSP do middleware (COEP omitido de propósito — quebraria Mapbox/GA/Supabase).
> - **ARQ-Mi-03 / Mi-04 / Mi-12** (código morto) — removidos: `export const config bodyParser` (inerte no App Router), `app/(admin)/layout.tsx` (grupo órfão sem páginas), hook `useChat` (sem call site).
> - **SEC-MIN-11** (seed) — senha removida do `console.log`; o guard `NODE_ENV==="production"` que o agente disse faltar **já existia** (`prisma/seed.ts:157`).
> - **ARQ-M-10** (perf) — detalhe do item: 1 `groupBy` por status em vez de 1 aggregate + 2 counts (3 queries → 1).
> - **ARQ-M-07** (perf) — `GET /api/items/[id]` com `take:24` nas imagens (bound de payload; shape preservado).
> - **ARQ-Mi-11** — `lib/rateLimit.ts` documentado como **Node-only** (não reimplementei o sliding-window via REST — alto risco de errar o rate limiting; doc resolve a regressão silenciosa).
> - **QA-GAP-01..10** (cobertura E2E) — 3 specs novos: `session-invalidation` (fluxo completo, **guarda o SEC-CRIT-04** — sessão antiga → 401 SESSION_EXPIRED), `price-suggestion` e `audit-gaps-s13` (guards/validação de cupom, embaixador, extensão, disputa, fotos de booking, auth mobile, founder leads, notificação individual). **14/14 verde no staging.** Happy-paths que exigem booking em estado específico ficam anotados p/ fixture dedicado.
>
> **Refutados/não-acionáveis na reverificação (além do SEC-CRIT-03):** **SEC-MIN-10** (disputes) — pela matriz de roles do CLAUDE.md, FINANCEIRO + OPERACIONAL + SUPERADMIN **todos** tratam disputas; o check `role === "ADMIN"` já cobre exatamente esse conjunto — apertar excluiria papéis válidos.
>
> **Permanecem para deliberação (dependência ou decisão):** **SEC-CRIT-02** (rotação do secret no Vercel — sua ação), SEC-MAJ-04 (upgrade de deps), SEC-MAJ-06 + LGPD (D4 jurídico), ARQ-A-01/M-04/M-05 (decisão de produto: ISR/SSG, slugs, `/categoria`), **ARQ-M-06** (estratégia de cache — staleness vs. perf), **ARQ-M-03** (SessionProvider — recomendação do agente está ERRADA: o header global usa `signOut`/`useSession`, então o provider PRECISA ser global; a versão correta exigiria reescrever `signOut` — refactor grande por ganho marginal de LCP), NextAuth GA.

### 🔴 CRITICAL — deliberar primeiro

| ID | Achado | Local | Risco |
|---|---|---|---|
| **SEC-CRIT-01** ✅verificado | Cron routes "abrem por padrão" se `CRON_SECRET` vazio: `if (secret && auth !== Bearer secret)` curto-circuita p/ false quando secret undefined/"" → rota fica **pública**. CONFIRMADO em `reminders/route.ts:36` | 6 rotas `app/api/cron/*` | Disparar cobranças Stripe late fee, cancelar reservas, marcar payout PROCESSING, e-mail em massa. **Correção ao agente:** `middleware.ts:99` na verdade FALHA-FECHADO (bypass só com secret presente) — NÃO é vulnerável. 2 crons (ambassador-decay, reengagement) já usam a forma estrita |
| **SEC-CRIT-02** 🔨 literal removido 13/08, **falta ROTACIONAR** | `CRON_SECRET` real de staging versionado em texto claro (valor redigido deste doc) | era: `CLAUDE.md`, `docs/STATUS.md`, `e2e/cron.spec.ts`, `.github/workflows/main.yml`, `e2e/financeiro.spec.ts` | **Severidade estava subestimada: o repo é PÚBLICO** — não é "qualquer um com acesso ao repo", é qualquer pessoa na internet. Confirmado 13/08 que os endpoints de cron do staging respondem publicamente (401 com segredo errado). Os crons enviam e-mail real via Resend para gente que está no banco (inclui leads da campanha), criam late fee no Stripe e cancelam reservas. **Rotacionar em staging TAMBÉM** — não só em produção: o valor está no histórico do git para sempre e remover o literal não o invalida |
| ~~**SEC-CRIT-03**~~ ❌**REFUTADO** | Falso positivo. O agente alegou "login web sem rate limit / `loginIp`/`loginEmail` código morto", mas há um wrapper que intercepta o POST do NextAuth e aplica rate limit em `/callback/credentials` (**10/min por IP + 5/5min por e-mail**). O agente grepou só `lib/auth.ts` e não viu o wrapper | `app/api/auth/[...nextauth]/route.ts:14-40` | **Sem risco — login web ESTÁ protegido contra brute force.** Removido dos pendentes |
| ✅ **SEC-CRIT-04 RESOLVIDO** | Invalidação de sessão pós-troca de senha/e-mail implementada (Caminho B, sem migration): claim `loginAt` + epoch no Redis checado no middleware. (Antes: não existia — o `STATUS.md:49` afirmava o contrário.) | `lib/redis-admin-blocklist.ts`, `lib/auth.ts`, `middleware.ts`, `app/api/user/{password,email}/route.ts` | Token roubado deixa de valer ao trocar a senha. Fail-open se Upstash ausente |
| **SEC-CRIT-05** ✅verificado | Upload de fotos de booking: guard só checa participante, **zero validação de `status`** e **nenhum check de MIME/magic-bytes** (nem content-type — só tamanho) | `app/api/bookings/[id]/photos/route.ts:48-117` | Subir fotos CHECKOUT fora de fase / após COMPLETED → envenenar histórico p/ fraude em disputa. Exige ser participante do booking (severidade real mais p/ Major que Critical) |
| ~~**SEC-CRIT-06**~~ ⬇️**rebaixado p/ Minor** | Exclusão de imagem sem validar prefixo do path. **Verificado:** o guard de propriedade (`ownerId !== session.user.id → 403`, linha 202) já protege e `image.url` é server-controlled → apenas defesa-em-profundidade, não explorável | `app/api/items/[id]/images/route.ts:202,211` | Baixo |
| **ARQ-A-01** | **Estratégia de render divergiu do ADR-007**: `/itens`, `/itens/[id]`, `/loja/[slug]`, `/perfil/[id]`, `/sobre` são SSR puro (`auth()` no topo força dynamic); zero ISR/SSG; `/categoria/[slug]` prometida não existe | múltiplas páginas + `app/sitemap.ts` | SEO orgânico capado + custo lambda linear ao crawl + LCP mobile pior em escala. **Decisão estratégica sua** |
| **ARQ-A-02** | Regressão de `after()`: `prisma.item.update({viewCount:+1}).catch()` solto após o return da Server Component | `app/itens/[id]/page.tsx:164` | viewCount subdimensionado em prod (afeta sort "Mais alugados" e o futuro `generateStaticParams`); silencioso. Classe de bug que o CLAUDE.md alerta |
| **ARQ-A-03** ⊕ **QA-BUG-06** | `BASE_URL` não propaga p/ 13 specs no run completo (`?? 'http://localhost:3000'`) → ~14 falhas mascaradas/falsos-positivos; sumário reporta MENOS falhas do que há | `playwright.staging.config.ts` + 13 specs | Ruído mascara bugs reais; gate de release vira permissivo por hábito ("é só o BASE_URL de novo") |

### 🟠 MAJOR

| ID | Achado | Local | Risco/Nota |
|---|---|---|---|
| **SEC-MAJ-02** | `/api/upload` (genérico, usado por `/itens/novo`) aceita `application/octet-stream` sem magic-bytes | `app/api/upload/route.ts:24-26` | Payload arbitrário em bucket público com URL `*.supabase.co` → phishing/malware. `items/[id]/images` já valida certo — alinhar |
| **SEC-MAJ-03** | Upload de doc de identidade (CPF/RG/selfie) sem whitelist MIME nem magic-bytes; contentType vem do cliente | `app/api/users/me/id-verification/route.ts:55-63` | XSS no painel admin via signed URL (SVG/HTML como "documento"). Comprometimento de admin = jackpot |
| **SEC-MAJ-04** | `pnpm audit --prod`: 2 High (`rollup` path-traversal, `esbuild` RCE), 2 Moderate (`postcss`, `uuid`), 1 Low (`cookie`<0.7 via `@supabase/ssr` — path de sessão) | `pnpm-lock.yaml` | rollup/esbuild são build-time; `cookie` e `postcss` runtime. Atualizar `@sentry/nextjs` + `@supabase/ssr` |
| **SEC-MAJ-05** ⊕ **ARQ-M-02** | NextAuth **v5.0.0-beta.31** em produção, sem ADR de risco nem plano de migração GA (changelog v5 já trocou cookies/callbacks) | `package.json`, `lib/auth.ts` | Auth é caminho crítico; beta sem garantia de patch de segurança. Criar ADR-023 (versão alvo, gatilho, soak) |
| ~~**SEC-MAJ-06** ⚠️LGPD~~ ✅ **RESOLVIDO** (verificado 2026-08-19, reconfirmado 2026-08-23) | ~~DELETE de conta anonimiza nome/e-mail/CPF mas **não** `borrowerNote/ownerNote/Review.comment/Message.content/OwnerPaymentAccount(PIX)/IDVerification.idDocumentUrl+selfie`~~ — o DELETE atual faz scrub atômico de TODOS esses campos: `Review.comment→null`, `Message.content→"[mensagem removida]"+deletedAt`, `borrowerNote/ownerNote→null`, `pixKey→"REMOVIDO"`, `idDocumentUrl/idSelfieUrl→null`, arquivos `id-docs` removidos via `after()`. | `app/api/users/me/route.ts` | ✅ Sem violação de LGPD art.18. Só ficam retidos valores/datas de transações concluídas (CTN art.173, 5 anos, com aviso ao titular — permitido pelo art.18 §3º). Baixa dada conforme decisão do fundador (avaliação multi-perfil 2026-08). |
| **SEC-MAJ-07** | Bypass global de rate limit: `SKIP_RATE_LIMIT=true` e `E2E_SECRET`+header `x-e2e-token` desligam TUDO; workflows setam `SKIP_RATE_LIMIT=true` | `lib/rateLimit.ts:94-100`, `.github/workflows/*` | Se a env vazar p/ Vercel prod, rate limits caem silenciosamente. Condicionar a `NODE_ENV !== production` |
| **SEC-MAJ-09** | `pickupToken` (6 dígitos, controle anti-fraude da retirada) gerado com `Math.random()` (PRNG não-cripto) | `app/api/webhooks/stripe/route.ts:99-105`, `app/api/bookings/[id]/route.ts:262-268` | Previsão sequencial → "ativar" reserva alheia. Trocar por `crypto.randomInt(100000,1000000)` |
| **QA-BUG-04** ⚠️app | `POST /api/auth/resend-verification` retorna **400 ALREADY_VERIFIED** quando e-mail já verificado — deveria ser **409** (RFC 7231 estado de recurso). Spec também tem assert invertido | `app/api/auth/resend-verification/route.ts:37-41` | Client que trata 400 como erro de input mostra mensagem genérica. **Único achado de semântica de API app-side novo do QA** |
| **ARQ-M-01** | Filtro de distância carrega **TODOS os itens AVAILABLE em memória** (Haversine em JS; sem PostGIS — `geom` comentado no schema) | `app/itens/page.tsx:122-127` | O(n) RAM+CPU; 27 itens OK, 50k explode (timeout mobile). LCP da rota de maior conversão. Resolver hoje = horas; depois = reescrita |
| **ARQ-M-03** | `SessionProvider` (client) envolve a árvore inteira no root layout — hidrata até `/sobre` | `components/layout/Providers.tsx`, `app/layout.tsx:95` | Bundle inflado em páginas públicas; degrada LCP. Mover p/ layout de rotas autenticadas ou passar session via prop aos 3 leafs |
| **ARQ-M-04 / M-05** | `Item.slug` e `Category.slug` existem no schema (índice + "SEO URL") mas URLs usam `id` (cuid); `/categoria/[slug]` (ADR-007) não existe | `schema.prisma:311,331`, `app/sitemap.ts` | SEO long-tail enfraquecido; habilitar slugs depois = 301 em massa (perda temporária de PageRank). Decidir antes de prod |
| **ARQ-M-06** | `getPlatformFeeRate()` e as 10+ helpers de `PlatformConfig` fazem `findUnique` **a cada request** — zero `unstable_cache`/`React.cache` | `lib/platform-config.ts` | Round-trip ao Postgres por request no caminho crítico (item/booking/webhook) p/ valor que muda ~1×/mês |
| **ARQ-M-07** | `GET /api/items/[id]` usa `include` amplo + `images` sem `take` (carrega todas as fotos) | `app/api/items/[id]/route.ts:17-40` | Payload 50–200KB; cresce com upload. Server Component equivalente já usa `select` granular |
| **ARQ-M-08** | Paginação dupla `useJsFilter ? slice : raw` frágil a refactor (invariante não-óbvio) | `app/itens/page.tsx:184-187` | Bug latente (count errado/itens duplicados). Extrair p/ função pura testada |
| **QA-BUG-01** | Cobertura: smoke #21 não passa `pickupToken` no `mark_active` → fluxo de **avaliação pós-locação fica sem cobertura real** (app correto ao exigir token) | `e2e/security2.spec.ts:224` | Regressão em reviews passaria invisível. Spec deve buscar token como `review.spec.ts:44-48` |

### 🟡 MINOR (backlog — baixo risco residual)

| ID | Achado | Local |
|---|---|---|
| **SEC-MIN-05** ❗⬆️**CONFIRMADO — SOBE p/ MAJOR/CRITICAL** | **Stored XSS público confirmado.** `item.title`/`description`/`owner.name` entram em `productJsonLd`+`breadcrumbJsonLd` via `dangerouslySetInnerHTML`+`JSON.stringify` (não escapa `</script>`) E a validação do título é **só length** (`item.ts:10-11`, sem stripHtml/sanitize). Título `</script><script>…` (≤120 ch) executa em **todo visitante** da página do item | `app/itens/[id]/page.tsx:208-254` + `lib/validations/item.ts:10-11` |
| **SEC-MIN-06** ✅confirmado (considerar MAJOR) | `GET /api/items` (público) retorna `latitude/longitude` **exatos** (linhas 63-64) — vaza endereço do dono apesar da UI mostrar só bairro. Privacidade/segurança física + LGPD | `app/api/items/route.ts:63-64` |
| **SEC-MIN-01** | Faltam headers `Cross-Origin-*` e CSP `frame-ancestors 'none'` | `next.config.ts:7-17`, `middleware.ts:35-61` |
| **SEC-MIN-02** | `/api/auth/verify-email` é GET com side-effect (CSRF-friendly; mitigado por token único 32B) | `app/api/auth/verify-email/route.ts` |
| **SEC-MIN-09** | Mobile JWT sem rotação de refresh, sem blocklist, sem `jti` — device roubado válido por 30d | `app/api/auth/mobile/login/route.ts`, `refresh/route.ts` |
| **SEC-MIN-10** | `/api/admin/disputes/[id]` checa só `role==="ADMIN"`, não `requireAdminRole` granular | `app/api/admin/disputes/[id]/route.ts:17` |
| **SEC-MIN-11** | `prisma/seed.ts` loga senha admin em texto claro; sem guard `NODE_ENV!=="production"` | `prisma/seed.ts:163,182` |
| **SEC-MIN-03/04/07/08** | IP em claro no contract (export LGPD não inclui); `stripHtml` simplista no chat; `/founders/leads` sem unsubscribe; `viewCount` sem rate-limit | (ver relatório) |
| **LGPD-01/02/03** | `consentVersion` hardcoded sem catálogo/re-consentimento; UUID retido no Sentry; sem `ConsentLog` (histórico de consentimento) | múltiplos |
| **ARQ-Mi-01** | 6+ primitivos UI com `"use client"` desnecessário (`Button`, `ShareOLogo` sem hooks) — bundle inflado | `components/ui/*` |
| **ARQ-Mi-08** | `geocodeUserLocation` é `await` (não `after()`) no `PATCH /me` → form espera Mapbox 3–5s | `app/api/users/me/route.ts:228,235` |
| **ARQ-Mi-10** | Detalhe do item faz 3 `booking.count` que poderiam ser 1 `groupBy` | `app/itens/[id]/page.tsx:118-139` |
| **ARQ-Mi-11** | `lib/rateLimit.ts` usa SDK `@upstash/redis` (Node-only) — quebra se rota virar Edge | `lib/rateLimit.ts:10` |
| **ARQ-Mi-02/03/04/05/06/07/09/12** | 2 fontes p/ APP_URL; `bodyParser:false` morto no webhook; `app/(admin)/` órfão; `@tanstack/react-query` no bundle web sem caller; polling client em 3 componentes booking; duplicata `"natal/rn"` em CITY_COORDS; TODOs sem owner; hook `useChat` legado morto | (ver relatório) |

### 📊 Gaps de cobertura E2E (fluxos implementados, zero teste automatizado)

| ID | Fluxo sem cobertura | Local | Risco |
|---|---|---|---|
| **QA-GAP-01** | **Cupons** (aplicar válido/inválido/expirado/race `COUPON_RACE`) | `lib/coupons.ts`, `POST /api/bookings` | Regressão em desconto/concorrência invisível |
| **QA-GAP-02** | **Embaixadores** (consent, painel `/perfil/embaixador`, tier, link, payout bloqueado) | `app/perfil/embaixador/`, `/api/ambassador/consent` | Painel com dado errado passa ao go-live |
| **QA-GAP-03** | **Extensão de prazo** bilateral (solicitar/aprovar/recusar + banner) | `app/api/bookings/[id]/extend/route.ts` | Fluxo de gestão de locação ativa sem validação |
| **QA-GAP-04** | **Disputa** ponta-a-ponta (abrir → admin vê → resolve) — só webhook coberto | `bookings/[id]/dispute`, `admin/disputes/[id]` | Mecanismo central de confiança sem E2E |
| **QA-GAP-05** | **JWT refresh / sessão 15min** (expira durante ação, refresh transparente) | `lib/auth.ts` | Usuário 15min+ no checkout pode ter erro silencioso → abandono |
| **QA-GAP-07** | **Fotos de devolução** (upload pré/pós-locação) | `bookings/[id]/photos` | Crítico p/ disputa; regressão invisível |
| **QA-GAP-06/08/09/10** | Sugestão de preço no form; auth mobile; founder leads; `PATCH /notifications/[id]/read` (badge do sino) | (ver relatório) | Menor |

### Notas do orquestrador (dedup, confiança, próximos passos)

- **Deduplicação aplicada:** NextAuth beta = SEC-MAJ-05 ⊕ ARQ-M-02 (1 item). BASE_URL = ARQ-A-03 ⊕ QA-BUG-06 (1 item) e já era conhecido (QA-02..13/24/25 da s11). Locators de auth do QA (**QA-BUG-02 logout**, **QA-BUG-03 callbackUrl**) **confirmam** os já-catalogados QA-03/QA-04 (bug no spec, app OK) — QA-BUG-03 adiciona nota a11y: `aria-label="Mostrar senha"` do toggle gera ambiguidade semântica. **QA-BUG-05** (admin 429) = QA-23 já catalogado.
- **O que é genuinamente novo e app-side (não infra de teste):** toda a coluna SEC-* (segurança), todo ARQ-* exceto A-03, e **QA-BUG-04** (400 vs 409). O resto dos "bugs" do QA são confirmações de itens de infra de teste já conhecidos — o valor do QA aqui foi **mapear os 10 gaps de cobertura** acima.
- **Verificações já feitas pelo orquestrador (read-only, 2026-06-13):**
  - ✅ **SEC-CRIT-01 CONFIRMADO** — `reminders/route.ts:36` falha-aberto se `CRON_SECRET` vazio. (Mas `middleware.ts:99` falha-FECHADO — corrigido na tabela.)
  - ✅ **SEC-CRIT-02 CONFIRMADO** — `CRON_SECRET` de staging estava em texto claro no CLAUDE.md (valor redigido; literal removido do repo em 13/08, rotação ainda pendente).
  - ❌ **SEC-CRIT-03 REFUTADO** — login web tem rate limit (wrapper `[...nextauth]/route.ts`). Era falso positivo.
  - ✅ **SEC-CRIT-04 CONFIRMADO** — `grep passwordChangedAt` = 0 ocorrências ⇒ invalidação de sessão pós-senha realmente não existe (diverge do STATUS.md:49).
  - ✅ **SEC-CRIT-05 CONFIRMADO** — sem status nem MIME check (só participante + tamanho).
  - ⬇️ **SEC-CRIT-06 REBAIXADO p/ Minor** — guard de propriedade já protege; só defesa-em-profundidade.
  - ❗ **SEC-MIN-05 CONFIRMADO e SOBE p/ MAJOR/CRITICAL** — stored XSS público REAL: título não sanitizado (só length) flui p/ JSON-LD via `dangerouslySetInnerHTML`. **Provavelmente o achado mais sério da auditoria** e estava como "Minor".
  - ✅ **SEC-MIN-06 CONFIRMADO** — lat/lng exatos no GET público; considerar MAJOR (privacidade/segurança física + LGPD).
  - ⏳ **Ainda NÃO reverificados (hipóteses até confirmar):** SEC-MAJ-02/03/04/07/09, QA-BUG-04 e os ARQ-* além de A-01/A-02/A-03. O caso SEC-CRIT-03 (refutado) mostra que os subagentes erram por grep estreito — **não tratar severidade não-verificada como fato**.
- **Estratégicas (decisão sua, não "bug"):** ARQ-A-01 (ADR-007 ISR/SSG), ARQ-M-04/05 (slugs e `/categoria`), SEC-MAJ-05⊕ARQ-M-02 (NextAuth beta).
- **Bloqueador D4:** ~~SEC-MAJ-06~~ (✅ resolvido, verificado 2026-08-19) + LGPD-01/03 são exatamente o que o jurídico vai cobrar — antecipar no dossiê da consulta.
- **Nada foi corrigido.** Aguardando sua deliberação sobre o que vira P0/P1/P2 e o que é aceito como risco.

---

## ✅ Concluídos (confirmados no código)

| Item | Evidência no código |
|---|---|
| `coverageThreshold` 70% nos módulos críticos | `jest.config.ts:50` |
| Testes unitários: `bookings`, `pricing`, `crypto`, `auth`, `rateLimit`, `middleware`, `haversine`, `co2`, `format`, `geo` | `__tests__/unit/` |
| Testes de integração: `bookings/patch`, `bookings/reviews`, `auth/register`, `conversations/messages`, `items/get/post/patch` | `__tests__/integration/` |
| Testes E2E: `auth`, `booking-flow`, `navigation`, `search-filter`, `admin`, `chat`, `favorites`, `responsive`, `error-pages`, `anuncio`, `review` | `e2e/` |
| Páginas 404 e 500 com design ShareO | `app/not-found.tsx`, `app/error.tsx` |
| Empty states em todas as páginas (inline com ícone + mensagem + CTA) | `/itens`, `/reservas`, `/mensagens`, `MyItemsGrid` |
| Política de cancelamento (lógica + exibição na UI) | `lib/cancellationPolicy.ts`, `app/itens/[id]/page.tsx` |
| Calendário de disponibilidade na página do item | `components/items/AvailabilityCalendar` + `app/itens/[id]/page.tsx:331` |
| Código da reserva + tela "Aguardando Confirmação" com countdown | `app/reservas/[id]/aguardando/`, `app/reservas/sucesso/` |
| Chips de filtros ativos com X para remover | `app/itens/_ActiveFilterChips.tsx` |
| `sitemap.ts` e `robots.ts` | `app/sitemap.ts`, `app/robots.ts` |
| Recuperação de senha | `app/(auth)/esqueci-senha/` |
| Exclusão de conta (LGPD) | `app/perfil/seguranca/` |
| Área de perfil completa (7 sub-páginas) | `app/perfil/*` |
| Filtro bottom sheet (mobile) | `components/items/FilterBottomSheet.tsx` |
| Pull to refresh (mobile) | `components/items/PullToRefresh.tsx` |
| CI/CD GitHub Actions | `.github/workflows/ci.yml` |
| Sentry configurado | `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts` |
| Rate limiting in-memory | `lib/rateLimit.ts` |
| Nav reestruturada (Início/Explorar/Anunciar dropdowns + MobileMenu expansível) | `components/layout/` |
| Taxa de resposta do proprietário + contagem de locações na página do item | `app/itens/[id]/page.tsx:109–129, 531–549` |
| Breadcrumb visual + JSON-LD na página do item | `app/itens/[id]/page.tsx:172, 257` |
| Seção "Itens similares" na página do item | `app/itens/[id]/page.tsx:132, 609` |
| Timeout automático de reserva (PENDING → cancelado em 12h via cron) | `app/api/cron/expire-bookings/route.ts` |
| E-mails de reengajamento pós-aluguel (1d, 7d, 30d) | `app/api/cron/reengagement/route.ts` |
| Extensão de prazo — API completa (locatário solicita / proprietário aprova ou recusa) | `app/api/bookings/[id]/extend/route.ts` |
| Abertura de disputa com motivo em texto | `_BookingActions.tsx` — botão "Abrir disputa" + textarea |

---

## QA E2E — Delta Sessão 11 (2026-06-13)

> Sessão 11: regeneração de fixtures + rerrodada completa da suíte staging.  
> Resultado: **224 passou / 30 falhou / 19 skip / 3 flaky** (276 testes, 8m40s, chromium, serial).  
> Baseline sessão 10: 227 passou / 28 falhou / 19 skip / 2 flaky.  
> Nenhum código de produção foi alterado nesta sessão (confirmado via `git diff --name-only`).  
>  
> **Causa raiz dual identificada:** (1) Sessões fixture expiradas — endereçado: fixtures locatário/proprietário/admin regenerados 2026-06-13 08:11. (2) `BASE_URL` não definido ao rodar `playwright test --config=playwright.staging.config.ts` — 13 specs usam `process.env.BASE_URL ?? 'http://localhost:3000'` e fazem requests API para localhost em vez do staging. Esta é causa persistente independente de fixtures.  
>  
> **Novo achado revelado pós-fixture:** QA-23 (admin-usuarios rate limit 429), QA-24 (smoke #19/#30 BASE_URL), QA-25 (auth seletores imprecisos) — ver seção P2 abaixo.

## QA E2E — Achados Sessão 10 (2026-06-13)

> Identificados durante execução E2E completa: suíte local (4 projetos, 45 specs) + suíte staging (276 testes, 1 worker).  
> Nenhum código de produção foi alterado nesta sessão.

### P1 — Necessários antes do MVP público

| # | Spec / Rota | Achado | Bug report resumido |
|---|---|---|---|
| QA-01 | `e2e-a11y-plan.spec.ts` / `/` e outras páginas públicas | **[PERSISTE — BUG FUNCIONAL]** 3 violações WCAG AA de contraste (serious) detectadas pelo axe-core em staging. Seletores: `.text-white\/50`, `.mt-5` (2 ocorrências). Reproduzível em 2/2 tentativas mesmo com fixture válido. Delta s11: falha confirmada novamente com mensagem idêntica. | TÍTULO: [Homepage/páginas públicas] — 3 violações WCAG AA color-contrast (serious) em staging — `.text-white\/50`, `.mt-5` · CRITICIDADE: Critical · AMBIENTE: https://shareo-rouge.vercel.app · PASSOS: 1. Acessar `/` ou páginas públicas · OBSERVADO: axe-core reporta `.text-white\/50` e 2× `.mt-5` com contraste insuficiente · ESPERADO: contraste mínimo 4,5:1 (texto normal) conforme WCAG 1.4.3 AA · EVIDÊNCIA: `e2e/e2e-a11y-plan.spec.ts:213` |
| QA-02 | `security5.spec.ts` / `PATCH /api/users/me` | **[PERSISTE — BASE_URL ausente]** Causa real: `security5.spec.ts` usa `BASE = process.env.BASE_URL ?? 'http://localhost:3000'`. Ao rodar staging sem `BASE_URL`, os requests API vão para localhost:3000. Fixture foi regenerado (não é mais sessão expirada), mas o spec continua falhando pela mesma razão sistêmica. Delta s11: a mesma falha (smoke #30, #31 também) confirmada em `security5.spec.ts:191, :215, :305`. | CORREÇÃO: passar `BASE_URL=https://shareo-rouge.vercel.app` no comando de staging ou definir em `playwright.staging.config.ts` via `process.env.BASE_URL`. |
| QA-03 | `auth.spec.ts` / `/dashboard` logout | **[PERSISTE — BUG NO SPEC]** Com fixture válido a sessão carrega corretamente (dashboard renderiza "Olá, Joana!"). O locator `getByRole('button', {name: /perfil|conta|avatar/i})` não encontra o botão real "Menu do usuário — Joana" (texto diferente do esperado). O dropdown não abre, portanto o botão "Sair" não aparece. Não é problema do app — é locator impreciso no spec. Delta s11: confirmado, mesmo erro. | CORREÇÃO: atualizar spec para `getByRole('button', {name: /menu do usuário|Joana/i})` ou usar `button[aria-label*="Menu"]`. |
| QA-04 | `auth.spec.ts` / `/login?callbackUrl=%2Fdashboard` | **[PERSISTE — BUG NO SPEC]** `getByLabel(/senha/i)` resolve para 2 elementos: input de senha + botão "Mostrar senha". Strict mode violation. Não é falha do app. Delta s11: confirmado, `locator.fill Error: strict mode violation`. | CORREÇÃO: usar `page.locator('#password').fill(...)` (ID exclusivo). |
| QA-05 | `security4.spec.ts` / `POST /api/payments/checkout` | **[PERSISTE — BASE_URL ausente + Stripe não configurado]** 4 sub-testes falham: smoke #28 `security4.spec.ts:56, :97, :136, :217`. Com fixture válido os requests chegam ao localhost:3000 (sem servidor) via `BASE = process.env.BASE_URL`. Adicionalmente, mesmo que `BASE_URL` fosse corrigido, Stripe em staging pode não ter `STRIPE_SECRET_KEY` configurado. Delta s11: 4 falhas confirmadas. | CORREÇÃO prioritária: adicionar `BASE_URL` ao comando/config de staging. Secundária: verificar `STRIPE_SECRET_KEY` no Vercel env. |
| QA-06 | `security2.spec.ts:183` / review flow smoke #21 | **[PERSISTE — BUG FUNCIONAL]** POST review retornou `422` (Unprocessable Entity), não `BASE_URL`. O request chegou ao servidor mas foi rejeitado — provavelmente porque o booking fixture no staging não está em estado COMPLETED/RETURNED para permitir review. Estado de DB inconsistente entre runs. Delta s11: `Expected: 201, Received: 422`. | TÍTULO: [Review flow] — smoke #21 booking não está em estado COMPLETED no staging: POST review retorna 422 · CRITICIDADE: Major |
| QA-07 | `security3.spec.ts:238` / `GET /api/users/me/export` | **[PERSISTE — BASE_URL ausente]** Request vai para localhost:3000 via `BASE = process.env.BASE_URL ?? 'http://localhost:3000'`. Com fixture válido a sessão está ok, mas o endpoint não é chamado no staging. Delta s11: confirmado como falha (status inesperado). | CORREÇÃO: `BASE_URL` no comando de staging. |
| QA-08 | `security3.spec.ts:285` / `PATCH /api/admin/payouts` | **[PERSISTE — BASE_URL ausente]** Mesmo padrão. `security3.spec.ts` usa `BASE`. Delta s11: confirmado como falha. | CORREÇÃO: `BASE_URL` no comando de staging. |
| QA-09 | `security3.spec.ts:117` / `POST /api/admin/export` | **[PERSISTE — BASE_URL ausente]** Request vai para localhost:3000. Delta s11: `Expected: 200, Received: 401`. | CORREÇÃO: `BASE_URL` no comando de staging. |
| QA-10 | `profile-edit.spec.ts:44` e `:75` | **[PERSISTE — BASE_URL ausente]** GET/PATCH `/api/users/me` vão para localhost:3000. Fixture regenerado funcionou (login e sessão estão válidos), mas o spec faz requests diretos via `BASE`. Delta s11: `GET /api/users/me deve ser 200 → false` e `Cannot read properties of undefined (reading 'name')`. | CORREÇÃO: `BASE_URL` no comando de staging. |
| QA-11 | `email-verification.spec.ts:79` | **[PERSISTE — BASE_URL ausente]** `email-verification.spec.ts` usa `BASE`. POST para localhost:3000 retorna conexão recusada interpretada como 401. Delta s11: `Expected value: 401, Received array: [200, 409, 429]` — o assert toContain recebeu 401 (localhost sem servidor). | CORREÇÃO: `BASE_URL` no comando de staging. |
| QA-12 | `id-verification.spec.ts:52` e `:84` | **[PERSISTE — BASE_URL ausente]** Requests para localhost:3000. Delta s11: 2 sub-testes falham (`Expected: [400, 409], Received: 401`). | CORREÇÃO: `BASE_URL` no comando de staging. |
| QA-13 | `notifications.spec.ts:41` e `:66` | **[PERSISTE — BASE_URL ausente]** `notifications.spec.ts` usa `BASE`. Delta s11: 2 sub-testes falham. | CORREÇÃO: `BASE_URL` no comando de staging. |
| QA-14 | `phone-verification.spec.ts:33` e `:130` | **[PERSISTE — BUG FUNCIONAL + BASE_URL ausente]** Teste 1 (sem auth): retornou `400` em vez de `401` — bug real no endpoint `/api/auth/phone/send-otp` que responde `400` antes de verificar auth. Teste 4 (campo phone): `BASE_URL` ausente. Delta s11: `Expected: 401, Received: 400` para teste 1. | TÍTULO: [Phone OTP] — `/api/auth/phone/send-otp` retorna 400 para request não autenticado, deveria retornar 401 · CRITICIDADE: Major · Correção para teste 4: `BASE_URL`. |

### P2 — Polimento / Infra de testes

| # | Spec / Rota | Achado | Detalhe |
|---|---|---|---|
| QA-15 | `responsive.spec.ts` / `/itens` | **Página /itens timeout 30s no servidor local** (chromium). A página não carrega em 30s no ambiente local. Pode indicar consulta lenta ao banco local de dev (Supabase local não configurado), SSR pesado ou query não indexada. Não é regressão em staging. | TÍTULO: [/itens] — timeout 30s no servidor local (chromium + tablet) · CRITICIDADE: Minor (ambiente local apenas) · AMBIENTE: localhost:3000 · PASSOS: 1. `pnpm dev` · 2. `page.goto('/itens')` · OBSERVADO: timeout após 30s · ESPERADO: carga em < 10s · EVIDÊNCIA: `e2e/responsive.spec.ts:47` |
| QA-16 | `pricecalc.spec.ts:146` | **Teste 5 (tabs ausentes) falha localmente** porque `/api/items` retorna lista vazia (banco local sem seed) — `dailyOnlyItem` é undefined. O teste deveria fazer early return com annotation mas pode estar falhando por outro motivo. Verificar se o early return está funcionando. | TÍTULO: [PriceCalc #5] — falha local por banco sem seed: `dailyOnlyItem` undefined sem early return correto · CRITICIDADE: Minor (infra local) · EVIDÊNCIA: `e2e/pricecalc.spec.ts:151-155` |
| QA-17 | `pricecalc.spec.ts:223` | **Teste 8 (preservar data ao trocar modo) falha localmente** — mesmo motivo do QA-16: `multiItem` undefined por banco local sem dados. O early return com annotation deveria evitar a falha mas o spec falha. | TÍTULO: [PriceCalc #8] — falha local por banco sem seed · CRITICIDADE: Minor · EVIDÊNCIA: `e2e/pricecalc.spec.ts:228-232` |
| QA-18 | `pricecalc.spec.ts:263` | **Teste 11 (teto R$500) falha localmente** — sem itens no banco local o teste não pode avançar. | TÍTULO: [PriceCalc #11] — falha local por banco sem seed · CRITICIDADE: Minor · EVIDÊNCIA: `e2e/pricecalc.spec.ts:268` |
| QA-19 | `pricecalc.spec.ts:329` | **Teste 10 (link /login para não logados) falha localmente** — sem itens disponíveis no banco local o spec falha ao tentar navegar para a página do item. | TÍTULO: [PriceCalc #10] — falha local por banco sem seed · CRITICIDADE: Minor · EVIDÊNCIA: `e2e/pricecalc.spec.ts:333` |
| QA-20 | `navigation.spec.ts` (8 falhas) · `error-pages.spec.ts` (2 falhas) · `mobile-menu-close.spec.ts` (2 falhas) · `mapbox.spec.ts` (2 falhas) | **Falhas locais em cadeia por timeout de /itens ou ausência de items no DB local.** A maioria dos specs de navegação que tentam acessar `/itens` ou navegar para detalhe de item falham por timeout ou por não encontrarem links de item. Causa raiz: servidor local sem dados seed + possível lentidão de compilação turbopack na primeira requisição. | TÍTULO: [Navegação/Responsividade local] — 14 specs falham no local por timeout em /itens ou ausência de itens no DB · CRITICIDADE: Minor (ambiente local) · CAUSA RAIZ: banco de dev local sem seed / timeout de cold-start turbopack · EVIDÊNCIA: `e2e/navigation.spec.ts`, `e2e/error-pages.spec.ts`, `e2e/mobile-menu-close.spec.ts`, `e2e/mapbox.spec.ts` |
| QA-21 | `double-booking.spec.ts:46` | **[PERSISTE — FLAKY / ESTADO DE DB]** Delta s11: smoke #10A e #10B ambos marcados como `flaky` (3 flaky total). O item no staging tem bookings pré-existentes que interferem com a criação de novo booking. O locatário "não consegue criar PENDING" (`expect.toBeTruthy() → false`) porque o item fixture pode estar sem disponibilidade. Race condition ou estado de DB contaminado. | TÍTULO: [double-booking] — smokes #10A #10B flaky: item fixture com bookings pré-existentes no DB · CRITICIDADE: Minor · AMBIENTE: staging · EVIDÊNCIA: saída Playwright "3 flaky" |
| QA-22 | **Sessões fixture staging** — 10+ specs afetados | **[RESOLVIDA (era fixture expirada) — 2026-06-13]** Fixtures locatário/proprietário/admin regenerados com sucesso via `npx tsx scripts/create-staging-fixtures.ts`. Timestamps: session-locatario.json 08:11:39, session-proprietario.json 08:11:42, session-admin.json 08:11:45. Os fixtures de financeiro e operacional (05/06) continuam expirados por não haver `FIXTURE_FINANCEIRO_PASSWORD`/`FIXTURE_OPERACIONAL_PASSWORD` no env local — esses testes continuam protegidos por `test.skip` condicional (existência do arquivo) mas as sessões expiradas causam falha quando o spec é executado. Confirmado: as 3 falhas que eram puramente de fixture expirada (QA-02/10/13 parte das razões) não estão mais no topo — mas o `BASE_URL` ausente é a causa real persistente. | AÇÃO RESIDUAL: definir senha de financeiro/operacional em `.env.local` para regenerar essas sessões. |
| QA-23 | `admin-usuarios.spec.ts:106,132,152,170` / Grupo 2 CRUD | **[NOVO — s11]** 4 testes do Grupo 2 (CRUD de admins) falham com **429 Too Many Requests** em vez de 201/400/409. A suíte serial executa múltiplas chamadas de criação de admin em sequência rápida — o rate limiter do endpoint `/api/admin/usuarios` bloqueia após N requests. O rate limit está muito agressivo para testes sequenciais. | TÍTULO: [admin-usuarios Grupo 2] — rate limit 429 bloqueia testes sequenciais de CRUD admin · CRITICIDADE: Minor (infra de testes, não afeta usuário real) · CORREÇÃO: adicionar `test.setTimeout` maior + `waitForTimeout(1000)` entre requests no spec, ou usar credenciais diferentes por sub-teste. |
| QA-24 | `security2.spec.ts:91` / smoke #19 password reset | **[NOVO — s11 / BASE_URL ausente]** `security2.spec.ts` usa `BASE = process.env.BASE_URL ?? 'http://localhost:3000'`. Smoke #19 faz POST para `/api/auth/forgot-password` via `fetch(BASE + ...)` e tenta parsear a resposta como JSON. Com servidor local não rodando, recebe HTML de erro → `SyntaxError: Unexpected end of JSON input`. | CORREÇÃO: `BASE_URL` no comando de staging. |
| QA-25 | `security5.spec.ts:61` / smoke #29 review após COMPLETED | **[NOVO — s11 / BASE_URL ausente + estado DB]** Smoke #29 usa `BASE`. Requests vão para localhost:3000. Também há indicação de que o booking fixture no staging pode não estar em COMPLETED. | CORREÇÃO: `BASE_URL` + verificar estado do booking lifecycle no DB. |

---

## 🔴 P0 — Bloqueia abertura para produção

| # | Atividade | Detalhe |
|---|---|---|
| 1 | ✅ **CSP com nonces** | `unsafe-inline` removido do `script-src`; nonce gerado por request em `middleware.ts`; aplicado em layout JSON-LD e GA4 |
| 2 | ✅ **Rate limiting Upstash** | Código já suportava Upstash via `@upstash/ratelimit` — só precisa das env vars no Vercel: `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` |
| 3 | ⏳ **Supabase production** | **Aguarda validação 100% de staging** — criar apenas após aprovação final; GitHub environment `production` com Required Reviewers |
| 4 | ✅ **Fix senhas hardcoded (GitGuardian)** | Resolvido 06/06/2026: `git filter-repo` limpou 477 commits, senhas trocadas no provedor de email, movidas para `FIXTURE_FINANCEIRO_PASSWORD` / `FIXTURE_OPERACIONAL_PASSWORD`, sessions regeneradas. |
| 5 | ✅ **Política de cancelamento hardcoded** | Resolvido 2026-06-12: `getCancellationConfig()` em `lib/platform-config.ts` (chaves `cancelation*`); `calcRefund()` aceita config opcional. |
| 6 | ✅ **Taxa de atraso hardcoded (1,5×)** | Resolvido 2026-06-12: `getLateFeeMultiplier()` (chave `lateFeeMultiplierX100`); cron e e-mail recebem o valor dinâmico. |
| 7 | ✅ **Limiares de tier embaixador hardcoded** | Resolvido 2026-06-12: `getAmbassadorThresholds()` (chaves `ambassadorSilverThreshold`/`ambassadorGoldThreshold`). |
| 8 | ✅ **Janela de referral hardcoded (30 dias)** | Resolvido 2026-06-12: `getReferralWindowDays()` (chave `referralWindowDays`). |

---

## 🟠 P1 — Necessário antes do MVP público

| # | Atividade | Detalhe |
|---|---|---|
| 4 | ✅ **Preservação de contexto de busca** | `ItemCard` passa `?back=` com filtros; detalhe do item usa no link "← Voltar" |
| 5 | ✅ **Extensão de prazo — UI** | Locatário solicita nova data; proprietário aprova/recusa via banner; chama `POST/PATCH /extend` |
| 6 | ✅ **Relatório de problema estruturado** | 4 categorias + descrição obrigatória + foto opcional; abre disputa com reason formatada |
| 7 | ✅ **Prazos de auto-cancelamento hardcoded** | Resolvido 2026-06-12: `getAutoCancelConfig()` (chaves `autoCancelPendingHours`/`autoCancelOwnerHours`); mensagens de notificação dinâmicas. |
| 8 | ✅ **Janela de payout hardcoded (3 dias)** | Resolvido 2026-06-12: `getPayoutWindowDays()` (chave `payoutWindowDays`); `payout.create` agora com `await` (era fire-and-forget). |
| 9 | ✅ **Limites de upload hardcoded** | Resolvido 2026-06-12: `getUploadLimits()` (chaves `maxImagesPerItem`/`maxUploadSizeMB`) aplicado em 4 endpoints (images, upload, photos, id-verification). |
| 10 | ✅ **Rate limits hardcoded** | Resolvido 2026-06-12: mapa `RATE_LIMITS` exportado em `lib/rateLimit.ts`; 13 endpoints atualizados. |
| 11 | ✅ **Teto R$500 sem aviso na UI** | Resolvido 2026-06-12: `_PriceCalc.tsx` exibe alerta e desabilita CTA quando subtotal > `CHECKOUT_MAX_CENTS`. |
| 12 | ✅ **geocodeItem fire-and-forget** | Resolvido 2026-06-12: callers em `POST /api/items` e `PUT /api/items/[id]` envolvidos em `after()` do Next.js. |

---

## 🟡 P2 — Polimento pré-lançamento

| # | Atividade | Detalhe |
|---|---|---|
| 7 | ✅ **PWA ícones** | Resolvido 2026-06-16 (s19): `scripts/generate-pwa-icons.mjs` gera 192/512/maskable-512 + apple-touch a partir de `public/logos/pwa-icon-source.png`; wired no `app/manifest.ts`. |
| 8 | ✅ **PWA screenshots** | Resolvido: `public/logos/pwa-screenshot-mobile.png` (390×844, 159KB) + `pwa-screenshot-wide.png` (1280×800, 297KB), ambos `narrow`/`wide` wired no `app/manifest.ts`. |
| 9 | ✅ **Página `/sobre`** | Conteúdo completo: hero, stats, missão, história, valores, equipe, desenvolvimento (Pratika IA) e CTA. Linkada no footer e MobileMenu. |
| 10 | ✅ **Stubs com conteúdo** | Resolvido 2026-06-16 (s19): `/politicas` (termos, privacidade LGPD c/ DPO, responsabilidade, cancelamento, cookies, contato), `/suporte` (central de ajuda, atendimento, segurança) e `/comunidade` (conexão local, benefícios, participação) já com conteúdo real. **Discoverability:** `/comunidade` adicionada ao footer (decisão do fundador: `/suporte` e `/politicas` ficam acessíveis por URL direta por serem consolidações redundantes com `/ajuda`, `/termos`, `/privacidade` já no footer). |
| 11 | ✅ **Jest global `next-auth@5`** | `transformIgnorePatterns` atualizado para `@upstash\|next-auth\|@auth`; testes de badge corrigidos; 21 suítes / 355 testes / 0 falhas |
| 12 | ✅ **Sentry source maps + alertas** | Source maps chegando (184–248 arquivos por build); alertas criados: novo issue + erros acima de 10/hora |
| 13 | ✅ **Countdown devolução** | `components/booking/ReturnCountdown.tsx` — já wired em `app/reservas/[id]/page.tsx` |
| 14 | ✅ **Onboarding do primeiro anúncio** | `ListingQualityIndicator` + `ItemCardPreview` + dicas inline já no `ItemForm.tsx` |
| 15 | ✅ **Prazos de token de auth hardcoded** | Resolvido 2026-06-12: `lib/auth-config.ts` com `EMAIL_VERIFY_TOKEN_TTL_MS` e `PASSWORD_RESET_TOKEN_TTL_MS`; 3 rotas atualizadas. |
| 16 | ✅ **Thresholds de badges hardcoded** | Resolvido 2026-06-12: `BORROWER_BADGES` agora exportado; `REPUTATION_PER_REVIEW` já era constante nomeada. |
| 17 | ✅ **Fatores de CO₂ hardcoded** | Já eram constantes nomeadas exportadas (`CO2_KG_PER_BOOKING_DAY`, `CO2_KG_PER_TREE_PER_YEAR`) — sem ação necessária. |
| 18 | ✅ **Checkout Stripe expira em 30 min hardcoded** | Resolvido 2026-06-12: `STRIPE_CHECKOUT_EXPIRES_SECONDS` em `lib/platform-config.ts`. |
| 19 | ✅ **sendExportReadyEmail (ADR-016)** | Resolvido 2026-06-12: template criado em `lib/email.ts`; export assíncrono notifica o admin e usa `after()` (era fire-and-forget). |

---

## 🟢 P3 — Pós-produção

| # | Atividade | Detalhe |
|---|---|---|
| 25 | **Verificação de celular via SMS OTP (Zenvia)** | Decisão Raimundo 2026-06-10. Provedor: Zenvia (~R$0,12–0,20/SMS, melhor entrega BR). Fluxo: OTP 6 dígitos, TTL 10min, bcrypt no banco. Schema: `phoneVerifiedAt`, `phoneOtpHash`, `phoneOtpExpiresAt`. Gate: bloqueia 1ª reserva se não verificado. Endpoints: `POST /api/phone/send-otp` + `POST /api/phone/verify-otp`. UI em `/perfil/seguranca`. Estimativa: ~1 sprint. |
| 15 | **Lighthouse CI** | LCP < 2,5s, CLS < 0,1, INP < 200ms — medir no CI após preview URL estável |
| 16 | **k6 load test** | 50 usuários em `GET /api/items`, P95 < 1s |
| 17 | **Expo Go — teste mobile** | `cd apps/mobile && npx expo start --tunnel --clear` |
| 18 | **Chat com templates** | Mensagens pré-prontas que preenchem o campo (não enviam sozinhas) |
| 19 | **Avaliação por critérios** | Item como descrito / pontualidade / comunicação / conservação |
| 20 | **Gamificação** | Badges Bronze/Prata/Ouro, pontos de reputação, cupom 10% off por avaliar |
| 21 | **CO₂ por categoria** | Campo no schema Prisma — adiado (risco de migration) |
| 22 | ✅ **Duplicata haversine** | Verificado 2026-06-12: `utils/geo.ts` só contém `buildSlug` — `lib/haversine.ts` já é o canônico único. Item estava desatualizado. |
| 23 | **KPIs instrumentados** | Bounce < 40%, CTR cards > 15%, conversão > 8%, NPS > 50 |
| 24 | **Validação Android real** | Samsung Galaxy A13 com Expo Go |

---

## Resumo executivo

| Prioridade | Qtd | Foco |
|---|---|---|
| ✅ Concluídos | 27 | Verificados diretamente no código |
| 🔴 P0 | 7 | Bloqueia produção (inclui 4 hardcoded críticos: política cancelamento, late fee, tier embaixador, janela referral) |
| 🟠 P1 | 6 | MVP público (inclui 4 hardcoded: auto-cancel, payout window, upload limits, rate limits) |
| 🟡 P2 | 12 | Polimento e assets (inclui 4 hardcoded: tokens auth, badges, CO₂, Stripe session) |
| 🟢 P3 | 11 | Pós-produção |

> **Varredura de hardcoded realizada em 2026-06-12** — 61 valores encontrados, 16 priorizados acima (P0–P2). Os demais 45 são constantes de validação de string (mín/máx chars), limites de paginação e constantes de UI considerados aceitáveis como literais no código.

### Inventário completo de hardcoded (referência)

| Arquivo | Valor | O que é | Prioridade |
|---|---|---|---|
| `lib/cancellationPolicy.ts` | `100%, 70%, 50%`, `24h`, `6h` | Política reembolso e janelas | P0 |
| `lib/email.ts:561` + `cron/reminders/route.ts:118` | `1.5` | Multiplicador taxa de atraso | P0 |
| `lib/ambassador.ts:16` | `11`, `51` | Limiares de tier Bronze/Prata/Ouro | P0 |
| `lib/referral.ts:11` | `30` dias | Janela atribuição de referral | P0 |
| `lib/platform-config.ts` | `12h` | Auto-cancel PENDING sem resposta (configurável via PlatformConfig: autoCancelPendingHours) | P1 |
| `app/api/cron/auto-cancel/route.ts:20` | `48h` | Auto-cancel proprietário sem ação | P1 |
| `app/api/bookings/[id]/route.ts:303` | `3` dias | Janela elegibilidade payout | P1 |
| `app/api/items/[id]/images/route.ts:10` | `10` imagens | Máx fotos por item | P1 |
| `app/api/upload/route.ts:21` et al. | `10 MB` | Limite tamanho arquivo | P1 |
| Rate limits em 8+ endpoints | vários | Req/min por IP ou usuário | P1 |
| `app/api/auth/register/route.ts:119` + `resend-verification` | `48h` | Expiração token verificação e-mail | P2 |
| `app/api/auth/forgot-password/route.ts:50` | `60 min` | Expiração link reset senha | P2 |
| `lib/badges.ts:19-22` | `3, 10, 25, 50` | Reservas para badge borrower | P2 |
| `lib/badges.ts:58` | `10` pontos | Reputação por avaliação | P2 |
| `lib/co2.ts:13-14` | `0.5`, `21.77` | Fatores CO₂ por booking e árvore | P2 |
| `app/api/payments/checkout/route.ts:125` | `30 min` | Expiração sessão Stripe Checkout | P2 |

---

## Fora de escopo (decisões fechadas)

| Item | Motivo |
|---|---|
| WhatsApp (chat, Business API) | Decisão explícita do produto |
| Pagamento Pix/Boleto | Stripe já implementado — outros métodos são H2+ |
| Push notifications FCM | Não planejado para H1 |
| Vídeo de verificação | H3 |
| Aluguel recorrente/assinatura | H2 |
| Seguro contra danos automático | H2 |
| Dark mode | Fora do escopo H1 — documentado |
| Busca por voz | Fora dos requisitos MVP |
| RLS Supabase | Desabilitado — incompatível com PgBouncer; segurança via `ownerId !== session.user.id → 403` |
