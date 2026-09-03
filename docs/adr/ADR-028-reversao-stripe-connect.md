# ADR-028 — Reversão para Stripe Connect (split automático, sem exigir conta própria do locador)

**Status:** Accepted (decisão do sócio majoritário Raimundo, 2026-08-19; **ampliada em 2026-08-24** — ver "Atualização" abaixo) — **supersede [[ADR-026-pagamentos-mercado-pago-modelo-b]]** no que diz respeito ao PSP escolhido; produção segue **gated** por D4 e, adicionalmente, pela pendência jurídica específica do desenho Stripe Connect (ver "Riscos / Pendências").
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

1. **Checkout:** ~~Pix, cartão à vista e boleto~~ → **revisado em 20/08/2026 para SÓ CARTÃO À VISTA** (ver "Riscos / Pendências"). Parcelamento no crédito segue **desabilitado** (evita antecipação e fluxo de caixa negativo). O **boleto foi descartado** pelos fundadores por não aceitar reembolso, e o **Pix depende de liberação da Stripe que exige 60 dias de pagamentos processados** — não é decisão nossa, é pré-requisito deles.
2. **Split automático 85% proprietário / 15% ShareO** via Stripe Connect (destination charge: `application_fee_amount` + `transfer_data.destination`), executado pelo próprio Stripe — não mais um cálculo só de bookkeeping.
3. **Proprietário não abre conta Stripe própria visível** — fornece dados bancários e passa por KYC dentro (ou por um link hospedado a partir) da interface do ShareO. Se será Connect **Custom** (KYC 100% dentro da UI do ShareO) ou **Express** (onboarding hospedado pela própria Stripe) é decisão de implementação, ainda em aberto — ver "Riscos / Pendências".
4. **Liquidação:** Pix D+0/D+1, cartão à vista D+2 úteis, boleto D+2/D+3 — números fornecidos pelo sócio, a confirmar contra a documentação oficial da Stripe Brasil na fase de implementação.
5. **Notas fiscais:** ShareO emite NFS-e sobre os 15% de comissão; proprietário emite nota sobre os 85%. Seguimos o mesmo entendimento fiscal já registrado no parecer D4 para o modelo MP ("15% é receita da ShareO, 85% não é") — o racional não muda com a troca de PSP, mas a integração técnica de emissão não existe hoje para nenhum dos dois PSPs.
6. **Mercado Pago Modelo B fica DORMENTE, não removido** ⚠️ *(revisado em 24/08 — ver "Atualização 2026-08-24" no fim do documento)*: a flag `PlatformConfig.mercadoPagoEnabled` permanece com default OFF no código (já era o padrão antes desta decisão) — o código (OAuth, checkout, webhook) é preservado para não perder o investimento caso seja necessário reavaliar, mas sai do caminho de produção.
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
- [x] **Pix e boleto — RESOLVIDO em 20/08/2026 saindo os dois do checkout, por motivos diferentes.** Conferido no Dashboard da conta (`acct_1TbiQRPypC9cgCrs`): o **Pix não aparece nem na lista de métodos elegíveis** e o **boleto** está desabilitado, sob "Ação obrigatória", com botão "Solicitar acesso".
  - **Boleto: decisão dos fundadores (20/08) — não será usado.** Motivo técnico que a decisão original não conhecia: a tabela de capacidades da Stripe marca `✗ Partial refunds` e `✗ Full refunds` — **boleto não aceita reembolso nenhum**, nem contestação. Isso é incompatível com a política de cancelamento publicada (24h→100%, 24–6h→70%, <6h→50%), que seria inexecutável para quem pagasse por boleto; todo o caminho `charge.refunded` → reversão de `Transfer` nunca dispararia ali. **Coerente com a mesma decisão já tomada em 30/06/2026 para o Mercado Pago** (`docs/juridico/mp-pendencias-go-live.md`, item 3) — não é reversão de rumo, é a mesma conclusão pela segunda vez.
  - **Pix: bloqueado por pré-requisito da Stripe, não por configuração.** É **convite, não autoatendimento**, e o suporte exige *"good standing E no mínimo 60 DIAS de pagamentos processados"*. A ShareO processou **zero** pagamentos reais (produção travada pelo D4), então o Pix só é pedível ~60 dias **depois** do go-live com cartão. **Isso NÃO atrasa o lançamento** — o relógio só começa a contar depois dele.
  - **Confirmado pelo suporte da Stripe em 20/08/2026** (consulta aberta pelo Dashboard, com o desenho técnico descrito):
    - Os 60 dias contam do **primeiro pagamento em modo LIVE**; pagamentos em **modo de teste NÃO contam**. A ShareO só usou Stripe em teste no início do projeto, então o contador está em **zero**.
    - **Não dá para submeter antecipadamente.** O Pix "aparecerá automaticamente" nas configurações de métodos quando a conta ficar elegível — não há fila em que entrar antes.
    - **Existe caminho de exceção:** mesmo antes dos 60 dias é possível pedir uma **avaliação de risco do Pix** com caso de uso forte, e o próprio suporte citou "marketplace com CNPJ ativo e modelo de negócio bem definido" como exemplo. Vale usar pós-lançamento, com CNPJ ativo + parecer jurídico + modelo documentado.
    - Além do tempo, os critérios são **taxa de disputa historicamente baixa, sem problemas de risco anteriores e conta sem restrições**. **Não há volume mínimo.**
    - **A arquitetura foi validada por eles**, sem ressalvas: Connect com contas Express e configuration `recipient`, separate charges and transfers **sem** `on_behalf_of` ⇒ a conta da plataforma é o merchant of record; Pix é aceito porque a conta da plataforma é BR; e o Checkout hospedado suporta Pix. É confirmação independente do desenho implementado no #325.
  - **No lançamento: cartão de débito E crédito, à vista** (decisão dos fundadores, 20/08). Não exige mudança de código — a doc da Stripe é explícita que cartões são "vinculados a uma conta de **débito ou crédito**", então `["card"]` cobre os dois.
  - **🪤 Bandeiras — verificar ANTES de publicar copy.** A Stripe lista como aceitas sem configuração adicional: Visa, Mastercard, Amex, Discover/Diners, JCB, China UnionPay e eftpos. Duas ressalvas que atingem o Brasil: **Amex NÃO é aceito em contas do Brasil** (a tabela diz "todos os países, **exceto Brasil**, Malásia, Tailândia e Emirados Árabes"), e **Elo e Hipercard não aparecem na lista**. A copy antiga chegou a prometer "Elo, Hipercard, Amex" (ver `docs/juridico/copy-pagamento-stripe-connect.md`) — como a Elo tem peso relevante no Brasil, confirmar quais bandeiras a conta realmente processa antes de anunciar qualquer uma.
  - **Consequência no código:** `payment_method_types` voltou a `["card"]`. A lista é **explícita**, então um método não habilitado na conta faz a Checkout Session **falhar inteira** — deixá-la com `pix` enquanto o Pix não existe na conta significaria ninguém conseguir pagar **nem de cartão**.
  - **O que fica pronto para quando o Pix chegar:** os handlers `checkout.session.async_payment_succeeded`/`async_payment_failed` continuam no webhook, dormentes. São necessários porque o Pix é assíncrono, e mantê-los custa nada — quando o Pix for liberado, basta acrescentá-lo à lista e assinar os dois eventos.
