/**
 * Consulta compartilhada das linhas do relatório financeiro (ADR-016).
 *
 * Extraída de `app/api/admin/export/route.ts` quando o cron mensal de
 * intermediações (Contabilizei, B3 — ver docs/juridico/retorno-contabilizei-
 * tributacao-2026-09-10.md) passou a precisar da mesma consulta. Não pode
 * viver dentro de um `route.ts` como export nomeado extra: o `next build`
 * reprova rota com export que não é handler/config (ver memória
 * feedback-next-route-export-solto).
 */
import { prisma } from "@/lib/prisma"
import { decryptDocument } from "@/lib/crypto"
import { centsToCsvDecimal } from "@/lib/csv"
import { PAYOUT_STATUS_LABEL } from "@/lib/payout-status"
import type { PayoutStatus } from "@prisma/client"

/**
 * Resumo do(s) `Payout` de uma reserva — normalmente 1, mas pode ser 2 quando
 * há extensão de prazo paga à parte (ATOR-03, um Payout por cobrança). Sem
 * essa junção o CSV mostrava o valor CALCULADO do repasse, nunca se ele
 * realmente saiu — pedido do fundador para auditoria de verdade.
 */
function resumoRepasse(payouts: { status: PayoutStatus; processedAt: Date | null }[]): string {
  if (payouts.length === 0) return "—"
  if (payouts.every((p) => p.status === "COMPLETED")) return PAYOUT_STATUS_LABEL.COMPLETED
  if (payouts.some((p) => p.status === "FAILED" || p.status === "BLOCKED")) {
    return payouts.map((p) => PAYOUT_STATUS_LABEL[p.status]).join(" + ")
  }
  return PAYOUT_STATUS_LABEL[payouts[0].status]
}

/**
 * CPF (PF) ou CNPJ (PJ) do proprietário, em claro — exigido pela Contabilizei
 * para emitir a NF da comissão contra o proprietário (retorno 10/09/2026).
 * Só dígitos, sem máscara: diferente da exibição em tela (`maskCPF`/
 * `maskCNPJ`), este export alimenta um sistema contábil, não um usuário.
 * Escopo já restrito a ADMIN_SUPERADMIN/ADMIN_FINANCEIRO em ambos os
 * chamadores.
 */
function documentoProprietario(owner: { cpfEncrypted: string | null; cnpjEncrypted: string | null }): string {
  const encrypted = owner.cnpjEncrypted ?? owner.cpfEncrypted
  if (!encrypted) return ""
  try {
    return decryptDocument(encrypted)
  } catch {
    return ""
  }
}

/**
 * Janela do mês calendário anterior + rótulo pt-BR — compartilhada pelos dois
 * crons de fechamento mensal (`cron/monthly-report`, resumo agregado;
 * `cron/intermediation-report`, CSV por transação). Vivia copiada em cada um.
 */
export function getPreviousMonthWindow(now: Date = new Date()) {
  const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastDay  = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
  const monthLabel = firstDay.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
  return { firstDay, lastDay, monthLabel }
}

/** Admins com acesso a relatórios financeiros — mesmo filtro nos dois crons mensais. */
export function getFinanceAdmins() {
  return prisma.user.findMany({
    where:  { role: "ADMIN", adminRole: { in: ["ADMIN_FINANCEIRO", "ADMIN_SUPERADMIN"] } },
    select: { id: true, email: true, name: true },
  })
}

export async function fetchFinancialRows(start: Date, end: Date) {
  const bookings = await prisma.booking.findMany({
    where: {
      // Reserva em disputa nao fica mais num status proprio: ela segue
      // ACTIVE/RETURNED. Entra no export pelo `disputeStatus`, senao
      // sumiria justamente do relatorio que existe para acompanha-la.
      OR: [
        { status: { in: ["COMPLETED", "CANCELLED"] } },
        { disputeStatus: { not: "NONE" } },
      ],
      createdAt: { gte: start, lte: end },
    },
    orderBy: { createdAt: "asc" },
    select: {
      id:               true,
      createdAt:        true,
      status:           true,
      paymentStatus:    true,
      totalPrice:       true,
      platformFeeRate:  true,
      platformFeeAmount: true,
      ownerNetAmount:   true,
      stripeFee:        true,
      stripeDisputeId:  true,
      item:             { select: { title: true } },
      owner:            { select: { name: true, email: true, cpfEncrypted: true, cnpjEncrypted: true } },
      borrower:         { select: { name: true, email: true } },
      payouts:          { select: { status: true, processedAt: true } },
    },
  })

  return bookings.map((b) => ({
    "data":                b.createdAt.toISOString().slice(0, 10),
    "cod locação":         b.id,
    "descrição":           b.item.title,
    "valor pago":          centsToCsvDecimal(b.totalPrice),
    "tx Stripe":           centsToCsvDecimal(b.stripeFee),
    "Comissão Shareo":     centsToCsvDecimal(b.platformFeeAmount),
    "Valor proprietário":  centsToCsvDecimal(b.ownerNetAmount),
    status:                b.status,
    pagamento:             b.paymentStatus,
    proprietario:          b.owner.name ?? "",
    cpf_cnpj_proprietario: documentoProprietario(b.owner),
    email_proprietario:    b.owner.email,
    locatario:             b.borrower.name ?? "",
    email_locatario:       b.borrower.email,
    taxa_pct:              b.platformFeeRate != null ? (b.platformFeeRate / 100).toFixed(2) + "%" : "",
    status_repasse:        resumoRepasse(b.payouts),
    dispute_id:            b.stripeDisputeId ?? "",
  }))
}
