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
- [ ] **Custom vs. Express.** Custom dá mais controle e mantém a marca ShareO no onboarding, mas transfere mais responsabilidade de compliance (KYC, coleta de documento) para a ShareO. Express reduz esse escopo mas expõe a marca Stripe durante o onboarding do proprietário. Decisão técnica a ser tomada na fase de desenho detalhado (ver plano de implementação).
- [ ] **Timing de liquidação real.** D+0/D+1 (Pix), D+2 (cartão), D+2/D+3 (boleto) foram fornecidos pelo sócio; confirmar contra a documentação oficial da Stripe para Connect no Brasil antes de comunicar esses prazos a proprietários.
- [ ] **NFS-e sobre a comissão.** Nenhuma integração técnica de emissão existe hoje (nem havia para o MP). Precisa de fornecedor (Focus NFe, eNotas, API municipal etc.) e vira trabalho novo independente do PSP escolhido.
- [ ] **Staging:** a flag `mercadoPagoEnabled` está ligada em `PlatformConfig` desde 30/06/2026 (validação end-to-end feita naquela data). Precisa ser desligada nesse ambiente (delete/`false` na linha correspondente) — é uma alteração de dado em staging, fora do escopo desta migração de schema.

## Notas de implementação

- **Achado do levantamento técnico (19/08/2026):** hoje coexistem três caminhos de pagamento no código — Stripe Checkout simples, PIX manual da plataforma e Mercado Pago Modelo B — nenhum em produção (todos gated por D4). O split hoje calculado (`platformFeeRate`/`platformFeeAmount`/`ownerNetAmount` em `Booking`, via `calcSplit()` em `lib/platform-config.ts`) é só bookkeeping — não é executado por nenhum PSP.
- **Schema (implementado nesta mudança):** `OwnerPaymentAccount` ganhou os campos de Connect (`stripeAccountId`, `stripeConnectStatus`, `stripeChargesEnabled`, `stripePayoutsEnabled`, `stripeDetailsSubmitted`, `stripeDisabledReason`, `stripeConnectedAt`) e `Booking` ganhou `stripeConnectedAccountId` (auditoria de para qual connected account o split de cada reserva foi enviado). O campo `Booking.pixDeclaredAt` foi removido (migração `20260819120100_remove_platform_pix_manual`).
- **Plano técnico restante** (fora do escopo desta mudança de schema):
  1. Onboarding do proprietário (criação da connected account + coleta de dados bancários + KYC — Custom ou Express).
  2. Checkout com Pix + boleto + cartão à vista e split via `transfer_data`/`application_fee_amount`.
  3. Webhooks de Connect (`account.updated`, `payout.paid`, `transfer.created`) somados ao webhook Stripe já existente.
  4. Desligar o Mercado Pago em staging (flag) e remover o PIX manual pessoal do código.
  5. Integração de NFS-e sobre a comissão.
  6. Atualizar `CLAUDE.md`, `docs/STATUS.md` e o card estático de `app/admin/financeiro/page.tsx` para refletir a decisão.

## Decisões relacionadas

- **Supersede parcialmente [[ADR-026-pagamentos-mercado-pago-modelo-b]]** — mantém o objetivo de afastar o merchant-of-record centralizado, mas troca o PSP e o desenho de onboarding do proprietário.
- [[ADR-012-modelo-pix-centralizado]] — modelo original (merchant of record), já superado por ADR-026.
- [[ADR-013-webhook-queue]] — reaproveita o padrão de fila idempotente (`StripeEventQueue`), agora também para eventos de Connect.
- [[ADR-014-payout-trigger]] — gatilho de repasse; com destination charges o repasse deixa de depender do cron/admin manual.
- D4 — consulta jurídica: [[project-d4-juridico]] — pendência de confirmar se o parecer cobre o desenho Connect (ver "Riscos / Pendências").