- [ ] **Novos eventos precisam ser assinados no webhook clássico.** `checkout.session.async_payment_succeeded` e `checkout.session.async_payment_failed` são novos no endpoint `/api/webhooks/stripe`. Se não forem marcados no Dashboard, pagamento por Pix/boleto **nunca marca a reserva como paga** — e falha em silêncio, porque o `completed` chega normalmente (só que sem `payment_status: "paid"`).
- [x] **Staging:** a flag `mercadoPagoEnabled` foi desligada em `PlatformConfig` em 19/08/2026 via `scripts/disable-mercadopago-staging.ts --confirm` (estava ligada desde 30/06/2026).
- [x] **Split no checkout — implementado (19/08/2026), mas com mecanismo diferente do que o item 2 desta decisão descrevia originalmente.** "Destination charge" (`application_fee_amount`+`transfer_data.destination`) foi descartado — implementamos **"separate charges and transfers"**: o checkout cobra normalmente na conta da plataforma (só ganhou `payment_intent_data.transfer_group = bookingId`), e o `Transfer` pro proprietário é criado **depois**, no cron de repasse (`app/api/cron/payout/route.ts`), no mesmo ponto onde o repasse manual via PIX já acontecia — preserva a retenção de N dias após a devolução (proteção contra disputa) que já existia. A doc da Stripe confirma que `/v1/transfers` funciona normalmente contra uma connected account v2 com a capability `recipient.stripe_balance.stripe_transfers` (é literalmente o propósito dela). `source_transaction` na Transfer é **obrigatório** pra transferências envolvendo o Brasil. Não usa `application_fee_amount` — a taxa dos 15% fica implícita: só se transfere `ownerNetAmount` (85%), não o valor cheio.
- [x] **Webhooks de Connect via Event Destinations v2 — código implementado em 20/08/2026, falta a etapa manual no lado Stripe.** Achado em 19/08/2026: contas v2 não disparam o evento v1 `account.updated` no endpoint clássico (`app/api/webhooks/stripe/route.ts`) — é um mecanismo de assinatura diferente (`stripe.v2.core.eventDestinations`, eventos "thin"). Implementado: rota separada `app/api/webhooks/stripe-connect/route.ts` (usa `stripe.parseEventNotification`, não `constructEvent`) + `scripts/create-stripe-connect-event-destination.ts` para registrar o destination. **Pendente (não é código):** rodar o script com `--confirm` e gravar o `STRIPE_CONNECT_WEBHOOK_SECRET` retornado nas env vars do Vercel — só então a sincronização passa a funcionar fora do retorno do onboarding.

