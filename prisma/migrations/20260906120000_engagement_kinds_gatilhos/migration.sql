-- Novos tipos de e-mail de reengajamento: os gatilhos de evento.
--
-- Motivo: ate aqui o unico e-mail sobre favoritos era o digest mensal, que sai
-- pelo calendario. Estes tres saem por EVENTO REAL, que e o que faz o e-mail
-- ser noticia em vez de repeticao:
--
--   FAVORITE_NUDGE      -- 3 dias depois de favoritar, uma unica vez
--   FAVORITE_PRICE_DROP -- preco caiu >= 10% desde o dia do favorito
--   FAVORITE_BACK       -- item voltou ao catalogo depois de pausado
--
-- 🪤 ALTER TYPE ... ADD VALUE fica SOZINHO nesta migration, sem nenhum UPDATE
-- nem uso dos valores novos. O Postgres recusa usar um valor de enum na mesma
-- transacao em que ele foi criado, e o Prisma roda cada migration numa
-- transacao. As colunas novas vao na migration seguinte pelo mesmo motivo.

ALTER TYPE "EngagementEmailKind" ADD VALUE IF NOT EXISTS 'FAVORITE_NUDGE';
ALTER TYPE "EngagementEmailKind" ADD VALUE IF NOT EXISTS 'FAVORITE_PRICE_DROP';
ALTER TYPE "EngagementEmailKind" ADD VALUE IF NOT EXISTS 'FAVORITE_BACK';
