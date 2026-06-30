/**
 * GET /api/cron/purge-admin-logs
 * Executado mensalmente via Vercel Cron (dia 1, 02h UTC).
 *
 * Expurgo de retencao LGPD: remove registros de admin_logs com mais de 5 anos.
 * Prazo de 5 anos fiscal confirmado com juridico em 2026-06-30 (A1 — prazo fiscal
 * LGPD art. 7o IX + CTN art. 173).
 *
 * EXCECAO (A4 — retencao legal): registros com legalHold=true sao PULADOS e preservados
 * independentemente do prazo. Acionar via SQL pelo juridico/compliance (MFA obrigatorio).
 * Ver migration 20260630100000_add_legal_hold para instrucoes de acionamento.
 *
 * Decisao de design:
 *   - admin_logs sao trilha de auditoria interna; retencao de 5 anos e padrao de
 *     conformidade para registros de acesso administrativo (LGPD art. 7o IX +
 *     prazo fiscal CTN art. 173).
 *   - Idempotente: re-executar nao apaga registros adicionais indevidamente.
 */
import { NextResponse, type NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { assertCronAuth } from "@/lib/auth/cron-guard"

export const runtime  = "nodejs"
export const maxDuration = 60

// 5 anos fiscal (LGPD art. 7o IX + CTN art. 173).
// Prazo confirmado com juridico em 2026-06-30 (decisao A1).
const RETENTION_YEARS = 5

export async function GET(req: NextRequest) {
  const denied = assertCronAuth(req)
  if (denied) return denied

  const cutoff = new Date()
  cutoff.setFullYear(cutoff.getFullYear() - RETENTION_YEARS)

  // Deleta registros mais antigos que 5 anos, EXCETO os marcados com legalHold=true.
  // Registros sob ordem judicial/litigio sao preservados ate o juridico levantar a retencao.
  // Prisma nao suporta LIMIT em deleteMany. Para o volume esperado no MVP/H1,
  // um unico deleteMany e suficiente. Se a tabela crescer muito, migrar para
  // deleteMany com cursor paginado em loop.
  const result = await prisma.adminLog.deleteMany({
    where: {
      createdAt: { lt: cutoff },
      legalHold: false,
    },
  })

  // Contagem de registros retidos por ordem judicial (para auditoria)
  const heldCount = await prisma.adminLog.count({
    where: {
      createdAt: { lt: cutoff },
      legalHold: true,
    },
  })

  const summary = {
    ok:               true,
    retentionYears:   RETENTION_YEARS,
    cutoffDate:       cutoff.toISOString(),
    deleted:          result.count,
    legalHoldSkipped: heldCount,
    note:             "LGPD art. 7o IX + prazo fiscal 5 anos (A1). Registros com legalHold=true preservados (A4).",
  }
  console.warn("[cron/purge-admin-logs]", JSON.stringify(summary))
  return NextResponse.json(summary)
}