## Notas de implementação

- **Achado do levantamento técnico (19/08/2026):** hoje coexistem três caminhos de pagamento no código — Stripe Checkout simples, PIX manual da plataforma e Mercado Pago Modelo B — nenhum em produção (todos gated por D4). O split hoje calculado (`platformFeeRate`/`platformFeeAmount`/`ownerNetAmount` em `Booking`, via `calcSplit()` em `lib/platform-config.ts`) é só bookkeeping — não é executado por nenhum PSP.
- **Schema (implementado nesta mudança):** `OwnerPaymentAccount` ganhou os campos de Connect (`stripeAccountId`, `stripeConnectStatus`, `stripeChargesEnabled`, `stripePayoutsEnabled`, `stripeDetailsSubmitted`, `stripeDisabledReason`, `stripeConnectedAt`) e `Booking` ganhou `stripeConnectedAccountId` (auditoria de para qual connected account o split de cada reserva foi enviado). O campo `Booking.pixDeclaredAt` foi removido (migração `20260819120100_remove_platform_pix_manual`).
- **Plano técnico restante** (fora do escopo desta mudança de schema):
  1. ~~Onboarding do proprietário~~ — **implementado e validado em staging em 19/08/2026**, ver bloco abaixo.
  2. ~~Checkout com split~~ — **implementado em 19/08/2026** via separate charges and transfers (ver "Riscos/Pendências"). ~~Pix e boleto~~ — **adicionados em 20/08/2026** (ver bloco abaixo).
  3. ~~Webhooks de Connect~~ — **código implementado em 20/08/2026** (`app/api/webhooks/stripe-connect/route.ts`); falta só registrar o Event Destination no lado Stripe e gravar o secret (ver "Riscos/Pendências").
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
  - ~~**Gap conhecido, não implementado:** reversão de `Transfer` em caso de reembolso/disputa **depois** do repasse já ter acontecido.~~ — **resolvido para reembolso em 20/08/2026** (ver bloco abaixo); segue aberto só para **disputa perdida**.

