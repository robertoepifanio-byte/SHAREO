# Roteiro de teste — Stripe Connect ponta a ponta (ADR-028)

**Ambiente:** staging (`https://staging.shareo.com.br`) em **modo TEST** da Stripe.
**Nunca em produção** — `shareo-prod` está travado pelo D4 jurídico.

**O que este roteiro prova:** que o dinheiro percorre o caminho inteiro — cobrança →
retenção na ShareO → `Transfer` para o proprietário → reversão em estorno/disputa.
Hoje o código está **implementado e não exercitado**; nada aqui pode ser marcado ✅
sem a evidência da coluna correspondente.

**O que já está provado e NÃO precisa ser refeito:**

| Item | Evidência | Data |
|---|---|---|
| Onboarding Express (Accounts v2) | conta ACTIVE em staging | 19/08/2026 |
| Webhook de Connect (Event Destination v2) | ping `200 OK` no Workbench | 21/08/2026 |

---

## Fase 0 — Preparação (bloqueia tudo o que vem depois)

| # | Passo | Como verificar |
|---|---|---|
| 0.1 | Flag `stripeConnectEnabled` = `"true"` na tabela `PlatformConfig` do **shareo-staging** (`zythygwvmrwrqmnrdufq`) | `GET /api/payments/stripe/connect` responde redirect, não **404**. 🪤 O default é OFF: com a flag desligada, TODA a fase 1 devolve 404 e parece bug de auth. |
| 0.2 | `STRIPE_SECRET_KEY` (test) presente nas env vars do Vercel do projeto **`shareo`** | mesmo teste do 0.1 — sem a chave também dá 404 |
| 0.3 | `STRIPE_WEBHOOK_SECRET` e `STRIPE_CONNECT_WEBHOOK_SECRET` no Vercel | Workbench → cada destination → último evento **200** |
| 0.4 | Reduzir `payoutWindowDays` (default **3**) OU planejar editar `eligibleAfter` direto no banco | evita esperar 3 dias na fase 5 |

> 🪤 Trocar env var no Vercel **não** afeta um deployment já existente — é preciso um
> deployment novo. Redeploy de build prebuilt não pega env nova (mordeu em 21/08).

**Atores necessários:** 2 usuários distintos em staging — um **proprietário** (com item
publicado) e um **locatário**. Não usar a mesma conta para os dois.

---

## Fase 1 — Onboarding do proprietário (smoke, ~10 min)

| # | Ação | Resultado esperado | Evidência |
|---|---|---|---|
| 1.1 | Logado como proprietário, ir em `/perfil/recebimentos` → botão de conectar Stripe | redireciona para o onboarding hospedado da Stripe | screenshot da tela da Stripe |
| 1.2 | Completar o onboarding com os dados de teste da Stripe | volta para `/perfil/recebimentos` | — |
| 1.3 | Conferir o banco | `OwnerPaymentAccount.stripeConnectStatus = "ACTIVE"` e `stripeAccountId` preenchido | linha do banco |
| 1.4 | Conferir o Workbench de Connect | chegou `v2.core.account[...].capability_status_updated` com **200** | print da entrega |

> 🪤 O 1.4 é o que prova que o webhook de Connect faz mais que responder ping. Se o
> status ficar `ONBOARDING` mesmo com a conta pronta na Stripe, o suspeito é o
> `accounts.retrieve` sem os `include` — foi exatamente o bug evitado no #326.

---

## Fase 2 — Checkout com cartão (o caminho do dinheiro entrando)

Checkout é **só cartão** — débito e crédito à vista. Boleto e Pix estão fora por
decisão registrada no ADR-028; não tente adicioná-los ao teste.

| # | Ação | Resultado esperado |
|---|---|---|
| 2.1 | Locatário cria reserva de um item do proprietário da fase 1, valor **≤ R$ 500** | reserva em `PENDING` |
| 2.2 | Proprietário confirma a reserva | status `CONFIRMED` — o pagamento só abre aqui |
| 2.3 | Locatário paga com **crédito**: `4242 4242 4242 4242`, validade futura, CVC qualquer | Checkout conclui, redireciona para `/reservas/sucesso` |
| 2.4 | Repetir uma segunda reserva com **débito**: `4000 0566 5566 5556` | conclui igual |
| 2.5 | Uma terceira com cartão **recusado**: `4000 0000 0000 0002` | Stripe recusa; a reserva **não** vira `PAID` e continua pagável |

