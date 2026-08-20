# ADR-028 — Reversão para Stripe Connect (split automático, sem exigir conta própria do locador)

**Status:** Accepted (decisão do sócio majoritário Raimundo, 2026-08-19) — **supersede parcialmente [[ADR-026-pagamentos-mercado-pago-modelo-b]]** no que diz respeito ao PSP escolhido; produção segue **gated** por D4 e, adicionalmente, pela pendência jurídica específica do desenho Stripe Connect (ver "Riscos / Pendências").
**Data:** 2026-08-19
**Decisores:** Raimundo (sócio majoritário).
**Contexto:** ShareO — módulo financeiro.

---

## Contexto

O ADR-026 adotou Mercado Pago Modelo B porque o parecer jurídico (D4) apontou o modelo anterior — merchant of record centralizado ([[ADR-012-modelo-pix-centralizado]]) — como o maior risco regulatório (Lei 12.865/2013: arranjo de pagamento não autorizado sem licença BACEN). A solução era terceirizar o arranjo a um PSP licenciado com split real, para que o dinheiro do locatário nunca transitasse pela conta da ShareO.

Na prática comercial, o Modelo B do Mercado Pago exige que **cada proprietário conecte a própria conta MP via OAuth** para receber a parte dele do split. Essa exigência gerou **forte rejeição** dos proprietários: abrir conta em outra instituição financeira só para poder alugar um item é fricção alta demais para o perfil de usuário do ShareO (pessoa física, uso ocasional).

Diante disso, decisão do sócio majoritário: reverter para Stripe — mas agora usando **Stripe Connect** (não o Stripe Checkout simples que existia antes da migração para o MP), para preservar o benefício de split automático sem repetir a fricção de onboarding externo do MP.

## Decisão

Adotar **Stripe Connect** como PSP definitivo, com o seguinte desenho:

1. **Checkout:** Pix, cartão à vista e boleto — parcelamento no crédito **desabilitado** (evita antecipação e fluxo de caixa negativo).
2. **Split automático 85% proprietário / 15% ShareO** via Stripe Connect (destination charge: `application_fee_amount` + `transfer_data.destination`), executado pelo próprio Stripe — não mais um cálculo só de bookkeeping.
3. **Proprietário não abre conta Stripe própria visível** — fornece dados bancários e passa por KYC dentro (ou por um link hospedado a partir) da interface do ShareO. Se será Connect **Custom** (KYC 100% dentro da UI do ShareO) ou **Express** (onboarding hospedado pela própria Stripe) é decisão de implementação, ainda em aberto — ver "Riscos / Pendências".
4. **Liquidação:** Pix D+0/D+1, cartão à vista D+2 úteis, boleto D+2/D+3 — números fornecidos pelo sócio, a confirmar contra a documentação oficial da Stripe Brasil na fase de implementação.
5. **Notas fiscais:** ShareO emite NFS-e sobre os 15% de comissão; proprietário emite nota sobre os 85%. Seguimos o mesmo entendimento fiscal já registrado no parecer D4 para o modelo MP ("15% é receita da ShareO, 85% não é") — o racional não muda com a troca de PSP, mas a integração técnica de emissão não existe hoje para nenhum dos dois PSPs.
6. **Mercado Pago Modelo B fica DORMENTE, não removido:** a flag `PlatformConfig.mercadoPagoEnabled` permanece com default OFF no código (já era o padrão antes desta decisão) — o código (OAuth, checkout, webhook) é preservado para não perder o investimento caso seja necessário reavaliar, mas sai do caminho de produção.
7. **PIX manual da plataforma (chave pessoal do fundador) é removido integralmente do código**, não apenas desligado — era um risco temporário assumido só para validar o fluxo em staging, perde a função com o Connect, e era o próprio risco regulatório mais exposto do sistema hoje (dinheiro de terceiros passando pela conta pessoal de um sócio).

## Consequências