- **Pix, boleto e reversão de Transfer — implementados em 20/08/2026** (as 3 pendências técnicas restantes do ADR; 18 testes verdes entre `__tests__/unit/lib/owner-transfer.test.ts` — a aritmética da reversão — e `__tests__/integration/api/stripe/webhook.test.ts` — o roteamento de eventos).
  - **Onde a lógica passou a morar.** As duas pontas do mesmo movimento de dinheiro ficavam em camadas diferentes (o `Transfer` nascia inline no cron, a reversão inline no webhook, conversando por um `metadata` Json não tipado). Agora as duas vivem em `lib/payments/owner-transfer.ts`, com o formato do metadata declarado uma vez (`OwnerTransferMetadata`). O envelope de idempotência da `StripeEventQueue`, que virou a segunda cópia quando o webhook de Connect apareceu, saiu para `lib/payments/stripe-event-queue.ts`. E os efeitos de "reserva paga" deixaram de ser uma terceira cópia: o webhook chama `markRentalPaid()` (`lib/payments/mark-booking-paid.ts`), que já existia para o Mercado Pago **e já tinha a guarda de idempotência que a cópia do Stripe não tinha** — sem ela, um retro-processamento regeraria o `pickupToken` e invalidaria o código que o locatário já tem em mãos. Risco que Pix/boleto agravam, porque o caminho Stripe passou a ter dois eventos distintos que marcam pago.
  - **Pix e boleto no checkout (item 1 da Decisão).** `payment_method_types: ["card", "boleto", "pix"]` em `app/api/payments/checkout/route.ts`. O Checkout hospedado coleta sozinho os dados extras que o boleto exige (CPF/nome) — não precisou de campo novo na nossa UI. Os dois cabem no teto de R$500 do MVP (`CHECKOUT_MAX_CENTS`): boleto aceita R$5–49.999,99 e Pix R$0,50–3.000 por transação. Parcelamento no crédito segue desabilitado (é o default do Checkout: sem `payment_method_options.card.installments`, não parcela).
  - **Consequência não óbvia — Pix e boleto são ASSÍNCRONOS.** Diferente do cartão, a Checkout Session dispara `checkout.session.completed` com `payment_status` ainda **não** `"paid"`: o pagamento confirma depois (Pix em minutos, boleto em até 1 dia útil). Sem tratar isso, um pagamento por Pix/boleto **nunca** marcaria a reserva como paga. Foram adicionados dois handlers no webhook: `checkout.session.async_payment_succeeded` (marca PAID, gera `pickupToken`, notifica — mesmo caminho do cartão, extraído para `handleCheckoutSessionPaid()`) e `checkout.session.async_payment_failed` (Pix expirado / boleto não compensado → limpa `stripeSessionId` pra permitir nova tentativa, sem tocar em reserva já paga).
  - **Reversão de `Transfer` — cobre reembolso E disputa perdida.** Os dois são o mesmo fato ("o dinheiro voltou pro locatário"), então há um caminho só: `reverseOwnerTransfer()` em `lib/payments/owner-transfer.ts`. Verifica se existe `PlatformTransaction` tipo `OWNER_PAYOUT` para a reserva (i.e. o repasse já saiu) e, se sim, reverte a parte **proporcional** via `stripe.transfers.createReversal()` — devolução de 50% do valor cobrado reverte 50% do repasse. É **cumulativo** (soma o que já foi revertido para o mesmo `transferId` e reverte só a diferença), então reembolso parcial em vários eventos converge sem estourar o "already reversed" da Stripe. Cada reversão grava seu `PlatformTransaction` (`REFUND`, com `stripeTransferId` + `stripeReversalId`) pra auditoria.
  - **A assinatura é em valores, não em `Stripe.Charge` — e foi isso que fechou o caso da disputa.** A primeira versão recebia o `Charge` e derivava tudo de `amount_refunded/amount`, o que fazia `charge.dispute.closed` parecer inalcançável ("faltaria um amount confiável"). Recebendo `clawbackAmount`/`chargedAmount`, os dois gatilhos servem: reembolso passa `charge.amount_refunded`/`charge.amount`; disputa perdida passa `dispute.amount`/`booking.totalPrice` (que é o próprio `unit_amount` mandado pra Checkout Session) — sem ida extra à API.
  - **Erro na reversão NÃO é engolido:** propaga, o evento vai pra `FAILED` e a Stripe retenta. Dinheiro parado no lugar errado não pode falhar em silêncio — e a `idempotencyKey` (o alvo acumulado de reversão) torna o retry inofensivo.

