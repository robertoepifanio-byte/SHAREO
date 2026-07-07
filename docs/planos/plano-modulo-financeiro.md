# Plano de Desenvolvimento — Módulo Financeiro ShareO

**Versão:** 1.1  
**Criado em:** 2026-06-05  
**Atualizado em:** 2026-06-05 (correção D2)  
**Base:** Relatório de Análise Crítica (v1.0, 05/06/2026) + Decisões dos Fundadores

---

## Decisões dos Fundadores (base deste plano)

| # | Decisão | Impacto no plano |
|---|---|---|
| D1 | **PIX apenas no MVP.** Stripe Connect BR reavaliado em ~6 meses. Código Stripe Test preservado, mas invisível na UI. | Elimina B1 e B3 como bloqueadores. FIN-1 reescrito para cadastro de chave PIX. |
| D2 | **Sem caução no MVP.** Locação limitada a itens com valor total até R$ 500. FIN-6 (Caução) adiado para V1-Financeiro. | Elimina FIN-6 e SEC-FIN-7/9 do MVP. Adiciona validação de teto de R$ 500 no checkout. |
| D3 | **Roles admin implementadas agora** (pré-requisito financeiro). | B2 resolvido na Fase 1 antes de qualquer épico financeiro. |
| D4 | **Consulta jurídica em análise** (Lei 12.865/2013). | Nenhum go-live em produção antes de retorno jurídico. |

---

## Bloqueadores e status pós-decisões

| Bloqueador | Status | Como resolvido |
|---|---|---|
| B1 — Stripe Connect BR aprovação restrita | ✅ Eliminado | Decisão D1: modelo PIX centralizado |
| B2 — Roles admin inexistentes | 🔴 Resolve na Fase 1 | SEC-FIN-1 é a primeira entrega |
| B3 — Webhook Connect separado | ✅ Eliminado | Não haverá contas Connect no MVP |
| B4 — Status DISPUTED inexistente | 🔴 Resolve na Fase 1 | SEC-FIN-4 incluído na semana 2 |

---

## Visão geral das fases

| Fase | Período estimado | Resultado |
|---|---|---|
| Fase 0 — Decisões e ADRs | 2 dias | ADRs 012-017 escritos; Stripe Test ocultado |
| Fase 1 — MVP-Financeiro (parte 1) | Semanas 1-2 | Roles, schema, cadastro PIX, split no checkout |
| Fase 2 — MVP-Financeiro (parte 2) | Semanas 3-5 | Repasse, dashboards, auditoria |
| Fase 3 — V1-Financeiro | Semanas 6-10 | Caução PIX, chargebacks, exportações |
| Fase 4 — V2-Financeiro | Semanas 11-13 | Relatório mensal, informe IR, reavaliação Connect |

**Caminho crítico total:** ~13 semanas.  
**Pré-requisito absoluto:** Supabase production criado e validado (previsto julho/2026).

---

## Fase 0 — Decisões e ADRs
**Duração:** 2 dias  
**Quem:** Arquiteto + PO

### Entregas

| ADR | Decisão a documentar |
|---|---|
| ADR-012 | Modelo PIX centralizado (sem Connect). ShareO = merchant of record. Proprietário recebe via PIX/TED. |
| ADR-013 | Webhook queue: `StripeEventQueue` + cron vs. Inngest. **Recomendação:** cron MVP, Inngest V2. |
| ADR-014 | Payout trigger: cron diário às 10h BRT. Hold de 3 dias após devolução confirmada. |
| ADR-015 | Caução MVP: informativo + valor PIX registrado na plataforma. Processo formal de liberação/retenção. 2 PaymentIntents na V1. |
| ADR-016 | Exportação: síncrona até 90 dias; assíncrona (job + Storage) para períodos maiores. |
| ADR-017 | LGPD: retenção de dados financeiros por 5 anos (CTN Art. 173). |

### Também na Fase 0

- [ ] Ocultar UI Stripe Connect no frontend (feature flag ou `NEXT_PUBLIC_STRIPE_CONNECT_ENABLED=false`)
- [ ] Preservar toda lógica de checkout Stripe (só esconder, não deletar)
- [ ] Abrir consulta jurídica (Lei 12.865/2013 + IN RFB 2.178/2024)

---

## Fase 1 — MVP-Financeiro, Parte 1
**Duração:** 2 semanas  
**Quem:** Dev + Segurança

### Semana 1 — Fundação

#### SEC-FIN-1 — Roles admin diferenciadas (CRÍTICO — bloqueia todo o módulo)

```
ADMIN_SUPERADMIN   → acesso completo + auditoria
ADMIN_FINANCEIRO   → FIN-4, FIN-7, FIN-8, repasses manuais
ADMIN_OPERACIONAL  → itens, suporte, moderação
```