### Positivas
- Elimina a fricção comercial que motivou a reversão: o proprietário não precisa abrir conta em outra instituição financeira.
- Reaproveita a base já existente do Stripe (`lib/stripe.ts`, webhook `app/api/webhooks/stripe/route.ts`, fila idempotente `StripeEventQueue`) — não é greenfield total.
- Split automático via Connect remove o gargalo de repasse manual (mesmo ganho que o Modelo B do MP prometia, sem o OAuth do proprietário).
- A saída do PIX manual (chave pessoal) reduz o risco regulatório mais exposto do sistema hoje, independentemente de como o Connect evoluir.

### Negativas / Trade-offs
- **Nada de Stripe Connect existe hoje no código.** Apesar do Stripe já estar integrado, é só Checkout simples — onboarding do proprietário, split real, schema de connected account e webhooks de Connect são construção nova, não reativação de algo desligado.
- Segunda migração de PSP em menos de dois meses (MP em 28/06/2026, reversão em 19/08/2026) — custo de contexto e de retrabalho. Mitigado parcialmente por manter o código MP dormente em vez de descartado.
- **Pendência jurídica nova (ver abaixo):** o parecer D4 validou especificamente o desenho do Mercado Pago Modelo B. O desenho análogo do Stripe Connect (dinheiro do locatário vai para a *connected account* do proprietário, não para a conta da ShareO) não foi objeto desse parecer.

## Riscos / Pendências

- [ ] **Confirmação jurídica específica para Stripe Connect.** O parecer D4 (`docs/juridico/parecer-juridico-revisado-mp.md`) validou o afastamento do enquadramento como arranjo de pagamento (Lei 12.865) para o desenho **do Mercado Pago**. O Connect tem racional análogo (o valor do locatário não transita pela conta da ShareO), mas isso precisa ser confirmado formalmente pelo jurídico antes do go-live — não assumir que o parecer existente cobre automaticamente o novo PSP.
- [x] **Custom vs. Express — decidido: Express.** Menos tempo de engenharia e menos responsabilidade de compliance do lado da ShareO (a Stripe hospeda a tela e faz o KYC); trade-off aceito é a marca Stripe aparecer no onboarding. Implementado e validado em staging em 19/08/2026 (ver "Notas de implementação").
- [ ] **Timing de liquidação real.** D+0/D+1 (Pix), D+2 (cartão), D+2/D+3 (boleto) foram fornecidos pelo sócio; confirmar contra a documentação oficial da Stripe para Connect no Brasil antes de comunicar esses prazos a proprietários.
- [ ] **NFS-e sobre a comissão.** Nenhuma integração técnica de emissão existe hoje (nem havia para o MP). Precisa de fornecedor (Focus NFe, eNotas, API municipal etc.) e vira trabalho novo independente do PSP escolhido.
- [x] **Staging:** a flag `mercadoPagoEnabled` foi desligada em `PlatformConfig` em 19/08/2026 via `scripts/disable-mercadopago-staging.ts --confirm` (estava ligada desde 30/06/2026).
- [x] **Split no checkout — implementado (19/08/2026), mas com mecanismo diferente do que o item 2 desta decisão descrevia originalmente.** "Destination charge" (`application_fee_amount`+`transfer_data.destination`) foi descartado — implementamos **"separate charges and transfers"**: o checkout cobra normalmente na conta da plataforma (só ganhou `payment_intent_data.transfer_group = bookingId`), e o `Transfer` pro proprietário é criado **depois**, no cron de repasse (`app/api/cron/payout/route.ts`), no mesmo ponto onde o repasse manual via PIX já acontecia — preserva a retenção de N dias após a devolução (proteção contra disputa) que já existia. A doc da Stripe confirma que `/v1/transfers` funciona normalmente contra uma connected account v2 com a capability `recipient.stripe_balance.stripe_transfers` (é literalmente o propósito dela). `source_transaction` na Transfer é **obrigatório** pra transferências envolvendo o Brasil. Não usa `application_fee_amount` — a taxa dos 15% fica implícita: só se transfere `ownerNetAmount` (85%), não o valor cheio.
- [ ] **Webhooks de Connect precisam de Event Destinations v2, não do webhook clássico `account.updated`.** Achado em 19/08/2026: contas v2 não disparam o evento v1 `account.updated` no endpoint clássico (`app/api/webhooks/stripe/route.ts`) — é um mecanismo de assinatura diferente (`stripe.v2.core.eventDestinations`, eventos "thin"). Enquanto isso não for configurado, a sincronização de status depende só do retorno do onboarding (funciona, mas não captura mudanças de status que aconteçam fora de uma visita do proprietário à tela de onboarding, ex.: a Stripe suspender a conta depois).