- **Webhook de Connect (Event Destinations v2) — código implementado em 20/08/2026.**
  - Rota **separada** do webhook v1: `app/api/webhooks/stripe-connect/route.ts`. Precisa ser separada porque a verificação de assinatura é outra função — `stripe.parseEventNotification()`, não `stripe.webhooks.constructEvent()` (que **recusa explicitamente** payload de evento thin, com erro dizendo pra usar a outra) — e o secret é outro (`STRIPE_CONNECT_WEBHOOK_SECRET`, gerado na criação do Event Destination, não o `STRIPE_WEBHOOK_SECRET` do endpoint clássico).
  - Eventos assinados (`lib/stripe-connect-events.ts`, fonte única lida pela rota E pelo script que registra o destination): `v2.core.account[configuration.recipient].capability_status_updated` (o principal — status de `payouts`/`stripe_transfers`) e `...[requirements].updated`. `...[configuration.recipient].updated` foi deliberadamente deixado de fora: dispara junto dos outros para a mesma mudança e só geraria uma segunda ida à API pelo mesmo estado. O handler passa a conta pro mesmo `syncStripeConnectAccount()` do retorno do onboarding — **ponto único de escrita** dos campos `stripe*` preservado — e reusa a `StripeEventQueue` pra dedup.
  - **🪤 ARMADILHA (achada na revisão, antes de ir pro ar): NÃO usar `notification.fetchRelatedObject()`.** O SDK faz um GET simples, e na v2 `configuration.recipient` e `requirements` são campos **opt-in** (`include`). Sem eles o Account volta sem capabilities, `deriveStripeConnectStatus()` concluiria `ONBOARDING` e o webhook **rebaixaria uma conta que estava `ACTIVE`** — quebrando o repasse de quem já estava recebendo, silenciosamente e a cada evento. A rota refaz o `accounts.retrieve(id, { include: [...] })`, igual ao que `app/api/stripe/connect/return/route.ts` já fazia.
  - **Passo manual pendente (não é código):** rodar `pnpm tsx scripts/create-stripe-connect-event-destination.ts --confirm` e gravar o `signing_secret` retornado como `STRIPE_CONNECT_WEBHOOK_SECRET` no Vercel. A Stripe só mostra esse secret **uma vez**, na criação. Sem esse passo a rota existe mas nunca recebe evento — a sincronização continua dependendo só do retorno do onboarding (funciona, mas não captura mudança de status que aconteça fora de uma visita do proprietário à tela, ex.: a Stripe suspender a conta depois).

- **🪤 `lib/stripe.ts` não pode importar `next/server`.** O envelope de verificação de assinatura (`verifyStripeWebhookRequest`) devolve `NextResponse`, e colocá-lo em `lib/stripe.ts` arrastou `next/server` pra dentro do módulo do cliente Stripe. `lib/stripe-connect.ts` importa `lib/stripe.ts`, e o teste dele roda em jsdom — que não tem o global `Request` que `next/server` exige. Resultado: uma suíte inteira quebrou por um import que nada tinha a ver com ela. O envelope mora em `lib/payments/stripe-webhook.ts`, junto de `stripe-event-queue.ts`; `lib/stripe.ts` fica cliente puro.
- **Timeout do cliente Stripe (achado na 2ª revisão).** `lib/stripe.ts` usava os defaults do SDK: 80s de timeout e 2 retries — uma única chamada travada pode consumir ~240s. O cron de repasse tem orçamento de 60s e processa um lote de 10, então o default deixaria uma chamada lenta estourar a execução inteira e os outros repasses ficarem sem vez. Agora: `timeout: 15s`, `maxNetworkRetries: 1`.
- **Deixado de fora de propósito (candidatos a mudança própria, não a esta):**
  - **Paralelizar o cron de repasse em lotes.** `app/api/cron/reminders/route.ts` já tem um `processInBatches` (paralelo dentro do lote, sequencial entre lotes) que serviria. Mexer no fluxo de controle de movimentação de dinheiro sem conseguir exercitá-lo ponta a ponta merece revisão própria; o timeout acima já corta o pior caso.
  - **Índice em `Booking.stripePaymentIntentId`.** Os handlers de reembolso e disputa filtram por essa coluna, que não tem índice — hoje é seq scan. Inofensivo no tamanho atual da tabela, mas é o único ponto que piora com o crescimento. Exige migração.
  - **Trocar o `findUnique`+`upsert` da fila de eventos por create-first com catch de P2002** (1 ida ao banco em vez de 2 na entrega normal). É mudança na semântica de idempotência de um caminho de dinheiro — não vale carona.

