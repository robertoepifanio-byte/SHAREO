// Fonte: components/ui/StatCard.tsx, components/ui/*Badge (deduplicação s38)
// Transcrição dos badges do site — StatusBadge, BookingStatusBadge, ItemStatusBadge.
// Valores de cor transcritos de globals.css (:root booking/item status).

import React from "react"
import { View, Text, StyleSheet } from "react-native"

// ── Badge base ───────────────────────────────────────────────────────────────
type BadgeVariant = "green" | "amber" | "red" | "blue" | "gray" | "navy"

interface BadgeProps {
  variant:  BadgeVariant
  children: React.ReactNode
}

// Paleta transcrita de globals.css (valores de booking/item status)
const BADGE_COLORS: Record<BadgeVariant, { bg: string; text: string; border: string }> = {
  green: { bg: "#D1FAE5", text: "#065F46", border: "#A7F3D0" },
  amber: { bg: "#FEF3C7", text: "#92400E", border: "#FDE68A" },
  red:   { bg: "#FEE2E2", text: "#991B1B", border: "#FECACA" },
  blue:  { bg: "#EFF6FF", text: "#1E40AF", border: "#BFDBFE" },
  gray:  { bg: "#F1F5F9", text: "#64748B", border: "#E2E8F0" },
  navy:  { bg: "#EFF6FF", text: "#003366", border: "#BFDBFE" },
}

export function Badge({ variant, children }: BadgeProps) {
  const c = BADGE_COLORS[variant]
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: c.bg, borderColor: c.border },
      ]}
    >
      <Text style={[styles.text, { color: c.text }]}>
        {children}
      </Text>
    </View>
  )
}

// ── BookingStatusBadge — mapeamento transcrito do handoff §1.5 ───────────────
// Status Prisma → variant → label (VERBATIM do handoff)
type BookingStatus = "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELLED" | "DISPUTED"

const BOOKING_MAP: Record<BookingStatus, { variant: BadgeVariant; label: string }> = {
  PENDING:   { variant: "amber", label: "Aguardando aprovação" },
  ACTIVE:    { variant: "blue",  label: "Em andamento" },
  COMPLETED: { variant: "green", label: "Concluída" },
  CANCELLED: { variant: "gray",  label: "Cancelada" },
  DISPUTED:  { variant: "red",   label: "Em disputa" },
}

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const m = BOOKING_MAP[status]
  return <Badge variant={m.variant}>{m.label}</Badge>
}

// ── ItemStatusBadge — mapeamento transcrito do handoff §1.5 ─────────────────
type ItemStatus = "AVAILABLE" | "RENTED" | "DRAFT" | "UNDER_REVIEW"

const ITEM_MAP: Record<ItemStatus, { variant: BadgeVariant; label: string }> = {
  AVAILABLE:    { variant: "green", label: "Disponível" },
  RENTED:       { variant: "amber", label: "Alugado" },
  DRAFT:        { variant: "gray",  label: "Rascunho" },
  UNDER_REVIEW: { variant: "blue",  label: "Em análise" },
}

export function ItemStatusBadge({ status }: { status: ItemStatus }) {
  const m = ITEM_MAP[status]
  return <Badge variant={m.variant}>{m.label}</Badge>
}

// Alias conforme handoff §1.5
export { Badge as StatusBadge }

const styles = StyleSheet.create({
  badge: {
    alignSelf:       "flex-start",
    borderWidth:     1,
    borderRadius:    6,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  text: {
    fontSize:   11,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
})
