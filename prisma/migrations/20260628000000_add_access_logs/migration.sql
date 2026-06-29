-- Migration: add_access_logs (ADITIVA)
-- Implementa o registro de acesso para conformidade com o Marco Civil da Internet, art. 15
-- (retenção obrigatória de 6 meses de logs de acesso a aplicações de internet).
--
-- IMPORTANTE: confirmar prazo e escopo com jurídico antes do go-live em produção.
-- A tabela só é populada quando PlatformConfig.accessLogsEnabled = "true".
-- Com a flag OFF (default), nenhuma linha é gravada e ZERO impacto de performance.

CREATE TABLE "access_logs" (
  "id"        TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "ts"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  "ip"        TEXT        NOT NULL,
  "userId"    TEXT,
  "path"      TEXT        NOT NULL,
  "method"    TEXT        NOT NULL,
  "status"    INTEGER     NOT NULL DEFAULT 0,
  "requestId" TEXT,
  CONSTRAINT "access_logs_pkey" PRIMARY KEY ("id")
);

-- Índice por data: expurgo por intervalo e consultas por período (art. 15 — autoridade)
CREATE INDEX "access_logs_ts_idx"   ON "access_logs" ("ts");
-- Índice por userId: consulta por titular (art. 18 LGPD — portabilidade / acesso)
CREATE INDEX "access_logs_user_idx" ON "access_logs" ("userId")
  WHERE "userId" IS NOT NULL;

COMMENT ON TABLE "access_logs" IS
  'Registro de acesso a aplicações — Marco Civil da Internet art. 15. '
  'Retenção obrigatória: 180 dias (expurgo via cron /api/cron/purge-access-logs). '
  'Populada SOMENTE quando PlatformConfig.accessLogsEnabled = "true" (default OFF). '
  'Prazo e escopo a confirmar com jurídico antes de ativar em produção (D4 bloqueador).';