- Adicionar campo `adminRole` em `User` (enum no schema Prisma)
- Migration
- Guard em todas as rotas `/app/admin/financeiro/*`
- Atualizar seed de staging (`admin@shareo.com.br` → `ADMIN_SUPERADMIN`)

#### FIN-1.1 — Schema Prisma: campos financeiros

Adicionar ao model `Booking`:
```prisma
platformFeeRate      Int?         // basis points, ex: 1500 = 15%
platformFeeAmount    Int?         // centavos, calculado no checkout
ownerNetAmount       Int?         // centavos, calculado no checkout
stripeFee            Int?         // centavos, lido do BalanceTransaction
depositStatus        DepositStatus @default(NONE)
stripeDisputeId      String?
```

Novos models:
- `OwnerPaymentAccount` — chave PIX + tipo (CPF/CNPJ/telefone/e-mail/aleatória) + status verificação
- `PlatformTransaction` — registro imutável de cada movimentação
- `Payout` — repasse programado ou executado
- `PlatformConfig` — taxa configurável (padrão: 15%)
- `StripeEventQueue` — fila de eventos assíncronos

Índices obrigatórios:
```prisma
@@index([ownerId, paymentStatus, paidAt])  // em Booking — queries FIN-5
@@index([eligibleAfter, status])            // em Payout — cron query
@@index([ownerPaymentAccountId, status])    // em Payout — listagem por proprietário
```

#### FIN-1.3 — Cadastro de chave PIX do proprietário (substitui Connect onboarding)

- Tela em `/perfil/recebimentos` (nova sub-página)
- Campos: tipo de chave + chave + nome do titular + banco (display)
- Validação de formato por tipo (CPF, CNPJ, e-mail, telefone, aleatória)
- Status: `PENDING_VERIFICATION` → `VERIFIED` (verificação manual no admin MVP)
- API: `POST/PATCH /api/user/payment-account`

### Semana 2 — Split e segurança

#### FIN-2.1 — PlatformConfig

- Model já na migration da semana 1
- API admin `GET/PATCH /api/admin/platform-config`
- Taxa padrão: 15% (1500 basis points)
- Apenas `ADMIN_SUPERADMIN` pode alterar

#### FIN-2.2 — Checkout com split

Modificar `app/api/bookings/checkout/route.ts`:
1. Ler `platformFeeRate` de `PlatformConfig`
2. Calcular `platformFeeAmount = total × rate`
3. Calcular `ownerNetAmount = total − platformFeeAmount`
4. Gravar ambos no `Booking` antes de criar a Checkout Session
5. `stripeFee` preenchido pelo webhook `payment_intent.succeeded` (BalanceTransaction)

#### FIN-MVP-TETO — Teto de R$ 500 por locação (decisão D2)

- Validação server-side no checkout: `if (booking.total > 50000) → 400` (50000 centavos)
- Validação na UI: desabilitar botão "Reservar" + mensagem explicativa quando total > R$ 500
- Campo informativo na página do item quando preço × prazo mínimo já ultrapasse R$ 500
- Remover restrição quando FIN-6 (caução) for implementado

#### SEC-FIN-4 — Status DISPUTED

- Adicionar `DISPUTED` ao enum `BookingStatus` (migration)
- Handler `charge.dispute.created` em `/api/webhooks/stripe`:
  - Atualiza `booking.status → DISPUTED`
  - Grava `stripeDisputeId`
  - Bloqueia cron de repasse para esta reserva
  - Notifica `ADMIN_FINANCEIRO` por e-mail
- Cron de repasse: `where: { status: { not: 'DISPUTED' } }`

#### lib/copy/financial.ts — Glossário de termos

```typescript
export const FINANCIAL_COPY = {
  platformFee: 'Taxa ShareO',
  ownerNetAmount: 'O que você recebe',
  holdback: 'Prazo de liberação',
  chargeback: 'Contestação de pagamento',
  depositHold: 'Caução reservada',
  payoutFailed: 'Problema no repasse',
  pixAccount: 'Conta de recebimento PIX',
} as const
```

---

## Fase 2 — MVP-Financeiro, Parte 2
**Duração:** 3 semanas  
**Quem:** Dev + Designer

### Semana 3 — Repasse automático

#### FIN-3.1 — Cron de repasse (`/api/cron/payout`)

Lógica:
1. Busca `Payout` com `status: PENDING` e `eligibleAfter <= now()` e `status NOT DISPUTED` — `take: 10`
2. Idempotência (optimistic lock): `updateMany({ where: { id, status: 'PENDING' }, data: { status: 'PROCESSING' } })` — skip se `count === 0`
3. MVP: registra `Payout` como `PROCESSING` + notifica `ADMIN_FINANCEIRO` para executar PIX manualmente
4. V1+: integração automática (EFI Bank / Pagar.me)

