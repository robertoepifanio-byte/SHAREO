// Fonte: app/itens/[id]/page.tsx + _PriceCalc.tsx + _StickyBookingCTA.tsx
// Transcrição das telas de detalhe do site para React Native.
// Modo locatário: galeria, preço, tabs de modalidade, resumo, CTA "Solicitar locação".
// Modo proprietário: badge "Seu item" + solicitações pendentes.
// Aviso de teto R$500: copy verbatim de _PriceCalc.tsx linha 434.
// Skeleton de loading: equivalente ao <Skeleton> do site.

import React, { useState, useMemo, useEffect } from "react"
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  Platform,
  Linking,
} from "react-native"
import { router, useLocalSearchParams } from "expo-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Image } from "expo-image"
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { apiFetch, API_URL } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { fmtCurrency, calcBookingTotal } from "@/lib/pricing"
import { useTheme } from "@/lib/theme"
import { Stars } from "@/components/ui/Stars"
import { ItemCard, type ItemCardItem } from "@/components/items/ItemCard"
import { useRentalCart, type RentalCartItem } from "@/lib/rentalCart"

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface ItemDetail {
  id:          string
  title:       string
  description: string
  pricePerDay: number
  pricePerWeek:  number | null
  pricePerMonth: number | null
  depositAmount: number | null
  condition:     string
  voltage:       string | null
  city:          string
  state:         string
  neighborhood:  string | null
  status:        string
  ownerId:       string
  rules:                  string | null
  estimatedRetailPrice:   number | null
  requireIdVerification:  boolean
  requirePhone:           boolean
  category:      { name: string }
  owner:         { id: string; name: string; avatarUrl: string | null; isVerified: boolean; city: string | null }
  images:        { url: string }[]
  reviews:       { id: string; rating: number; comment: string | null; reviewer: { name: string } }[]
  _count:        { reviews: number; favorites: number }
  // Solicitações pendentes — retornadas apenas quando o usuário é o proprietário
  pendingBookings?: { id: string; borrower: { name: string }; startDate: string }[]
  // Estatísticas do proprietário — fonte: app/itens/[id]/page.tsx linhas 122-139
  // Opcionais: a API que retorna esses campos (commit 7ab2b9f) ainda não foi
  // implantada em staging quando este código foi testado ao vivo pela 1ª vez —
  // o app deve tolerar uma resposta antiga sem esses campos, não assumir que
  // sempre existem (causou crash real: "Cannot read property 'completedCount'
  // of undefined").
  responseBadge?: { label: string; avgHours: number } | null
  ownerStats?:    { completedCount: number; responseRate: number | null }
  // P1-31 / Story B — itens relacionados retornados pelo GET /api/items/[id]
  // Fonte: app/itens/[id]/page.tsx linhas 670-699
  ownerItems?:   ItemCardItem[]
  similarItems?: ItemCardItem[]
}

interface FavoriteStatusResponse { data: { favorited: boolean } }

// ── Constantes verbatim do site ───────────────────────────────────────────────
// Fonte: _PriceCalc.tsx linha 434, CHECKOUT_MAX_CENTS = 50000 (lib/platform-config.ts)
const CHECKOUT_MAX_CENTS = 50_000          // R$500
const CONDITION: Record<string, string> = {
  NEW: "Novo", EXCELLENT: "Seminovo", GOOD: "Bom estado", FAIR: "Regular",
  NOVO: "Novo", EXCELENTE: "Seminovo", BOM: "Bom estado", REGULAR: "Regular",
}

type Mode = "daily" | "weekly" | "monthly"

// Fonte: _PriceCalc.tsx linhas 48-71 — VERBATIM. calcBookingTotal aplica a
// melhor tarifa (dia/semana/mês) pelo TOTAL de dias, independente do `mode`
// escolhido na aba (ex.: 10 dias no modo "Diário" com pricePerWeek definido
// usa tarifa semanal internamente) — o texto do resumo precisa refletir isso,
// senão o breakdown mostrado diverge do total realmente cobrado.
function buildBreakdown(
  days: number, pricePerDay: number,
  pricePerWeek?: number | null, pricePerMonth?: number | null,
): string {
  if (days >= 30 && pricePerMonth) {
    const months = Math.floor(days / 30), restDays = days % 30
    const parts: string[] = []
    if (months > 0)   parts.push(`${months} mês${months > 1 ? "es" : ""} × ${fmtCurrency(pricePerMonth)}`)
    if (restDays > 0) parts.push(`${restDays} dia${restDays > 1 ? "s" : ""} × ${fmtCurrency(pricePerDay)}`)
    return parts.join(" + ")
  }
  if (days >= 7 && pricePerWeek) {
    const weeks = Math.floor(days / 7), restDays = days % 7
    const parts: string[] = []
    if (weeks > 0)    parts.push(`${weeks} sem${weeks > 1 ? "anas" : "ana"} × ${fmtCurrency(pricePerWeek)}`)
    if (restDays > 0) parts.push(`${restDays} dia${restDays > 1 ? "s" : ""} × ${fmtCurrency(pricePerDay)}`)
    return parts.join(" + ")
  }
  return `${days} dia${days > 1 ? "s" : ""} × ${fmtCurrency(pricePerDay)}`
}

// ── Helpers ───────────────────────────────────────────────────────────────────
// Defensivo: `iso` vem do DateTimePicker nativo via dateToISO(), mas "Date value
// out of bounds" foi reproduzido em device real (causa exata não confirmada —
// suspeita de parsing de string de data divergente entre motores JS/Android).
// Nunca deixa a tela inteira crashar por causa de 1 data mal formada.
function addDays(iso: string, days: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return ""
  const d = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(d.getTime())) return ""
  d.setDate(d.getDate() + days)
  if (Number.isNaN(d.getTime())) return ""
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-")
  return `${d}/${m}/${y}`
}

function localToday(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

// Converte Date (do DateTimePicker nativo) para "AAAA-MM-DD" — mesmo formato
// que o resto da tela já usa (endDate/days calculados via addDays/fmtDate
// acima). Trocamos só o controle de entrada, não a lógica de cálculo.
function dateToISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

const todayDate = (() => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
})()

// ── AvailabilityCalendar ──────────────────────────────────────────────────────
// Transcrição de components/items/AvailabilityCalendar.tsx (site).
// Exibe 2 meses (atual + próximo) com dias coloridos:
//   verde  = disponível  | vermelho = ocupado  | cinza = passado
// Fonte dos dados: GET /api/items/[id]/availability → { data: string[] } YYYY-MM-DD.
// Nenhuma lib de calendário nova necessária — grid manual como no site.

const CAL_MONTH_NAMES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
]
const CAL_DAY_NAMES = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"]

function calDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2,"0")}-${String(day).padStart(2,"0")}`
}

/** Um mês de calendário — sem hooks (componente puro de apresentação). */
function CalendarMonth({
  year, month, occupied, todayKey,
}: { year: number; month: number; occupied: Set<string>; todayKey: string }) {
  const firstDay    = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: { day: number | null; key: string | null }[] = []
  for (let i = 0; i < firstDay; i++) cells.push({ day: null, key: null })
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, key: calDateKey(year, month, d) })
  const rows: typeof cells[] = []
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7))

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={calS.monthTitle}>{CAL_MONTH_NAMES[month]} {year}</Text>
      {/* Cabeçalho dos dias da semana */}
      <View style={calS.weekRow}>
        {CAL_DAY_NAMES.map((d) => (
          <Text key={d} style={calS.dayHeader}>{d}</Text>
        ))}
      </View>
      {/* Células de dia */}
      {rows.map((row, ri) => (
        <View key={ri} style={calS.weekRow}>
          {row.map((cell, ci) => {
            if (!cell.day || !cell.key) {
              return <View key={`e-${ri}-${ci}`} style={calS.cell} />
            }
            const isPast  = cell.key < todayKey
            const isOcc   = occupied.has(cell.key)
            const isToday = cell.key === todayKey
            // Cores verbatim dos tokens Tailwind do site:
            // bg-success/15 + text-success | bg-destructive/15 + text-destructive | bg-muted
            let bg = "#DCFCE7"; let fg = "#16A34A"
            if (isPast)       { bg = "#F1F5F9"; fg = "#94A3B8" }
            else if (isOcc)   { bg = "#FEE2E2"; fg = "#DC2626" }
            return (
              <View
                key={cell.key}
                style={[calS.cell, { backgroundColor: bg }, isToday && calS.cellToday]}
                accessibilityLabel={`${cell.day} de ${CAL_MONTH_NAMES[month]}: ${isPast ? "passado" : isOcc ? "ocupado" : "disponível"}`}
              >
                <Text style={[calS.cellText, { color: fg }]}>{cell.day}</Text>
              </View>
            )
          })}
        </View>
      ))}
    </View>
  )
}

/** Wrapper com fetch + loading/error — transcreve AvailabilityCalendar.tsx do site. */
function MobileAvailabilityCalendar({ itemId }: { itemId: string }) {
  const today    = new Date()
  const todayKey = calDateKey(today.getFullYear(), today.getMonth(), today.getDate())
  const months   = [
    { year: today.getFullYear(), month: today.getMonth() },
    {
      year:  today.getMonth() === 11 ? today.getFullYear() + 1 : today.getFullYear(),
      month: (today.getMonth() + 1) % 12,
    },
  ]

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey:  ["item-availability", itemId],
    queryFn:   () => apiFetch<{ data: string[] }>(`/api/items/${itemId}/availability`),
    staleTime: 5 * 60_000,  // 5 min — espelha o Cache-Control do endpoint
    enabled:   !!itemId,
  })
  const occupied = new Set<string>(data?.data ?? [])

  if (isLoading) {
    return (
      <View style={{ marginTop: 8 }}>
        {[0, 1].map((i) => (
          <View key={i} style={{ marginBottom: 16 }}>
            <View style={{ height: 14, width: 120, backgroundColor: "#E2E8F0", borderRadius: 6, marginBottom: 8, alignSelf: "center" }} />
            {Array.from({ length: 5 }).map((_, ri) => (
              <View key={ri} style={calS.weekRow}>
                {Array.from({ length: 7 }).map((_, ci) => (
                  <View key={ci} style={[calS.cell, { backgroundColor: "#E2E8F0" }]} />
                ))}
              </View>
            ))}
          </View>
        ))}
      </View>
    )
  }

  if (isError) {
    return (
      <View style={calS.errorBox}>
        <Text style={calS.errorText}>Não foi possível carregar o calendário.</Text>
        <TouchableOpacity onPress={() => void refetch()} style={calS.retryBtn} accessibilityRole="button" accessibilityLabel="Tentar novamente">
          <Text style={calS.retryText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View>
      {/* Legenda — verbatim do site */}
      <View style={calS.legend}>
        <View style={calS.legendItem}><View style={[calS.legendSwatch, { backgroundColor: "#DCFCE7", borderColor: "#86EFAC" }]} /><Text style={calS.legendLabel}>Disponível</Text></View>
        <View style={calS.legendItem}><View style={[calS.legendSwatch, { backgroundColor: "#FEE2E2", borderColor: "#FCA5A5" }]} /><Text style={calS.legendLabel}>Ocupado</Text></View>
        <View style={calS.legendItem}><View style={[calS.legendSwatch, { backgroundColor: "#F1F5F9", borderColor: "#CBD5E1" }]} /><Text style={calS.legendLabel}>Passado</Text></View>
      </View>
      {months.map((m) => (
        <CalendarMonth
          key={`${m.year}-${m.month}`}
          year={m.year}
          month={m.month}
          occupied={occupied}
          todayKey={todayKey}
        />
      ))}
    </View>
  )
}

// Estilos do calendário — separados para não poluir o StyleSheet principal
const calS = StyleSheet.create({
  monthTitle: { fontSize: 13, fontWeight: "700", textAlign: "center", marginBottom: 8, color: "#0F172A" },
  weekRow:    { flexDirection: "row", marginBottom: 2 },
  dayHeader:  { flex: 1, textAlign: "center", fontSize: 9, fontWeight: "500", color: "#64748B", marginBottom: 4 },
  cell: {
    flex: 1, height: 30, borderRadius: 6,
    alignItems: "center", justifyContent: "center", marginHorizontal: 1,
  },
  cellToday:  { borderWidth: 1.5, borderColor: "#007B3C" },
  cellText:   { fontSize: 11, fontWeight: "500" },
  legend:     { flexDirection: "row", gap: 12, marginBottom: 12, flexWrap: "wrap" },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendSwatch: { width: 12, height: 12, borderRadius: 3, borderWidth: 1 },
  legendLabel:  { fontSize: 11, color: "#64748B" },
  errorBox:  { borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 8, padding: 12, flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 4 },
  errorText: { fontSize: 12, color: "#64748B", flex: 1 },
  retryBtn:  { paddingHorizontal: 8, paddingVertical: 4 },
  retryText: { fontSize: 12, color: "#007B3C", fontWeight: "600", textDecorationLine: "underline" },
})

// ── AddToRentalButton (Story B) ───────────────────────────────────────────────
// Transcrição de components/cart/AddToRentalButton.tsx (site).
// Permite adicionar o item a uma locação multi-item do MESMO anunciante.
// Estado persistido via Zustand+AsyncStorage (equivale ao localStorage+window events do site).
// Sem rota nativa "/carrinho" ainda — "Ver carrinho" abre no site via Linking
// (mesmo padrão de "Editar anúncio" em itens/[id].tsx e links do MobileMenu.tsx).
// Nenhuma dep nativa nova — não exige novo build EAS.

function MobileAddToRentalButton({
  ownerId, ownerName, item,
}: { ownerId: string; ownerName: string; item: RentalCartItem }) {
  const { cart, load, add, replace } = useRentalCart()
  const [msg, setMsg] = useState<string | null>(null)

  // Carrega carrinho do AsyncStorage ao montar (idempotente — ok chamar múltiplas vezes)
  useEffect(() => { void load() }, [load])

  const inCart        = cart?.items.some((i) => i.itemId === item.itemId) ?? false
  const sameOwnerCount = cart?.ownerId === ownerId ? (cart?.items.length ?? 0) : 0

  function handleAdd() {
    setMsg(null)
    const res = add(ownerId, ownerName, item)
    if (res.ok) return
    if (res.reason === "ALREADY_IN_CART") {
      setMsg("Este item já está na sua locação.")
      return
    }
    // Carrinho tem itens de outro anunciante — copy verbatim de AddToRentalButton.tsx linha 35
    Alert.alert(
      "Substituir locação",
      "Sua locação já tem itens de outro anunciante. Deseja esvaziar e começar uma nova locação com este item?",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Confirmar", onPress: () => replace(ownerId, ownerName, item) },
      ],
    )
  }

  if (inCart) {
    return (
      <View style={{ marginBottom: 10 }}>
        {/* Verbatim AddToRentalButton.tsx linha 44-49 */}
        <TouchableOpacity
          style={addS.inCartBtn}
          onPress={() => Linking.openURL(`${API_URL}/carrinho`)}
          accessibilityRole="link"
          accessibilityLabel={`Ver carrinho${sameOwnerCount > 0 ? ` (${sameOwnerCount} itens)` : ""}`}
        >
          <Text style={addS.inCartText}>
            ✓ Na sua locação · Ver carrinho{sameOwnerCount > 0 ? ` (${sameOwnerCount})` : ""} →
          </Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={{ marginBottom: 10 }}>
      {/* Verbatim AddToRentalButton.tsx linha 51-56 */}
      <TouchableOpacity
        style={addS.addBtn}
        onPress={handleAdd}
        accessibilityRole="button"
        accessibilityLabel="Adicionar a uma locação"
      >
        <Text style={addS.addBtnText}>➕ Adicionar a uma locação</Text>
      </TouchableOpacity>

      {msg && <Text style={addS.msgText}>{msg}</Text>}

      {/* Sub-texto verbatim de AddToRentalButton.tsx linha 63 */}
      <Text style={addS.hintText}>
        Junte vários itens deste anunciante e alugue tudo numa só locação.
        {sameOwnerCount > 0 && (
          <>
            {" "}
            <Text
              style={addS.cartLink}
              onPress={() => Linking.openURL(`${API_URL}/carrinho`)}
              accessibilityRole="link"
            >
              Ver carrinho ({sameOwnerCount}) →
            </Text>
          </>
        )}
      </Text>
    </View>
  )
}

const addS = StyleSheet.create({
  inCartBtn: {
    minHeight: 44, borderWidth: 1, borderColor: "#007B3C", backgroundColor: "rgba(0,123,60,0.05)",
    borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12,
    flexDirection: "row", alignItems: "center", justifyContent: "center",
  },
  inCartText: { fontSize: 13, fontWeight: "700", color: "#007B3C" },
  addBtn: {
    minHeight: 44, borderWidth: 1, borderColor: "#CBD5E1",
    borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12,
    flexDirection: "row", alignItems: "center", justifyContent: "center",
  },
  addBtnText: { fontSize: 13, fontWeight: "700", color: "#0F172A" },
  msgText:    { fontSize: 11, color: "#64748B", marginTop: 4 },
  hintText:   { fontSize: 11, color: "#64748B", marginTop: 4, lineHeight: 16 },
  cartLink:   { fontWeight: "700", color: "#007B3C" },
})

// ── Utilitário: divide array em sublistas de `size` elementos ────────────────
// Usado para montar o grid 2 colunas dentro do ScrollView (FlatList não pode
// ser aninhado em ScrollView — usamos View+rows manuais igual ao padrão do
// componente de grid do site para seções não-raiz da tela).
function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = []
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size))
  return result
}

// ── Skeleton de loading — equivalente ao <Skeleton> do site ──────────────────
function SkeletonBox({ h, w = "100%", style }: { h: number; w?: number | string; style?: object }) {
  return (
    <View
      style={[
        { height: h, width: w as number, backgroundColor: "#E2E8F0", borderRadius: 8 },
        style,
      ]}
      accessibilityElementsHidden
    />
  )
}

function ItemDetailSkeleton() {
  return (
    <ScrollView style={sk.scroll} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
      <SkeletonBox h={256} style={{ marginHorizontal: -16, marginTop: -16, borderRadius: 0 }} />
      <SkeletonBox h={12} w={80} style={{ marginTop: 16 }} />
      <SkeletonBox h={24} style={{ marginTop: 8 }} />
      <SkeletonBox h={16} w={120} style={{ marginTop: 8 }} />
      <SkeletonBox h={90} style={{ marginTop: 16 }} />
      <SkeletonBox h={16} style={{ marginTop: 16 }} />
      <SkeletonBox h={16} style={{ marginTop: 8 }} />
      <SkeletonBox h={16} w="80%" style={{ marginTop: 8 }} />
    </ScrollView>
  )
}
const sk = StyleSheet.create({ scroll: { flex: 1, backgroundColor: "#F8FAFC" } })

// ── Tela principal ─────────────────────────────────────────────────────────────
export default function ItemDetailScreen() {
  const { id }     = useLocalSearchParams<{ id: string }>()
  const insets     = useSafeAreaInsets()
  const user       = useAuth((s) => s.user)
  const qc         = useQueryClient()
  const { tokens } = useTheme()
  const [imgIdx, setImgIdx] = useState(0)

  // ── Estado de favorito (optimistic update) ─────────────────────────────────
  const [isFavorited, setIsFavorited] = useState<boolean | null>(null)

  // ── Estado do PriceCalc ────────────────────────────────────────────────────
  const [mode, setMode]           = useState<Mode>("daily")
  const [startDate, setStartDate] = useState("")
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [numDays, setNumDays]     = useState(1)
  const [note, setNote]           = useState("")
  const [coupon, setCoupon]       = useState("")
  const [bookingError, setBookingError] = useState("")
  const [pending, setPending]     = useState(false)
  const [success, setSuccess]     = useState(false)

  // ── Fetch do item ──────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ["item", id],
    queryFn:  () => apiFetch<{ data: ItemDetail }>(`/api/items/${id}`),
    enabled:  !!id,
  })

  // Taxa da plataforma — NUNCA hardcode (regra do CLAUDE.md). Fonte: _PriceCalc.tsx
  // prop feeRatePct, vindo de getPlatformFeeRate() no Server Component pai do site.
  // Mobile reaproveita /api/stats (já expõe feeRate em basis points).
  const { data: statsData } = useQuery({
    queryKey: ["platform-stats"],
    queryFn:  () => apiFetch<{ data: { feeRate: number } }>("/api/stats"),
    staleTime: 5 * 60_000,
  })
  const feeRatePct = statsData ? statsData.data.feeRate / 100 : null

  const toggleFavorite = useMutation({
    mutationFn: () =>
      apiFetch<FavoriteStatusResponse>(`/api/items/${id}/favorite`, { method: "POST" }),
    onMutate: () => {
      setIsFavorited((prev) => (prev === null ? true : !prev))
    },
    onSuccess: (res) => {
      setIsFavorited(res.data.favorited)
      qc.invalidateQueries({ queryKey: ["favorites"] })
    },
    onError: () => {
      setIsFavorited((prev) => (prev === null ? null : !prev))
    },
  })

  const item = data?.data

  // ── Data de devolução calculada automaticamente ────────────────────────────
  // Fonte: _PriceCalc.tsx linhas 104-109
  // Hooks ficam ANTES de qualquer return condicional (Rules of Hooks) — não
  // dependem de `item`, só de state, então é seguro calculá-los sempre.
  const endDate = useMemo(() => {
    if (!startDate) return ""
    if (mode === "weekly")  return addDays(startDate, 7)
    if (mode === "monthly") return addDays(startDate, 30)
    return addDays(startDate, numDays)
  }, [startDate, mode, numDays])

  const days = useMemo(() => {
    if (!startDate) return 0
    if (mode === "weekly")  return 7
    if (mode === "monthly") return 30
    return numDays
  }, [startDate, mode, numDays])

  // ── Skeleton ───────────────────────────────────────────────────────────────
  if (isLoading) return <ItemDetailSkeleton />

  // ── Item não encontrado ────────────────────────────────────────────────────
  if (!item) {
    return (
      <View style={[s.center, { backgroundColor: tokens.bg }]}>
        <Text style={s.notFoundIcon}>😕</Text>
        <Text style={[s.notFoundTitle, { color: tokens.navy }]}>Item não encontrado</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: tokens.green, fontSize: 14 }}>← Voltar</Text>
        </TouchableOpacity>
      </View>
    )
  }

  // ── Dados derivados ────────────────────────────────────────────────────────
  const isOwner   = user?.id === item.ownerId
  const avgRating = item.reviews.length
    ? item.reviews.reduce((sum, r) => sum + r.rating, 0) / item.reviews.length
    : null
  // Fallback defensivo: ownerStats pode faltar se a API respondendo ainda for
  // uma versão sem o campo (deploy de staging atrasado em relação a este código).
  const ownerStats = item.ownerStats ?? { completedCount: 0, responseRate: null }

  const heartIcon = isFavorited === true ? "❤️" : "🤍"

  // ── Modos disponíveis (fonte: _PriceCalc.tsx linhas 86-90) ────────────────
  const availableModes: Mode[] = [
    "daily",
    ...(item.pricePerWeek  ? ["weekly"  as Mode] : []),
    ...(item.pricePerMonth ? ["monthly" as Mode] : []),
  ]

  // ── Cálculo de preço — fonte: _PriceCalc.tsx linhas 118-131 ───────────────
  const { totalPrice: subtotalCents, savings: savingsCents } = days > 0
    ? calcBookingTotal(days, item.pricePerDay, item.pricePerWeek, item.pricePerMonth)
    : { totalPrice: 0, savings: 0 }

  const breakdown = days > 0
    ? buildBreakdown(days, item.pricePerDay, item.pricePerWeek, item.pricePerMonth)
    : ""

  // Teto D2: fonte _PriceCalc.tsx linha 134
  const overLimit = subtotalCents > CHECKOUT_MAX_CENTS

  const isReady = !!startDate && days > 0 && !overLimit

  function handleModeChange(m: Mode) {
    setMode(m)
    setBookingError("")
    if (m === "daily") setNumDays(1)
  }

  function handleDateChange(_: DateTimePickerEvent, selected?: Date) {
    setShowDatePicker(Platform.OS === "ios")
    if (selected) {
      setStartDate(dateToISO(selected))
      setBookingError("")
    }
  }

  // ── Ações ──────────────────────────────────────────────────────────────────
  function handleToggleFavorite() {
    if (!user) {
      Alert.alert("Login necessário", "Faça login para salvar favoritos.", [
        { text: "Cancelar", style: "cancel" },
        { text: "Entrar", onPress: () => router.push("/(auth)/login") },
      ])
      return
    }
    toggleFavorite.mutate()
  }

  async function handleSolicitar() {
    if (!user) {
      Alert.alert("Login necessário", "Faça login para fazer uma reserva.", [
        { text: "Cancelar", style: "cancel" },
        { text: "Entrar", onPress: () => router.push("/(auth)/login") },
      ])
      return
    }
    if (!isReady || !item) return
    setBookingError("")
    setPending(true)
    try {
      const res = await apiFetch<{ data: { id: string } }>("/api/bookings", {
        method: "POST",
        body: JSON.stringify({
          itemId:   item.id,
          startDate: new Date(`${startDate}T12:00:00`).toISOString(),
          endDate:   new Date(`${endDate}T12:00:00`).toISOString(),
          borrowerNote: note || undefined,
          couponCode:   coupon.trim() || undefined,
          client: "mobile",
        }),
      })
      setSuccess(true)
      router.push(`/reservas/${res.data.id}` as never)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao solicitar reserva."
      setBookingError(msg)
    } finally {
      setPending(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={[s.root, { backgroundColor: tokens.bg }]}>

      {/* ── Galeria ── */}
      <View style={s.gallery}>
        {item.images[imgIdx] ? (
          <Image
            source={{ uri: item.images[imgIdx].url }}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            accessibilityLabel={`Foto do item ${item.title}`}
          />
        ) : (
          <View style={s.galleryPlaceholder}>
            <Text style={{ fontSize: 64 }}>📦</Text>
          </View>
        )}

        {/* Botão voltar */}
        <TouchableOpacity
          style={[s.galleryBtn, { top: insets.top + 8, left: 16 }]}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
        >
          <Text style={s.galleryBtnText}>‹</Text>
        </TouchableOpacity>

        {/* Botão favoritar — apenas para locatários */}
        {!isOwner && (
          <TouchableOpacity
            style={[s.galleryBtn, { top: insets.top + 8, right: 16 }]}
            onPress={handleToggleFavorite}
            disabled={toggleFavorite.isPending}
            accessibilityRole="button"
            accessibilityLabel={isFavorited === true ? "Remover dos favoritos" : "Adicionar aos favoritos"}
          >
            <Text style={{ fontSize: 18 }}>{heartIcon}</Text>
          </TouchableOpacity>
        )}

        {/* Badge "Seu item" — modo proprietário */}
        {isOwner && (
          <View style={s.ownerBadge} accessibilityRole="none">
            <Text style={s.ownerBadgeText}>Seu item</Text>
          </View>
        )}

        {/* Miniaturas */}
        {item.images.length > 1 && (
          <View style={s.dots}>
            {item.images.map((_, i) => (
              <TouchableOpacity key={i} onPress={() => setImgIdx(i)}>
                <View style={[s.dot, i === imgIdx ? s.dotActive : s.dotInactive]} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* ── Cabeçalho do item ── */}
        {/* "text-xs font-semibold uppercase tracking-widest text-brand" — page.tsx */}
        <Text style={[s.category, { color: tokens.green }]}>
          {item.category.name.toUpperCase()}
        </Text>
        <Text style={[s.title, { color: tokens.navy }]}>{item.title}</Text>

        {/* Rating */}
        {avgRating !== null && (
          <View style={s.ratingRow}>
            <Stars rating={avgRating} />
            <Text style={[s.ratingText, { color: tokens.muted }]}>
              {avgRating.toFixed(1)} ({item._count.reviews})
            </Text>
            <View style={s.ecoBadge}>
              <Text style={s.ecoBadgeText}>🌿 Eco</Text>
            </View>
          </View>
        )}

        {/* Tags: condição, voltagem, bairro */}
        <View style={s.tags}>
          <View style={[s.tag, { borderColor: tokens.border }]}>
            <Text style={[s.tagText, { color: tokens.muted }]}>
              {CONDITION[item.condition] ?? item.condition}
            </Text>
          </View>
          {item.voltage && (
            <View style={[s.tag, { borderColor: "#FCD34D", backgroundColor: "#FFFBEB" }]}>
              <Text style={[s.tagText, { color: "#92400E", fontWeight: "500" }]}>
                ⚡ {item.voltage}
              </Text>
            </View>
          )}
          {item.neighborhood && (
            <View style={[s.tag, { borderColor: tokens.border }]}>
              <Text style={[s.tagText, { color: tokens.muted }]}>📍 {item.neighborhood}</Text>
            </View>
          )}
        </View>

        {/* Regras do anunciante — fonte: page.tsx linhas 456-471 (P2-51) */}
        {item.rules && item.rules.trim().length > 0 && (
          <View style={[s.infoBox, { borderColor: "#FCD34D", backgroundColor: "#FFFBEB" }]}>
            <Text style={s.infoBoxIcon}>📄</Text>
            <Text style={[s.infoBoxText, { color: "#92400E" }]}>
              <Text style={{ fontWeight: "700" }}>Regras do anunciante: </Text>
              {item.rules}
            </Text>
          </View>
        )}

        {/* Calculadora alugar vs comprar — fonte: page.tsx linhas 473-488 */}
        {item.estimatedRetailPrice != null && item.estimatedRetailPrice > 0 && (
          <View style={[s.infoBox, { borderColor: tokens.green, backgroundColor: "#F0FDF4" }]}>
            <Text style={s.infoBoxIcon}>💡</Text>
            <Text style={[s.infoBoxText, { color: tokens.muted }]}>
              Comprar este item custa{" "}
              <Text style={{ color: tokens.text, fontWeight: "700" }}>
                ~{fmtCurrency(item.estimatedRetailPrice)}
              </Text>
              . Alugar por 1 dia sai a{" "}
              <Text style={{ color: tokens.green, fontWeight: "700" }}>
                {fmtCurrency(item.pricePerDay)}
              </Text>{" "}
              — economia de{" "}
              <Text style={{ color: tokens.success, fontWeight: "700" }}>
                {Math.round((1 - item.pricePerDay / item.estimatedRetailPrice) * 100)}%
              </Text>{" "}
              vs comprar novo.
            </Text>
          </View>
        )}

        {/* ── Proprietário ── fonte: page.tsx linhas 566-590 (mini card com link p/ perfil) ── */}
        <TouchableOpacity
          style={[s.ownerCard, { backgroundColor: tokens.surface, borderColor: tokens.border }]}
          onPress={() => Linking.openURL(`${API_URL}/perfil/${item.owner.id}`)}
          accessibilityRole="link"
          accessibilityLabel={`Ver perfil de ${item.owner.name}`}
        >
          {item.owner.avatarUrl ? (
            <Image
              source={{ uri: item.owner.avatarUrl }}
              style={[s.ownerAvatar, { backgroundColor: tokens.border }]}
              contentFit="cover"
            />
          ) : (
            <View style={[s.ownerAvatar, { backgroundColor: tokens.navy }]}>
              <Text style={s.ownerAvatarText}>{item.owner.name[0]?.toUpperCase()}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={[s.ownerName, { color: tokens.text }]}>
              {item.owner.name}
              {item.owner.isVerified
                ? <Text style={{ color: tokens.success }}> ✓</Text>
                : null
              }
            </Text>
            {item.owner.city && (
              <Text style={[s.ownerCity, { color: tokens.muted }]}>📍 {item.owner.city}</Text>
            )}
            {/* Badge de resposta — fonte: page.tsx linhas 583-587 */}
            {item.responseBadge && (
              <Text style={[s.ownerResponseBadge, { color: tokens.green }]}>
                ⚡ {item.responseBadge.label}
              </Text>
            )}
          </View>
          <Text style={{ fontSize: 18, color: tokens.muted }} accessibilityElementsHidden>›</Text>
        </TouchableOpacity>

        {/* Estatísticas do proprietário — fonte: page.tsx linhas 592-616 (P1-23) */}
        {(ownerStats.completedCount > 0 || ownerStats.responseRate !== null) && (
          <View style={[s.ownerStatsGrid, { backgroundColor: tokens.bg, borderColor: tokens.border }]}>
            {ownerStats.completedCount > 0 && (
              <View style={s.ownerStatCell}>
                <Text style={[s.ownerStatValue, { color: tokens.navy }]}>
                  {ownerStats.completedCount}
                </Text>
                <Text style={[s.ownerStatLabel, { color: tokens.muted }]}>
                  locaç{ownerStats.completedCount === 1 ? "ão" : "ões"} concluída{ownerStats.completedCount !== 1 ? "s" : ""}
                </Text>
              </View>
            )}
            {ownerStats.responseRate !== null && (
              <View style={s.ownerStatCell}>
                <Text style={[s.ownerStatValue, { color: tokens.navy }]}>
                  {ownerStats.responseRate}%
                </Text>
                <Text style={[s.ownerStatLabel, { color: tokens.muted }]}>taxa de resposta</Text>
              </View>
            )}
          </View>
        )}

        {/* Editar anúncio — modo proprietário. Sem tela nativa de edição ainda;
            segue o mesmo padrão de fallback já usado em MobileMenu.tsx (Linking
            p/ o site) até que apps/mobile/app/itens/[id]/editar.tsx exista. */}
        {isOwner && (
          <TouchableOpacity
            style={[s.editListingBtn, { borderColor: tokens.border }]}
            onPress={() => Linking.openURL(`${API_URL}/itens/${item.id}/editar`)}
            accessibilityRole="link"
            accessibilityLabel="Editar anúncio"
          >
            <Text style={[s.editListingBtnText, { color: tokens.text }]}>✏️ Editar anúncio</Text>
          </TouchableOpacity>
        )}

        {/* ── Solicitações pendentes (modo proprietário) ── */}
        {isOwner && item.pendingBookings && item.pendingBookings.length > 0 && (
          <View style={[s.pendingBox, { backgroundColor: "#FFFBEB", borderColor: "#FCD34D" }]}>
            <Text style={[s.pendingTitle, { color: "#92400E" }]}>
              Solicitações pendentes ({item.pendingBookings.length})
            </Text>
            {item.pendingBookings.map((b) => (
              <TouchableOpacity
                key={b.id}
                style={s.pendingItem}
                onPress={() => router.push(`/reservas/${b.id}` as never)}
                accessibilityRole="button"
                accessibilityLabel={`Ver solicitação de ${b.borrower.name}`}
              >
                <Text style={[s.pendingBorrower, { color: "#92400E" }]}>
                  {b.borrower.name}
                </Text>
                <Text style={[s.pendingDate, { color: "#B45309" }]}>
                  Retirada: {fmtDate(b.startDate.split("T")[0])}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── Descrição ── */}
        <Text style={[s.sectionTitle, { color: tokens.navy }]}>Sobre o item</Text>
        <Text style={[s.description, { color: tokens.muted }]}>{item.description}</Text>

        {/* ── P1-22 — Calendário de disponibilidade ────────────────────────
            Fonte: page.tsx linhas 374-379 + components/items/AvailabilityCalendar.tsx.
            Endpoint: GET /api/items/[id]/availability → { data: string[] }.
            Mostra mês atual + próximo; verde=disponível, vermelho=ocupado, cinza=passado.
            Nenhuma dep nativa nova — grid manual como no site. ── */}
        <View style={{ height: 1, backgroundColor: tokens.border, marginTop: 16, marginBottom: 0 }} />
        <Text style={[s.sectionTitle, { color: tokens.navy }]}>Disponibilidade</Text>
        <MobileAvailabilityCalendar itemId={item.id} />

        {/* ── PriceCalc — só para locatários ── */}
        {!isOwner && (
          <>
            {/* Requisitos do proprietário — fonte: page.tsx linhas 490-511 */}
            {(item.requireIdVerification || item.requirePhone) && (
              <View style={[s.infoBox, { borderColor: "#FCD34D", backgroundColor: "#FFFBEB", marginTop: 20 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.reqTitle, { color: "#92400E" }]}>📋 Requisitos do proprietário</Text>
                  {item.requireIdVerification && (
                    <Text style={[s.reqItem, { color: "#B45309" }]}>✓ Identidade verificada</Text>
                  )}
                  {item.requirePhone && (
                    <Text style={[s.reqItem, { color: "#B45309" }]}>✓ Telefone cadastrado</Text>
                  )}
                </View>
              </View>
            )}

            <Text style={[s.sectionTitle, { color: tokens.navy, marginTop: item.requireIdVerification || item.requirePhone ? 8 : 24 }]}>
              Calcular locação
            </Text>

            {/* Tabs de modalidade — fonte: _PriceCalc.tsx linhas 205-235 */}
            {availableModes.length > 1 && (
              <View style={s.modeTabs}>
                {availableModes.map((m) => {
                  const active = mode === m
                  const labels: Record<Mode, string> = { daily: "Diário", weekly: "Semanal", monthly: "Mensal" }
                  const prices: Record<Mode, number | null> = {
                    daily: item.pricePerDay,
                    weekly: item.pricePerWeek,
                    monthly: item.pricePerMonth,
                  }
                  const units: Record<Mode, string> = { daily: "/dia", weekly: "/sem", monthly: "/mês" }
                  const price = prices[m] ?? 0
                  return (
                    <TouchableOpacity
                      key={m}
                      onPress={() => handleModeChange(m)}
                      style={[
                        s.modeTab,
                        { borderColor: active ? tokens.green : tokens.border },
                        active && { backgroundColor: "#F0FDF4" },
                      ]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={labels[m]}
                    >
                      <Text style={[s.modeLabel, { color: active ? tokens.green : tokens.muted }]}>
                        {labels[m].toUpperCase()}
                      </Text>
                      <Text style={[s.modePrice, { color: active ? tokens.text : tokens.muted }]}>
                        {fmtCurrency(price)}
                      </Text>
                      <Text style={[s.modeUnit, { color: active ? tokens.green : tokens.muted }]}>
                        {units[m]}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            )}

            {/* Data de retirada — calendário nativo, mesmo padrão de reservas/checkout.tsx
                (equivalente ao <input type="date"> do site, que abre o calendário do
                navegador; RN não tem isso embutido em TextInput, precisa do picker). */}
            <View style={s.fieldGroup}>
              <Text style={[s.fieldLabel, { color: tokens.muted }]}>RETIRADA</Text>
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                style={[s.dateInput, s.dateBtn, { borderColor: tokens.border, backgroundColor: tokens.surface }]}
                accessibilityRole="button"
                accessibilityLabel={`Data de retirada: ${startDate ? fmtDate(startDate) : "não selecionada"}. Toque para escolher`}
              >
                <Text style={{ color: startDate ? tokens.text : tokens.muted, fontSize: 14 }}>
                  {startDate ? fmtDate(startDate) : "Selecionar data"}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={startDate ? new Date(`${startDate}T12:00:00`) : todayDate}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  minimumDate={todayDate}
                  onChange={handleDateChange}
                />
              )}
              {showDatePicker && Platform.OS === "ios" && (
                <TouchableOpacity
                  onPress={() => setShowDatePicker(false)}
                  style={{ alignItems: "flex-end", marginTop: 8 }}
                >
                  <Text style={{ color: tokens.green, fontSize: 14, fontWeight: "600" }}>Confirmar</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Quantidade de dias (modo diário) — fonte: _PriceCalc.tsx linhas 256-292 */}
            {mode === "daily" && (
              <View style={s.fieldGroup}>
                <Text style={[s.fieldLabel, { color: tokens.muted }]}>QUANTIDADE DE DIAS</Text>
                <View style={s.stepper}>
                  <TouchableOpacity
                    style={[s.stepperBtn, { borderColor: tokens.border }]}
                    onPress={() => setNumDays((n) => Math.max(1, n - 1))}
                    accessibilityLabel="Diminuir dias"
                    accessibilityRole="button"
                  >
                    <Text style={[s.stepperBtnText, { color: tokens.muted }]}>−</Text>
                  </TouchableOpacity>
                  <View style={[s.stepperValue, { borderColor: tokens.border }]}>
                    <Text style={[s.stepperValueText, { color: tokens.text }]}>{numDays}</Text>
                  </View>
                  <TouchableOpacity
                    style={[s.stepperBtn, { borderColor: tokens.border }]}
                    onPress={() => setNumDays((n) => Math.min(365, n + 1))}
                    accessibilityLabel="Aumentar dias"
                    accessibilityRole="button"
                  >
                    <Text style={[s.stepperBtnText, { color: tokens.muted }]}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Devolução — calculada automaticamente — fonte: _PriceCalc.tsx linhas 295-321 */}
            <View style={s.fieldGroup}>
              <Text style={[s.fieldLabel, { color: tokens.muted }]}>
                DEVOLUÇÃO{" "}
                <Text style={[s.fieldLabelBadge, { color: tokens.muted }]}>calculado automaticamente</Text>
              </Text>
              <View style={[s.dateReadOnly, { borderColor: tokens.border, backgroundColor: "#F1F5F9" }]}>
                <Text style={{ color: endDate ? tokens.text : tokens.muted, fontSize: 14 }}>
                  {endDate ? fmtDate(endDate) : "—"}
                </Text>
              </View>
              {endDate && (
                <Text style={[s.devNote, { color: tokens.muted }]}>
                  {mode === "daily"
                    ? `Retirada + ${numDays} dia${numDays > 1 ? "s" : ""} — devolução no mesmo horário da retirada`
                    : mode === "weekly"
                    ? "Retirada + 7 dias — devolução no mesmo horário da retirada"
                    : "Retirada + 30 dias — devolução no mesmo horário da retirada"}
                </Text>
              )}
            </View>

            {/* Resumo de preço — fonte: _PriceCalc.tsx linhas 324-373 */}
            <View style={[s.summary, { backgroundColor: tokens.bg, borderColor: tokens.border }]}>
              {days > 0 && startDate ? (
                <>
                  <View style={s.summaryRow}>
                    <Text style={[s.summaryLabel, { color: tokens.muted }]}>{breakdown}</Text>
                    <Text style={[s.summaryValue, { color: tokens.muted }]}>
                      {fmtCurrency(subtotalCents)}
                    </Text>
                  </View>
                  {/* Desconto por período — fonte: _PriceCalc.tsx linhas 332-337 */}
                  {savingsCents > 0 && (
                    <View style={s.summaryRow}>
                      <Text style={[s.summaryLabel, { color: tokens.success, fontSize: 12, fontWeight: "600" }]}>
                        🏷️ Desconto por período
                      </Text>
                      <Text style={{ color: tokens.success, fontSize: 12, fontWeight: "600" }}>
                        -{fmtCurrency(savingsCents)}
                      </Text>
                    </View>
                  )}
                  <View style={[s.summaryDivider, { backgroundColor: tokens.border }]} />
                  <View style={s.summaryRow}>
                    <Text style={[s.summaryTotal, { color: tokens.text }]}>Total do aluguel</Text>
                    <Text style={[s.summaryTotal, { color: tokens.text }]}>
                      {fmtCurrency(subtotalCents)}
                    </Text>
                  </View>
                  {/* Transparência da taxa — copy verbatim de _PriceCalc.tsx linha 364,
                      feeRatePct SEMPRE dinâmico (nunca hardcode — regra do CLAUDE.md) */}
                  {feeRatePct != null && (
                    <Text style={[s.summaryFeeNote, { color: tokens.muted }]}>
                      Você paga apenas o valor da locação. A ShareO retém {feeRatePct % 1 === 0 ? feeRatePct.toFixed(0) : feeRatePct}% do repasse ao proprietário.
                    </Text>
                  )}
                </>
              ) : (
                <View style={s.summaryRow}>
                  <Text style={[s.summaryLabel, { color: tokens.muted }]}>Selecione a data de retirada</Text>
                  <Text style={[s.summaryValue, { color: tokens.muted }]}>—</Text>
                </View>
              )}
            </View>

            {/* Aviso de teto R$500 — copy VERBATIM de _PriceCalc.tsx linha 434 */}
            {overLimit && (
              <View
                style={s.limitWarn}
                accessibilityRole="alert"
              >
                <Text style={s.limitWarnText}>
                  ⚠️ O total excede o limite de{" "}
                  <Text style={{ fontWeight: "700" }}>R$500,00</Text>
                  {" "}por locação.{"\n"}
                  Reduza a quantidade de dias ou escolha outra modalidade.
                </Text>
              </View>
            )}

            {/* Nota ao proprietário */}
            {isReady && user && (
              <View style={s.fieldGroup}>
                <Text style={[s.fieldLabel, { color: tokens.muted }]}>
                  MENSAGEM AO PROPRIETÁRIO (OPCIONAL)
                </Text>
                <TextInput
                  style={[s.textarea, { borderColor: tokens.border, color: tokens.text, backgroundColor: tokens.surface }]}
                  placeholder="Ex.: Preciso para um evento no fim de semana…"
                  placeholderTextColor={tokens.muted}
                  value={note}
                  onChangeText={setNote}
                  multiline
                  numberOfLines={3}
                  maxLength={500}
                  textAlignVertical="top"
                  accessibilityLabel="Mensagem ao proprietário"
                />
              </View>
            )}

            {/* Cupom de desconto — fonte: _PriceCalc.tsx linhas 393-413 (P3-20) */}
            {isReady && user && (
              <View style={s.fieldGroup}>
                <Text style={[s.fieldLabel, { color: tokens.muted }]}>
                  CUPOM DE DESCONTO (OPCIONAL)
                </Text>
                <TextInput
                  style={[s.dateInput, { borderColor: tokens.border, color: tokens.text, backgroundColor: tokens.surface, textTransform: "uppercase" }]}
                  placeholder="Ex.: PROMO-AB2CD"
                  placeholderTextColor={tokens.muted}
                  value={coupon}
                  onChangeText={(v) => setCoupon(v.toUpperCase())}
                  maxLength={30}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  accessibilityLabel="Cupom de desconto"
                />
                <Text style={[s.devNote, { color: tokens.muted }]}>
                  O desconto é aplicado no valor final da reserva.
                </Text>
              </View>
            )}

            {/* Story B — AddToRentalButton ────────────────────────────────────
                Fonte: page.tsx linhas 536-555 + components/cart/AddToRentalButton.tsx.
                Separador "ou" verbatim do site (page.tsx linhas 537-541).
                Estado no useRentalCart (Zustand+AsyncStorage). ── */}
            <View style={s.orSeparator}>
              <View style={[s.orLine, { backgroundColor: tokens.border }]} />
              <Text style={[s.orText, { color: tokens.muted }]}>ou</Text>
              <View style={[s.orLine, { backgroundColor: tokens.border }]} />
            </View>
            <MobileAddToRentalButton
              ownerId={item.owner.id}
              ownerName={item.owner.name}
              item={{
                itemId:        item.id,
                title:         item.title,
                image:         item.images[0]?.url ?? null,
                pricePerDay:   item.pricePerDay,
                pricePerWeek:  item.pricePerWeek,
                pricePerMonth: item.pricePerMonth,
                depositAmount: item.depositAmount,
              }}
            />

            {/* Trust Box — fonte: page.tsx linhas 618-635 (conteúdo estático) */}
            <View style={[s.trustBox, { borderColor: tokens.green, backgroundColor: "#F0FDF4" }]}>
              <Text style={[s.trustBoxTitle, { color: tokens.green }]}>🔒 Sua locação está protegida</Text>
              {[
                "Cancelamento gratuito até 24h antes",
                "Item protegido durante a locação",
                "Suporte ShareO disponível 7 dias por semana",
              ].map((line) => (
                <View key={line} style={s.trustBoxRow}>
                  <Text style={{ color: tokens.green, fontSize: 13 }}>✓</Text>
                  <Text style={[s.trustBoxText, { color: tokens.text }]}>{line}</Text>
                </View>
              ))}
            </View>

            {/* Política de cancelamento — fonte: page.tsx linhas 637-665 +
                lib/cancellationPolicy.ts DEFAULTS (o site também usa o export
                estático CANCELLATION_POLICY_LINES, não a config dinâmica). */}
            <View style={[s.trustBox, { borderColor: tokens.border, backgroundColor: tokens.surface }]}>
              <Text style={[s.trustBoxTitle, { color: tokens.navy }]}>Política de cancelamento</Text>
              {[
                { label: "Até 24h antes", detail: "reembolso total (100%)" },
                { label: "Entre 24h e 6h antes", detail: "70% de reembolso" },
                { label: "Menos de 6h antes", detail: "50% de reembolso" },
              ].map((line) => (
                <View key={line.label} style={s.trustBoxRow}>
                  <Text style={{ color: tokens.muted, fontSize: 13 }}>•</Text>
                  <Text style={[s.trustBoxText, { color: tokens.text }]}>
                    <Text style={{ fontWeight: "700" }}>{line.label}: </Text>
                    <Text style={{ color: tokens.muted }}>{line.detail}</Text>
                  </Text>
                </View>
              ))}
            </View>

            {/* Erro de booking */}
            {bookingError ? (
              <View style={s.errorBox} accessibilityRole="alert">
                <Text style={s.errorText}>{bookingError}</Text>
              </View>
            ) : null}

            {/* Estado de sucesso */}
            {success && (
              <View style={[s.successBox, { backgroundColor: "#F0FDF4", borderColor: "#86EFAC" }]}>
                <Text style={{ color: "#166534", fontSize: 14, fontWeight: "600" }}>
                  Solicitação enviada!
                </Text>
              </View>
            )}
          </>
        )}

        {/* ── Avaliações ── */}
        {item.reviews.length > 0 && (
          <View style={{ marginTop: 24 }}>
            <Text style={[s.sectionTitle, { color: tokens.navy }]}>
              Avaliações ({item._count.reviews})
            </Text>
            {item.reviews.map((r) => (
              <View
                key={r.id}
                style={[s.reviewCard, { backgroundColor: tokens.surface, borderColor: tokens.border }]}
              >
                <Text style={[s.reviewName, { color: tokens.text }]}>{r.reviewer.name}</Text>
                <Stars rating={r.rating} />
                {r.comment && (
                  <Text style={[s.reviewComment, { color: tokens.muted }]}>{r.comment}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* ── Story B — Itens do mesmo anunciante ────────────────────────────
            Fonte: page.tsx linhas 670-685.
            Exibido apenas para locatários (mesmo critério do site: !isOwner).
            Reutiliza o ItemCard compartilhado (components/items/ItemCard.tsx). ── */}
        {!isOwner && (item.ownerItems?.length ?? 0) > 0 && (
          <View style={[s.relatedSection, { borderTopColor: tokens.border }]}>
            <Text style={[s.sectionTitle, { color: tokens.navy, marginTop: 0 }]}>
              Itens do mesmo anunciante
            </Text>
            <Text style={[s.relatedSubtitle, { color: tokens.muted }]}>
              De {item.owner.name} — você pode alugar vários itens deste anunciante numa só locação.
            </Text>
            {chunk(item.ownerItems ?? [], 2).map((row, i) => (
              <View key={i} style={s.gridRow}>
                {row.map((oi) => (
                  <View key={oi.id} style={s.gridCell}>
                    <ItemCard item={oi} onPress={() => router.push(`/itens/${oi.id}` as never)} />
                  </View>
                ))}
                {row.length < 2 && <View style={s.gridCell} />}
              </View>
            ))}
          </View>
        )}

        {/* ── P1-31 — Você também pode gostar ───────────────────────────────
            Fonte: page.tsx linhas 687-699.
            Filtra itens do mesmo dono (já exibidos acima) — mesmo critério do site.
            Exibido para todos (site não filtra por isOwner nesta seção). ── */}
        {(() => {
          const ownerIds = new Set((item.ownerItems ?? []).map((oi) => oi.id))
          const filtered = (item.similarItems ?? []).filter((si) => !ownerIds.has(si.id))
          if (filtered.length === 0) return null
          return (
            <View style={[s.relatedSection, { borderTopColor: tokens.border }]}>
              <Text style={[s.sectionTitle, { color: tokens.navy, marginTop: 0 }]}>
                Você também pode gostar
              </Text>
              {chunk(filtered, 2).map((row, i) => (
                <View key={i} style={s.gridRow}>
                  {row.map((si) => (
                    <View key={si.id} style={s.gridCell}>
                      <ItemCard item={si} onPress={() => router.push(`/itens/${si.id}` as never)} />
                    </View>
                  ))}
                  {row.length < 2 && <View style={s.gridCell} />}
                </View>
              ))}
            </View>
          )
        })()}
      </ScrollView>

      {/* ── CTA fixo — modo locatário ── */}
      {!isOwner && (
        <View
          style={[
            s.cta,
            {
              backgroundColor: tokens.surface,
              borderTopColor:  tokens.border,
              paddingBottom:   insets.bottom + 12,
            },
          ]}
        >
          <TouchableOpacity
            style={[
              s.ctaBtn,
              {
                backgroundColor: isReady && !pending ? tokens.green : "#94A3B8",
              },
            ]}
            onPress={handleSolicitar}
            disabled={!isReady || pending}
            accessibilityRole="button"
            accessibilityLabel={user ? "Solicitar locação" : "Entrar para solicitar locação"}
            accessibilityState={{ disabled: !isReady || pending }}
          >
            <Text style={s.ctaBtnText}>
              {pending ? "Enviando…" : "💬 Solicitar locação"}
            </Text>
          </TouchableOpacity>
          <Text style={[s.ctaNote, { color: tokens.muted }]}>
            Pagamento processado com segurança
          </Text>
        </View>
      )}
    </View>
  )
}

// ── Estilos ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:     { flex: 1 },
  center:   { flex: 1, alignItems: "center", justifyContent: "center" },
  notFoundIcon:  { fontSize: 48, marginBottom: 12 },
  notFoundTitle: { fontSize: 18, fontWeight: "600" },
  scroll:   { flex: 1 },

  // Galeria
  gallery:           { height: 256, backgroundColor: "#E2E8F0", position: "relative" },
  galleryPlaceholder:{ flex: 1, alignItems: "center", justifyContent: "center" },
  galleryBtn: {
    position: "absolute",
    width: 44, height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center", justifyContent: "center",
  },
  galleryBtnText: { color: "#FFFFFF", fontSize: 24, fontWeight: "700", lineHeight: 28 },
  ownerBadge: {
    position: "absolute", top: 12, right: 12,
    backgroundColor: "#007B3C",
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4,
  },
  ownerBadgeText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  dots: {
    position: "absolute", bottom: 8, left: 0, right: 0,
    flexDirection: "row", justifyContent: "center", gap: 4,
  },
  dot:       { height: 6, borderRadius: 3 },
  dotActive: { width: 16, backgroundColor: "#FFFFFF" },
  dotInactive:{ width: 6, backgroundColor: "rgba(255,255,255,0.5)" },

  // Cabeçalho
  category: { fontSize: 11, fontWeight: "700", letterSpacing: 1, marginTop: 4 },
  title:    { fontSize: 22, fontWeight: "800", marginTop: 4, lineHeight: 28 },
  ratingRow:{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  ratingText:{ fontSize: 12 },
  ecoBadge: {
    marginLeft: 4, borderWidth: 1, borderColor: "rgba(0,123,60,0.3)",
    backgroundColor: "rgba(0,123,60,0.1)", borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  ecoBadgeText: { fontSize: 11, fontWeight: "700", color: "#007B3C" },

  // Tags
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  tag:  { borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  tagText: { fontSize: 12 },

  // Boxes informativos (regras / calculadora / requisitos) — fonte: page.tsx
  infoBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 12,
  },
  infoBoxIcon: { fontSize: 14, marginTop: 1 },
  infoBoxText: { flex: 1, fontSize: 12, lineHeight: 18 },
  reqTitle: { fontSize: 12, fontWeight: "700", marginBottom: 4 },
  reqItem:  { fontSize: 12, marginTop: 2 },

  // Proprietário
  ownerCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 12, borderWidth: 1, padding: 12, marginTop: 16,
  },
  ownerAvatar: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center",
  },
  ownerAvatarText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  ownerName: { fontSize: 14, fontWeight: "600" },
  ownerCity: { fontSize: 12, marginTop: 2 },
  ownerResponseBadge: { fontSize: 12, fontWeight: "600", marginTop: 2 },

  // Estatísticas do proprietário — fonte: page.tsx linhas 592-616
  ownerStatsGrid: {
    flexDirection: "row", marginTop: 10, borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  ownerStatCell: { flex: 1, alignItems: "center" },
  ownerStatValue: { fontSize: 16, fontWeight: "800" },
  ownerStatLabel: { fontSize: 10, textAlign: "center", lineHeight: 13, marginTop: 2 },

  editListingBtn: {
    marginTop: 10, height: 44, borderWidth: 1, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  editListingBtnText: { fontSize: 13, fontWeight: "600" },

  // Trust box / política de cancelamento — fonte: page.tsx linhas 618-665
  trustBox: { borderWidth: 1, borderRadius: 10, padding: 14, marginTop: 12 },
  trustBoxTitle: { fontSize: 12, fontWeight: "700", marginBottom: 8 },
  trustBoxRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 6 },
  trustBoxText: { flex: 1, fontSize: 12, lineHeight: 17 },

  // Solicitações pendentes
  pendingBox:  { borderRadius: 10, borderWidth: 1, padding: 12, marginTop: 16 },
  pendingTitle:{ fontSize: 13, fontWeight: "700", marginBottom: 8 },
  pendingItem: { paddingVertical: 6, borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.08)" },
  pendingBorrower: { fontSize: 13, fontWeight: "600" },
  pendingDate: { fontSize: 11, marginTop: 2 },

  // Seções
  sectionTitle: { fontSize: 15, fontWeight: "700", marginTop: 20, marginBottom: 6 },
  description:  { fontSize: 14, lineHeight: 22 },

  // Tabs de modalidade
  modeTabs: { flexDirection: "row", gap: 8, marginBottom: 16 },
  modeTab: {
    flex: 1, borderWidth: 1, borderRadius: 12,
    paddingVertical: 10, paddingHorizontal: 8,
    alignItems: "center",
  },
  modeLabel: { fontSize: 9, fontWeight: "700", letterSpacing: 0.5 },
  modePrice: { fontSize: 15, fontWeight: "800", marginTop: 2 },
  modeUnit:  { fontSize: 9, marginTop: 1 },

  // Campos
  fieldGroup: { marginBottom: 14 },
  fieldLabel: { fontSize: 11, fontWeight: "600", letterSpacing: 0.4, marginBottom: 4 },
  fieldLabelBadge: { fontSize: 10, fontWeight: "400", textTransform: "none" },
  dateInput: {
    height: 44, borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 12, fontSize: 14,
  },
  dateBtn: { justifyContent: "center" },
  dateReadOnly: {
    height: 44, borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 12, justifyContent: "center",
  },
  devNote: { fontSize: 11, marginTop: 4, lineHeight: 16 },

  // Stepper de dias
  stepper: { flexDirection: "row", gap: 8 },
  stepperBtn: {
    width: 44, height: 44, borderWidth: 1, borderRadius: 8,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  stepperBtnText: { fontSize: 20, lineHeight: 24 },
  stepperValue: {
    flex: 1, height: 44, borderWidth: 1, borderRadius: 8,
    alignItems: "center", justifyContent: "center",
  },
  stepperValueText: { fontSize: 16, fontWeight: "700" },

  // Resumo de preço
  summary: {
    borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 12,
  },
  summaryRow:     { flexDirection: "row", justifyContent: "space-between", marginVertical: 3 },
  summaryLabel:   { fontSize: 13, flex: 1, marginRight: 8 },
  summaryValue:   { fontSize: 13 },
  summaryDivider: { height: 1, marginVertical: 8 },
  summaryTotal:   { fontSize: 14, fontWeight: "700" },
  summaryFeeNote: { fontSize: 11, lineHeight: 16, marginTop: 8 },

  // Aviso de teto — copy verbatim de _PriceCalc.tsx
  limitWarn: {
    borderRadius: 10, borderWidth: 1,
    borderColor: "#FCD34D", backgroundColor: "#FFFBEB",
    padding: 12, marginBottom: 14,
    flexDirection: "row", gap: 8,
  },
  limitWarnText: { color: "#92400E", fontSize: 13, lineHeight: 19, flex: 1 },

  // Textarea
  textarea: {
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, minHeight: 80,
  },

  // Erro / sucesso
  errorBox:  { backgroundColor: "#FEF2F2", borderRadius: 8, padding: 12, marginBottom: 12 },
  errorText: { color: "#B91C1C", fontSize: 13 },
  successBox:{ borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 12 },

  // Avaliações
  reviewCard:    { borderRadius: 10, borderWidth: 1, padding: 12, marginBottom: 8 },
  reviewName:    { fontSize: 13, fontWeight: "600", marginBottom: 2 },
  reviewComment: { fontSize: 12, marginTop: 4, lineHeight: 18 },

  // CTA fixo
  cta: {
    borderTopWidth: 1, paddingTop: 12, paddingHorizontal: 16,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 10 },
      android: { elevation: 8 },
    }),
  },
  ctaBtn: {
    minHeight: 52, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  ctaBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  ctaNote:    { fontSize: 11, textAlign: "center", marginTop: 6 },

  // Separador "ou" — fonte: page.tsx linhas 537-541 (Story B)
  orSeparator: { flexDirection: "row", alignItems: "center", gap: 8, marginVertical: 10 },
  orLine:      { flex: 1, height: 1 },
  orText:      { fontSize: 12 },

  // Grids de itens relacionados — fonte: page.tsx linhas 670-699
  relatedSection: {
    marginTop: 28, borderTopWidth: 1, paddingTop: 20,
  },
  relatedSubtitle: { fontSize: 13, marginTop: 2, marginBottom: 12, lineHeight: 19 },
  gridRow:  { flexDirection: "row", gap: 8, marginBottom: 8 },
  gridCell: { flex: 1 },
})
