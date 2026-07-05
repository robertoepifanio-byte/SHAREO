// Fonte: app/dashboard/page.tsx + components/dashboard/{SuggestCard,MonthlyGoalProgress,UpcomingReturns}.tsx

import React, { useState } from "react"
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from "react-native"
import { router } from "expo-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Image } from "expo-image"
import Svg, { Path, Line, Rect, Circle, Polyline } from "react-native-svg"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useAuth } from "@/lib/auth"
import { useTheme } from "@/lib/theme"
import { apiFetch, API_URL } from "@/lib/api"
import { Avatar } from "@/components/ui/Avatar"

// ── Tipos — espelham exatamente os campos retornados por GET /api/dashboard ──
interface RecentBooking {
  id:         string
  status:     string
  startDate:  string
  endDate:    string
  totalPrice: number
  item: {
    title:  string
    images: { url: string }[]
  }
}

interface SuggestionItem {
  id:          string
  title:       string
  pricePerDay: number
  images:      { url: string }[]
}

interface UpcomingReturn {
  id:       string
  endDate:  string
  item:     { title: string }
  borrower: { name: string }
}

interface DashboardData {
  itemCount:       number
  totalViews:      number
  activeBookings:  number
  monthEarnings:   number
  recentBookings:  RecentBooking[]
  suggestions:     SuggestionItem[]
  upcomingReturns: UpcomingReturn[]
  co2Kg:           number
  treesEquivalent: number
}

// ── BOOKING_STATUS_LABEL — verbatim de components/ui/BookingStatusBadge.tsx ──
const BOOKING_STATUS_LABEL: Record<string, string> = {
  PENDING:   "Aguardando",
  CONFIRMED: "Confirmada",
  ACTIVE:    "Em andamento",
  RETURNED:  "Devolução em andamento",
  COMPLETED: "Concluída",
  CANCELLED: "Cancelada",
  DISPUTED:  "Em disputa",
}

// ── formatPrice — equivalente a formatPrice() de utils/format.ts ──
function formatPrice(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style:    "currency",
    currency: "BRL",
  }).format(cents / 100)
}

// ── formatDateNumeric — equivalente a formatDateNumeric() de utils/format.ts ──
function formatDateNumeric(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day:   "2-digit",
    month: "2-digit",
    year:  "numeric",
  })
}

// ── countdownLabel — verbatim de components/dashboard/UpcomingReturns.tsx ──
function countdownLabel(endDate: string): string {
  const now    = new Date()
  const end    = new Date(endDate)
  const msLeft =
    new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime() -
    new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const days = Math.ceil(msLeft / 86_400_000)

  if (days < 0)   return `Atrasado ${Math.abs(days)} dia${Math.abs(days) !== 1 ? "s" : ""}`
  if (days === 0) return "Devolução hoje"
  if (days === 1) return "Devolução amanhã"
  return `Devolução em ${days} dias`
}

// ── Ícones SVG — subconjunto dos ícones Lucide usados na página do site ──────
function IconPlus({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Line x1="12" y1="5" x2="12" y2="19" />
      <Line x1="5"  y1="12" x2="19" y2="12" />
    </Svg>
  )
}
function IconPackage({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Line x1="16.5" y1="9.4"  x2="7.5"  y2="4.21" />
      <Path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <Polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <Line x1="12" y1="22.08" x2="12" y2="12" />
    </Svg>
  )
}
function IconSearch({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="11" cy="11" r="8" />
      <Line x1="21" y1="21" x2="16.65" y2="16.65" />
    </Svg>
  )
}
function IconChat({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </Svg>
  )
}
function IconCalendar({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <Line x1="16" y1="2" x2="16" y2="6" />
      <Line x1="8"  y1="2" x2="8"  y2="6" />
      <Line x1="3"  y1="10" x2="21" y2="10" />
    </Svg>
  )
}
function IconUser({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <Circle cx="9" cy="7" r="4" />
      <Line x1="19" y1="8" x2="19" y2="14" />
      <Line x1="22" y1="11" x2="16" y2="11" />
    </Svg>
  )
}

