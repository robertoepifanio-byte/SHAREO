-- Cadastro progressivo + LGPD:
--   profileCompletedAt → marca conclusão do cadastro completo (null = incompleto; gate de Anunciar/Alugar)
--   ageDeclaredAt      → persiste a declaração de 18+ (trilha de auditoria LGPD)
-- DDL idempotente — seguro em DB limpo e no staging.

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "profileCompletedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "ageDeclaredAt"       TIMESTAMP(3);

-- Backfill: usuários já existentes (cadastro completo no modelo antigo) são considerados completos
-- se já têm documento (CPF ou CNPJ) e localização (cidade + estado).
UPDATE "users"
   SET "profileCompletedAt" = COALESCE("profileCompletedAt", "createdAt")
 WHERE "profileCompletedAt" IS NULL
   AND ("cpfHash" IS NOT NULL OR "cnpjHash" IS NOT NULL)
   AND "city" IS NOT NULL
   AND "state" IS NOT NULL;

-- Convite-piloto (C1): localização opcional do lead para definir a região dos pilotos.
ALTER TABLE "founder_leads"
  ADD COLUMN IF NOT EXISTS "city"  TEXT,
  ADD COLUMN IF NOT EXISTS "state" CHAR(2);
