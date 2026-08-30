# Roteiro — exercitar o caminho de pagamento Stripe ponta a ponta (staging)

**Divisão de trabalho:** o fundador clica — só ele tem sessão e cartão. **O assistente confere o banco a cada passo.** É essa conferência que separa "a tela mostrou" de "o estado gravou", que é onde este projeto já se enganou umas dez vezes.

> ⚠️ **Isto NÃO libera go-live.** O bloqueador segue sendo o D4. Exercitar em teste remove a incerteza técnica, não a jurídica.

---

## O que já está provado, e o que não está

Levantado no banco do staging em 2026-08-24. **Importa para não gastar esforço onde já há evidência:**

| Etapa | Evidência | Estado |
|---|---|---|
| Sessão de checkout criada | 2 sessões, prefixo `cs_test_` | ✅ |
| Pagamento + webhook + handler | **4 eventos `checkout.session.completed`, todos `COMPLETED`** (21–23/08) | ✅ |
| Ping do event destination do Connect | 2, `COMPLETED` | ✅ |
| **Transfer ao proprietário** | **zero** `PlatformTransaction`; 35 repasses em `PROCESSING`, 3 em `PENDING`, **nenhum `COMPLETED`** | ❌ **nunca rodou** |
| Estorno / disputa | nenhum evento na fila | ❌ |
| Cobrança de extensão | recém-construída | ❌ |
| Evento de conta do Connect (`v2.core.account[…]`) | zero — só os pings | ❌ |

**Conclusão que reordena o roteiro:** o checkout **já funcionou de verdade**, quatro vezes. O desconhecido é o que vem *depois* do pagamento — e o maior deles é o **Transfer**, que nunca foi executado uma única vez.

🪤 **Números financeiros do staging enganam:** há **67 reservas `PAID`** e só **2 sessões de checkout**. As outras 65 foram marcadas como pagas por seed e scripts, não por pagamento real.

---

## 0. Antes de começar

| # | Verificar | Como | OK? |
|---|---|---|---|
| 0.1 | ~~Modo de teste~~ | ✅ **Confirmado**: as sessões gravadas começam com `cs_test_`. As env vars da Stripe são `Sensitive` no Vercel — o valor **não é visível nem para você**, então o prefixo dos IDs no banco é a forma de saber, e ela não expõe segredo nenhum. | ✅ |
| 0.2 | `STRIPE_WEBHOOK_SECRET` | ✅ **Confirmado pelos 4 eventos processados** — assinatura inválida daria 400 e nenhuma linha na fila. | ✅ |
| 0.3 | Proprietário com Connect `ACTIVE` | ✅ Carlos, ativo desde 23/08. Há também um `ONBOARDING` e um `NOT_CONNECTED` — úteis para a fase 5. | ✅ |
| 0.4 | Eventos assinados no webhook | `charge.refunded` e `charge.dispute.created` **ainda não têm evidência** de terem chegado. Conferir no Dashboard antes da fase 4. | ( ) |

**🪤 Nunca use telefone real.** A Stripe Link intercepta o checkout pedindo telefone; escape pelo link **"Pagar sem a Link"**. Já houve reserva real acidental neste projeto.

**Cartão de teste:** `4242 4242 4242 4242` · validade futura qualquer · CVC qualquer.

---

## Fase 1 — Ciclo até a devolução (reconferência)

Não é descoberta: é preparar o terreno da fase 2 e ver de novo, com os olhos no banco.

| # | Ação | Esperado | OK? |
|---|---|---|---|
| 1.1 | Locatário reserva um item **do Carlos** (ele é quem tem Connect ativo). Valor **abaixo de R$ 500** (teto D2). | Reserva `PENDING`. | ( ) |
| 1.2 | Carlos confirma. | `CONFIRMED` + botão **Pagar agora**. | ( ) |
| 1.3 | Locatário paga com o cartão de teste, **por fora da Link**. | Volta em `/reservas/sucesso`. | ( ) |
| 1.4 | Carlos informa o `pickupToken`. | `ACTIVE`. | ( ) |
| 1.5 | Locatário anexa **foto** e devolve; Carlos confirma. | `COMPLETED`. Sem foto → 422 (trava de 23/08). | ( ) |

**Confiro:** `paymentStatus = PAID`, `paidAt`, `pickupToken`, `stripePaymentIntentId`, `platformFeeAmount + ownerNetAmount = totalPrice`, linha nova `checkout.session.completed` `COMPLETED` na fila, e o `Payout` criado com `sourcePaymentIntentId` **nulo**.

> 🚩 Linha `FAILED` na fila = chegou e quebrou (`lastError` diz o quê). **Nenhuma linha** = não chegou.

