-- AddStripeConnectNeedsAction
-- Adiciona o valor STRIPE_CONNECT_NEEDS_ACTION ao enum NotificationType.
--
-- Por que um tipo novo?
-- Nenhum valor existente cobre semanticamente a notificação de mudança de
-- status da connected account do proprietário (requirements vencidos, capability
-- suspensa, etc.): o deep-link vai para /perfil/recebimentos, não para nenhuma
-- tela de booking ou verificação. Usar ID_REJECTED ou similar causaria falsos
-- positivos em dashboards e futuras preferências de e-mail por categoria.
--
-- LIÇÃO DO CLAUDE.md: ALTER TYPE ... ADD VALUE e UPDATE na mesma transação PG
-- é inválido. Por isso esta migration usa dois statements separados, sem BEGIN/COMMIT
-- explícito — o Prisma envolve cada statement num bloco próprio.
--
-- Aplicar nos dois Supabase: staging (zythygwvmrwrqmnrdufq) e produção.

ALTER TYPE "NotificationType" ADD VALUE 'STRIPE_CONNECT_NEEDS_ACTION';
