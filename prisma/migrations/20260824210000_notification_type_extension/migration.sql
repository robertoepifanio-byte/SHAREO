-- ATOR-04 — tipos próprios para as notificações de extensão de prazo.
--
-- As três notificações do fluxo de extensão (pedido, aprovação, recusa) eram
-- gravadas como `BOOKING_CONFIRMED` — "reserva confirmada" para um evento que
-- não é isso. O corpo do texto estava certo, então nada parecia quebrado; o que
-- estava errado era a CLASSIFICAÇÃO, que é o que um filtro por categoria, um
-- deep-link ou uma preferência de e-mail leem.
--
-- 🪤 `ALTER TYPE ... ADD VALUE` não pode rodar na mesma transação que um UPDATE
-- que use o valor novo (lição registrada no CLAUDE.md). Aqui só adicionamos os
-- valores; as linhas antigas continuam como BOOKING_CONFIRMED e NÃO são
-- reclassificadas — reescrever histórico de notificação não conserta nada que
-- alguém já leu, e exigiria um segundo SQL separado.
--
-- Aditiva e reversível na prática: nada passa a falhar se um deploy antigo
-- rodar contra este banco, porque valores novos de enum só aparecem quando o
-- código novo os grava.

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'EXTENSION_REQUESTED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'EXTENSION_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'EXTENSION_REJECTED';
