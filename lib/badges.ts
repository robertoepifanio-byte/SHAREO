/**
 * P3-70/71/72 — Sistema de reputação e badges do ShareO.
 *
 * Regras:
 *  - +10 pontos por avaliação enviada
 *  - Badge locatário baseado em aluguéis concluídos como borrower
 *  - Badge "Avaliador Ativo" quando tem ≥1 avaliação nos últimos 30 dias
 */

export interface Badge {
  key:   string
  label: string
  emoji: string
  color: string
}

// P3-71: badges de locatário por quantidade de aluguéis concluídos
const BORROWER_BADGES: (Badge & { minBookings: number })[] = [
  { key: "diamond",  label: "Diamante",  emoji: "💎", color: "text-blue-400",   minBookings: 50 },
  { key: "gold",     label: "Ouro",      emoji: "🥇", color: "text-yellow-500", minBookings: 25 },
  { key: "silver",   label: "Prata",     emoji: "🥈", color: "text-slate-400",  minBookings: 10 },
  { key: "bronze",   label: "Bronze",    emoji: "🥉", color: "text-amber-700",  minBookings: 3  },
]

export function getBorrowerBadge(completedBookingsAsBorrower: number): Badge | null {
  return BORROWER_BADGES.find((b) => completedBookingsAsBorrower >= b.minBookings) ?? null
}

export function getNextBorrowerBadge(completedBookingsAsBorrower: number): {
  badge: Badge & { minBookings: number }
  progress: number // 0–100
} | null {
  const sorted = [...BORROWER_BADGES].reverse() // Bronze → Diamante
  const nextIdx = sorted.findIndex((b) => completedBookingsAsBorrower < b.minBookings)
  if (nextIdx === -1) return null // já tem o máximo

  const next = sorted[nextIdx]!
  const prev = sorted[nextIdx - 1]
  const from = prev?.minBookings ?? 0
  const progress = Math.round(((completedBookingsAsBorrower - from) / (next.minBookings - from)) * 100)
  return { badge: next, progress: Math.max(0, Math.min(100, progress)) }
}

// P3-72: badge "Avaliador Ativo" — recebido quando enviou avaliação nos últimos 30 dias
export const ACTIVE_REVIEWER_BADGE: Badge = {
  key:   "active-reviewer",
  label: "Avaliador Ativo",
  emoji: "⭐",
  color: "text-orange-link",
}

export function isActiveReviewer(lastReviewDate: Date | null | undefined): boolean {
  if (!lastReviewDate) return false
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  return lastReviewDate > thirtyDaysAgo
}

export const REPUTATION_PER_REVIEW = 10