**Verificar no banco após 2.3:**
- `Booking.paymentStatus = "PAID"`, `stripePaymentIntentId` preenchido
- `platformFeeAmount` + `ownerNetAmount` batem com a taxa de `getPlatformFeeRate()`
  (⚠️ nunca conferir contra 15% hardcoded — ler a config)
- `StripeEventQueue` tem `checkout.session.completed` com status `COMPLETED`

**Verificar na Stripe:** o PaymentIntent tem `transfer_group = <bookingId>` e o saldo
caiu na conta da **ShareO** (não na do proprietário) — é o modelo *separate charges
and transfers*, e é isso que dá a retenção contra disputa.

### Cartões de teste (modo TEST apenas)

Conferidos em https://docs.stripe.com/testing (21/08/2026). **Nenhum funciona com
chave live** — e a Stripe proíbe testar em live com cartão real.

| Cenário | Número | Usado em |
|---|---|---|
| Crédito aprovado (Visa) | `4242 4242 4242 4242` | 2.3 |
| Débito aprovado (Visa) | `4000 0566 5566 5556` | 2.4 |
| Débito aprovado (Mastercard) | `5200 8282 8282 8210` | alternativa 2.4 |
| Recusa genérica | `4000 0000 0000 0002` | 2.5 |
| Recusa por saldo insuficiente | `4000 0000 0000 9995` | extra |
| Disputa / chargeback (fraude) | `4000 0000 0000 0259` | 7.1 |
| Cartão brasileiro (Visa BR) | `4000 0007 6000 0002` | opcional |
| Exige autenticação 3DS | `4000 0025 0000 3155` | opcional |

Para todos: validade = qualquer data futura, CVC = 3 dígitos quaisquer, CEP = qualquer.

> 🪤 **Amex fica de fora de propósito.** A conta brasileira aceita Visa e Mastercard;
> testar com Amex daria um falso negativo que parece bug do checkout.
>
> 🪤 O cartão de disputa é protegido por 3DS — o Checkout pede autenticação antes de
> aprovar, e a disputa só abre depois. Esse atraso é útil: dá pra rodar o cron de
> repasse ANTES da disputa chegar e verificar o bloqueio do payout (7.3).

---

## Fase 3 — Idempotência (o teste que quase ninguém faz)

| # | Ação | Resultado esperado |
|---|---|---|
| 3.1 | No Workbench, reenviar o `checkout.session.completed` já processado | responde **200** com `duplicate: true`; nada muda no banco |
| 3.2 | Conferir o `pickupToken` da reserva antes e depois do 3.1 | **idêntico** |

> O 3.2 existe porque a cópia Stripe do "booking pago" já ficou sem o guard de
> idempotência uma vez, e o sintoma seria o locatário chegar com um código de
> retirada que não vale mais.

---

## Fase 4 — Até a devolução, gerando o Payout

| # | Ação | Resultado esperado |
|---|---|---|
| 4.1 | Retirada confirmada com o `pickupToken` | reserva em andamento |
| 4.2 | Devolução confirmada (`confirm_return`) | reserva `COMPLETED` |
| 4.3 | Conferir a tabela `Payout` | 1 linha `PENDING`, `amount = ownerNetAmount`, `eligibleAfter ≈ agora + payoutWindowDays` |

> 🪤 O Payout **só nasce se o proprietário tiver `OwnerPaymentAccount`**. Se a fase 1
> foi pulada, o 4.3 não cria nada e falha em silêncio — o `.catch()` só loga.

---

## Fase 5 — O `Transfer` real (o item que nunca foi exercitado)

| # | Ação | Resultado esperado |
|---|---|---|
| 5.1 | Adiantar a elegibilidade do Payout no banco (`eligibleAfter` para o passado) | — |
| 5.2 | Disparar o cron: `GET /api/cron/payout` com header `Authorization: Bearer $CRON_SECRET` | HTTP 200 com contagem `processed: 1` |
| 5.3 | Conferir o `Payout` | status **`COMPLETED`** e id do Transfer gravado |
| 5.4 | Conferir na Stripe → Connect → a conta do proprietário | **Transfer** criado, valor = `ownerNetAmount`, com `source_transaction` apontando para a charge |
| 5.5 | Rodar o cron **de novo** | o mesmo payout **não** é transferido duas vezes (lock otimista `updateMany`) |

SQL do 5.1 (rodar no **shareo-staging**):

```sql
UPDATE "Payout" SET "eligibleAfter" = now() - interval '1 minute' WHERE id = '<payoutId>';
```