## Como verificar (nada disto foi exercitado em staging ainda)

O código está no ar, mas **nada foi exercitado ponta a ponta** — diferente do onboarding Express, que foi. Passos pendentes, em ordem:

1. **Resolver a tarefa VENCIDA da conta Stripe.** Em 20/08 o Dashboard exibe *"Vários recursos pausados — uma tarefa obrigatória está vencida"*, e **Cartões aparece como "Ação necessária"** na configuração `Default`. **Enquanto isso não fecha, nem cartão cobra** — é o único item que impede qualquer pagamento, e por isso vem primeiro. O suporte da Stripe informou o **prazo (19/08/2026, já vencido)** e nomeou os três itens, que a tela não detalha: **data de nascimento válida**, **documento de identidade com foto válido** e **atualização das informações do representante da conta**. ⚠️ O item da data de nascimento merece atenção: o cadastro **já traz** uma data (30/09/1965), então ela foi rejeitada ou não bate com o documento — conferir se o que está no Stripe é idêntico ao documento enviado, em vez de reenviar o mesmo. Documentação enviada pelo representante em 20/08; **confirmar que foi aceita, não só entregue** (o envio ocorreu após o prazo).
2. **Registrar o Event Destination** de Connect: `pnpm tsx scripts/create-stripe-connect-event-destination.ts --confirm` (rodar o dry-run antes), e gravar o `signing_secret` como `STRIPE_CONNECT_WEBHOOK_SECRET` no Vercel. A Stripe só mostra esse valor **uma vez**. ⚠️ `STRIPE_SECRET_KEY` está **vazia no `.env.local`** — a chave só existe nas env vars do Vercel, então o script não roda local sem alguém colocá-la lá.
3. **Exercitar em staging:** um reembolso de uma reserva cujo repasse já saiu confirma a reversão de `Transfer`. O caminho do repasse exige uma reserva até a devolução + a janela de elegibilidade + o cron rodando.

**Não estão mais nesta lista:** habilitar Pix e boleto (os dois saíram do checkout — ver "Riscos / Pendências") e marcar os eventos `async_payment_*` no webhook (só fazem falta quando o Pix entrar, ~60 dias após o go-live com cartão).

Até isso acontecer, o estado honesto é **"implementado, aguardando verificação"** — não ✅.

## Decisões relacionadas

- **Supersede [[ADR-026-pagamentos-mercado-pago-modelo-b]]** — mantém o objetivo de afastar o merchant-of-record centralizado, mas troca o PSP e o desenho de onboarding do proprietário. Era supersessão *parcial* até 24/08/2026; passou a total (ver "Atualização" abaixo).
- [[ADR-012-modelo-pix-centralizado]] — modelo original (merchant of record), já superado por ADR-026.
- [[ADR-013-webhook-queue]] — reaproveita o padrão de fila idempotente (`StripeEventQueue`), agora também para eventos de Connect.
- [[ADR-014-payout-trigger]] — gatilho de repasse; com destination charges o repasse deixa de depender do cron/admin manual.
- D4 — consulta jurídica: [[project-d4-juridico]] — pendência de confirmar se o parecer cobre o desenho Connect (ver "Riscos / Pendências").


---

## Atualização — 2026-08-24: o Mercado Pago sai de cena por completo

**Decisão do fundador:** o Mercado Pago **não será utilizado**. A Stripe é o PSP, sem plano B ativo.

Isto muda duas coisas que este ADR havia deixado em aberto em 19/08.

**1. A supersessão do [[ADR-026-pagamentos-mercado-pago-modelo-b]] vira total.** Em 19/08 o ADR-026 foi superado só quanto ao PSP escolhido, e o Modelo B seguia como caminho de volta. Não segue mais.