#### FIN-3.3 — Trigger de elegibilidade

- Ao confirmar devolução bilateral: `Payout.eligibleAfter = now() + 3 dias`
- Ao abrir disputa: `Payout.status = BLOCKED`

### Semana 4 — Dashboards

#### FIN-4.1 — Dashboard gestor (corrigir painel admin existente)

Corrigir card "Receita total" → separar em:
- **GMV** (volume total de aluguéis)
- **Receita ShareO** (soma de `platformFeeAmount`)
- **A repassar** (soma de `ownerNetAmount` pendentes — NUNCA esconder)
- **Alertas ativos** (chargebacks, contas PIX não verificadas)

Rota: `/app/admin/financeiro/page.tsx` (nova, guard `ADMIN_FINANCEIRO`)

#### FIN-5.1 — "Meus Ganhos" mobile (`/perfil/ganhos`)

Hierarquia obrigatória above the fold (375px):
1. Card hero: "A receber" (ownerNetAmount pendente) + "Repasse em X dias"
2. Cards secundários: "Recebido no mês" + "Taxa ShareO"
3. Lista de aluguéis com status visual (✓ repassado / ⏳ pendente / ✗ problema)
4. Link "Ver desempenho por item" (tela separada)
5. Botão terciário "Exportar extrato"

### Semana 5 — Auditoria e onboarding

#### SEC-FIN-5 — Log de auditoria imutável

- Novo model `AuditLog` (append-only: `userId`, `action`, `resourceType`, `resourceId`, `metadata`, `ip`, `createdAt`)
- Registrar: exportações de dados financeiros, repasses manuais, alterações de `PlatformConfig`, chargebacks
- API admin: `GET /api/admin/audit-log` (apenas `ADMIN_SUPERADMIN`)

#### SEC-FIN-6 — Aprovação dupla para repasses manuais

- Repasses manuais acima de R$ 500: exigir segundo admin (`ADMIN_FINANCEIRO`) para aprovar
- UI: modal de confirmação com campo de justificativa
- Registro em `AuditLog` com ambos os IDs

#### Onboarding financeiro progressivo (FIN-1.4)

Implementar fluxo em 3 etapas (não bloquear no cadastro do item):
- **Etapa 1** (cadastro do item): banner discreto — "Cadastre sua chave PIX para receber"
- **Etapa 2** (primeira reserva recebida): modal bloqueante antes de confirmar
- **Etapa 3** (antes do redirect para checkout do locatário): tela de transição com instruções

---

## Fase 3 — V1-Financeiro
**Duração:** 4 semanas (reduzido — FIN-6 adiado)
**Quem:** Dev + Designer + Segurança

### Semanas 6-7 — Chargebacks e disputas (FIN-7)

- Handler completo `charge.dispute.created` (já parcialmente em SEC-FIN-4)
- Handler `charge.dispute.updated` + `charge.dispute.closed`
- Evidence submission API Stripe (`stripe.disputes.update`)
- UI admin: `/admin/financeiro/contestacoes` — lista + detalhe + ação
- Notificação ao proprietário e locatário ao abrir disputa
- Status `DISPUTED` bloqueia repasse até resolução

### Semanas 8-9 — Exportações (FIN-8.1 + FIN-8.2)

- `GET /api/financeiro/extrato.csv` — síncrono até 90 dias
- `POST /api/financeiro/relatorio` — assíncrono para períodos maiores
  - Salva PDF gerado em Supabase Storage (bucket privado)
  - URL pré-assinada TTL 15 minutos (SEC-FIN-8)
- Exportação admin: CPF + rendimentos — apenas `ADMIN_FINANCEIRO`

### FIN-6 — Caução ⏳ ADIADO — pós V1-Financeiro

> **Decisão D2:** sem caução no MVP. Risco mitigado pelo teto de R$ 500 por locação.
> FIN-6 (caução completa com processo formal), SEC-FIN-7 (liberação 72h) e SEC-FIN-9 (alerta 48h) entram no roadmap apenas após validação do MVP-Financeiro em produção. Avaliar junto com reavaliação do Stripe Connect BR.

---

## Fase 4 — V2-Financeiro
**Duração:** 3 semanas  
**Quem:** Dev + PO

### Semanas 11-12

- **FIN-5.2** — Histórico de pagamentos paginado (`/perfil/ganhos/historico`)
- **FIN-5.3** — Desempenho por item (gráfico barras mensais — tela separada do mobile)
- **FIN-8.3** — Relatório mensal automático (cron todo dia 1, envia PDF por e-mail)

### Semana 13

- **FIN-8.4** — Informe anual para IR (gerado em janeiro para o ano anterior)
- **SEC-FIN-10** — `beforeSend` no Sentry: redact de `platformFeeAmount`, `ownerNetAmount`, `pixKey`
- **Reavaliação Stripe Connect BR** — analisar viabilidade (~6 meses após D1)

