import type { Prisma, PayoutStatus } from "@prisma/client"

const STATUS_OPTIONS: PayoutStatus[] = ["PENDING", "PROCESSING", "COMPLETED", "FAILED", "BLOCKED"]

export interface PayoutFilterParams {
  q?:      string | null
  status?: string | null
  from?:   string | null // YYYY-MM-DD
  to?:     string | null // YYYY-MM-DD
}

export interface ParsedPayoutFilters {
  q:      string
  status: PayoutStatus | undefined
  from:   string // "" se ausente — pra repopular o <input type="date">
  to:     string
  where:  Prisma.PayoutWhereInput
}

/**
 * Fonte única do filtro de `/admin/financeiro/repasses` — usada pela tela
 * (Server Component) e pela exportação CSV (`/api/admin/export/repasses`).
 * Sem isso, os dois liam searchParams e montavam o `where` cada um do seu
 * jeito — CSV divergindo silenciosamente do que a tela mostra é o tipo de
 * bug que só aparece quando alguém confere o total exportado contra a tela.
 */
export function parsePayoutFilters(params: PayoutFilterParams): ParsedPayoutFilters {
  const q      = params.q?.trim() || ""
  const status = STATUS_OPTIONS.includes(params.status as PayoutStatus) ? (params.status as PayoutStatus) : undefined
  const from   = params.from || ""
  const to     = params.to   || ""

  // Data pura (YYYY-MM-DD) do <input type="date"> — sem componente de hora, então
  // "from" e "to" já cobrem o dia inteiro sem precisar de +1 dia no "to" (lt do dia
  // seguinte seria necessário só se comparássemos contra hora; aqui basta lte no fim
  // do dia informado).
  const fromDate = from ? new Date(`${from}T00:00:00`) : undefined
  const toDate   = to   ? new Date(`${to}T23:59:59.999`) : undefined

  const where: Prisma.PayoutWhereInput = {
    ...(status ? { status } : {}),
    ...(fromDate || toDate ? { createdAt: { ...(fromDate ? { gte: fromDate } : {}), ...(toDate ? { lte: toDate } : {}) } } : {}),
    ...(q
      ? {
          OR: [
            { booking: { item: { title: { contains: q, mode: "insensitive" } } } },
            { ownerPaymentAccount: { user: { name:  { contains: q, mode: "insensitive" } } } },
            { ownerPaymentAccount: { user: { email: { contains: q, mode: "insensitive" } } } },
            // Só casa com o ID EXATO da reserva (é um cuid, não dá pra busca parcial) —
            // útil quando se cola o ID vindo da URL de /admin/reservas/[id].
            { bookingId: { equals: q } },
          ],
        }
      : {}),
  }

  return { q, status, from, to, where }
}

export { STATUS_OPTIONS as PAYOUT_STATUS_OPTIONS }
