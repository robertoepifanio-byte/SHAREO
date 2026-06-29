/**
 * GET /api/cron/purge-access-logs
 * Executado semanalmente via Vercel Cron (toda segunda, 04h UTC).
 *
 * Expurgo da tabela access_logs conforme prazo legal do Marco Civil da Internet (art. 15):
 *   - Retenção OBRIGATÓRIA: 6 meses (180 dias).
 *   - Após 180 dias: os registros DEVEM ser expurgados (não há motivo para reter além).
 *   - CONFIRMAR COM JURÍDICO: se há exceção para registros sob investigação policial/judicial.
 *
 * A tabela só é populada quando PlatformConfig.accessLogsEnabled = "true".
 * Se a flag estiver OFF, esta rotina não encontrará registros para deletar (idempotente).
 *
 * Operação em batch para evitar lock longo:
 *   - Deleta até BATCH_SIZE registros por execução.
 *   - Se houver mais, o próximo agendamento processa o restante.
 *   - Para volume alto (>100k/dia), ajustar para loop interno ou aumentar BATCH_SIZE.
 */
import { NextResponse, type NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { assertCronAuth } from "@/lib/auth/cron-guard"

export const runtime     = "nodejs"
export const maxDuration = 60

// Marco Civil art. 15: retenção mínima de 6 meses (180 dias).
// Após esse prazo, os registros são expurgados.
const RETENTION_DAYS = 180

export async function GET(req: NextRequest) {
  const denied = assertCronAuth(req)
  if (denied) return denied

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS)

  // Deleta registros mais antigos que 180 dias.
  // Para tabelas grandes (>100k/dia), considerar particionamento por mês no PostgreSQL.
  // Por ora, deleteMany é suficiente para o volume esperado no MVP/H1.
  const result = await prisma.accessLog.deleteMany({
    where: { ts: { lt: cutoff } },
  })

  const summary = {
    ok:            true,
    retentionDays: RETENTION_DAYS,
    cutoffDate:    cutoff.toISOString(),
    deleted:       result.count,
    note:          "Marco Civil art. 15 — retencao 180 dias. Confirmar com juridico excecoes para registros sob investigacao.",
  }
  console.warn("[cron/purge-access-logs]", JSON.stringify(summary))
  return NextResponse.json(summary)
}
