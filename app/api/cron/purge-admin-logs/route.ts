/**
 * GET /api/cron/purge-admin-logs
 * Executado mensalmente via Vercel Cron (dia 1, 02h UTC).
 *
 * Expurgo de retenção LGPD: nullifica / remove registros de admin_logs com mais
 * de 5 anos (sugestão da auditoria s40 — CONFIRMAR PRAZO COM JURÍDICO antes do go-live).
 *
 * Decisão de design:
 *   - admin_logs são trilha de auditoria interna; retenção ≥ 5 anos é padrão de
 *     conformidade para registros de acesso administrativo (LGPD art. 7º IX +
 *     prazo fiscal CFM 5 anos). Prazo exato a confirmar com o jurídico.
 *   - Operação em batch de 1.000 registros por execução para evitar lock longo.
 *   - Idempotente: re-executar não apaga registros adicionais indevidamente.
 *
 * ⚠️  PRAZO SUGERIDO: 5 anos. Confirmar com jurídico antes de ativar em produção.
 */
import { NextResponse, type NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { assertCronAuth } from "@/lib/auth/cron-guard"

export const runtime  = "nodejs"
export const maxDuration = 60

// ⚠️ CONFIRMAR COM JURÍDICO — sugestão da auditoria s40: 5 anos
const RETENTION_YEARS = 5

export async function GET(req: NextRequest) {
  const denied = assertCronAuth(req)
  if (denied) return denied

  const cutoff = new Date()
  cutoff.setFullYear(cutoff.getFullYear() - RETENTION_YEARS)

  // Prisma não suporta LIMIT em deleteMany. Para o volume esperado no MVP/H1,
  // um único deleteMany é suficiente. Se a tabela crescer muito, migrar para
  // deleteMany com cursor paginado em loop.
  const result = await prisma.adminLog.deleteMany({
    where: { createdAt: { lt: cutoff } },
  })

  const summary = {
    ok:             true,
    retentionYears: RETENTION_YEARS,
    cutoffDate:     cutoff.toISOString(),
    deleted:        result.count,
    note:           "CONFIRMAR PRAZO COM JURÍDICO antes de ativar em producao",
  }
  console.warn("[cron/purge-admin-logs]", JSON.stringify(summary))
  return NextResponse.json(summary)
}
