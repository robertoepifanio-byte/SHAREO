/**
 * GET /api/cron/purge-fiscal-records
 * Executado mensalmente via Vercel Cron (dia 1, 03h UTC).
 *
 * Expurgo dos REGISTROS FINANCEIROS retidos de titulares que excluíram a conta.
 *
 * 🪤 Por que existe: ao excluir a conta, o sistema informa ao titular que
 * "Registros financeiros dos últimos 5 anos foram preservados de forma
 * anonimizada conforme exigência fiscal (CTN art. 173). Serão expurgados
 * automaticamente após o prazo." (app/api/users/me/route.ts). Existiam rotinas
 * de expurgo para admin_logs, access_logs e IPs de consentimento — nenhuma para
 * esses registros. A promessa estava publicada e ninguém a cumpria. Nada havia
 * vencido ainda, porque a plataforma tem menos de um ano; a rotina entra antes
 * de existir o primeiro vencimento. Decisão de Raimundo, 02/09/2026 (opção "a").
 *
 * 🪤 Escopo: só apaga quando TODOS os titulares ligados ao registro já
 * excluíram a conta. Uma PlatformTransaction pertence a uma reserva com DUAS
 * partes; enquanto uma delas mantém conta ativa, o registro ainda é o histórico
 * fiscal DELA, e apagá-lo cumpriria a promessa feita a um às custas do outro.
 * Payout tem titular único (a conta de recebimento), então basta ele.
 *
 * O que este expurgo NÃO faz: apagar registros de usuários ativos após 5 anos.
 * Isso é uma decisão de política de retenção mais ampla, não a promessa feita
 * ao titular que pediu exclusão — e por isso não entra aqui sem ser decidida.
 *
 * Idempotente: reexecutar não apaga nada além do que já venceu.
 */
import { NextResponse, type NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { assertCronAuth } from "@/lib/auth/cron-guard"

export const runtime     = "nodejs"
export const maxDuration = 60

/** Mesmo prazo do scrub de exclusão e das outras rotinas (CTN art. 173). */
export const RETENTION_YEARS = 5

export async function GET(req: NextRequest) {
  const denied = assertCronAuth(req)
  if (denied) return denied

  const cutoff = new Date()
  cutoff.setFullYear(cutoff.getFullYear() - RETENTION_YEARS)

  // Payout: titular único — a conta de recebimento. Vai primeiro porque é o
  // registro mais específico; se algo falhar depois, não sobra payout órfão de
  // uma transação já apagada.
  const payouts = await prisma.payout.deleteMany({
    where: {
      createdAt: { lt: cutoff },
      ownerPaymentAccount: { user: { deletedAt: { not: null } } },
    },
  })

  // PlatformTransaction: as DUAS partes precisam ter excluído a conta.
  const transacoes = await prisma.platformTransaction.deleteMany({
    where: {
      createdAt: { lt: cutoff },
      booking: {
        borrower: { deletedAt: { not: null } },
        owner:    { deletedAt: { not: null } },
      },
    },
  })

  // Visibilidade do que ficou para trás por ter uma parte ainda ativa. Sem isto
  // ninguém saberia distinguir "não venceu nada" de "venceu e não pôde apagar".
  const retidasPorParteAtiva = await prisma.platformTransaction.count({
    where: {
      createdAt: { lt: cutoff },
      booking: {
        OR: [
          { borrower: { deletedAt: { not: null } } },
          { owner:    { deletedAt: { not: null } } },
        ],
        AND: [
          {
            OR: [
              { borrower: { deletedAt: null } },
              { owner:    { deletedAt: null } },
            ],
          },
        ],
      },
    },
  })

  const summary = {
    ok:                     true,
    retentionYears:         RETENTION_YEARS,
    cutoffDate:             cutoff.toISOString(),
    payoutsDeleted:         payouts.count,
    transactionsDeleted:    transacoes.count,
    retidasPorParteAtiva,
    note: "CTN art. 173 + LGPD art. 16. Só apaga quando todos os titulares do registro excluíram a conta.",
  }
  console.warn("[cron/purge-fiscal-records]", JSON.stringify(summary))
  return NextResponse.json(summary)
}