---

## 🔴 Fase 2 — O Transfer. A mais importante do roteiro.

`createOwnerTransfer` **nunca foi executado**. É aqui que mora a armadilha que a revisão de hoje encontrou: a Stripe **exige** `source_transaction` no Brasil, e ele liga a transferência a **uma** cobrança.

**🪤 Sem zerar a janela, o repasse só fica elegível em 3 dias** — e `payoutWindowDays` **não tem tela de edição**.

| # | Ação | OK? |
|---|---|---|
| 2.1 | Como `ADMIN_SUPERADMIN`: `PATCH /api/admin/platform-config?key=payoutWindowDays` com `{"value":"0"}`. | ( ) |
| 2.2 | **Refazer a fase 1 numa reserva nova.** O `eligibleAfter` é gravado quando o payout nasce, não quando o cron lê — zerar depois não ajuda a reserva antiga. | ( ) |
| 2.3 | Disparar: `GET /api/cron/payout` com `Authorization: Bearer $CRON_SECRET`. | ( ) |
| 2.4 | **Restaurar** `payoutWindowDays` para `3`. | ( ) |

**Confiro:** `Payout.status = COMPLETED` com `processedAt`, e — a prova real — o **primeiro `PlatformTransaction` tipo `OWNER_PAYOUT`** da história do projeto, com `stripeTransferId` no metadata. Na Stripe, um Transfer para a conta conectada.

> 🚩 Se ficar em `PROCESSING`, caiu na fila manual de PIX: o proprietário não tem Connect `ACTIVE`. É desfecho válido do sistema, mas **não é o que esta fase quer provar** — refazer com o Carlos.

---

## 🔴 Fase 3 — Extensão paga, e os DOIS repasses

O ponto onde a correção de hoje se prova. Depende do PR [#361](https://github.com/robertoepifanio-byte/SHAREO/pull/361) estar no ar.

| # | Ação | Esperado | OK? |
|---|---|---|---|
| 3.1 | Reserva `ACTIVE` **já paga**: locatário pede extensão. | Carlos recebe notificação de solicitação. | ( ) |
| 3.2 | Carlos aprova. | Banner **"Extensão aceita — falta pagar"** com o valor. **A data de devolução NÃO muda ainda** — se mudar, a correção falhou. | ( ) |
| 3.3 | Locatário paga as diárias extras. | Volta com `?extensao=paga`. | ( ) |
| 3.4 | Concluir a devolução e rodar o cron da fase 2. | | ( ) |

**Confiro:** `endDate` movido **só agora**; `totalDays`/`totalPrice` somados; `extensionPaymentIntentId` preenchido; notificação para **as duas** partes; e — o essencial — **dois `Payout`**, um com `sourcePaymentIntentId` nulo e outro apontando para a cobrança da extensão, somando exatamente o líquido do proprietário.

É a diferença entre o proprietário receber e a Stripe recusar a transferência **em silêncio**.

---

## Fase 4 — Estorno

| # | Ação | OK? |
|---|---|---|
| 4.1 | Conferir que `charge.refunded` está assinado no Dashboard (ver 0.4). | ( ) |
| 4.2 | No painel da Stripe (teste), estornar a cobrança de uma reserva **cujo Transfer já saiu** (fase 2). | ( ) |

**Confiro:** `paymentStatus = REFUNDED` e um `PlatformTransaction` de reversão trazendo de volta a parte proporcional. Sem isso o proprietário fica com o dinheiro e a plataforma absorve o estorno sozinha.

---

## Fase 5 — Evento de conta do Connect

Fecha a pendência aberta desde o [#352](https://github.com/robertoepifanio-byte/SHAREO/pull/352): o escopo `@accounts` foi corrigido, mas **nenhum evento de conta passou pelo caminho** — a fila tem só os 2 pings.

| # | Ação | OK? |
|---|---|---|
| 5.1 | Concluir o onboarding da conta que está em `ONBOARDING`, ou conectar um proprietário novo. | ( ) |

**Confiro:** linha nova na fila com tipo `v2.core.account[…]`. Sem isso, a plataforma só descobre que um proprietário ficou apto quando ele mesmo volta à tela de recebimentos — quem fecha a aba fica invisível, e os repasses seguem para a fila manual sem ninguém notar.

---

## Depois

Cada fase confirmada vira evidência no `docs/STATUS.md`. O que **não** for exercitado continua "implementado, aguardando verificação" — sem exceção.

**Limpeza:** as reservas criadas aqui são lixo manual (o `scripts/limpar-lixo-teste-staging.ts` cobre só o escopo `e2e`). Remover com escopo explícito ao final.
