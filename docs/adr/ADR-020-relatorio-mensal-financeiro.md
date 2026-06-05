# ADR-020 — Relatório Mensal Financeiro: Consolidação Automática via Cron

**Status:** Accepted
**Data:** 2026-06-05
**Decisores:** Arquiteto, Product Owner
**Contexto:** ShareO — módulo financeiro Fase 4

---

## Contexto

Administradores financeiros precisam de visibilidade periódica sobre a saúde financeira da plataforma sem precisar acessar o painel manualmente todo início de mês. Um relatório automático consolida os dados do mês anterior e os entrega proativamente.

Alternativas avaliadas:

- **E-mail com PDF**: mais formal, requer integração com serviço de e-mail (SendGrid/Resend) e geração de PDF — complexidade desnecessária no MVP.
- **Notificação in-app + dados no retorno da API**: mais simples, sem dependência de e-mail configurado, visível no painel de notificações já existente.
- **Dashboard com atualização automática**: o painel `/admin/financeiro` já exibe dados em tempo real — o relatório mensal adiciona valor diferente (consolidação histórica + entrega proativa).

## Decisão

1. **`GET /api/cron/monthly-report`**: executa no **1º dia de cada mês às 12:00 UTC (09:00 BRT)** via Vercel Cron (`0 12 1 * *`).
2. **Janela**: consolida o mês anterior completo (de `firstDay` a `lastDay` do mês -1).
3. **Métricas consolidadas**: GMV (volume + contagem de locações), receita ShareO (taxa plataforma), repasse líquido a proprietários, repasses realizados (valor + contagem), disputas abertas no mês, novas contas PIX cadastradas.
4. **Entrega**: notificação in-app para todos os usuários com `adminRole IN (ADMIN_FINANCEIRO, ADMIN_SUPERADMIN)`. Body contém o resumo em texto; `data` contém o objeto JSON com todos os valores para uso programático futuro.
5. **MVP → V1+**: em V1+, substituir notificação in-app por e-mail HTML formatado com os mesmos dados (quando SendGrid/Resend estiver configurado).

## Consequências

### Positivas
- Visibilidade proativa: admins recebem o resumo sem precisar lembrar de acessar o painel.
- Sem dependência de serviço externo no MVP (só usa Prisma + sistema de notificações já existente).
- Dados estruturados em `Notification.data` permitem futuras integrações (ex: exportar para planilha, webhook para Slack).

### Negativas / Trade-offs
- Notificação in-app tem menor visibilidade que e-mail — admin pode não perceber imediatamente.
- Cron executa no 1º do mês às 09h BRT; se o deploy estiver fora do ar nesse horário, o relatório do mês é perdido (sem retry automático para crons Vercel).
- Não gera arquivo persistente — dados estão na notificação, não em storage. Se o admin excluir a notificação, perde o histórico (mitigação: exportação via FIN-8 cobre períodos históricos).

## Decisões relacionadas

- [[ADR-016-exportacao-financeira]] — exportação manual cobre o mesmo período com mais detalhes
- [[ADR-013-webhook-queue]] — padrão de cron com autenticação via `CRON_SECRET`
- [[ADR-018-chargebacks]] — disputas abertas no mês são incluídas no relatório mensal
