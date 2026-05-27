-- AddColumn: slug to users
ALTER TABLE "users" ADD COLUMN "slug" TEXT;

-- Backfill: gerar slug para usuários existentes
-- Formato: primeiros 30 chars do nome em lowercase sem acentos + últimos 6 chars do id
UPDATE "users"
SET "slug" = regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g')
             || '-'
             || substring(id, length(id) - 5)
WHERE "slug" IS NULL;

-- UniqueIndex
CREATE UNIQUE INDEX "users_slug_key" ON "users"("slug");