## Notas de implementação

- **Achado do levantamento técnico (19/08/2026):** hoje coexistem três caminhos de pagamento no código — Stripe Checkout simples, PIX manual da plataforma e Mercado Pago Modelo B — nenhum em produção (todos gated por D4). O split hoje calculado (`platformFeeRate`/`platformFeeAmount`/`ownerNetAmount` em `Booking`, via `calcSplit()` em `lib/platform-config.ts`) é só bookkeeping — não é executado por nenhum PSP.
- **Schema (implementado nesta mudança):** `OwnerPaymentAccount` ganhou os campos de Connect (`stripeAccountId`, `stripeConnectStatus`, `stripeChargesEnabled`, `stripePayoutsEnabled`, `stripeDetailsSubmitted`, `stripeDisabledReason`, `stripeConnectedAt`) e `Booking` ganhou `stripeConnectedAccountId` (auditoria de para qual connected account o split de cada reserva foi enviado). O campo `Booking.pixDeclaredAt` foi removido (migração `20260819120100_remove_platform_pix_manual`).
- **Plano técnico restante** (fora do escopo desta mudança de schema):
  1. ~~Onboarding do proprietário~~ — **implementado e validado em staging em 19/08/2026**, ver bloco abaixo.
  2. ~~Checkout com split~~ — **implementado em 19/08/2026** via separate charges and transfers (ver "Riscos/Pendências"). **Pix e boleto no checkout ainda faltam** (hoje o checkout só aceita cartão, `payment_method_types: ["card"]`) — não fazia parte deste recorte.
  3. Webhooks de Connect — **precisa de Event Destinations v2**, não do `account.updated` clássico (ver "Riscos/Pendências").
  4. ~~Desligar o Mercado Pago em staging (flag) e remover o PIX manual pessoal do código.~~ — feito em 19/08/2026.
  5. Integração de NFS-e sobre a comissão.
  6. ~~Atualizar `CLAUDE.md`, `docs/STATUS.md` e o card estático de `app/admin/financeiro/page.tsx`~~ — feito em 19/08/2026.

- **Onboarding Express — implementado e validado em staging (19/08/2026).** `lib/stripe-connect.ts` + rotas `app/api/payments/stripe/connect` (GET web / POST mobile), `app/api/stripe/connect/return`, `app/api/stripe/connect/refresh`; tela transcrita pro app mobile (`apps/mobile/app/perfil/recebimentos.tsx`). Flag `stripeConnectEnabled` (default OFF) ligada em staging via `scripts/enable-stripe-connect-staging.ts --confirm`.
  - **Achado crítico: Accounts v1 não serve mais para integrações novas.** A primeira implementação usou `stripe.accounts.create()` (v1) e a própria Stripe recusou a chamada: *"Stripe no longer recommends Accounts v1 for new Connect integrations."* Contas Stripe novas já nascem exigindo a API v2 (`stripe.v2.core.accounts`). Existe um toggle de compatibilidade v1 no Dashboard (`feat_accounts_v1_support`), mas optamos por migrar pra v2 em vez de usar o modo de compatibilidade.
  - **Configuration escolhida: `recipient`, não `merchant`.** O desenho do ADR-028 é a proprietária RECEBER a parte dela (a ShareO processa a cobrança do locatário), não a connected account processar sua própria cobrança — a doc da Stripe descreve exatamente esse caso como o de `recipient` ("Destination Charges without `on_behalf_of` set").
  - **Achado não documentado claramente:** a Stripe recusa a capability `recipient.stripe_balance.stripe_transfers` sem `merchant.card_payments` também requisitada na mesma conta — mesmo o desenho não usando a connected account como merchant of record. Requisitamos as duas (schema em `getOrCreateConnectedAccount`, `lib/stripe-connect.ts`) e listamos as duas `configurations` no Account Link de onboarding, senão a capability de `card_payments` fica pendente pra sempre por falta de coleta de requirements.
  - **Validado ponta a ponta em staging:** conta criada de verdade (`acct_...`), onboarding hospedado carregado, retorno sincronizando o banco e a UI reagindo ao status (`⏳ Cadastro iniciado, verificação da Stripe pendente.` com "Continuar cadastro" após onboarding parcial). Fluxo completo até `ACTIVE` (charges/payouts habilitados) não foi exercitado (pararia num captcha da Stripe que não deve ser automatizado) — considerado validado o suficiente pelo sócio.