// ── Status badge colors — verbatim de components/ui/BookingStatusBadge.tsx ──
function statusColors(status: string): { bg: string; text: string } {
  switch (status) {
    case "PENDING":   return { bg: "#FEF3C7", text: "#92400E" }
    case "CONFIRMED": return { bg: "#DBEAFE", text: "#1D4ED8" }
    case "ACTIVE":    return { bg: "#D1FAE5", text: "#065F46" }
    case "RETURNED":  return { bg: "#EDE9FE", text: "#5B21B6" }
    case "COMPLETED": return { bg: "#D1FAE5", text: "#065F46" }
    case "CANCELLED": return { bg: "#FEE2E2", text: "#991B1B" }
    case "DISPUTED":  return { bg: "#FEF3C7", text: "#92400E" }
    default:          return { bg: "#F1F5F9", text: "#64748B" }
  }
}

// ── DEFAULT_GOAL_CENTS — verbatim de components/dashboard/MonthlyGoalProgress.tsx ──
const DEFAULT_GOAL_CENTS = 50_000 // R$ 500,00

export default function DashboardScreen() {
  const { tokens } = useTheme()
  const insets      = useSafeAreaInsets()
  const { user }   = useAuth()
  const qc          = useQueryClient()

  // Reminder state por booking — espelha UpcomingReturns.tsx
  const [reminded, setReminded] = useState<Set<string>>(new Set())
  const [reminderError, setReminderError] = useState<Record<string, string>>({})

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["dashboard"],
    queryFn:  () => apiFetch<{ data: DashboardData }>("/api/dashboard"),
    enabled:  !!user,
    select:   (r) => r.data,
    staleTime: 60_000,
  })

  const reminderMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const res = await fetch(`${API_URL}/api/bookings/${bookingId}/reminder`, {
        method: "POST",
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error?.message ?? "Erro ao enviar lembrete.")
      return bookingId
    },
    onSuccess: (bookingId) => {
      setReminded((prev) => new Set([...prev, bookingId]))
    },
    onError: (err: Error, bookingId) => {
      setReminderError((prev) => ({ ...prev, [bookingId]: err.message }))
    },
  })

  // ── Guard: não logado ─────────────────────────────────────────────────────
  if (!user) {
    return (
      <View style={[s.center, { backgroundColor: tokens.bg }]}>
        <Text style={[s.gateTitle, { color: tokens.navy }]}>
          Faça login para acessar o Dashboard
        </Text>
        <TouchableOpacity
          style={[s.loginBtn, { backgroundColor: tokens.green }]}
          onPress={() => router.push("/(auth)/login")}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Entrar"
        >
          <Text style={s.loginBtnText}>Entrar</Text>
        </TouchableOpacity>
      </View>
    )
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={[s.center, { backgroundColor: tokens.bg }]}>
        <ActivityIndicator size="large" color={tokens.green} />
        <Text style={[s.loadingText, { color: tokens.muted }]}>Carregando...</Text>
      </View>
    )
  }

  // ── Erro ──────────────────────────────────────────────────────────────────
  if (isError || !data) {
    return (
      <View style={[s.center, { backgroundColor: tokens.bg }]}>
        <Text style={[s.gateTitle, { color: tokens.navy }]}>
          Não foi possível carregar o Dashboard
        </Text>
        <TouchableOpacity
          style={[s.loginBtn, { backgroundColor: tokens.green }]}
          onPress={() => refetch()}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Tentar novamente"
        >
          <Text style={s.loginBtnText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const firstName     = user.name?.split(" ")[0] ?? "você"
  const earningsCents = data.monthEarnings

  // P2-60 — Meta mensal — verbatim de MonthlyGoalProgress.tsx
  const goalCents  = DEFAULT_GOAL_CENTS
  const goalPct    = Math.min(Math.round((earningsCents / goalCents) * 100), 100)
  const goalReached = earningsCents >= goalCents

  return (
    <ScrollView
      style={[s.scroll, { backgroundColor: tokens.bg }]}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
    >
      {/* ── HEADER GRADIENTE — verbatim de dashboard/page.tsx linhas 159-174 ── */}
      {/* solid navy no mobile (gradient não disponível sem biblioteca extra) */}
      <View style={[s.headerBand, { backgroundColor: tokens.navy, paddingTop: insets.top + 16 }]}>
        <View style={s.headerRow}>
          <View style={s.headerText}>
            <Text style={s.headerGreeting}>Olá, {firstName}! 👋</Text>
            <Text style={s.headerSub}>Bem-vindo de volta ao ShareO</Text>
          </View>
          <Avatar name={firstName} imageUrl={user.avatarUrl} size="md" />
        </View>
      </View>

      <View style={s.content}>

        {/* ── Stats 2×2 — verbatim de dashboard/page.tsx linhas 205-226 ── */}
        <View style={s.statsGrid}>
          <View style={[s.statCard, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
            <Text style={[s.statLabel, { color: tokens.muted }]}>RESERVAS ATIVAS</Text>
            <Text style={[s.statValue, { color: tokens.navy }]}>{data.activeBookings}</Text>
            <Text style={[s.statSub, { color: tokens.muted }]}>em andamento</Text>
          </View>

          <View style={[s.statCard, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
            <Text style={[s.statLabel, { color: tokens.muted }]}>MEUS ITENS</Text>
            <Text style={[s.statValue, { color: tokens.navy }]}>{data.itemCount}</Text>
            <Text style={[s.statSub, { color: tokens.muted }]}>
              {data.itemCount === 1 ? "anunciado" : "anunciados"}
            </Text>
          </View>

          <View style={[s.statCard, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
            <Text style={[s.statLabel, { color: tokens.muted }]}>GANHOS ESTE MÊS</Text>
            <Text style={[s.statValue, { color: tokens.green }]}>{formatPrice(earningsCents)}</Text>
            <Text style={[s.statSub, { color: tokens.muted }]}>como locador</Text>
          </View>

          <View style={[s.statCard, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
            <Text style={[s.statLabel, { color: tokens.muted }]}>VISUALIZAÇÕES</Text>
            <Text style={[s.statValue, { color: tokens.navy }]}>{data.totalViews}</Text>
            <Text style={[s.statSub, { color: tokens.muted }]}>nos seus anúncios</Text>
          </View>
        </View>

        {/* ── Meta mensal — verbatim de MonthlyGoalProgress.tsx ── */}
        <View
          style={[
            s.goalCard,
            goalReached
              ? { backgroundColor: "#F0FDF4", borderColor: "#86EFAC" }
              : { backgroundColor: tokens.surface, borderColor: tokens.border },
          ]}
          accessibilityLabel={`Meta mensal: ${formatPrice(earningsCents)} de ${formatPrice(goalCents)} (${goalPct}%)`}
        >
          <View style={s.goalHeader}>
            <Text style={[s.goalLabel, { color: tokens.muted }]}>META MENSAL</Text>
            {goalReached && (
              <View style={s.goalBadge}>
                <Text style={s.goalBadgeText}>Meta atingida!</Text>
              </View>
            )}
          </View>

          <View style={s.goalAmountRow}>
            <Text style={[s.goalAmount, { color: goalReached ? tokens.success : tokens.green }]}>
              {formatPrice(earningsCents)}
            </Text>
            <Text style={[s.goalMeta, { color: tokens.muted }]}>
              {" "}/ {formatPrice(goalCents)}
            </Text>
          </View>

          {/* Barra de progresso */}
          <View
            style={[s.progressTrack, { backgroundColor: tokens.border }]}
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: 100, now: goalPct }}
          >
            <View
              style={[
                s.progressFill,
                {
                  width:           `${goalPct}%` as `${number}%`,
                  backgroundColor: goalReached ? tokens.success : tokens.green,
                },
              ]}
            />
          </View>

          <Text style={[s.goalPct, { color: tokens.muted }]}>
            {goalPct}%{goalReached ? " 🎉" : ""}
          </Text>
        </View>

        {/* ── Próximas devoluções — verbatim de UpcomingReturns.tsx ── */}
        {data.upcomingReturns.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={[s.sectionTitle, { color: tokens.navy }]}>Próximas devoluções</Text>
              <TouchableOpacity
                onPress={() => router.push("/(tabs)/reservas")}
                accessibilityRole="link"
                accessibilityLabel="Ver todas as reservas"
              >
                <Text style={[s.sectionLink, { color: tokens.green }]}>Ver todas →</Text>
              </TouchableOpacity>
            </View>

            <View style={[s.listCard, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
              {data.upcomingReturns.map((b, i) => {
                const isReminded = reminded.has(b.id)
                const isSending  = reminderMutation.isPending && reminderMutation.variables === b.id
                const errMsg     = reminderError[b.id]
                const countdown  = countdownLabel(b.endDate)
                const isOverdue  = countdown.startsWith("Atrasado")
                const isSoon     = countdown === "Devolução hoje" || countdown === "Devolução amanhã"
                const firstName  = b.borrower.name.split(" ")[0]

                return (
                  <View
                    key={b.id}
                    style={[
                      s.listRow,
                      i < data.upcomingReturns.length - 1
                        ? { borderBottomWidth: 1, borderBottomColor: tokens.border }
                        : undefined,
                    ]}
                  >
                    {/* Ícone calendário — verbatim de UpcomingReturns.tsx linha 89 */}
                    <View style={[s.iconCircle, { backgroundColor: `${tokens.green}1A` }]}>
                      <IconCalendar color={tokens.green} />
                    </View>

                    <View style={s.listRowText}>
                      <Text
                        style={[s.listRowTitle, { color: tokens.text }]}
                        numberOfLines={1}
                      >
                        {b.item.title}
                      </Text>
                      <Text style={[s.listRowSub, { color: tokens.muted }]}>
                        Locatário: {firstName}
                      </Text>
                      <Text
                        style={[
                          s.listRowSub,
                          {
                            fontWeight: "600",
                            color: isOverdue
                              ? tokens.error
                              : isSoon
                              ? tokens.warning
                              : tokens.muted,
                          },
                        ]}
                      >
                        {countdown}
                      </Text>
                      {errMsg ? (
                        <Text style={[s.listRowSub, { color: tokens.error }]}>{errMsg}</Text>
                      ) : null}
                    </View>

                    {/* Botão lembrete — verbatim de UpcomingReturns.tsx linha 110 */}
                    <TouchableOpacity
                      onPress={() => {
                        setReminderError((prev) => { const n = { ...prev }; delete n[b.id]; return n })
                        reminderMutation.mutate(b.id)
                      }}
                      disabled={isReminded || isSending}
                      accessibilityRole="button"
                      accessibilityLabel={isReminded ? "Lembrete enviado" : `Enviar lembrete para ${firstName}`}
                      style={[
                        s.reminderBtn,
                        isReminded
                          ? { backgroundColor: "#D1FAE5" }
                          : isSending
                          ? { backgroundColor: tokens.border }
                          : { backgroundColor: `${tokens.green}1A` },
                      ]}
                    >
                      <Text
                        style={[
                          s.reminderBtnText,
                          {
                            color: isReminded
                              ? tokens.success
                              : isSending
                              ? tokens.muted
                              : tokens.green,
                          },
                        ]}
                      >
                        {isSending ? "..." : isReminded ? "Enviado ✓" : "Lembrar"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )
              })}
            </View>
          </View>
        )}

        {/* ── Reservas recentes — verbatim de dashboard/page.tsx linhas 241-273 ── */}
        {data.recentBookings.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={[s.sectionTitle, { color: tokens.navy }]}>Minhas Reservas</Text>
              <TouchableOpacity
                onPress={() => router.push("/(tabs)/reservas")}
                accessibilityRole="link"
                accessibilityLabel="Ver histórico de reservas"
              >
                <Text style={[s.sectionLink, { color: tokens.green }]}>Ver histórico →</Text>
              </TouchableOpacity>
            </View>

            <View style={[s.listCard, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
              {data.recentBookings.map((b, i) => {
                const { bg: sBg, text: sText } = statusColors(b.status)
                return (
                  <TouchableOpacity
                    key={b.id}
                    onPress={() => router.push(`/reservas/${b.id}` as never)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`Reserva ${b.item.title}`}
                    style={[
                      s.listRow,
                      i < data.recentBookings.length - 1
                        ? { borderBottomWidth: 1, borderBottomColor: tokens.border }
                        : undefined,
                    ]}
                  >
                    {/* Thumbnail do item */}
                    <View style={[s.itemThumb, { backgroundColor: tokens.border }]}>
                      {b.item.images[0]?.url ? (
                        <Image
                          source={{ uri: b.item.images[0].url }}
                          style={s.itemThumbImg}
                          contentFit="cover"
                          accessibilityLabel={b.item.title}
                        />
                      ) : null}
                    </View>

                    <View style={s.listRowText}>
                      <Text
                        style={[s.listRowTitle, { color: tokens.text }]}
                        numberOfLines={1}
                      >
                        {b.item.title}
                      </Text>
                      <Text style={[s.listRowSub, { color: tokens.muted }]}>
                        {formatDateNumeric(b.startDate)} – {formatDateNumeric(b.endDate)}
                      </Text>
                    </View>

                    {/* Status badge */}
                    <View style={[s.statusBadge, { backgroundColor: sBg }]}>
                      <Text style={[s.statusBadgeText, { color: sText }]}>
                        {BOOKING_STATUS_LABEL[b.status] ?? b.status}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        )}

        {/* ── Sugestões — verbatim de dashboard/page.tsx linhas 276-288 (via SuggestCard) ── */}
        {data.suggestions.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={[s.sectionTitle, { color: tokens.navy }]}>Sugestões para Você</Text>
              <TouchableOpacity
                onPress={() => router.push("/(tabs)/explorar")}
                accessibilityRole="link"
                accessibilityLabel="Ver mais itens"
              >
                <Text style={[s.sectionLink, { color: tokens.green }]}>Ver mais →</Text>
              </TouchableOpacity>
            </View>

            {/* ScrollView horizontal — verbatim de dashboard/page.tsx linha 282 */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.suggestionsRow}
            >
              {data.suggestions.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => router.push(`/itens/${item.id}` as never)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={item.title}
                  style={[s.suggestCard, { backgroundColor: tokens.surface, borderColor: tokens.border }]}
                >
                  <View style={[s.suggestThumb, { backgroundColor: tokens.border }]}>
                    {item.images[0]?.url ? (
                      <Image
                        source={{ uri: item.images[0].url }}
                        style={s.suggestThumbImg}
                        contentFit="cover"
                        accessibilityLabel={item.title}
                      />
                    ) : null}
                  </View>
                  <View style={s.suggestBody}>
                    <Text
                      style={[s.suggestTitle, { color: tokens.text }]}
                      numberOfLines={2}
                    >
                      {item.title}
                    </Text>
                    <Text style={[s.suggestPrice, { color: tokens.green }]}>
                      {formatPrice(item.pricePerDay)}
                      <Text style={[s.suggestPriceSub, { color: tokens.muted }]}>/dia</Text>
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Ações rápidas — verbatim de dashboard/page.tsx linhas 291-354 ── */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: tokens.navy }]}>Ações rápidas</Text>

          <View style={s.actionsGrid}>
            {[
              {
                icon:  <IconPlus color={tokens.green} />,
                label: "Criar anúncio",
                desc:  "Anuncie um item para alugar",
                onPress: () => router.push("/itens/novo"),
              },
              {
                icon:  <IconPackage color={tokens.green} />,
                label: "Meus anúncios",
                desc:  "Gerencie o que você anuncia",
                onPress: () => router.push("/meus-anuncios"),
              },
              {
                icon:  <IconSearch color={tokens.green} />,
                label: "Explorar itens",
                desc:  "Encontre o que você precisa alugar",
                onPress: () => router.push("/(tabs)/explorar"),
              },
              {
                icon:  <IconChat color={tokens.green} />,
                label: "Chat",
                desc:  "Veja suas conversas",
                onPress: () => router.push("/(tabs)/mensagens"),
              },
            ].map((action) => (
              <TouchableOpacity
                key={action.label}
                onPress={action.onPress}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={action.label}
                style={[s.actionCard, { backgroundColor: tokens.surface, borderColor: tokens.border }]}
              >
                <View style={[s.actionIcon, { backgroundColor: `${tokens.green}1A` }]}>
                  {action.icon}
                </View>
                <View style={s.actionText}>
                  <Text style={[s.actionLabel, { color: tokens.navy }]}>{action.label}</Text>
                  <Text style={[s.actionDesc, { color: tokens.muted }]}>{action.desc}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── ShareO Sustentável — verbatim de dashboard/page.tsx linhas 357-378 ── */}
        <View style={[s.sustainCard, { backgroundColor: tokens.green }]}>
          <View style={s.sustainHeader}>
            <Text style={s.sustainEmoji}>🌿</Text>
            <Text style={s.sustainTitle}>ShareO Sustentável</Text>
          </View>
          <Text style={s.sustainSub}>Iniciativas de economia circular na sua região</Text>

          <View style={s.sustainItems}>
            {[
              { icon: "👕", title: "Troca Circular",  desc: "Troque roupas que não usa com vizinhos da sua região." },
              { icon: "🔧", title: "Eco Centro",      desc: "Doe ou repare equipamentos. Evite o descarte desnecessário." },
              { icon: "♻️", title: "Reciclagem Local", desc: "Descubra pontos de coleta seletiva perto de você." },
            ].map((card) => (
              <View key={card.title} style={s.sustainItem}>
                <Text style={s.sustainItemEmoji}>{card.icon}</Text>
                <Text style={s.sustainItemTitle}>{card.title}</Text>
                <Text style={s.sustainItemDesc}>{card.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── CO₂ Bar — verbatim de dashboard/page.tsx linhas 381-394 ── */}
        <View style={s.co2Bar}>
          <Text style={s.co2Emoji}>🌍</Text>
          <View style={s.co2Text}>
            <Text style={s.co2Value}>
              {data.co2Kg > 0
                ? `${data.co2Kg} kg CO₂`
                : "Comece a alugar e economize CO₂"}
            </Text>
            <Text style={s.co2Sub}>
              economizados com o ShareO
              {data.co2Kg > 0 && data.treesEquivalent >= 0.01
                ? ` · equivale a ${
                    data.treesEquivalent >= 1
                      ? `${Math.floor(data.treesEquivalent)} árvore${Math.floor(data.treesEquivalent) !== 1 ? "s" : ""}`
                      : `${(data.treesEquivalent * 100).toFixed(0)}% de uma árvore`
                  } plantada`
                : ""}
            </Text>
          </View>
        </View>

      </View>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  scroll: { flex: 1 },

  center: {
    flex:           1,
    alignItems:     "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  gateTitle: {
    fontSize:  16,
    fontWeight: "600",
    textAlign: "center",
  },
  loadingText: { fontSize: 13, marginTop: 8 },
  loginBtn: {
    borderRadius:      10,
    minHeight:         48,
    paddingHorizontal: 32,
    alignItems:        "center",
    justifyContent:    "center",
    width:             "100%",
  },
  loginBtnText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },

  // Header
  headerBand: {
    paddingHorizontal: 16,
    paddingBottom:     20,
  },
  headerRow: {
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "space-between",
  },
  headerText:    { flex: 1 },
  headerGreeting: {
    fontSize:   22,
    fontWeight: "800",
    color:      "#FFFFFF",
    fontFamily: "Montserrat_700Bold",
  },
  headerSub: {
    fontSize:   13,
    color:      "rgba(255,255,255,0.65)",
    marginTop:  4,
  },

  // Main content padding
  content: {
    paddingHorizontal: 16,
    paddingTop:        16,
    gap:               16,
  },

  // Stats grid 2×2 — verbatim de dashboard/page.tsx linhas 205-226
  statsGrid: {
    flexDirection: "row",
    flexWrap:      "wrap",
    gap:           12,
  },
  statCard: {
    width:             "47.5%",
    borderWidth:       1,
    borderRadius:      12,
    padding:           16,
  },
  statLabel: {
    fontSize:      10,
    fontWeight:    "700",
    letterSpacing: 0.8,
    marginBottom:  4,
  },
  statValue: {
    fontSize:   22,
    fontWeight: "800",
  },
  statSub: {
    fontSize:  11,
    marginTop:  4,
  },

  // Meta mensal — verbatim de MonthlyGoalProgress.tsx
  goalCard: {
    borderWidth:  1,
    borderRadius: 12,
    padding:      16,
  },
  goalHeader: {
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "space-between",
    marginBottom:   12,
  },
  goalLabel: {
    fontSize:      10,
    fontWeight:    "700",
    letterSpacing: 0.8,
  },
  goalBadge: {
    backgroundColor:   "#D1FAE5",
    borderRadius:      20,
    paddingHorizontal: 10,
    paddingVertical:   2,
  },
  goalBadgeText: { fontSize: 10, fontWeight: "700", color: "#065F46" },
  goalAmountRow: {
    flexDirection: "row",
    alignItems:    "baseline",
    marginBottom:  10,
  },
  goalAmount: { fontSize: 22, fontWeight: "800" },
  goalMeta:   { fontSize: 13 },
  progressTrack: {
    height:       10,
    borderRadius: 10,
    overflow:     "hidden",
  },
  progressFill: {
    height:       10,
    borderRadius: 10,
  },
  goalPct: {
    fontSize:   11,
    fontWeight: "600",
    textAlign:  "right",
    marginTop:  6,
  },

  // Sections
  section:       { gap: 10 },
  sectionHeader: {
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "space-between",
  },
  sectionTitle: { fontSize: 15, fontWeight: "600" },
  sectionLink:  { fontSize: 13, fontWeight: "600" },

  // List card (used for upcoming returns + recent bookings)
  listCard: {
    borderWidth:  1,
    borderRadius: 14,
    overflow:     "hidden",
  },
  listRow: {
    flexDirection:     "row",
    alignItems:        "center",
    paddingHorizontal: 14,
    paddingVertical:   12,
    gap:               10,
    minHeight:         56,
  },
  iconCircle: {
    width:          40,
    height:         40,
    borderRadius:   20,
    alignItems:     "center",
    justifyContent: "center",
    flexShrink:     0,
  },
  listRowText: { flex: 1, minWidth: 0 },
  listRowTitle: {
    fontSize:   13,
    fontWeight: "600",
  },
  listRowSub: {
    fontSize:  11,
    marginTop: 2,
  },

  // Reminder button — verbatim min-h-[44px] from UpcomingReturns.tsx
  reminderBtn: {
    flexShrink:        0,
    minWidth:          56,
    minHeight:         44,
    borderRadius:      8,
    paddingHorizontal: 10,
    alignItems:        "center",
    justifyContent:    "center",
  },
  reminderBtnText: { fontSize: 11, fontWeight: "600" },

  // Item thumbnail (recent bookings)
  itemThumb: {
    width:        48,
    height:       48,
    borderRadius: 10,
    overflow:     "hidden",
    flexShrink:   0,
  },
  itemThumbImg: {
    width:  48,
    height: 48,
  },

  // Status badge
  statusBadge: {
    borderRadius:      20,
    paddingHorizontal: 8,
    paddingVertical:   3,
    flexShrink:        0,
  },
  statusBadgeText: { fontSize: 10, fontWeight: "600" },

  // Suggestions — verbatim de SuggestCard.tsx (min-w-[140px])
  suggestionsRow: {
    gap:            10,
    paddingRight:   4,
  },
  suggestCard: {
    width:        140,
    borderWidth:  1,
    borderRadius: 14,
    overflow:     "hidden",
  },
  suggestThumb: {
    height:   90,
    overflow: "hidden",
  },
  suggestThumbImg: {
    width:  140,
    height: 90,
  },
  suggestBody: {
    padding: 8,
  },
  suggestTitle: {
    fontSize:   11,
    fontWeight: "600",
    lineHeight: 15,
  },
  suggestPrice: {
    fontSize:   13,
    fontWeight: "700",
    marginTop:  4,
  },
  suggestPriceSub: { fontSize: 10, fontWeight: "400" },

  // Actions grid
  actionsGrid: { gap: 10 },
  actionCard: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               14,
    borderWidth:       1,
    borderRadius:      12,
    padding:           16,
    minHeight:         64,
  },
  actionIcon: {
    width:          48,
    height:         48,
    borderRadius:   24,
    alignItems:     "center",
    justifyContent: "center",
    flexShrink:     0,
  },
  actionText:  { flex: 1 },
  actionLabel: { fontSize: 14, fontWeight: "600" },
  actionDesc:  { fontSize: 12, marginTop: 2 },

  // ShareO Sustentável — verbatim de dashboard/page.tsx linhas 357-378
  sustainCard: {
    borderRadius:  14,
    padding:       20,
  },
  sustainHeader: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           6,
    marginBottom:  4,
  },
  sustainEmoji: { fontSize: 18 },
  sustainTitle: {
    fontSize:   17,
    fontWeight: "700",
    color:      "#FFFFFF",
    fontFamily: "Montserrat_700Bold",
  },
  sustainSub: {
    fontSize:     12,
    color:        "rgba(255,255,255,0.7)",
    marginBottom: 14,
  },
  sustainItems: { gap: 10 },
  sustainItem: {
    backgroundColor:   "rgba(255,255,255,0.1)",
    borderRadius:      10,
    padding:           14,
  },
  sustainItemEmoji: { fontSize: 22, marginBottom: 6 },
  sustainItemTitle: {
    fontSize:     12,
    fontWeight:   "600",
    color:        "#FFFFFF",
    marginBottom: 4,
  },
  sustainItemDesc: {
    fontSize:   11,
    color:      "rgba(255,255,255,0.75)",
    lineHeight: 16,
  },

  // CO₂ bar — verbatim de dashboard/page.tsx linhas 381-394
  co2Bar: {
    flexDirection:  "row",
    alignItems:     "center",
    gap:            14,
    backgroundColor: "#004d2a",
    borderRadius:   14,
    paddingHorizontal: 20,
    paddingVertical:   16,
    marginBottom:   4,
  },
  co2Emoji: { fontSize: 30 },
  co2Text:  { flex: 1 },
  co2Value: {
    fontSize:   17,
    fontWeight: "800",
    color:      "#FFFFFF",
  },
  co2Sub: {
    fontSize:  12,
    color:     "rgba(255,255,255,0.65)",
    marginTop: 2,
  },
})