**2. A pendência jurídica B1 fecha.** O B1 do `docs/juridico/checklist-conformidade-juridica.md` era *constituir a PJ* + *contratar o PSP*, e a metade travada era o **contrato do Mercado Pago**, que exigia negociação e assinatura. Esse contrato **deixa de existir como pendência**: a relação com a Stripe se formaliza pela aceitação eletrônica do Stripe Services Agreement no cadastro da conta plataforma, não por instrumento assinado à parte. O que sobrava do B1 era uma **confirmação**, não uma negociação: que a conta plataforma na Stripe estivesse no **CNPJ 68.512.556/0001-09**, e não no CPF de um sócio. O fundador confirmou no mesmo dia — conta `acct_1TbiQR…` ("Shareo Marketplace") no CNPJ da PJ, endereço comercial batendo com o Comprovante de Situação Cadastral. **B1 fechado.** É essa titularidade que sustenta o desenho de "a ShareO não é merchant of record".

**Com isso, o D4 volta a ser o único bloqueador `🔒` de go-live** — e agora com um item novo dentro dele, a transferência internacional (abaixo).

### ⚠️ Consequência que NÃO é troca de nome: transferência internacional

O parecer jurídico e o RIPD foram escritos com o **Mercado Pago**, entidade **brasileira**, como operador dos dados de pagamento. A **Stripe é estrangeira**. Compartilhar dados pessoais com ela é **transferência internacional** (LGPD art. 33) — outra base legal, outra análise de risco, outra redação na Política de Privacidade.

Isso **não se resolve** trocando "Mercado Pago" por "Stripe" nos documentos. Precisa passar pelo jurídico (é matéria do D4). Atinge `docs/juridico/transferencia-internacional-dados.md`, `rascunho-ripd.md` e o item **C4** do checklist — todos ainda escritos na hipótese "operador no Brasil".

### O código dormente do MP — **decisão nº 6 REVOGADA**

A decisão nº 6 deste ADR preservou OAuth, checkout e webhook do MP atrás da flag `mercadoPagoEnabled` (default OFF), para não perder o investimento caso fosse preciso reavaliar. Com o MP descartado isso virou peso morto, e **o fundador decidiu arrancar** (24/08/2026).

**Removido do código:**

| O quê | Onde |
|---|---|
| SDK | dependência `mercadopago` (package.json + lockfile) |
| Integração | `lib/mercadopago.ts` |
| Rotas | `/api/mp/oauth/callback`, `/api/mp/webhook`, `/api/payments/mp/checkout`, `/api/payments/mp/connect` |
| UI web | `MpPayButton`, bloco "Receber pelo Mercado Pago" em `/perfil/recebimentos`, banner de retorno do OAuth (`?mp=`) |
| UI app | mutation de checkout e botão "Pagar reserva" em `apps/mobile/app/reservas/[id].tsx` |
| Config | flag `mercadoPagoEnabled` e `getMercadoPagoConfig()` |
| Testes/scripts | `__tests__/integration/api/mp/`, `scripts/disable-mercadopago-staging.ts` |

**Banco:** os campos também saíram, pela migração `20260824190000_remove_mercado_pago` — 9 colunas (`Booking.mpPreferenceId`/`mpPaymentId` e os 7 `mp*` de `OwnerPaymentAccount`), a tabela `mercado_pago_event_queue` e a linha `mercadoPagoEnabled` de `platform_configs`.

É **destrutiva** e foi autorizada com escopo explícito, depois de conferir o que existia em staging: 1 reserva com preference/payment, 1 conta com tokens OAuth criptografados e 12 linhas na fila — tudo do sandbox, nenhuma transação real. Apagar os tokens de terceiro é também higiene de segurança: nenhum código restante conseguiria renová-los, revogá-los ou re-cifrá-los numa rotação de chave.

🪤 Duas armadilhas que o ensaio pegou antes do merge: a tabela é `platform_configs` (plural, o `@@map` pluraliza) — no singular a migração aborta e o `migrate deploy` a marca como FALHADA, **travando todos os deploys seguintes**; e as migrations históricas do MP (`20260629…`, `20260630…`) ficam **intocadas**, porque o Prisma guarda checksum por migração e editá-las quebraria `migrate deploy` em todo ambiente que já as aplicou.

