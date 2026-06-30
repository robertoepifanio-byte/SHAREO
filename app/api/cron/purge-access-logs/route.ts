/**
 * GET /api/cron/purge-access-logs
 * Executado semanalmente via Vercel Cron (toda segunda, 04h UTC).
 *
 * Expurgo da tabela access_logs conforme prazo legal do Marco Civil da Internet (art. 15):
 *   - Retencao OBRIGATORIA: 6 meses (180 dias). Prazo confirmado com juridico em 2026-06-30 (A1).
 *   - Apos 180 dias: os registros sao expurgados (sem motivo legal para reter alem).
 *   - EXCECAO (A4 — retencao legal): registros com legalHold=true sao PULADOS e preservados
 *     independentemente do prazo. Acionar via SQL pelo juridico/compliance (MFA obrigatorio).
 *     Ver migration 20260630100000_add_legal_hold para instrucoes de acionamento.
 *
 * A tabela so e populada quando PlatformConfig.accessLogsEnabled = "true".
 * Se a flag estiver OFF, esta rotina nao encontrara registros para deletar (idempotente).
 *
 * Operacao em batch para evitar lock longo:
 *   - Deleta em uma unica operacao (volume MVP baixo).
 *   - Para volume alto (>100k/dia), migrar para loop paginado com cursor.
 */
import { NextResponse, type NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { assertCronAuth } from "@/lib/auth/cron-guard"

export const runtime     = "nodejs"
export const maxDuration = 60

// Marco Civil art. 15: retencao minima de 6 meses (180 dias).
// Prazo confirmado com juridico em 2026-06-30 (decisao A1).
const RETENTION_DAYS = 180

export async function GET(req: NextRequest) {
  const denied = assertCronAuth(req)
  if (denied) return denied

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS)

  // Deleta registros mais antigos que 180 dias, EXCETO os marcados com legalHold=true.
  // Registros sob ordem judicial/litigio (legalHold=true) sao preservados indefinidamente
  // ate que o juridico/compliance levante a retencao via SQL no Supabase Dashboard.
  // Para tabelas grandes (>100k/dia), considerar particionamento por mes no PostgreSQL.
  const result = await prisma.accessLog.deleteMany({
    where: {
      ts:        { lt: cutoff },
      legalHold: false,
    },
  })

  // Contagem de registros retidos por ordem judicial (para auditoria)
  const heldCount = await prisma.accessLog.count({
    where: {
      ts:        { lt: cutoff },
      legalHold: true,
    },
  })

  const summary = {
    ok:            true,
    retentionDays: RETENTION_DAYS,
    cutoffDate:    cutoff.toISOString(),
    deleted:       result.count,
    legalHoldSkipped: heldCount,
    note:          "Marco Civil art. 15 — retencao 180 dias (A1). Registros com legalHold=true preservados (A4).",
  }
  console.warn("[cron/purge-access-logs]", JSON.stringify(summary))
  return NextResponse.json(summary)
}
