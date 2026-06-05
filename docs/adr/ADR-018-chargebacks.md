# ADR-018 — Gestão de Chargebacks: Bloqueio Automático + Resolução via Webhook

**Status:** Accepted
**Data:** 2026-06-05
**Decisores:** Arquiteto, Product Owner
**Contexto:** ShareO — módulo financeiro Fase 3

---

## Contexto

Quando um pagador contesta uma cobrança no cartão de crédito (chargeback), o Stripe abre uma disputa (`charge.dispute.created`). Durante esse período:

- O valor disputado fica retido pelo Stripe — o repasse ao proprietário não pode ocorrer.
- A disputa pode ser ganha (valor retorna à plataforma), perdida (valor fica com o comprador) ou encerrada sem penalidade.
- O prazo para responder à disputa no Stripe é tipicamente 7–21 dias dependendo da bandeira.

Sem controle, o cron de payout poderia transferir valor ao proprietário enquanto o Stripe retém o mesmo valor, gerando saldo negativo na conta da plataforma.

## Decisão

1. **Webhook `charge.dispute.created`**: marca a `Booking` com `status = DISPUTED` e salva `stripeDisputeId`. Notifica todos os usuários com `adminRole = ADMIN_FINANCEIRO` via notificação in-app.
2. **Bloqueio automático no cron**: `findMany` de payouts filtra `booking.status != DISPUTED` — nenhum repasse é processado para bookings em disputa.
3. **Webhook `charge.dispute.closed`**: resolve automaticamente com base em `dispute.status`:
   - `lost` → `Booking.status = CANCELLED` (sem repasse, disputa perdida)
   - qualquer outro (`won`, `warning_closed`, etc.) → `Booking.status = COMPLETED` (volta ao fluxo normal, payout elegível no próximo cron)
4. **Sem intervenção manual obrigatória** para abertura/fechamento — o webhook cuida do ciclo completo.
5. O painel `/admin/financeiro` exibe seção "Disputas abertas" em vermelho com `stripeDisputeId`, valor e link para a reserva.

## Consequências

### Positivas
- Proteção contra saldo negativo: repasse nunca sai durante disputa ativa.
- Resolução automática via webhook elimina trabalho manual para o admin.
- Visibilidade imediata: painel e notificação in-app alertam o time financeiro.

### Negativas / Trade-offs
- Proprietário fica bloqueado sem aviso direto — MVP não envia e-mail ao proprietário sobre a disputa (V1+: notificar proprietário com orientações).
- Se o Stripe falhar em entregar o webhook `closed`, a booking fica presa em `DISPUTED` indefinidamente. Mitigação: admin pode alterar status manualmente pelo painel de repasses.
- Não há integração com o painel de disputas do Stripe Dashboard — o admin precisa acessar o Stripe para responder à contestação.

## Decisões relacionadas

- [[ADR-013-webhook-queue]] — fila de eventos Stripe; chargebacks seguem o mesmo padrão de handlers
- [[ADR-014-payout-trigger]] — trigger de payout respeita status DISPUTED via filtro no cron
- [[ADR-012-modelo-pix-centralizado]] — repasse PIX só ocorre após resolução da disputa
