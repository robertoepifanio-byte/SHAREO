-- Migration: decouple_pix_from_mp (ADITIVA)
-- Desacopla o PIX do Mercado Pago em owner_payment_accounts:
-- os campos de PIX (pixKeyType, pixKey, holderName) deixam de ser NOT NULL.
-- Locadores que conectam o Mercado Pago diretamente (ADR-026 / Modelo B) não
-- precisam ter PIX pré-cadastrado — o callback OAuth faz UPSERT/CREATE sem PIX.
-- Comportamento legado intacto: campos PIX continuam opcionais no formulário de
-- cadastro PIX; quem já tem PIX não é afetado.
-- Gated por D4 (flag mercadoPagoEnabled OFF por padrão — fluxo atual não muda).

-- AlterTable
ALTER TABLE "owner_payment_accounts"
  ALTER COLUMN "pixKeyType" DROP NOT NULL,
  ALTER COLUMN "pixKey" DROP NOT NULL,
  ALTER COLUMN "holderName" DROP NOT NULL;
