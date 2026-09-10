/**
 * GET /api/cron/intermediation-report
 * Executado no 1º dia de cada mês (fechamento automático).
 *
 * Gera o "Relatório de Intermediações" que a Contabilizei exige mensalmente
 * para sustentar que os 85% repassados ao proprietário não são receita da
 * ShareO (B3, ver docs/juridico/retorno-contabilizei-tributacao-2026-09-10.md).
 * Reaproveita a consulta do export administrativo (ADR-016), mas envia só as
 * colunas que a Contabilizei pediu — data, valores e documento do
 * proprietário — sem PII do locatário nem metadados de disputa, que não têm
 * função no relatório fiscal e não deveriam sair da plataforma por e-mail.
 */
import { NextResponse, type NextRequest } from "next/server"
import { assertCronAuth } from "@/lib/auth/cron-guard"
import { fetchFinancialRows, getPreviousMonthWindow, getFinanceAdmins } from "@/lib/financial-export"
import { toCsv, CSV_BOM } from "@/lib/csv"
import { sendIntermediationReportEmail } from "@/lib/email"

export const runtime     = "nodejs"
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const denied = assertCronAuth(req)
  if (denied) return denied

  const { firstDay, lastDay, monthLabel } = getPreviousMonthWindow()

  const [rows, admins] = await Promise.all([
    fetchFinancialRows(firstDay, lastDay),
    getFinanceAdmins(),
  ])

  const fiscalRows = rows.map((r) => ({
    "data":                        r["data"],
    "cod locação":                 r["cod locação"],
    "valor pago":                  r["valor pago"],
    "Comissão Shareo":             r["Comissão Shareo"],
    "Valor proprietário":          r["Valor proprietário"],
    "proprietario":                r["proprietario"],
    "cpf_cnpj_proprietario":       r["cpf_cnpj_proprietario"],
  }))
  const csv = CSV_BOM + toCsv(fiscalRows)
  const filename = `shareo-intermediacoes-${firstDay.toISOString().slice(0, 7)}.csv`

  const results = await Promise.allSettled(
    admins.map((admin) =>
      sendIntermediationReportEmail(admin.email, admin.name ?? "Admin", monthLabel, csv, filename)
    )
  )
  const failed = results.filter((r) => r.status === "rejected").length

  console.warn(`[cron/intermediation-report] ${monthLabel} — ${rows.length} transações, ${admins.length - failed}/${admins.length} e-mails enviados`)

  return NextResponse.json({ ok: true, month: monthLabel, rows: rows.length, sent: admins.length - failed, failed })
}
