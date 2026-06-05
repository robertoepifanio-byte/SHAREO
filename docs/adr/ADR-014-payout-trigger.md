# ADR-014 — Trigger de Payout: Cron Diário + Hold de 3 Dias

**Status:** Accepted
**Data:** 2026-06-05
**Decisores:** Arquiteto, Product Owner
**Contexto:** ShareO — módulo financeiro

---

## Contexto

Após a devolução confirmada de um item, o proprietário precisa receber o repasse. A decisão envolve dois parâmetros:

**Quando disparar o payout:**
- Evento-driven (imediatamente após confirmação): máxima agilidade, porém exige Inngest ou similar para confiabilidade — fora do escopo MVP.
- Cron periódico: compatível com a arquitetura atual (ADR-013), previsível e monitorável.

**Período de hold:**
- Sem hold: proprietário recebe imediatamente após devolução confirmada; sem janela para resolver disputas (item danificado, devolução parcial).
- Hold de 3 dias: tempo suficiente para o proprietário registrar ocorrências antes do dinheiro sair da plataforma.
- Hold de 7 dias: mais proteção, porém prejudica a experiência do proprietário sem justificativa proporcional no MVP.

Referência de mercado: Airbnb pratica hold de 24h; Mercado Livre de 3 a 14 dias dependendo do vendedor.

## Decisão

1. Campo `Payout.eligibleAfter = devolucao_confirmada_at + 3 dias`.
2. Cron Vercel roda diariamente às **10h BRT** (13h UTC, fora do pico de transações PIX).
3. Query: `WHERE status = 'PENDING' AND eligibleAfter <= now()`.
4. Cada `Payout` processado registra `processedAt`, `pixTxId` (chave de transação) e transita para `COMPLETED` ou `FAILED`.
5. No MVP, o repasse PIX é executado manualmente pelo admin financeiro (ADMIN_FINANCEIRO); o cron gera a fila de pagamentos pendentes e envia notificação interna.

## Consequências

### Positivas
- Proprietário sabe exatamente quando receberá (devolução + 3 dias corridos).
- Janela de hold reduz chargebacks e disputas por dano.
- Execução às 10h evita concorrência com pico de PIX (horário comercial matutino).

### Negativas / Trade-offs
- Proprietário aguarda mínimo de 3 dias após devolução confirmada.
- Cron diário significa que atrasos no cron atrasam todos os payouts do dia.
- Repasse manual no MVP exige disciplina operacional da equipe financeira.

## Decisões relacionadas

- [[ADR-012-modelo-pix-centralizado]] — define que o repasse é via PIX manual no MVP
- [[ADR-013-webhook-queue]] — confirmação de devolução pode vir de evento webhook
- [[ADR-015-caucao-mvp-adiado]] — ausência de caução simplifica o cálculo do valor de payout