---

## Backlog de segurança integrado

| ID | História | Fase | Prioridade |
|---|---|---|---|
| SEC-FIN-1 | Roles ADMIN_FINANCEIRO / ADMIN_OPERACIONAL / ADMIN_SUPERADMIN | Fase 1 S1 | CRÍTICO |
| SEC-FIN-3 | Ocultar UI Stripe Connect (preservar código) | Fase 0 | CRÍTICO |
| SEC-FIN-4 | Status DISPUTED + handler idempotente | Fase 1 S2 | CRÍTICO |
| SEC-FIN-5 | Log de auditoria imutável | Fase 2 S5 | ALTO |
| SEC-FIN-6 | Aprovação dupla repasses manuais > R$ 500 | Fase 2 S5 | ALTO |
| SEC-FIN-7 | Liberação automática de caução em 72h | ⏳ Pós V1-Financeiro (aguarda FIN-6) | ALTO |
| SEC-FIN-8 | Exportações via Storage privado + URL pré-assinada TTL 15min | Fase 3 S8 | ALTO |
| SEC-FIN-9 | Alerta 48h antes da expiração do prazo de caução | ⏳ Pós V1-Financeiro (aguarda FIN-6) | MÉDIO |
| SEC-FIN-10 | `beforeSend` Sentry — redact campos financeiros | Fase 4 S13 | MÉDIO |
| SEC-FIN-11 | Verificação server-side: borrowerId ≠ item.ownerId | Fase 1 S2 | MÉDIO |
| SEC-FIN-12 | Unique constraint: 1 CPF/CNPJ = 1 chave PIX ativa | Fase 1 S1 | MÉDIO |
| SEC-FIN-13 | Consulta jurídica Lei 12.865/2013 + IN RFB 2.178/2024 | Fase 0 | MÉDIO |
| SEC-FIN-14 | Atualizar ADR-005: HMAC-SHA256 no hashDocument | Fase 4 S13 | BAIXO |
| SEC-FIN-15 | Remover bodyParser:false do webhook (código morto) | Fase 1 S2 | BAIXO |

---

## O que NÃO fazer neste módulo

| Item | Motivo |
|---|---|
| Ativar UI Stripe Connect | Decisão D1 — reavaliação em ~6 meses |
| Implementar caução no MVP | Decisão D2 — sem caução no MVP; FIN-6 adiado para pós V1-Financeiro |
| Permitir locação acima de R$ 500 no MVP | Decisão D2 — teto de segurança até implementação da caução |
| Deletar código Stripe existente | Deve ser preservado para reativação futura |
| Deploy em produção antes de retorno jurídico | Decisão D4 — risco Lei 12.865/2013 |
| Aceitar `ownerId` como parâmetro externo em FIN-5 | Risco IDOR com RLS desabilitado |

---

## Estimativas revisadas (com decisões dos fundadores)

| Épico | Estimativa original (Dev) | Estimativa revisada | Motivo da revisão |
|---|---|---|---|
| FIN-1 Infraestrutura | 12 dias | 10 dias | Onboarding PIX mais simples que Connect |
| FIN-2 Comissão | 8 dias | 7 dias | Sem mudança |
| FIN-3 Repasse | 7 dias | 6 dias | MVP manual; automação V1 |
| FIN-4 Painel Gestor | — | 5 dias | Corrigir admin existente |
| FIN-5 Painel Proprietário | — | 8 dias | 3 sub-telas |
| FIN-MVP-TETO Limite R$500 | — | 2 dias | Novo — decisão D2 |
| FIN-6 Caução | 24-28 dias | ⏳ adiado | Fora do MVP — pós V1-Financeiro |
| FIN-7 Chargebacks | 12 dias | 12 dias | Sem mudança |
| FIN-8 Relatórios | — | 8 dias | CSV síncrono + PDF assíncrono |
| Segurança (SEC-FIN) | — | 10 dias | Distribuído nas fases |
| ADRs + Fase 0 | — | 2 dias | — |
| **Total** | **~90 dias** | **~68 dias** | Redução pela decisão D1 (PIX) + D2 (sem caução no MVP) |

---

## Dependências externas

| Dependência | Dono | Impacto se atrasar |
|---|---|---|
| Supabase production criado | Roberto | Bloqueia qualquer go-live financeiro |
| Retorno da consulta jurídica | Roberto | Bloqueia go-live em produção |
| Verificação manual de chaves PIX | Time ShareO | FIN-3 funciona só para contas verificadas |
| Reavaliação Stripe Connect BR | Roberto (~6 meses) | Fase 4 reavaliação é gate para desbloquear Connect |
