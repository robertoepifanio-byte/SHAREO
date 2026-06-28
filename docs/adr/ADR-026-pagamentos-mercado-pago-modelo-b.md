# ADR-026 — Pagamentos via Mercado Pago (Modelo B — Split/Marketplace)

**Status:** Accepted (decisão dos fundadores, 2026-06-28) — **implementação pendente**; produção **gated por D4** (parecer FORMAL). **Supersede [[ADR-012-modelo-pix-centralizado]]**.
**Data:** 2026-06-28
**Decisores:** Fundadores, Arquiteto, Product Owner — com base no parecer jurídico (D4).
**Contexto:** ShareO — módulo financeiro.

---

## Contexto

O modelo do MVP ([[ADR-012-modelo-pix-centralizado]]) era *merchant of record*: a ShareO recebia 100% do pagamento, retinha 15% e repassava ao proprietário. O **parecer jurídico (D4, preliminar/em revisão)** apontou esse desenho como o **maior risco regulatório**: receber e repassar dinheiro de terceiros pode **enquadrar a ShareO como instituição/arranjo de pagamento** (Lei 12.865/2013), exigindo autorização do BACEN, com implicações de **PLD/FT** (Lei 9.613/1998). Recomendação do parecer: **terceirizar o arranjo a um PSP licenciado**, com **split/escrow**, usando **conta PJ** (nunca pessoal — hoje o staging usa, temporariamente, a chave PIX pessoal de um sócio).

Alternativas avaliadas:
- **Manter PIX centralizado (Stripe / merchant of record):** mantém o risco da Lei 12.865.
- **Mercado Pago — Modelo A (gateway simples):** 1 conta MP recebe tudo, repasse manual. ~1:1 do Stripe; mais rápido, mas **mantém** o merchant of record.
- **Mercado Pago — Modelo B (split/marketplace):** cada locador conecta conta MP (OAuth); o MP divide o pagamento; a taxa de 15% vira `marketplace_fee`. **Afasta** o enquadramento (o valor do locador não transita pela ShareO).

## Decisão

Adotar **Mercado Pago como PSP, no Modelo B (split/marketplace)**:

1. Cada **proprietário** conecta uma conta Mercado Pago via **OAuth** ("Conectar Mercado Pago"); a conta de recebimento da plataforma é **PJ da ShareO**.
2. No checkout, o pagamento é criado com **split**: o locador recebe sua parte direto e a ShareO retém **15%** como `marketplace_fee` (via `getPlatformFeeRate()`), mantendo o teto de **R$ 500/transação** e os guards atuais (CONFIRMED/dono/`calcSplit`).
3. Confirmação por **webhook** do MP (2 tempos: `data.id` → `GET /v1/payments/{id}` → status `approved`), idempotente (`PaymentEventQueue`).
4. **Repasse semanal** (decisão dos fundadores).
5. Implementação **faseada e atrás de flag**, sem tocar no fluxo atual até validar: Fundação + OAuth → checkout split + webhook → validação no sandbox (usuários/cartões de teste do MP) → **só então** remover o PIX manual (chave pessoal) e a integração Stripe.

**Pré-condições / bloqueadores:**
- Credenciais de teste do **app MP (marketplace)**: `Client ID`/`Client Secret`/`Access Token`/webhook (a serem fornecidas pelos fundadores).
- **Parecer jurídico FORMAL** (D4) + contrato com o PSP + conta PJ ativa **antes de qualquer go-live**.

## Consequências

### Positivas
- **Afasta o maior risco regulatório** (Lei 12.865): o PSP licenciado assume o arranjo; a ShareO não retém dinheiro de terceiros.
- Reduz exposição de **PLD/FT** (parte da obrigação recai sobre o PSP).
- MP é nativo BR (PIX/cartão/boleto) com **confirmação automática** — aposenta o checkout PIX manual temporário.
- **Repasse automático** pelo split — elimina o gargalo do repasse manual ([[ADR-012-modelo-pix-centralizado]]).

### Negativas / Trade-offs
- **Onboarding novo no fluxo do locador:** cada proprietário (inclusive PF) precisa **conectar conta MP** (OAuth) — fricção adicional, inerente ao split (equivalente ao Stripe Connect).
- Implementação maior (~2-3 semanas) vs. o Modelo A.
- Dependência de PSP externo (tarifas, disponibilidade, regras do MP).
- **Nenhum go-live antes do parecer FORMAL (D4).**

## Notas de implementação
- **Achado (2026-06-28):** não há "rotinas de Stripe Connect" no código — é **Stripe Checkout normal** (a UI do Connect estava apenas oculta). O pagamento **ativo** no staging é o **PIX manual** (chave pessoal do sócio, via `platformPix*` em `lib/platform-config.ts`). "Remover o legado" = retirar o PIX-manual-pessoal + a integração Stripe Checkout (`lib/stripe.ts`, checkout/webhook Stripe, refs em ambassador/referral/cron/admin).
- Superfície técnica e plano faseado: `docs/backlog-atividades-priorizadas.md` (seção Mercado Pago) e memória [[project-mercadopago-migration]].
- Conformidade jurídica rastreada em `docs/checklist-conformidade-juridica.md`.

## Decisões relacionadas
- **Supersede [[ADR-012-modelo-pix-centralizado]]** (merchant of record / PIX centralizado).
- [[ADR-013-webhook-queue]] — processamento idempotente de eventos de pagamento (reusar `StripeEventQueue` → `PaymentEventQueue`).
- [[ADR-014-payout-trigger]] — gatilho de repasse (agora via split do MP).
- [[ADR-015-caucao-mvp-adiado]] — sem caução no MVP (risco alocado ao locatário; ver parecer/CDC).
- D4 — consulta jurídica: [[project-d4-juridico]].