- **Split real (checkout + payout) — implementado em 19/08/2026, ainda não testado ponta a ponta em staging** (precisaria de uma reserva completa até a devolução + o cron rodar — não exercitado nesta sessão, diferente do onboarding).
  - `app/api/payments/checkout/route.ts`: só ganhou `payment_intent_data.transfer_group = bookingId` — a cobrança em si não muda, continua indo pra conta da plataforma.
  - `app/api/cron/payout/route.ts`: no ponto onde já existia (repasse elegível N dias após devolução, `booking.status !== DISPUTED`), agora verifica se `OwnerPaymentAccount.stripeConnectStatus === "ACTIVE"`. Se sim: cria o `Transfer` real (`source_transaction` = charge da cobrança original, `amount` = `ownerNetAmount` já calculado no checkout, `idempotencyKey` por `payout.id` contra retry duplicado) e marca `Payout` como `COMPLETED` automaticamente, registrando em `PlatformTransaction` (tipo `OWNER_PAYOUT`) pra auditoria. Se não (proprietário ainda não conectou o Stripe): cai no comportamento antigo — `PROCESSING` pra execução manual via PIX pelo `ADMIN_FINANCEIRO`. Convivência intencional durante a transição.
  - **Taxa da plataforma:** não usa `application_fee_amount` da Stripe — fica implícita por só transferir `ownerNetAmount` (85%) em vez do valor cheio da cobrança; os 15% simplesmente não saem do saldo da plataforma.
  - **Gap conhecido, não implementado:** reversão de `Transfer` em caso de reembolso/disputa **depois** do repasse já ter acontecido. O handler `charge.refunded` (`app/api/webhooks/stripe/route.ts`) só marca `paymentStatus: REFUNDED`, não reverte nenhuma transferência. Na prática o reembolso normalmente acontece via cancelamento **antes** da devolução (quando o `Transfer` ainda nem existe, o repasse só é elegível depois da devolução), então a janela de sobreposição é estreita — mas existe (ex.: disputa aberta depois do proprietário já ter sido pago). Não foi resolvido nesta mudança; precisa de `stripe.transfers.createReversal()` buscando o `stripeTransferId` salvo em `PlatformTransaction.metadata`.

## Decisões relacionadas

- **Supersede parcialmente [[ADR-026-pagamentos-mercado-pago-modelo-b]]** — mantém o objetivo de afastar o merchant-of-record centralizado, mas troca o PSP e o desenho de onboarding do proprietário.
- [[ADR-012-modelo-pix-centralizado]] — modelo original (merchant of record), já superado por ADR-026.
- [[ADR-013-webhook-queue]] — reaproveita o padrão de fila idempotente (`StripeEventQueue`), agora também para eventos de Connect.
- [[ADR-014-payout-trigger]] — gatilho de repasse; com destination charges o repasse deixa de depender do cron/admin manual.
- D4 — consulta jurídica: [[project-d4-juridico]] — pendência de confirmar se o parecer cobre o desenho Connect (ver "Riscos / Pendências").
