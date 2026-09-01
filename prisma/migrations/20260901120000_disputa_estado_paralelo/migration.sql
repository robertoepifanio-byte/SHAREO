-- Disputa deixa de ser um valor de BookingStatus e vira estado paralelo.
--
-- Motivo: enquanto DISPUTED ocupava `status`, abrir disputa sobrescrevia o
-- ACTIVE/RETURNED anterior e o destruia. Consequencias observadas em QA
-- (Thiago, 01/09/2026): a tela da reserva ficava sem nenhuma acao disponivel,
-- o locatario nao conseguia devolver o item, quem abriu nao conseguia cancelar
-- e o admin so conseguia encerrar a disputa cancelando a locacao junto.
--
-- O valor DISPUTED NAO e removido do enum: linhas historicas e o enum do
-- Postgres nao aceitam DROP VALUE. Nenhum caminho novo o grava.

CREATE TYPE "DisputeStatus" AS ENUM (
  'NONE',
  'OPEN',
  'RESOLVED_OWNER',
  'RESOLVED_BORROWER',
  'DISMISSED'
);

ALTER TABLE "bookings"
  ADD COLUMN "disputeStatus"     "DisputeStatus" NOT NULL DEFAULT 'NONE',
  ADD COLUMN "disputeOpenedAt"   TIMESTAMP(3),
  ADD COLUMN "disputeOpenedById" TEXT,
  ADD COLUMN "disputeResolvedAt" TIMESTAMP(3);

-- Backfill das disputas em aberto.
--
-- 🪤 O status pre-disputa dessas linhas foi DESTRUIDO na abertura e nao pode
-- ser recuperado. Reconstruimos pelo mesmo sinal que lib/disputeWindow.ts ja
-- usa para decidir a janela de cada papel: `returnRequestedAt` preenchido
-- significa que a devolucao ja tinha sido iniciada (RETURNED); vazio significa
-- locacao ainda em curso (ACTIVE). E inferencia, nao restauracao.
--
-- `disputeOpenedById` fica NULL: nao ha registro de quem abriu. Efeito pratico
-- em producao dessas linhas: ninguem pode cancelar a propria disputa
-- (a guarda exige igualdade com o autor), mas o admin resolve normalmente.
UPDATE "bookings"
SET
  "disputeStatus"   = 'OPEN',
  "disputeOpenedAt" = "updatedAt",
  "status"          = CASE
                        WHEN "returnRequestedAt" IS NOT NULL THEN 'RETURNED'::"BookingStatus"
                        ELSE 'ACTIVE'::"BookingStatus"
                      END
WHERE "status" = 'DISPUTED';

CREATE INDEX "bookings_disputeStatus_idx" ON "bookings"("disputeStatus");