🪤 **Consequência para o app:** o botão "Pagar reserva" chamava a rota do MP e virou um atalho para pagar no site. Na prática nada regrediu — com a flag desligada ele já só produzia "pagamento indisponível".

E o caminho de pagamento do app **já estava quebrado na volta antes desta remoção**: a rota do MP mandava `back_urls` para `shareo://pagamento/sucesso`, mas não existe rota `pagamento` em `apps/mobile/app/` nem nenhum listener de deep-link no app inteiro — o retorno cairia no not-found. Portar o checkout Stripe (PSP-03) tem, portanto, uma perna barata (trocar `auth()` por `resolveUserId`, padrão já pronto em `/api/payments/stripe/connect`) e uma cara, que é o retorno — `success_url` da Stripe é http(s) e não aceita scheme customizado, então precisa de página-ponte no site ou `openAuthSessionAsync`. Isso é trabalho novo, não paridade.

---

## Atualização — 2026-09-03: os reflexos jurídicos da troca de PSP

A decisão foi registrada como técnica e de produto. Faltava o outro lado: **trocar de PSP mudou premissas do parecer jurídico D4**, e isso não estava escrito em lugar nenhum da ADR.

### O que a troca mexeu, ponto a ponto

**1. Custódia do valor (Lei 12.865/2013) — o mais pesado.** O parecer afastou o enquadramento como instituição de pagamento sobre a premissa de que *"a ShareO não retém nem custodia"*. A implementação escolhida aqui — **separate charges and transfers**, adotada em 19/08 no lugar do destination charge para preservar a retenção contra disputa — faz o valor cheio **ficar na conta da ShareO na Stripe por 3 dias após a devolução** (`DEFAULT_PAYOUT_WINDOW_DAYS`). É factualmente outro desenho.

> 🪤 Esta consequência estava implícita na escolha técnica e ninguém a levou ao jurídico. A escolha foi certa pelo motivo de produto; o que faltou foi notar que ela reabria uma pergunta já respondida.

**2. Transferência internacional (LGPD art. 33).** O Mercado Pago é brasileiro; a Stripe não. Os pagamentos **mudaram de lado** no inventário — passaram a sair do Brasil, levando os dados mais sensíveis do fluxo (identificação das duas partes, valores, e dados bancários de quem anuncia). Aplicado em 03/09: a Política de Privacidade ganhou a **seção 4.1**, declarando o fato ao titular. **Não declara mecanismo do art. 33** — o DPA não foi firmado, e afirmar garantia inexistente é o defeito que estamos eliminando.

**3. PLD/FT.** A resposta B4 concluiu que a ShareO não é sujeito obrigado *porque o PSP assume KYC/KYB*. Isso continua verdade na prática — a verificação roda inteira dentro do Connect —, mas **a conclusão pode depender de o PSP ser autorizado pelo BACEN**, condição que o MP cumpria de forma direta.

**4. Fiscal.** A decisão B2 (15% receita / 85% em trânsito) foi tomada antes de duas coisas: o valor passar pela conta da plataforma e o regime ser definido como **Simples Nacional** (03/09), onde a apuração parte da receita bruta.

### O que foi feito e o que ficou

| | |
|---|---|
| Inventário de transferência internacional | ✅ corrigido — a Stripe estava classificada como "inativa, risco baixo" |
| Política de Privacidade | ✅ seção 4.1 publicada (site e app) |
| Onde o KYC acontece | ✅ documentado no checklist |
| DPA com a Stripe + mecanismo do art. 33 | ⬜ **pendente — bloqueia go-live** |
| Custódia / Lei 12.865 | ⬜ **pendente com a advogada** — é o único que pode mexer no produto |
| Tratamento dos 85% no Simples | ⬜ pendente com a Contabilizei |

Documentos: [`ressalva-psp-stripe-2026-09-03.md`](../juridico/ressalva-psp-stripe-2026-09-03.md) · [`roteiro-advogada-lei-12865-2026-09-03.md`](../juridico/roteiro-advogada-lei-12865-2026-09-03.md) · [`roteiro-contabilizei-simples-nacional-2026-09-03.md`](../juridico/roteiro-contabilizei-simples-nacional-2026-09-03.md)