**Caso alternativo obrigatório (5.6):** um proprietário **sem** conta Connect ativa
deve cair em `PROCESSING` para execução manual via PIX pelo `ADMIN_FINANCEIRO`, e
aparecer em `/admin/financeiro`. Esse é o caminho de convivência com o modelo antigo,
e é o que quebra silenciosamente se alguém "simplificar" o cron.

---

## Fase 6 — Estorno e reversão do `Transfer`

> 🔴 **Leia antes de executar.** O código **não emite estorno**. Cancelar uma reserva
> apenas grava `refundAmount`/`refundPercent`; nenhuma chamada a `refunds.create`
> existe no repositório. O estorno é emitido **por uma pessoa no Dashboard da
> Stripe**. Portanto o passo 6.2 é manual, e isso é uma lacuna de produto a decidir —
> não um detalhe deste teste.

| # | Ação | Resultado esperado |
|---|---|---|
| 6.1 | Locatário cancela uma reserva **já paga e já transferida** (fase 5) | `refundAmount`/`refundPercent` gravados conforme a política 24h/6h |
| 6.2 | **Manualmente**, no Dashboard da Stripe, estornar a charge no valor de `refundAmount` | Stripe emite o refund |
| 6.3 | Webhook `charge.refunded` chega | `Booking.paymentStatus = "REFUNDED"` |
| 6.4 | Conferir na Stripe → o Transfer da fase 5 | existe uma **reversão proporcional** (`clawbackAmount / chargedAmount × payout.amount`) |
| 6.5 | Estorno **parcial** (ex.: 70%) numa segunda reserva | reversão proporcional, não integral |

> 🪤 Se o 6.4 falhar, o evento fica `FAILED` e a Stripe **retenta** — de propósito.
> Dinheiro no lugar errado não pode ser engolido em silêncio. Um `FAILED` que se
> repete indefinidamente na `StripeEventQueue` é o alarme.

---

## Fase 7 — Disputa (chargeback)

Usar o cartão de teste de disputa: `4000 0000 0000 0259`.

| # | Ação | Resultado esperado |
|---|---|---|
| 7.1 | Pagar uma reserva com o cartão acima e deixar a disputa abrir | `Booking.status = "DISPUTED"`, `stripeDisputeId` gravado |
| 7.2 | Conferir `/admin/financeiro` | a reserva aparece no bloco "Disputas abertas"; admins financeiros receberam notificação |
| 7.3 | Rodar o cron de payout com a disputa aberta | o payout dessa reserva é **ignorado** (`booking.status not DISPUTED`) |
| 7.4 | Fechar a disputa como **perdida** no Dashboard | `Booking.status = "CANCELLED"`; se já havia Transfer, ele é revertido |
| 7.5 | Em outra reserva, fechar a disputa como **ganha** | volta para `COMPLETED`; o Transfer **não** é revertido |

> O 7.3 é o coração da retenção: é ele que justifica a janela de `payoutWindowDays`.
> Se o payout sair antes da disputa, a ShareO paga do próprio bolso.

---

## Fase 8 — Negativos (rápidos, mas é onde mora o prejuízo)

| # | Ação | Esperado |
|---|---|---|
| 8.1 | Checkout de reserva **acima de R$ 500** | 422 `EXCEEDS_MVP_LIMIT` |
| 8.2 | Checkout de reserva ainda **não confirmada** | 422 `BOOKING_NOT_CONFIRMED` |
| 8.3 | Usuário **que não é o locatário** tenta pagar | 403 `FORBIDDEN` |
| 8.4 | Pagar reserva **já paga** | 409 `ALREADY_PAID` |
| 8.5 | Deixar a Checkout Session **expirar** sem pagar | `checkout.session.expired` → reserva liberada para nova tentativa, sem 500 |
| 8.6 | POST no webhook com assinatura inválida | **400**, nunca 500 |

---

## Como registrar o resultado

Para cada linha, uma de três marcas — e a regra da casa vale aqui inteira:

- ✅ **só com evidência anexada** (print da Stripe, linha do banco, resposta HTTP)
- ⚠️ passou com ressalva — descrever a ressalva
- ❌ falhou — anexar o erro

**Sem evidência, o item é "não testado", não "passou".** Este projeto já teve status ✅
com bug vivo cerca de dez vezes; a regra existe por causa disso.

Ao fim, atualizar `docs/adr/ADR-028-reversao-stripe-connect.md` com a data e o
resultado — o ADR é o lugar onde "implementado" vira "verificado".
