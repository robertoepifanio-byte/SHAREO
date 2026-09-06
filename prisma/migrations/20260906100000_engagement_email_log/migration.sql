-- Registro de envio de e-mail de reengajamento.
--
-- Motivo: o aviso de "item favoritado disponivel" consultava
-- `favorites.createdAt <= now() - 30 dias` e nao guardava nada sobre o que ja
-- havia sido enviado. O cron roda todo dia, entao o mesmo aviso saia todo dia,
-- para sempre, um e-mail POR FAVORITO. Fundador com 3 favoritos recebia 3
-- e-mails as 07h BRT diariamente.
--
-- A restricao UNIQUE (userId, kind, dedupeKey) e a peca central: faz o reenvio
-- ser recusado pelo banco, e nao apenas evitado por uma clausula WHERE que a
-- proxima refatoracao pode afrouxar sem ninguem perceber.

CREATE TYPE "EngagementEmailKind" AS ENUM (
  'REVIEW_REMINDER',
  'SIMILAR_ITEMS',
  'FAVORITE_DIGEST'
);

CREATE TABLE "engagement_emails" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "kind"      "EngagementEmailKind" NOT NULL,
  "dedupeKey" TEXT NOT NULL,
  "sentAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "engagement_emails_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "engagement_emails_userId_kind_dedupeKey_key"
  ON "engagement_emails" ("userId", "kind", "dedupeKey");

-- Suporta a consulta do teto global: "quantos envios este usuario recebeu nos
-- ultimos 7 dias?", feita uma vez por destinatario candidato.
CREATE INDEX "engagement_emails_userId_sentAt_idx"
  ON "engagement_emails" ("userId", "sentAt");

ALTER TABLE "engagement_emails"
  ADD CONSTRAINT "engagement_emails_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
