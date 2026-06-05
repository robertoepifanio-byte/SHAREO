# ADR-013 — Processamento de Webhooks Stripe via Queue + Cron

**Status:** Accepted
**Data:** 2026-06-05
**Decisores:** Arquiteto, Product Owner
**Contexto:** ShareO — módulo financeiro

---

## Contexto

Eventos Stripe (ex: `payment_intent.succeeded`, `payment_intent.payment_failed`) precisam ser processados de forma **idempotente e resiliente**. Falhas de rede ou reprocessamentos não podem gerar pagamentos duplicados ou estados inconsistentes.

Alternativas avaliadas:

- **Processamento síncrono no webhook handler:** simples, mas sem proteção contra timeout de 10s da Vercel em lógica pesada; falha silenciosa se o handler cair após confirmar `200` ao Stripe.
- **Inngest:** plataforma de background jobs com retry nativo, DX excelente. Adiciona dependência de serviço externo pago; latência de centenas de ms é aceitável, mas onboarding de conta no MVP não se justifica.
- **Tabela `StripeEventQueue` + cron:** processamento assíncrono dentro da própria infraestrutura Supabase/Vercel, sem dependência externa.

O MVP não tem requisito de processamento em tempo real — atraso de até 24h entre o pagamento e a atualização do status da locação é aceitável para a fase inicial.

## Decisão

Adotar tabela `StripeEventQueue` no banco Prisma com cron diário:

1. Webhook handler do Stripe persiste o evento bruto (`stripeEventId`, `type`, `payload`, `status: PENDING`) e retorna `200` imediatamente.
2. Idempotência garantida por `UNIQUE(stripeEventId)` — reenvios do Stripe são descartados com `ON CONFLICT DO NOTHING`.
3. Cron Vercel (`/api/cron/process-stripe-events`) roda diariamente às 10h BRT, processa eventos `PENDING` em ordem de `createdAt`.
4. Eventos com falha transitam para `FAILED` após 3 tentativas; alertas via log estruturado.
5. Migração para **Inngest** avaliada na V2, quando volume de locações justificar processamento near-real-time.

## Consequências

### Positivas
- Zero dependência de serviço externo adicional no MVP.
- Idempotência nativa por constraint de banco.
- Handler de webhook nunca bloqueia — responde `200` em < 100ms.

### Negativas / Trade-offs
- Latência de até 24h entre pagamento confirmado e atualização de status na plataforma.
- Cron diário é ponto único de falha; monitoramento manual necessário no MVP.
- Reprocessamento manual de eventos `FAILED` requer intervenção de admin.

## Decisões relacionadas

- [[ADR-012-modelo-pix-centralizado]] — eventos PIX são a principal fonte de webhooks
- [[ADR-014-payout-trigger]] — cron de payouts compartilha janela de execução com este cron
