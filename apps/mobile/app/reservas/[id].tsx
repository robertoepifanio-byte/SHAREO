// Fonte: app/reservas/[id]/page.tsx + app/reservas/[id]/_BookingActions.tsx
//        + lib/bookingHistory.ts
// Detalhe da reserva: status, histórico de eventos, datas, valores, pagamento MP,
// token de retirada, avisos de status, ações (cancelar, devolver, confirmar).
// StyleSheet + tokens (useTheme) — migrado de className NativeWind para garantir
// compatibilidade com todos os bundles de produção.

import { View, Text, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator, Alert, Linking, StyleSheet, Modal, TextInput, Image as RNImage } from "react-native"
import { useState, useEffect, useRef, useCallback } from "react"
import { router, useLocalSearchParams } from "expo-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Image } from "expo-image"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import * as ImagePicker from "expo-image-picker"
import { apiFetch, API_URL, getTokens } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useTheme } from "@/lib/theme"
import { formatPickupAddress } from "@/lib/ownerAddress"
import { deriveBookingHistory } from "@/lib/bookingHistory"

interface BookingDetail {
  id:            string
  status:        string
  paymentStatus: string | null
  startDate:     string
  endDate:       string
  totalDays:     number
  dailyPrice:    number
  totalPrice:    number
  discountCents: number | null
  depositAmount: number | null
  borrowerNote:  string | null
  cancelReason:  string | null
  lateFeeAmount: number | null
  // timestamps de histórico — fonte: app/reservas/[id]/page.tsx linhas 83-96
  createdAt:            string
  respondedAt:          string | null
  paidAt:               string | null
  contractSignedAt:     string | null
  activatedAt:          string | null
  returnRequestedAt:    string | null
  returnedAt:           string | null
  cancelledAt:          string | null
  extensionRequestedAt:      string | null
  extensionRespondedAt:      string | null
  extensionStatus:           string | null
  extensionRequestedEndDate: string | null
  // token de retirada — fonte: app/reservas/[id]/page.tsx linhas 116-118
  pickupToken:       string | null
  pickupTokenUsedAt: string | null
  item: {
    id: string; title: string
    images: { url: string }[]
  }
  // Story B — fonte: app/reservas/[id]/page.tsx linhas 107-114
  bookingItems: {
    itemId: string; totalPrice: number
    item: { title: string; images: { url: string }[] }
  }[]
  owner: {
    id: string; name: string
    cep: string | null; street: string | null; neighborhood: string | null
    city: string | null; state: string | null
  }
  borrower: { id: string; name: string }
  conversation: { id: string } | null
  // ReviewForm — fonte: app/reservas/[id]/page.tsx linhas 619-651 + _ReviewForm.tsx
  reviews: { reviewType: string; rating: number; comment: string | null }[]
  // CheckInOut — fonte: app/reservas/[id]/page.tsx linhas 527-547 + _CheckInOut.tsx
  photos: { id: string; url: string; phase: string; createdAt: string }[]
}

// Split da taxa da plataforma — fonte: app/reservas/[id]/page.tsx linhas 147-153.
// A taxa é RETIDA do repasse ao proprietário (não somada ao locatário); o
// cupom é absorvido pela taxa, nunca pelo proprietário. feeRateBps SEMPRE
// dinâmico (nunca hardcode — regra do CLAUDE.md), fonte: /api/stats.
function calcSplit(totalPrice: number, feeRateBps: number) {
  const platformFeeAmount = Math.round(totalPrice * feeRateBps / 10000)
  const ownerNetAmount    = totalPrice - platformFeeAmount
  return { platformFeeAmount, ownerNetAmount }
}

// Mapeamento de status — fonte: app/reservas/[id]/page.tsx + BookingStatusBadge.tsx
// Cores mapeadas para tokens disponíveis no tailwind.config.js do mobile
type StatusColors = { label: string; borderColor: string; bgColor: string; textColor: string }
const STATUS_LABEL_LIGHT: Record<string, StatusColors> = {
  PENDING:   { label: "Aguardando aprovação",   borderColor: "#FCD34D", bgColor: "#FFFBEB", textColor: "#92400E" },
  CONFIRMED: { label: "Confirmada",             borderColor: "#6EE7B7", bgColor: "#ECFDF5", textColor: "#065F46" },
  ACTIVE:    { label: "Em andamento",           borderColor: "#93C5FD", bgColor: "#EFF6FF", textColor: "#1E40AF" },
  RETURNED:  { label: "Devolução em andamento", borderColor: "#C4B5FD", bgColor: "#F5F3FF", textColor: "#6D28D9" },
  COMPLETED: { label: "Concluída",              borderColor: "#6EE7B7", bgColor: "#ECFDF5", textColor: "#065F46" },
  CANCELLED: { label: "Cancelada",              borderColor: "#E2E8F0", bgColor: "#F8FAFC", textColor: "#64748B" },
  DISPUTED:  { label: "Em disputa",             borderColor: "#FECACA", bgColor: "#FEF2F2", textColor: "#991B1B" },
}
const STATUS_LABEL_DARK: Record<string, StatusColors> = {
  PENDING:   { label: "Aguardando aprovação",   borderColor: "#FBBF7766", bgColor: "#2A1A00", textColor: "#FBBF77" },
  CONFIRMED: { label: "Confirmada",             borderColor: "#5BD08B66", bgColor: "#0A2A1A", textColor: "#5BD08B" },
  ACTIVE:    { label: "Em andamento",           borderColor: "#60A5FA66", bgColor: "#0A1A2A", textColor: "#93C5FD" },
  RETURNED:  { label: "Devolução em andamento", borderColor: "#A78BFA66", bgColor: "#1A1A2A", textColor: "#C4B5FD" },
  COMPLETED: { label: "Concluída",              borderColor: "#5BD08B66", bgColor: "#0A2A1A", textColor: "#5BD08B" },
  CANCELLED: { label: "Cancelada",              borderColor: "#26395A",   bgColor: "#0B1524", textColor: "#94A3B8" },
  DISPUTED:  { label: "Em disputa",             borderColor: "#F08C8466", bgColor: "#2A0A0A", textColor: "#F08C84" },
}
function getStatusLabel(status: string, mode: "light" | "dark"): StatusColors {
  const table = mode === "dark" ? STATUS_LABEL_DARK : STATUS_LABEL_LIGHT
  return table[status] ?? (mode === "dark" ? STATUS_LABEL_DARK["CANCELLED"] : STATUS_LABEL_LIGHT["CANCELLED"])
}

const fmt = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100)

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })

// Mesmo formato do site — fmtDateTimeBR (fonte: app/reservas/[id]/page.tsx linha 28)
const fmtEventDateTime = (d: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
    timeZone: "America/Fortaleza",
  }).format(new Date(d))

const ACTOR_ROLE_EMOJI: Record<string, string> = {
  borrower: "👤",
  owner:    "🏠",
  system:   "⚙️",
}

// ── ReturnCountdownInline ─────────────────────────────────────────────────────
// Fonte: components/booking/ReturnCountdown.tsx linhas 44-116
// Exibe tempo restante até endDate; atualiza a cada 60s.
// Urgente quando dias === 0 && horas < 4; vermelho quando expirado.
function ReturnCountdownInline({ endDateIso }: { endDateIso: string }) {
  const { tokens, mode } = useTheme()
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])

  const diff = new Date(endDateIso).getTime() - now
  if (diff <= 0) {
    return (
      <View style={[sCountdown.box, { borderColor: mode === "dark" ? "#F08C8466" : "#FECACA", backgroundColor: mode === "dark" ? "#2A0A0A" : "#FEF2F2", marginBottom: 12 }]}>
        <Text style={{ fontSize: 18, marginRight: 8 }}>⏰</Text>
        <View style={{ flex: 1 }}>
          <Text style={[sCountdown.title, { color: tokens.error }]}>Prazo de devolução encerrado</Text>
          <Text style={[sCountdown.sub, { color: tokens.error }]}>
            Devolva o item agora para evitar taxas de atraso adicionais.
          </Text>
        </View>
      </View>
    )
  }
  const totalMin = Math.floor(diff / 60_000)
  const days     = Math.floor(totalMin / (60 * 24))
  const hours    = Math.floor((totalMin % (60 * 24)) / 60)
  const minutes  = totalMin % 60
  const isUrgent = days === 0 && hours < 4
  return (
    <View style={[
      sCountdown.box,
      isUrgent
        ? { borderColor: mode === "dark" ? "#FBBF7766" : "#FDBA74", backgroundColor: mode === "dark" ? "#2A1A00" : "#FFF7ED", marginBottom: 12 }
        : { borderColor: mode === "dark" ? "#5BD08B66" : "#6EE7B7", backgroundColor: mode === "dark" ? "#0A2A1A" : "#F0FDF4", marginBottom: 12 },
    ]}>
      <Text style={{ fontSize: 18, marginRight: 8 }}>{isUrgent ? "⚠️" : "📅"}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[sCountdown.title, { color: isUrgent ? (mode === "dark" ? "#FBBF77" : "#C2410C") : tokens.navy }]}>
          {isUrgent ? "Devolução urgente" : "Devolução em"}
        </Text>
        <Text style={[sCountdown.countdown, { color: isUrgent ? (mode === "dark" ? "#FBBF77" : "#C2410C") : tokens.green }]}>
          {days > 0 ? `${days} dia${days !== 1 ? "s" : ""}, ` : ""}
          {hours}h e {minutes}min
        </Text>
      </View>
    </View>
  )
}
const sCountdown = StyleSheet.create({
  box:       { flexDirection: "row", alignItems: "flex-start", borderRadius: 12, borderWidth: 1, padding: 14 },
  title:     { fontSize: 13, fontWeight: "600" },
  sub:       { fontSize: 12, marginTop: 3 },
  countdown: { fontSize: 14, fontWeight: "700", marginTop: 2 },
})

export default function BookingDetailScreen() {
  const { id }     = useLocalSearchParams<{ id: string }>()
  const insets     = useSafeAreaInsets()
  const user       = useAuth((s) => s.user)
  const { tokens, mode } = useTheme()
  const qc         = useQueryClient()
  const [historyExpanded, setHistoryExpanded] = useState(false)
  // Painel de cancelamento — fonte: _BookingActions.tsx linhas 43-46, 118-119, 262-283
  const [cancelModalVisible, setCancelModalVisible] = useState(false)
  const [cancelReason, setCancelReason]             = useState("")
  // ContractBanner — fonte: app/reservas/[id]/_ContractBanner.tsx linhas 24-26
  const [contractSigned, setContractSigned]         = useState<boolean | null>(null)
  const [contractModalOpen, setContractModalOpen]   = useState(false)
  const [contractError, setContractError]           = useState("")
  const [contractSigning, setContractSigning]       = useState(false)
  // ReturnChecklist — fonte: components/booking/ReturnChecklist.tsx linhas 30-36
  const CHECKLIST_ITEMS_CONST = ["Item limpo e no estado recebido", "Todos os acessórios incluídos", "Caixa/embalagem original (se aplicável)", "Fotos do estado atual tiradas"] as const
  const [clChecked, setClChecked]         = useState([false, false, false, false])
  const [clPhotoUri, setClPhotoUri]       = useState<string | null>(null)
  const [clPhotoLoading, setClPhotoLoading] = useState(false)
  const [clSubmitting, setClSubmitting]   = useState(false)
  const [clError, setClError]             = useState<string | null>(null)
  // ReturnConditionForm — fonte: components/booking/ReturnConditionForm.tsx linhas 54-57
  const [rcCondition, setRcCondition]       = useState<"PERFECT" | "NORMAL_WEAR" | "DAMAGED" | null>(null)
  const [rcDamageDesc, setRcDamageDesc]     = useState("")
  const [rcSubmitting, setRcSubmitting]     = useState(false)
  const [rcError, setRcError]               = useState<string | null>(null)
  // ReviewForm — fonte: app/reservas/[id]/_ReviewForm.tsx linhas 82-94
  // Estado por tipo de avaliação: "idle"|"submitting"|"done"
  const [rvState, setRvState] = useState<Record<string, "idle" | "submitting" | "done">>({})
  const [rvRating, setRvRating] = useState<Record<string, number>>({})
  const [rvComment, setRvComment] = useState<Record<string, string>>({})
  const [rvError, setRvError] = useState<Record<string, string>>({})
  // CheckInOut — fonte: app/reservas/[id]/_CheckInOut.tsx linhas 16-77
  // Fotos indexadas por phase: "CHECKIN" | "CHECKOUT"
  const [cioPhotos, setCioPhotos] = useState<Record<string, { id: string; url: string; createdAt: string }[]>>({})
  const [cioUploading, setCioUploading] = useState<Record<string, boolean>>({})
  const [cioError, setCioError] = useState<Record<string, string>>({})

  // Todos os hooks ANTES de qualquer return condicional (protocolo item 4)
  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ["booking", id],
    queryFn:  () => apiFetch<{ data: BookingDetail }>(`/api/bookings/${id}`),
    enabled:  !!id && !!user,
  })

  // Taxa da plataforma — NUNCA hardcode (regra do CLAUDE.md). Fonte:
  // app/reservas/[id]/page.tsx linha 136-137 (getPlatformFeeRate() no
  // Server Component). Mobile reaproveita /api/stats, mesmo padrão de
  // app/itens/[id].tsx.
  const { data: statsData } = useQuery({
    queryKey: ["platform-stats"],
    queryFn:  () => apiFetch<{ data: { feeRate: number } }>("/api/stats"),
    staleTime: 5 * 60_000,
  })
  const feeRateBps = statsData?.data.feeRate ?? null

  // Sincroniza contractSigned ao carregar dados — fonte: _ContractBanner.tsx linha 24 (useState(initialSigned)).
  // Bug real (2026-07-04): guard `contractSigned === null` só sincronizava na 1ª renderização;
  // se o cache do React Query servisse contractSignedAt=null primeiro (ex.: remontar a tela após
  // assinar em outra navegação), o estado local travava em `false` e nunca refletia a assinatura
  // já persistida no backend. contractSignedAt não regride (contrato não é "des-assinado"), então
  // uma vez true na API sempre reflete true aqui — só usa o guard pra inicializar o `false`.
  useEffect(() => {
    if (data?.data?.contractSignedAt) {
      setContractSigned(true)
    } else if (data?.data && contractSigned === null) {
      setContractSigned(false)
    }
  }, [data, contractSigned])

  // Sincroniza fotos CheckInOut ao carregar dados — fonte: _CheckInOut.tsx linha 17 (useState(initial))
  useEffect(() => {
    if (!data?.data?.photos) return
    const byPhase: Record<string, { id: string; url: string; createdAt: string }[]> = {}
    for (const p of data.data.photos) {
      if (!byPhase[p.phase]) byPhase[p.phase] = []
      byPhase[p.phase].push({ id: p.id, url: p.url, createdAt: p.createdAt })
    }
    setCioPhotos(byPhase)
  }, [data?.data?.photos])

  // BUG FIX: o mobile chamava POST /api/bookings/${id}/cancel (rota inexistente → 404)
  // e não coletava o motivo. O site usa PATCH /api/bookings/${id} com { action:"cancel", reason }
  // e EXIGE o motivo (textarea, botão desabilitado se vazio — _BookingActions.tsx linhas 118-119,
  // 227, 262-283). reason é validado no servidor: transition.requiresReason → 400 se ausente.
  // Fonte: app/api/bookings/[id]/route.ts linhas 138-139, 227-229.
  const cancel = useMutation({
    mutationFn: (reason: string) =>
      apiFetch(`/api/bookings/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "cancel", reason }),
      }),
    onSuccess: () => {
      setCancelModalVisible(false)
      setCancelReason("")
      qc.invalidateQueries({ queryKey: ["booking", id] })
      qc.invalidateQueries({ queryKey: ["bookings"] })
    },
    onError: (e) =>
      Alert.alert("Erro", e instanceof Error ? e.message : "Não foi possível cancelar a reserva."),
  })

  const returnAction = useMutation({
    mutationFn: (action: "mark_returned" | "confirm_return") =>
      apiFetch(`/api/bookings/${id}`, { method: "PATCH", body: JSON.stringify({ action }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["booking", id] })
      qc.invalidateQueries({ queryKey: ["bookings"] })
    },
    onError: (e) =>
      Alert.alert("Erro", e instanceof Error ? e.message : "Não foi possível concluir a ação."),
  })

  // Checkout Mercado Pago — rota unificada resolveUserId + client:"mobile"
  // Fonte: app/api/payments/mp/checkout/route.ts + PR #161
  const mpCheckout = useMutation({
    mutationFn: async () => {
      const res = await apiFetch<{ data: { url: string | null } }>(
        "/api/payments/mp/checkout",
        { method: "POST", body: JSON.stringify({ bookingId: id, client: "mobile" }) },
      )
      return res.data.url
    },
    onSuccess: async (url) => {
      if (!url) {
        Alert.alert(
          "Pagamento indisponível",
          "O pagamento online ainda não está disponível nesta versão. Entre em contato com o proprietário para combinar o pagamento.",
        )
        return
      }
      const canOpen = await Linking.canOpenURL(url)
      if (canOpen) {
        await Linking.openURL(url)
      } else {
        Alert.alert("Erro", "Não foi possível abrir o link de pagamento.")
      }
    },
    onError: (e) => {
      const msg = e instanceof Error ? e.message : ""
      if (msg.includes("404") || msg.includes("indisponível") || msg.includes("NOT_FOUND")) {
        Alert.alert("Pagamento indisponível", "O pagamento online ainda não está disponível nesta versão.")
      } else if (msg.includes("OWNER_NOT_CONNECTED")) {
        Alert.alert("Proprietário sem conta de pagamento", "O proprietário ainda não conectou uma conta para receber. Entre em contato via chat.")
      } else if (msg.includes("BOOKING_NOT_CONFIRMED")) {
        Alert.alert("Aguardando confirmação", "O proprietário precisa confirmar a reserva antes do pagamento.")
      } else {
        Alert.alert("Erro", msg || "Não foi possível iniciar o pagamento.")
      }
    },
  })

  // ── Guards após hooks (protocolo item 4) ──────────────────────────────────
  if (!user) {
    return (
      <View style={[s.center, { backgroundColor: tokens.bg }]}>
        <Text style={{ color: tokens.muted, fontSize: 14 }}>Login necessário</Text>
      </View>
    )
  }

  if (isLoading) {
    return (
      <View style={[s.center, { backgroundColor: tokens.bg }]}>
        <ActivityIndicator size="large" color="#007B3C" />
      </View>
    )
  }

  const booking = data?.data
  if (!booking) {
    return (
      <View style={[s.center, { backgroundColor: tokens.bg, paddingHorizontal: 24 }]}>
        <Text style={{ fontSize: 40 }}>😕</Text>
        <Text style={[s.notFoundTitle, { color: tokens.navy }]}>Reserva não encontrada</Text>
        <TouchableOpacity
          style={{ marginTop: 16 }}
          onPress={() => router.back()}
          accessibilityRole="button"
        >
          <Text style={{ fontSize: 14, color: tokens.green }}>← Voltar</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const st         = getStatusLabel(booking.status, mode)
  const isOwner    = user.id === booking.owner.id
  const isBorrower = user.id === booking.borrower.id
  // Site: PENDING ou CONFIRMED, AMBOS os papéis — fonte: _BookingActions.tsx linha 241-242
  const canCancel        = (booking.status === "PENDING" || booking.status === "CONFIRMED") && (isOwner || isBorrower)
  const canReturn        = booking.status === "ACTIVE"   && isBorrower
  const canConfirmReturn = booking.status === "RETURNED" && isOwner
  const canPay           = isBorrower && booking.status === "CONFIRMED" && booking.paymentStatus !== "PAID"
  const thumb            = booking.item.images[0]?.url
  const extraItems       = booking.bookingItems.length - 1

  // Split — fonte: app/reservas/[id]/page.tsx linhas 150-153
  const discountCents = booking.discountCents ?? 0
  const split = feeRateBps != null
    ? (() => {
        const gross       = calcSplit(booking.totalPrice + discountCents, feeRateBps)
        const platformFee = Math.max(0, gross.platformFeeAmount - discountCents)
        return { platformFee, ownerNet: gross.ownerNetAmount }
      })()
    : null
  const feeRatePct   = feeRateBps != null ? feeRateBps / 100 : null
  const feeRateLabel = feeRatePct != null
    ? (feeRatePct % 1 === 0 ? feeRatePct.toFixed(0) : String(feeRatePct))
    : null
  const pickupAddress = formatPickupAddress(booking.owner)

  // Histórico de eventos — fonte: lib/bookingHistory.ts (deriveBookingHistory)
  const historyEvents = deriveBookingHistory({
    createdAt:            new Date(booking.createdAt),
    respondedAt:          booking.respondedAt          ? new Date(booking.respondedAt)          : null,
    paidAt:               booking.paidAt               ? new Date(booking.paidAt)               : null,
    activatedAt:          booking.activatedAt          ? new Date(booking.activatedAt)          : null,
    returnRequestedAt:    booking.returnRequestedAt    ? new Date(booking.returnRequestedAt)    : null,
    returnedAt:           booking.returnedAt           ? new Date(booking.returnedAt)           : null,
    cancelledAt:          booking.cancelledAt          ? new Date(booking.cancelledAt)          : null,
    cancelReason:         booking.cancelReason,
    extensionRequestedAt: booking.extensionRequestedAt ? new Date(booking.extensionRequestedAt) : null,
    extensionRespondedAt: booking.extensionRespondedAt ? new Date(booking.extensionRespondedAt) : null,
    extensionStatus:      booking.extensionStatus,
    status:               booking.status,
    borrower:             { name: booking.borrower.name },
    owner:                { name: booking.owner.name },
  })
  const sorted = [...historyEvents].reverse() // mais recente primeiro
  const latest  = sorted[0]

  // Assinar contrato — fonte: app/reservas/[id]/_ContractBanner.tsx linhas 40-47
  // POST /api/bookings/${id}/contract (contract/route.ts): registra contractSignedAt + ContractAcceptance.
  async function signContract() {
    setContractSigning(true)
    setContractError("")
    try {
      const res = await apiFetch(`/api/bookings/${id}/contract`, { method: "POST" })
      if ((res as { data?: { signed?: boolean; alreadySigned?: boolean } }).data?.signed || (res as { data?: { alreadySigned?: boolean } }).data?.alreadySigned) {
        setContractSigned(true)
        setContractModalOpen(false)
      }
    } catch (e) {
      setContractError(e instanceof Error ? e.message : "Erro ao assinar contrato.")
    } finally {
      setContractSigning(false)
    }
  }

  // Seletor de foto: oferece CÂMERA ou GALERIA (o site usa <input type=file>, que no
  // mobile abre os dois; o rótulo do botão promete "Tirar foto ou escolher da galeria").
  function pickImageAsset(): Promise<ImagePicker.ImagePickerAsset | null> {
    return new Promise((resolve) => {
      Alert.alert("Adicionar foto", "Como você quer adicionar a foto?", [
        {
          text: "Tirar foto",
          onPress: async () => {
            const perm = await ImagePicker.requestCameraPermissionsAsync()
            if (!perm.granted) {
              Alert.alert("Permissão necessária", "Autorize o acesso à câmera para tirar uma foto.")
              return resolve(null)
            }
            const r = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8 })
            resolve(!r.canceled && r.assets[0] ? r.assets[0] : null)
          },
        },
        {
          text: "Escolher da galeria",
          onPress: async () => {
            const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
            if (!perm.granted) {
              Alert.alert("Permissão necessária", "Autorize o acesso à galeria para adicionar uma foto.")
              return resolve(null)
            }
            const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 })
            resolve(!r.canceled && r.assets[0] ? r.assets[0] : null)
          },
        },
        { text: "Cancelar", style: "cancel", onPress: () => resolve(null) },
      ], { cancelable: true, onDismiss: () => resolve(null) })
    })
  }

  // ReturnChecklist — seleciona foto (câmera ou galeria)
  // Fonte: components/booking/ReturnChecklist.tsx linhas 47-51 (handleFileChange)
  async function clPickPhoto() {
    const asset = await pickImageAsset()
    if (asset) setClPhotoUri(asset.uri)
  }

  // ReturnChecklist — Confirma devolução: faz upload da foto (opcional) depois muda status
  // Fonte: components/booking/ReturnChecklist.tsx linhas 55-93 (handleConfirm)
  // Upload via FormData multipart — apiFetch sempre seta Content-Type: application/json,
  // então usamos fetch direto com Authorization header para não sobrescrever o boundary.
  async function clSubmit() {
    setClError(null)
    setClSubmitting(true)
    try {
      if (clPhotoUri) {
        setClPhotoLoading(true)
        const tokens = await getTokens()
        const fd     = new FormData()
        fd.append("phase", "CHECKOUT")
        // React Native FileSystem: uri como objeto com name e type para FormData
        fd.append("file", { uri: clPhotoUri, name: "checkout.jpg", type: "image/jpeg" } as unknown as Blob)
        const uploadRes = await fetch(`${API_URL}/api/bookings/${id}/photos`, {
          method:  "POST",
          headers: tokens ? { Authorization: `Bearer ${tokens.accessToken}` } : {},
          body:    fd,
        })
        setClPhotoLoading(false)
        if (!uploadRes.ok) {
          const j = await uploadRes.json().catch(() => ({}))
          throw new Error((j as { error?: { message?: string } }).error?.message ?? "Erro ao enviar foto.")
        }
      }
      await apiFetch(`/api/bookings/${id}`, {
        method: "PATCH",
        body:   JSON.stringify({ action: "mark_returned" }),
      })
      qc.invalidateQueries({ queryKey: ["booking", id] })
      qc.invalidateQueries({ queryKey: ["bookings"] })
    } catch (e) {
      setClError(e instanceof Error ? e.message : "Erro inesperado.")
    } finally {
      setClSubmitting(false)
      setClPhotoLoading(false)
    }
  }

  // CheckInOut — Upload de foto (expo-image-picker)
  // Fonte: app/reservas/[id]/_CheckInOut.tsx linhas 22-36 (upload)
  // API: POST /api/bookings/:id/photos (FormData: phase + file)
  async function cioUpload(phase: "CHECKIN" | "CHECKOUT") {
    const asset = await pickImageAsset()
    if (!asset) return

    setCioUploading((prev) => ({ ...prev, [phase]: true }))
    setCioError((prev) => ({ ...prev, [phase]: "" }))
    try {
      const tokens = await getTokens()
      const fd     = new FormData()
      fd.append("phase", phase)
      fd.append("file", { uri: asset.uri, name: `${phase.toLowerCase()}.jpg`, type: "image/jpeg" } as unknown as Blob)
      const res = await fetch(`${API_URL}/api/bookings/${id}/photos`, {
        method:  "POST",
        headers: tokens ? { Authorization: `Bearer ${tokens.accessToken}` } : {},
        body:    fd,
      })
      const json = await res.json()
      if (!res.ok) throw new Error((json as { error?: { message?: string } }).error?.message ?? "Erro ao enviar foto.")
      const photo = (json as { data: { id: string; url: string; createdAt: string } }).data
      setCioPhotos((prev) => ({
        ...prev,
        [phase]: [...(prev[phase] ?? []), { id: photo.id, url: photo.url, createdAt: photo.createdAt }],
      }))
    } catch (e) {
      setCioError((prev) => ({ ...prev, [phase]: e instanceof Error ? e.message : "Erro ao enviar foto." }))
    } finally {
      setCioUploading((prev) => ({ ...prev, [phase]: false }))
    }
  }

  // ReviewForm — Submete avaliação
  // Fonte: app/reservas/[id]/_ReviewForm.tsx linhas 131-155 (submit)
  // API: POST /api/bookings/:id/reviews { reviewType, rating, comment }
  // Schema: lib/validations/reviews.ts (CreateReviewSchema)
  async function submitReview(reviewType: string) {
    const rating = rvRating[reviewType] ?? 0
    if (rating === 0) {
      setRvError((prev) => ({ ...prev, [reviewType]: "Selecione uma nota." }))
      return
    }
    setRvError((prev) => ({ ...prev, [reviewType]: "" }))
    setRvState((prev) => ({ ...prev, [reviewType]: "submitting" }))
    try {
      await apiFetch(`/api/bookings/${id}/reviews`, {
        method: "POST",
        body:   JSON.stringify({
          reviewType,
          rating,
          comment: rvComment[reviewType]?.trim() || undefined,
        }),
      })
      setRvState((prev) => ({ ...prev, [reviewType]: "done" }))
    } catch (e) {
      setRvError((prev) => ({ ...prev, [reviewType]: e instanceof Error ? e.message : "Erro ao enviar avaliação." }))
      setRvState((prev) => ({ ...prev, [reviewType]: "idle" }))
    }
  }

  // ReturnConditionForm — Confirma estado na devolução
  // Fonte: components/booking/ReturnConditionForm.tsx linhas 64-103 (handleConfirm)
  // PERFECT/NORMAL_WEAR → confirm_return; DAMAGED → open_dispute com reason
  async function rcSubmit() {
    if (!rcCondition) return
    setRcError(null)
    setRcSubmitting(true)
    try {
      if (rcCondition === "DAMAGED") {
        await apiFetch(`/api/bookings/${id}`, {
          method: "PATCH",
          body:   JSON.stringify({ action: "open_dispute", reason: rcDamageDesc.trim() }),
        })
      } else {
        await apiFetch(`/api/bookings/${id}`, {
          method: "PATCH",
          body:   JSON.stringify({ action: "confirm_return" }),
        })
      }
      qc.invalidateQueries({ queryKey: ["booking", id] })
      qc.invalidateQueries({ queryKey: ["bookings"] })
    } catch (e) {
      setRcError(e instanceof Error ? e.message : "Erro inesperado.")
    } finally {
      setRcSubmitting(false)
    }
  }

  // Abre o painel de cancelamento com campo de motivo obrigatório.
  // Antes: Alert.alert com confirm direto (sem motivo) → 400 do servidor.
  // Fonte: _BookingActions.tsx linhas 262-283 (panel === "cancel").
  function handleCancel() {
    setCancelModalVisible(true)
  }

  function handleReturn() {
    Alert.alert(
      "Devolver item",
      "Confirmar que você está devolvendo o item? O locador precisará confirmar o recebimento para concluir a locação.",
      [
        { text: "Voltar", style: "cancel" },
        { text: "Devolver", onPress: () => returnAction.mutate("mark_returned") },
      ]
    )
  }

  function handleConfirmReturn() {
    Alert.alert(
      "Confirmar recebimento",
      "Confirmar que você recebeu o item de volta? Isso concluirá a locação.",
      [
        { text: "Voltar", style: "cancel" },
        { text: "Confirmar recebimento", onPress: () => returnAction.mutate("confirm_return") },
      ]
    )
  }

  return (
    <View style={[s.root, { backgroundColor: tokens.bg }]}>
      {/* Header — ← Minhas Reservas (fonte: app/reservas/[id]/page.tsx linha 168-172) */}
      <View
        style={[
          s.header,
          {
            paddingTop:        insets.top + 8,
            backgroundColor:   tokens.surface,
            borderBottomColor: tokens.border,
          },
        ]}
      >
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Voltar para Minhas Reservas"
        >
          <Text style={[s.backBtnText, { color: tokens.muted }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: tokens.navy }]} numberOfLines={1}>
          Reserva
        </Text>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor="#007B3C" />}
      >

        {/* Badge de status — fonte: app/reservas/[id]/page.tsx linhas 210-224 */}
        <View
          style={[s.statusBadge, { backgroundColor: st.bgColor, borderColor: st.borderColor }]}
        >
          <Text style={[s.statusLabel, { color: st.textColor }]}>{st.label}</Text>
          <Text style={[s.statusSub, { color: tokens.muted }]}>
            Criada em {fmtDate(booking.createdAt)}
          </Text>
        </View>

        {/* Histórico de eventos — fonte: app/reservas/[id]/page.tsx linhas 184-207 + BookingHistory.tsx */}
        {historyEvents.length > 0 && (
          <View style={[s.section, { borderColor: tokens.border, backgroundColor: tokens.surface }]}>
            {/* Botão de toggle — mínimo 44px */}
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={historyExpanded ? "Ocultar histórico da locação" : "Ver histórico da locação"}
              accessibilityState={{ expanded: historyExpanded }}
              onPress={() => setHistoryExpanded((v) => !v)}
              activeOpacity={0.7}
              style={s.historyToggle}
            >
              <View style={s.historyToggleLeft}>
                <Text style={[s.historyTitle, { color: tokens.text }]}>Histórico da locação</Text>
                <Text style={[s.historyCount, { color: tokens.muted }]}>
                  ({historyEvents.length} evento{historyEvents.length !== 1 ? "s" : ""})
                </Text>
              </View>
              <Text style={[s.historyChevron, { color: tokens.muted }]}>
                {historyExpanded ? "⌃" : "⌄"}
              </Text>
            </TouchableOpacity>

            {/* Preview do evento mais recente */}
            {!historyExpanded && latest && (
              <View style={[s.historyPreview, { borderTopColor: tokens.border }]}>
                <Text style={[s.historyPreviewLabel, { color: tokens.muted }]}>Último evento</Text>
                <Text style={[s.historyPreviewEvent, { color: tokens.green }]}>{latest.label}</Text>
                <Text style={[s.historyPreviewTime, { color: tokens.muted }]}>
                  {fmtEventDateTime(latest.at.toISOString())}
                </Text>
              </View>
            )}

            {/* Lista expandida */}
            {historyExpanded && (
              <View style={[s.historyList, { borderTopColor: tokens.border }]}>
                {sorted.map((event, idx) => {
                  const isFirst = idx === 0
                  const isLast  = idx === sorted.length - 1
                  return (
                    <View key={event.key} style={s.historyItem}>
                      {/* Linha + dot */}
                      <View style={s.historyDotCol}>
                        <View
                          style={[
                            s.historyDot,
                            isFirst
                              ? { backgroundColor: tokens.green }
                              : { backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border },
                          ]}
                        >
                          {isFirst ? (
                            <Text style={s.historyDotCheck}>✓</Text>
                          ) : (
                            <View style={[s.historyDotInner, { backgroundColor: tokens.border }]} />
                          )}
                        </View>
                        {!isLast && (
                          <View style={[s.historyLine, { backgroundColor: tokens.border }]} />
                        )}
                      </View>
                      {/* Conteúdo */}
                      <View style={s.historyContent}>
                        <Text
                          style={[
                            s.historyEventLabel,
                            { color: isFirst ? tokens.green : tokens.text },
                          ]}
                        >
                          {event.label}
                        </Text>
                        <Text style={[s.historyEventTime, { color: tokens.muted }]}>
                          {fmtEventDateTime(event.at.toISOString())}
                        </Text>
                        {event.actor && (
                          <Text style={[s.historyEventActor, { color: tokens.muted }]}>
                            {ACTOR_ROLE_EMOJI[event.actorRole]} {event.actor}
                          </Text>
                        )}
                      </View>
                    </View>
                  )
                })}
              </View>
            )}
          </View>
        )}

        {/* Item card — fonte: app/reservas/[id]/page.tsx linhas 248-268 */}
        <TouchableOpacity
          style={[s.section, s.itemCard, { borderColor: tokens.border, backgroundColor: tokens.surface }]}
          onPress={() => router.push(`/itens/${booking.item.id}`)}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={`Ver item ${booking.item.title}`}
        >
          <View style={[s.itemThumb, { backgroundColor: tokens.border }]}>
            {thumb ? (
              <Image source={{ uri: thumb }} style={{ flex: 1 }} contentFit="cover" />
            ) : (
              <View style={s.itemThumbEmpty}>
                <Text style={{ fontSize: 24 }}>📦</Text>
              </View>
            )}
          </View>
          <View style={s.itemInfo}>
            <Text style={[s.itemTitle, { color: tokens.navy }]} numberOfLines={2}>
              {booking.item.title}
              {/* "+N itens" — Story B, fonte: app/reservas/[id]/page.tsx linhas 214-216 */}
              {extraItems > 0 && (
                <Text style={{ fontWeight: "600", color: tokens.muted }}>
                  {" "}+ {extraItems} {extraItems === 1 ? "item" : "itens"}
                </Text>
              )}
            </Text>
            <Text style={[s.itemCounterpart, { color: tokens.muted }]}>
              {isOwner ? `Locatário: ${booking.borrower.name}` : `Proprietário: ${booking.owner.name}`}
            </Text>
          </View>
          <Text style={[s.itemChevron, { color: tokens.muted }]}>›</Text>
        </TouchableOpacity>

        {/* Itens desta locação — Story B, fonte: app/reservas/[id]/page.tsx linhas 226-246 */}
        {booking.bookingItems.length > 1 && (
          <View style={[s.section, { borderColor: tokens.border, backgroundColor: tokens.surface }]}>
            <Text style={[s.sectionLabel, { color: tokens.muted }]}>
              ITENS DESTA LOCAÇÃO ({booking.bookingItems.length})
            </Text>
            {booking.bookingItems.map((bi, i) => (
              <View
                key={bi.itemId}
                style={[
                  s.multiItemRow,
                  i < booking.bookingItems.length - 1 ? { borderBottomWidth: 1, borderBottomColor: tokens.border } : undefined,
                ]}
              >
                <View style={[s.multiItemThumb, { backgroundColor: tokens.border }]}>
                  {bi.item.images[0]?.url && (
                    <Image source={{ uri: bi.item.images[0].url }} style={{ flex: 1 }} contentFit="cover" />
                  )}
                </View>
                <Text style={[s.multiItemTitle, { color: tokens.text }]} numberOfLines={1}>
                  {bi.item.title}
                </Text>
                <Text style={[s.multiItemPrice, { color: tokens.muted }]}>{fmt(bi.totalPrice)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Datas — fonte: app/reservas/[id]/page.tsx linhas 255-276 */}
        <View style={[s.section, { borderColor: tokens.border, backgroundColor: tokens.surface }]}>
          <Text style={[s.sectionLabel, { color: tokens.muted }]}>PERÍODO</Text>
          <View style={s.datesRow}>
            <View style={{ flex: 1 }}>
              <Text style={[s.dateSubLabel, { color: tokens.muted }]}>
                {booking.activatedAt ? "Retirada (confirmada)" : "Retirada"}
              </Text>
              <Text style={[s.dateValue, { color: tokens.text }]}>
                {fmtDate(booking.activatedAt ?? booking.startDate)}
              </Text>
              {booking.activatedAt && (
                <Text style={[s.dateCaption, { color: tokens.success }]}>✓ Confirmada pelo locador</Text>
              )}
            </View>
            <Text style={[s.dateSep, { color: tokens.muted }]}>→</Text>
            <View style={{ flex: 1, alignItems: "flex-end" }}>
              <Text style={[s.dateSubLabel, { color: tokens.muted }]}>Devolução até</Text>
              <Text style={[s.dateValue, { color: tokens.text }]}>
                {fmtDate(booking.endDate)}
              </Text>
              {booking.activatedAt && (
                <Text style={[s.dateCaption, { color: tokens.muted }]}>Mesmo horário da retirada</Text>
              )}
            </View>
          </View>
        </View>

        {/* Resumo financeiro — fonte: app/reservas/[id]/page.tsx linhas 280-330 */}
        <View style={[s.section, { borderColor: tokens.border, backgroundColor: tokens.surface }]}>
          <Text style={[s.sectionLabel, { color: tokens.muted }]}>VALORES</Text>
          <View style={s.finRow}>
            <Text style={[s.finLabel, { color: tokens.muted }]}>
              {booking.totalDays} dia{booking.totalDays !== 1 ? "s" : ""} × {fmt(booking.dailyPrice)}
            </Text>
            <Text style={[s.finValue, { color: tokens.muted }]}>
              {fmt(booking.dailyPrice * booking.totalDays)}
            </Text>
          </View>
          {/* Desconto (cupom) — fonte: app/reservas/[id]/page.tsx linhas 285-290 */}
          {discountCents > 0 && (
            <View style={s.finRow}>
              <Text style={[s.finLabel, { color: tokens.success }]}>Desconto (cupom)</Text>
              <Text style={[s.finValue, { color: tokens.success }]}>− {fmt(discountCents)}</Text>
            </View>
          )}
          <View style={[s.divider, { backgroundColor: tokens.border }]} />
          <View style={s.finRow}>
            <Text style={[s.finTotalLabel, { color: tokens.text }]}>Total da locação</Text>
            <Text style={[s.finTotalValue, { color: tokens.text }]}>{fmt(booking.totalPrice)}</Text>
          </View>
          {booking.depositAmount != null && booking.depositAmount > 0 && (
            <View style={s.finRow}>
              <Text style={[s.finLabel, { color: tokens.muted }]}>Caução (devolvida)</Text>
              <Text style={[s.finValue, { color: mode === "dark" ? "#FBBF77" : "#B45309" }]}>{fmt(booking.depositAmount)}</Text>
            </View>
          )}
          {/* Repartição — taxa retida do repasse, não somada ao locatário.
              Fonte: app/reservas/[id]/page.tsx linhas 303-313. feeRateBps
              SEMPRE dinâmico (nunca hardcode — regra do CLAUDE.md). */}
          {split && feeRateLabel != null && (
            <View style={[s.splitBox, { backgroundColor: tokens.bg }]}>
              <View style={s.finRow}>
                <Text style={[s.finLabel, { color: tokens.muted }]}>Taxa Shareo ({feeRateLabel}%)</Text>
                <Text style={[s.finValue, { color: tokens.error }]}>− {fmt(split.platformFee)}</Text>
              </View>
              <View style={s.finRow}>
                <Text style={[s.finTotalLabel, { color: tokens.text, fontSize: 13 }]}>
                  {isOwner ? "Você recebe" : "Proprietário recebe"}
                </Text>
                <Text style={[s.finTotalValue, { color: tokens.green, fontSize: 13 }]}>{fmt(split.ownerNet)}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Taxa de atraso — fonte: app/reservas/[id]/page.tsx linhas 549-561 */}
        {booking.lateFeeAmount != null && booking.lateFeeAmount > 0 && (
          <View style={[s.alertBox, { borderColor: mode === "dark" ? "#F08C8466" : "#FCA5A5", backgroundColor: mode === "dark" ? "#2A0A0A" : "#FEF2F2" }]}>
            <Text style={{ fontSize: 16, marginRight: 8 }}>⏱</Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.alertTitle, { color: mode === "dark" ? "#F08C84" : "#991B1B" }]}>Taxa de atraso aplicada</Text>
              <Text style={[s.alertDesc, { color: tokens.error }]}>
                Item devolvido após o prazo. Taxa adicional: <Text style={{ fontWeight: "700" }}>{fmt(booking.lateFeeAmount)}</Text>
              </Text>
            </View>
          </View>
        )}

        {/* Token de retirada — fonte: app/reservas/[id]/page.tsx linhas 348-397 */}
        {/* Exibido: locatário + pagamento confirmado + token presente + não usado */}
        {isBorrower && booking.paymentStatus === "PAID" && booking.pickupToken && !booking.pickupTokenUsedAt && (
          <View style={[s.section, s.pickupCard, { borderColor: tokens.green, backgroundColor: mode === "dark" ? "#0A2A1A" : "#F0FDF4" }]}>
            <Text style={[s.pickupTitle, { color: tokens.green }]}>🔑 Código de retirada</Text>
            <Text style={[s.pickupHint, { color: tokens.muted }]}>
              Apresente este código ao proprietário na retirada
            </Text>
            <View style={[s.pickupCodeBox, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
              <Text style={[s.pickupCode, { color: tokens.navy }]} selectable>
                {booking.pickupToken}
              </Text>
            </View>
            <Text style={[s.pickupNote, { color: tokens.muted }]}>
              O proprietário digitará este código no app para confirmar a entrega. Guarde-o.
            </Text>

            {/* Endereço de retirada — fonte: app/reservas/[id]/page.tsx linhas 371-395 */}
            <View style={[s.pickupAddressBox, { borderColor: mode === "dark" ? "#FBBF7766" : "#FCD34D", backgroundColor: mode === "dark" ? "#2A1A00" : "#FFFBEB" }]}>
              <Text style={[s.pickupAddressLabel, { color: mode === "dark" ? "#FBBF77" : "#92400E" }]}>📍 Local de retirada (endereço cadastrado do proprietário)</Text>
              {pickupAddress ? (
                <>
                  <Text style={[s.pickupAddressValue, { color: mode === "dark" ? "#FCD34D" : "#78350F" }]}>{pickupAddress}</Text>
                  <Text style={[s.pickupAddressWarning, { color: mode === "dark" ? "#FBBF77" : "#B45309" }]}>
                    Por segurança, a retirada deve ocorrer exclusivamente neste endereço. Não aceite outro local.
                  </Text>
                </>
              ) : (
                <Text style={[s.pickupAddressValue, { color: mode === "dark" ? "#FCD34D" : "#78350F" }]}>
                  O proprietário ainda não cadastrou endereço. Entre em contato pelo chat para combinar o local de retirada.
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Aviso de pagamento pago para o locatário (status CONFIRMED + PAID) */}
        {/* Fonte: app/reservas/[id]/page.tsx linhas 414-428 */}
        {isBorrower && booking.status === "CONFIRMED" && booking.paymentStatus === "PAID" && (
          <View style={[s.alertBox, { borderColor: mode === "dark" ? "#5BD08B66" : "#6EE7B7", backgroundColor: mode === "dark" ? "#0A2A1A" : "#ECFDF5" }]}>
            <Text style={{ fontSize: 16, marginRight: 8 }}>✅</Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.alertTitle, { color: mode === "dark" ? "#5BD08B" : "#065F46" }]}>Pago com sucesso</Text>
              <Text style={[s.alertDesc, { color: mode === "dark" ? "#86EFAC" : "#059669" }]}>
                O locador foi notificado. Apresente o código de retirada acima.
              </Text>
            </View>
          </View>
        )}

        {/* Aviso de devolução em andamento (borrower em RETURNED) */}
        {/* Fonte: app/reservas/[id]/page.tsx linhas 584-595 */}
        {isBorrower && booking.status === "RETURNED" && (
          <View style={[s.alertBox, { borderColor: mode === "dark" ? "#A78BFA66" : "#C4B5FD", backgroundColor: mode === "dark" ? "#1A1A2A" : "#F5F3FF" }]}>
            <Text style={{ fontSize: 16, marginRight: 8 }}>🔄</Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.alertTitle, { color: mode === "dark" ? "#C4B5FD" : "#6D28D9" }]}>Devolução em andamento</Text>
              <Text style={[s.alertDesc, { color: mode === "dark" ? "#A78BFA" : "#7C3AED" }]}>
                Você iniciou a devolução. Aguardando o locador confirmar o recebimento do item para concluir a locação.
              </Text>
            </View>
          </View>
        )}

        {/* Aviso do locador aguardando devolução (owner em ACTIVE) */}
        {/* Fonte: app/reservas/[id]/page.tsx linhas 563-575 */}
        {isOwner && booking.status === "ACTIVE" && (
          <View style={[s.alertBox, { borderColor: mode === "dark" ? "#60A5FA66" : "#93C5FD", backgroundColor: mode === "dark" ? "#0A1A2A" : "#EFF6FF" }]}>
            <Text style={{ fontSize: 16, marginRight: 8 }}>⏳</Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.alertTitle, { color: mode === "dark" ? "#93C5FD" : "#1E40AF" }]}>Aguardando a devolução</Text>
              <Text style={[s.alertDesc, { color: mode === "dark" ? "#60A5FA" : "#2563EB" }]}>
                O locatário ainda está com o item. Quando ele iniciar a devolução, a reserva ficará como{" "}
                <Text style={{ fontWeight: "700" }}>Devolução em andamento</Text>
                {" "}e você poderá confirmar o recebimento aqui.
              </Text>
            </View>
          </View>
        )}

        {/* Motivo do cancelamento — fonte: app/reservas/[id]/page.tsx linhas 324-330 */}
        {booking.cancelReason && (
          <View style={[s.alertBox, { borderColor: mode === "dark" ? "#F08C8466" : "#FECACA", backgroundColor: mode === "dark" ? "#2A0A0A" : "#FEF2F2" }]}>
            <View style={{ flex: 1 }}>
              <Text style={[s.alertTitle, { color: mode === "dark" ? "#F08C84" : "#991B1B" }]}>
                {booking.status === "DISPUTED" ? "Motivo da disputa" : "Motivo do cancelamento"}
              </Text>
              <Text style={[s.alertDesc, { color: tokens.error }]}>{booking.cancelReason}</Text>
            </View>
          </View>
        )}

        {/* Nota do locatário — fonte: app/reservas/[id]/page.tsx linhas 316-322 */}
        {booking.borrowerNote && (
          <View style={[s.section, { borderColor: tokens.border, backgroundColor: tokens.surface }]}>
            <Text style={[s.sectionLabel, { color: tokens.muted }]}>MENSAGEM DO LOCATÁRIO</Text>
            <Text style={[s.noteText, { color: tokens.text }]}>{booking.borrowerNote}</Text>
          </View>
        )}

        {/* ── ContractBanner — assinatura de contrato digital
            Fonte: app/reservas/[id]/_ContractBanner.tsx linhas 19-126
            Condição: isBorrower + (CONFIRMED ou ACTIVE) — page.tsx linhas 513-525
            API: POST /api/bookings/${id}/contract (contract/route.ts)
        ── */}
        {isBorrower && (booking.status === "CONFIRMED" || booking.status === "ACTIVE") && (
          contractSigned ? (
            /* Estado: contrato assinado — _ContractBanner.tsx linhas 29-37 */
            <View style={[s.alertBox, { borderColor: mode === "dark" ? "#5BD08B66" : "#6EE7B7", backgroundColor: mode === "dark" ? "#0A2A1A" : "#ECFDF5", marginBottom: 12 }]}>
              <Text style={{ fontSize: 15, marginRight: 8 }}>✅</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.alertTitle, { color: mode === "dark" ? "#5BD08B" : "#065F46" }]}>Contrato assinado digitalmente.</Text>
                <Text style={[s.alertDesc, { color: mode === "dark" ? "#86EFAC" : "#059669" }]}>Ambas as partes estão protegidas.</Text>
              </View>
            </View>
          ) : (
            /* Estado: assinatura pendente — _ContractBanner.tsx linhas 49-68 */
            <View style={[s.section, { borderColor: mode === "dark" ? "#FBBF7766" : "#FCD34D", backgroundColor: mode === "dark" ? "#2A1A00" : "#FFFBEB", marginBottom: 12 }]}>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Text style={{ fontSize: 18, marginTop: 2 }}>📄</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[s.alertTitle, { color: mode === "dark" ? "#FBBF77" : "#92400E" }]}>Assinatura do contrato pendente</Text>
                  <Text style={[s.alertDesc, { color: mode === "dark" ? "#FCD34D" : "#B45309", marginTop: 4 }]}>
                    Leia e assine o termo de locação para confirmar sua responsabilidade sobre o item.
                  </Text>
                  <TouchableOpacity
                    style={[s.contractBtn]}
                    onPress={() => setContractModalOpen(true)}
                    accessibilityRole="button"
                    accessibilityLabel="Ler e assinar contrato"
                  >
                    <Text style={s.contractBtnText}>📝 Ler e assinar contrato</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )
        )}

        {/* ── ReturnCountdown — countdown de devolução (status ACTIVE)
            Fonte: components/booking/ReturnCountdown.tsx linhas 44-116
            Condição: booking.status === "ACTIVE" — page.tsx linhas 506-511
            Lógica: calcula dias/horas/minutos restantes; atualiza a cada 60s via useEffect.
            Urgente: dias === 0 && horas < 4 (laranja). Expirado: vermelho.
        ── */}
        {booking.status === "ACTIVE" && (
          <ReturnCountdownInline endDateIso={booking.endDate} />
        )}

        {/* ── ReturnChecklist — checklist de devolução (locatário + ACTIVE)
            Fonte: components/booking/ReturnChecklist.tsx linhas 96-274
            Condição: isBorrower && status === "ACTIVE" — page.tsx linhas 577-582
            Min. 3 de 4 itens marcados para habilitar botão. Foto opcional (incentivada).
            Quando este componente está ativo, o botão "Devolver" do bottomBar é suprimido.
        ── */}
        {isBorrower && booking.status === "ACTIVE" && (() => {
          // Foto obrigatória — fonte: ReturnChecklist.tsx (`canConfirm`).
          // Sem ela a API responde 422 RETURN_PHOTO_REQUIRED, então habilitar o
          // botão só levaria o locatário a um erro.
          const temFoto = clPhotoUri !== null
          // "Fotos do estado atual tiradas" é DERIVADO da foto, não uma pergunta
          // — fonte: ReturnChecklist.tsx (`checkedComFoto`). Como caixinha manual,
          // dava para marcar SEM foto, e anexar a foto deixava a caixinha vazia,
          // empurrando o locatário a marcar "Caixa/embalagem original" num item
          // sem caixa.
          const IDX_FOTO_CL   = CHECKLIST_ITEMS_CONST.indexOf("Fotos do estado atual tiradas")
          const checkedComFoto = clChecked.map((v, i) => (i === IDX_FOTO_CL ? temFoto : v))
          const checkedCount   = checkedComFoto.filter(Boolean).length
          const canConfirm     = checkedCount >= 3 && temFoto
          return (
            <View style={[s.section, { borderColor: tokens.border, backgroundColor: tokens.surface, marginBottom: 12 }]}>
              <Text style={[s.sectionLabel, { color: tokens.text, fontSize: 14, fontWeight: "700", letterSpacing: 0, marginBottom: 4 }]}>
                Checklist de devolução
              </Text>
              <Text style={[s.noteText, { color: tokens.muted, fontSize: 12, marginBottom: 14 }]}>
                Envie uma foto do estado do item e marque pelo menos 3 de 4 itens — a foto já conta como um deles. Depois disso, o locador confirma o recebimento.
              </Text>
              {CHECKLIST_ITEMS_CONST.map((label, i) => (
                <TouchableOpacity
                  key={label}
                  style={[
                    sChecklist.item,
                    { borderColor: checkedComFoto[i] ? "#007B3C" : tokens.border, backgroundColor: checkedComFoto[i] ? (mode === "dark" ? "#0A2A1A" : "#F0FDF4") : tokens.bg },
                  ]}
                  onPress={() => { if (i === IDX_FOTO_CL) return; setClChecked((prev) => { const n = [...prev]; n[i] = !n[i]; return n }) }}
                  disabled={i === IDX_FOTO_CL}
                  accessibilityRole="checkbox"
                  accessibilityLabel={label}
                  accessibilityState={{ checked: checkedComFoto[i] }}
                >
                  <View style={[sChecklist.checkbox, {
                    borderColor: checkedComFoto[i] ? "#007B3C" : tokens.border,
                    backgroundColor: checkedComFoto[i] ? "#007B3C" : "transparent",
                  }]}>
                    {checkedComFoto[i] && <Text style={sChecklist.checkmark}>✓</Text>}
                  </View>
                  <Text style={[sChecklist.label, { color: checkedComFoto[i] ? tokens.text : tokens.muted }]}>{label}</Text>
                </TouchableOpacity>
              ))}
              {/* Progresso */}
              <View style={sChecklist.progressRow}>
                <Text style={[s.noteText, { color: tokens.muted, fontSize: 11 }]}>
                  {checkedCount} de 4 itens verificados
                </Text>
                {canConfirm && (
                  <Text style={[s.noteText, { color: tokens.green, fontSize: 11, fontWeight: "600" }]}>Pronto para confirmar</Text>
                )}
              </View>
              <View style={[sChecklist.progressBar, { backgroundColor: tokens.border }]}>
                <View style={[sChecklist.progressFill, { width: `${(checkedCount / 4) * 100}%` as unknown as number }]} />
              </View>
              {/* Foto opcional */}
              <Text style={[s.noteText, { color: tokens.text, fontSize: 12, fontWeight: "600", marginTop: 14, marginBottom: 6 }]}>
                Foto do estado atual <Text style={{ color: tokens.error }}>*</Text> <Text style={{ fontWeight: "400", color: tokens.muted }}>(obrigatória)</Text>
              </Text>
              {clPhotoUri ? (
                <View style={{ position: "relative", marginBottom: 12 }}>
                  <RNImage source={{ uri: clPhotoUri }} style={sChecklist.photoPreview} resizeMode="cover" />
                  <TouchableOpacity
                    style={sChecklist.photoRemove}
                    onPress={() => setClPhotoUri(null)}
                    accessibilityRole="button"
                    accessibilityLabel="Remover foto"
                  >
                    <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "700" }}>×</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[sChecklist.photoBtn, { borderColor: tokens.border }]}
                  onPress={clPickPhoto}
                  disabled={clPhotoLoading}
                  accessibilityRole="button"
                  accessibilityLabel="Tirar foto ou escolher da galeria"
                >
                  <Text style={{ fontSize: 18, marginBottom: 4 }}>📷</Text>
                  <Text style={[s.noteText, { color: tokens.muted, fontSize: 12 }]}>
                    Tirar foto ou escolher da galeria
                  </Text>
                </TouchableOpacity>
              )}
              {clError && (
                <Text style={{ color: tokens.error, fontSize: 12, marginBottom: 8 }}>{clError}</Text>
              )}
              <TouchableOpacity
                style={[sChecklist.confirmBtn, {
                  backgroundColor: canConfirm && !clSubmitting ? "#007B3C" : tokens.border,
                  opacity: canConfirm && !clSubmitting ? 1 : 0.6,
                }]}
                onPress={clSubmit}
                disabled={!canConfirm || clSubmitting}
                accessibilityRole="button"
                accessibilityLabel="Devolver item"
                accessibilityState={{ disabled: !canConfirm || clSubmitting }}
              >
                {clSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={sChecklist.confirmText}>Devolver</Text>
                )}
              </TouchableOpacity>
              {/* Nota abaixo do botão — fonte: ReturnChecklist.tsx linhas 264-272 */}
              {canConfirm ? (
                <Text style={[s.noteText, { color: tokens.muted, fontSize: 11, textAlign: "center", marginTop: 6 }]}>
                  {"Ao devolver, a locação fica como "}
                  <Text style={{ fontWeight: "700" }}>Devolução em andamento</Text>
                  {" até o locador confirmar o recebimento."}
                </Text>
              ) : (
                <Text style={[s.noteText, { color: tokens.muted, fontSize: 11, textAlign: "center", marginTop: 6 }]}>
                  {!temFoto
                    ? "Envie uma foto do estado do item para habilitar a devolução."
                    : `Marque mais ${3 - checkedCount} ${3 - checkedCount === 1 ? "item" : "itens"} para habilitar a devolução.`}
                </Text>
              )}
            </View>
          )
        })()}

        {/* ── ReturnConditionForm — estado na devolução (locador + RETURNED)
            Fonte: components/booking/ReturnConditionForm.tsx linhas 105-263
            Condição: isOwner && status === "RETURNED" — page.tsx linhas 597-602
            3 opções: Perfeito | Desgaste normal | Com danos (requer descrição ≥10 chars)
            Substitui o botão "Confirmar recebimento" do bottomBar.
        ── */}
        {isOwner && booking.status === "RETURNED" && (() => {
          const RC_OPTIONS = [
            { value: "PERFECT"     as const, icon: "✅", label: "Perfeito estado",  desc: "O item foi devolvido exatamente como entregue.", borderSel: "#007B3C", bgSel: mode === "dark" ? "#0A2A1A" : "#F0FDF4" },
            { value: "NORMAL_WEAR" as const, icon: "👍", label: "Desgaste normal",  desc: "Pequenas marcas de uso esperadas para o período de locação.", borderSel: mode === "dark" ? "#60A5FA66" : "#93C5FD", bgSel: mode === "dark" ? "#0A1A2A" : "#EFF6FF" },
            { value: "DAMAGED"     as const, icon: "⚠️", label: "Com danos",         desc: "Item devolvido com danos além do desgaste normal.", borderSel: mode === "dark" ? "#F08C8466" : "#FECACA", bgSel: mode === "dark" ? "#2A0A0A" : "#FEF2F2" },
          ]
          const isDamaged  = rcCondition === "DAMAGED"
          const rcCanConfirm = rcCondition !== null && (!isDamaged || rcDamageDesc.trim().length >= 10)
          return (
            <View style={[s.section, { borderColor: tokens.border, backgroundColor: tokens.surface, marginBottom: 12 }]}>
              <Text style={[s.sectionLabel, { color: tokens.text, fontSize: 14, fontWeight: "700", letterSpacing: 0, marginBottom: 4 }]}>
                Estado na devolução
              </Text>
              <Text style={[s.noteText, { color: tokens.muted, fontSize: 12, marginBottom: 14 }]}>
                Como o item foi devolvido? Sua avaliação é importante para manter a confiança da plataforma.
              </Text>
              {RC_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    sRC.option,
                    {
                      borderColor: rcCondition === opt.value ? opt.borderSel : tokens.border,
                      backgroundColor: rcCondition === opt.value ? opt.bgSel : tokens.bg,
                    },
                  ]}
                  onPress={() => setRcCondition(opt.value)}
                  accessibilityRole="radio"
                  accessibilityLabel={opt.label}
                  accessibilityState={{ selected: rcCondition === opt.value }}
                >
                  <View style={[sRC.radio, {
                    borderColor: rcCondition === opt.value ? "#007B3C" : tokens.border,
                    backgroundColor: rcCondition === opt.value ? "#007B3C" : "transparent",
                  }]}>
                    {rcCondition === opt.value && <View style={sRC.radioDot} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[sRC.optLabel, { color: tokens.text }]}>{opt.icon} {opt.label}</Text>
                    <Text style={[sRC.optDesc, { color: tokens.muted }]}>{opt.desc}</Text>
                  </View>
                </TouchableOpacity>
              ))}
              {isDamaged && (
                <View style={{ marginTop: 10, marginBottom: 8 }}>
                  <Text style={[s.noteText, { color: tokens.text, fontSize: 13, fontWeight: "600", marginBottom: 4 }]}>
                    Descreva os danos <Text style={{ color: tokens.error }}>*</Text>
                  </Text>
                  <Text style={[s.noteText, { color: tokens.muted, fontSize: 11, marginBottom: 6 }]}>
                    Mínimo 10 caracteres. Esta descrição será incluída na abertura da disputa.
                  </Text>
                  <TextInput
                    style={[s.reasonInput, {
                      color: tokens.text,
                      borderColor: rcDamageDesc.length > 0 && rcDamageDesc.length < 10 ? tokens.error : tokens.border,
                      backgroundColor: tokens.bg,
                    }]}
                    value={rcDamageDesc}
                    onChangeText={setRcDamageDesc}
                    placeholder="Ex: Tela arranhada na parte superior, caixa com amassado lateral…"
                    placeholderTextColor={tokens.muted}
                    multiline
                    numberOfLines={3}
                    maxLength={1000}
                    textAlignVertical="top"
                  />
                  <View style={[sRC.disputeWarning, { borderColor: mode === "dark" ? "#F08C8466" : "#FECACA", backgroundColor: mode === "dark" ? "#2A0A0A" : "#FEF2F2" }]}>
                    <Text style={{ fontSize: 11, color: tokens.error }}>
                      ⚠️ Ao confirmar, uma disputa será aberta automaticamente e o time ShareO entrará em contato.
                    </Text>
                  </View>
                </View>
              )}
              {rcError && (
                <Text style={{ color: tokens.error, fontSize: 12, marginBottom: 8 }}>{rcError}</Text>
              )}
              <TouchableOpacity
                style={[sChecklist.confirmBtn, {
                  backgroundColor: rcCanConfirm && !rcSubmitting
                    ? isDamaged ? "#DC2626" : "#007B3C"
                    : tokens.border,
                  opacity: rcCanConfirm && !rcSubmitting ? 1 : 0.6,
                  marginTop: 8,
                }]}
                onPress={rcSubmit}
                disabled={!rcCanConfirm || rcSubmitting}
                accessibilityRole="button"
                accessibilityLabel={isDamaged ? "Abrir disputa" : "Confirmar estado"}
                accessibilityState={{ disabled: !rcCanConfirm || rcSubmitting }}
              >
                {rcSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={sChecklist.confirmText}>{isDamaged ? "Abrir disputa" : "Confirmar estado"}</Text>
                )}
              </TouchableOpacity>
            </View>
          )
        })()}

        {/* ── ReviewForm — avaliações pós-devolução
            Fonte: app/reservas/[id]/_ReviewForm.tsx linhas 81-296 + page.tsx linhas 619-651
            Condição: status RETURNED ou COMPLETED
            Locatário: avalia ITEM + OWNER. Locador: avalia BORROWER.
            Inicializa como "done" se já existe avaliação desse tipo.
            API: POST /api/bookings/:id/reviews { reviewType, rating, comment }
        ── */}
        {(booking.status === "RETURNED" || booking.status === "COMPLETED") && (() => {
          // Tipos a renderizar — fonte: page.tsx linhas 624-648
          const reviewTypesToRender: { type: string; targetName: string }[] = isBorrower
            ? [
                { type: "ITEM",  targetName: booking.item.title },
                { type: "OWNER", targetName: booking.owner.name },
              ]
            : isOwner
              ? [{ type: "BORROWER", targetName: booking.borrower.name }]
              : []
          if (reviewTypesToRender.length === 0) return null

          const REVIEW_TITLE: Record<string, string> = {
            ITEM:     "Avalie o item",
            OWNER:    "Avalie o proprietário",
            BORROWER: "Avalie o locatário",
          }

          return (
            <View style={{ marginBottom: 12 }}>
              <Text style={[s.sectionLabel, { color: tokens.text, fontSize: 14, fontWeight: "700", letterSpacing: 0, marginBottom: 8 }]}>
                Avaliações
              </Text>
              {reviewTypesToRender.map(({ type, targetName }) => {
                const existing = booking.reviews.find((r) => r.reviewType === type)
                const isDone   = rvState[type] === "done" || !!existing
                const rating   = rvRating[type] ?? 0
                const comment  = rvComment[type] ?? ""
                const isSubmitting = rvState[type] === "submitting"

                return (
                  <View
                    key={type}
                    style={[s.section, { borderColor: tokens.border, backgroundColor: tokens.surface, marginBottom: 10 }]}
                  >
                    <Text style={[s.noteText, { color: tokens.text, fontWeight: "700", fontSize: 14 }]}>
                      {REVIEW_TITLE[type]}
                    </Text>
                    <Text style={[s.noteText, { color: tokens.muted, fontSize: 12, marginBottom: 10 }]}>{targetName}</Text>
                    {isDone ? (
                      /* Estado "done" — fonte: _ReviewForm.tsx linhas 157-169 */
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Text style={{ color: tokens.warning, fontSize: 16 }}>
                          {"★".repeat(existing?.rating ?? (rvRating[type] ?? 0))}{"☆".repeat(5 - (existing?.rating ?? (rvRating[type] ?? 0)))}
                        </Text>
                        <Text style={{ color: tokens.success, fontWeight: "600", fontSize: 13 }}>Avaliação enviada</Text>
                      </View>
                    ) : (
                      <>
                        {/* Nota geral via estrelas — fonte: _ReviewForm.tsx linhas 217-237 */}
                        <Text style={[s.noteText, { color: tokens.text, fontSize: 13, fontWeight: "500", marginBottom: 6 }]}>
                          Nota geral
                        </Text>
                        <View style={sReview.starsRow}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <TouchableOpacity
                              key={star}
                              onPress={() => setRvRating((prev) => ({ ...prev, [type]: star }))}
                              style={sReview.starBtn}
                              accessibilityRole="button"
                              accessibilityLabel={`${star} estrela${star > 1 ? "s" : ""}`}
                            >
                              <Text style={{ fontSize: 26, color: rating >= star ? tokens.warning : tokens.border }}>★</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                        <TextInput
                          style={[s.reasonInput, {
                            color: tokens.text,
                            borderColor: tokens.border,
                            backgroundColor: tokens.bg,
                            marginTop: 10,
                          }]}
                          value={comment}
                          onChangeText={(v) => setRvComment((prev) => ({ ...prev, [type]: v }))}
                          placeholder="Comentário opcional…"
                          placeholderTextColor={tokens.muted}
                          multiline
                          numberOfLines={3}
                          maxLength={1000}
                          textAlignVertical="top"
                        />
                        {rvError[type] ? (
                          <Text style={{ color: tokens.error, fontSize: 12, marginTop: 6 }}>{rvError[type]}</Text>
                        ) : null}
                        <TouchableOpacity
                          style={[sChecklist.confirmBtn, {
                            backgroundColor: rating > 0 && !isSubmitting ? "#007B3C" : tokens.border,
                            opacity: rating > 0 && !isSubmitting ? 1 : 0.6,
                            marginTop: 10,
                          }]}
                          onPress={() => submitReview(type)}
                          disabled={rating === 0 || isSubmitting}
                          accessibilityRole="button"
                          accessibilityLabel="Enviar avaliação"
                          accessibilityState={{ disabled: rating === 0 || isSubmitting }}
                        >
                          {isSubmitting ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <Text style={sReview.btnText}>Enviar avaliação</Text>
                          )}
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                )
              })}
            </View>
          )
        })()}

        {/* ── CheckInOut — fotos de retirada/devolução
            Fonte: app/reservas/[id]/_CheckInOut.tsx linhas 39-276 + page.tsx linhas 527-547
            Condição: status ACTIVE, RETURNED ou COMPLETED — ambos os papéis podem ver
            Fases: CHECKIN (retirada) + CHECKOUT (devolução)
            Upload via expo-image-picker (já em package.json — sem nova dep nativa EAS)
            API: POST /api/bookings/:id/photos (FormData: phase + file)
        ── */}
        {(booking.status === "ACTIVE" || booking.status === "RETURNED" || booking.status === "COMPLETED") && (() => {
          // Permissão de upload por fase — fonte: app/reservas/[id]/page.tsx linhas 536, 544
          // CHECKIN upload: proprietário + status ACTIVE apenas.
          // CHECKOUT upload: proprietário + status RETURNED ou COMPLETED.
          // Locatário NUNCA faz upload de fotos de check-in/check-out.
          const cioCanUpload: Record<"CHECKIN" | "CHECKOUT", boolean> = {
            CHECKIN:  isOwner && booking.status === "ACTIVE",
            CHECKOUT: isOwner && (booking.status === "RETURNED" || booking.status === "COMPLETED"),
          }
          const CIO_PHASES: { key: "CHECKIN" | "CHECKOUT"; label: string; hint: string }[] = [
            { key: "CHECKIN",  label: "Fotos na retirada",  hint: "Registre o estado do item ao retirar." },
            { key: "CHECKOUT", label: "Fotos na devolução", hint: "Registre o estado do item ao devolver." },
          ]
          return (
            <View style={{ marginBottom: 12 }}>
              <Text style={[s.sectionLabel, { color: tokens.text, fontSize: 14, fontWeight: "700", letterSpacing: 0, marginBottom: 4 }]}>
                Fotos de check-in/check-out
              </Text>
              <Text style={[s.noteText, { color: tokens.muted, fontSize: 12, marginBottom: 10 }]}>
                Registre o estado do item em cada etapa da locação para evitar disputas.
              </Text>
              {CIO_PHASES.map(({ key, label, hint }) => {
                const list      = cioPhotos[key] ?? []
                const uploading = cioUploading[key] ?? false
                const canUpload = cioCanUpload[key]
                const err       = cioError[key]
                return (
                  <View
                    key={key}
                    style={[s.section, { borderColor: tokens.border, backgroundColor: tokens.surface, marginBottom: 10 }]}
                  >
                    <Text style={[s.noteText, { color: tokens.text, fontWeight: "700", fontSize: 13, marginBottom: 2 }]}>{label}</Text>
                    <Text style={[s.noteText, { color: tokens.muted, fontSize: 12, marginBottom: 10 }]}>{hint}</Text>
                    {list.length > 0 ? (
                      <View style={sCIO.grid}>
                        {list.map((photo) => (
                          <RNImage
                            key={photo.id}
                            source={{ uri: photo.url }}
                            style={sCIO.thumb}
                            accessibilityLabel={`Foto ${key === "CHECKIN" ? "de retirada" : "de devolução"}`}
                          />
                        ))}
                      </View>
                    ) : (
                      /* "Sem fotos registradas" — fonte: _CheckInOut.tsx linha 44-46 */
                      <Text style={[s.noteText, { color: tokens.muted, fontSize: 12, fontStyle: "italic", marginBottom: 8 }]}>
                        Sem fotos registradas
                      </Text>
                    )}
                    {/* Upload: apenas proprietário, fase/status corretos — _CheckInOut.tsx linha 55 */}
                    {canUpload && (
                      <TouchableOpacity
                        style={[sChecklist.photoBtn, { borderColor: tokens.border }]}
                        onPress={() => cioUpload(key)}
                        disabled={uploading}
                        accessibilityRole="button"
                        accessibilityLabel={`Adicionar foto ${label.toLowerCase()}`}
                        accessibilityState={{ disabled: uploading }}
                      >
                        {uploading ? (
                          <ActivityIndicator size="small" color={tokens.green} />
                        ) : (
                          <>
                            <Text style={{ fontSize: 22, marginBottom: 4 }}>📷</Text>
                            <Text style={{ fontSize: 13, color: tokens.muted, fontWeight: "500" }}>
                              {list.length === 0 ? "Adicionar foto" : "Adicionar outra foto"}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                    {err ? <Text style={{ color: tokens.error, fontSize: 12, marginTop: 4 }}>{err}</Text> : null}
                  </View>
                )
              })}
            </View>
          )
        })()}

      </ScrollView>

      {/* Bottom actions — fonte: app/reservas/[id]/page.tsx linhas 604-617 + _BookingActions.tsx */}
      <View
        style={[
          s.bottomBar,
          {
            backgroundColor:  tokens.surface,
            borderTopColor:   tokens.border,
            paddingBottom:    insets.bottom + 12,
          },
        ]}
      >
        {/* Pagar reserva (locatário + CONFIRMED + não pago) */}
        {canPay && (
          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: tokens.green }]}
            onPress={() => mpCheckout.mutate()}
            activeOpacity={0.85}
            disabled={mpCheckout.isPending}
            accessibilityRole="button"
            accessibilityLabel="Pagar com Mercado Pago"
            accessibilityState={{ disabled: mpCheckout.isPending }}
          >
            {mpCheckout.isPending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={s.actionBtnText}>Pagar reserva</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Devolver item (locatário + ACTIVE) — suprimido: ReturnChecklist exibe o botão no scroll.
            hideReturnActions equivalente: page.tsx linhas 613-616 */}
        {false && canReturn && (
          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: tokens.green }]}
            onPress={handleReturn}
            activeOpacity={0.85}
            disabled={returnAction.isPending}
            accessibilityRole="button"
            accessibilityLabel="Devolver item"
            accessibilityState={{ disabled: returnAction.isPending }}
          >
            {returnAction.isPending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={s.actionBtnText}>📦 Devolver</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Confirmar recebimento (locador + RETURNED) — suprimido: ReturnConditionForm no scroll.
            hideReturnActions equivalente: page.tsx linha 615 */}
        {false && canConfirmReturn && (
          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: tokens.green }]}
            onPress={handleConfirmReturn}
            activeOpacity={0.85}
            disabled={returnAction.isPending}
            accessibilityRole="button"
            accessibilityLabel="Confirmar recebimento do item"
            accessibilityState={{ disabled: returnAction.isPending }}
          >
            {returnAction.isPending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={s.actionBtnText}>📦 Confirmar recebimento</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Abrir conversa — fonte: app/reservas/[id]/page.tsx + _BookingActions.tsx */}
        {booking.conversation && (
          <TouchableOpacity
            style={[s.actionBtnOutline, { borderColor: tokens.green }]}
            onPress={() => router.push(`/mensagens/${booking.conversation!.id}`)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Abrir conversa com o proprietário"
          >
            <Text style={[s.actionBtnOutlineText, { color: tokens.green }]}>Abrir conversa</Text>
          </TouchableOpacity>
        )}

        {/* Cancelar reserva (locatário + PENDING ou CONFIRMED) — fonte: _BookingActions.tsx linha 242 */}
        {canCancel && (
          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: mode === "dark" ? "#2A0A0A" : "#FEF2F2", borderWidth: 1, borderColor: mode === "dark" ? "#F08C8466" : "#FECACA" }]}
            onPress={handleCancel}
            activeOpacity={0.85}
            disabled={cancel.isPending}
            accessibilityRole="button"
            accessibilityLabel="Cancelar reserva"
            accessibilityState={{ disabled: cancel.isPending }}
          >
            {cancel.isPending ? (
              <ActivityIndicator size="small" color={tokens.error} />
            ) : (
              <Text style={[s.actionBtnText, { color: tokens.error }]}>Cancelar reserva</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* ── Modal do contrato digital — fonte: app/reservas/[id]/_ContractBanner.tsx linhas 70-126
          Exibe texto resumido do contrato + botão "Aceito e assino".
          POST /api/bookings/${id}/contract → contractSignedAt gravado.
      ── */}
      <Modal
        visible={contractModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setContractModalOpen(false)}
      >
        <View style={s.modalOverlay}>
          <View style={[s.contractModalSheet, { backgroundColor: tokens.surface }]}>
            <Text style={[s.modalTitle, { color: tokens.navy }]}>Termo de Locação</Text>
            <Text style={[s.modalDesc, { color: tokens.muted }]}>ShareO · Contrato digital</Text>
            <ScrollView style={s.contractScroll} showsVerticalScrollIndicator>
              <Text style={[s.contractText, { color: tokens.text }]}>
                Este termo formaliza o acordo de locação entre as partes.{"\n\n"}
                O locatário se compromete a:{"\n"}
                1. Utilizar o item exclusivamente para o fim acordado.{"\n"}
                2. Devolver o item na data e condição combinadas.{"\n"}
                3. Arcar com taxas de atraso em caso de devolução fora do prazo.{"\n"}
                4. Responsabilizar-se por danos causados ao item durante o período de locação.{"\n"}
                5. Não sublocar ou transferir o item a terceiros.{"\n\n"}
                A ShareO atua como plataforma intermediária e não se responsabiliza por danos
                resultantes da utilização do item. Este contrato tem validade legal nos termos do
                Art. 565 do Código Civil Brasileiro.
              </Text>
            </ScrollView>
            {contractError ? (
              <Text style={{ fontSize: 12, color: tokens.error, paddingHorizontal: 4 }}>{contractError}</Text>
            ) : null}
            <View style={s.modalActions}>
              <TouchableOpacity
                style={[s.modalBtnSecondary, { borderColor: tokens.border }]}
                onPress={() => setContractModalOpen(false)}
                disabled={contractSigning}
                accessibilityRole="button"
                accessibilityLabel="Fechar contrato"
              >
                <Text style={[s.modalBtnSecondaryText, { color: tokens.text }]}>Fechar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalBtnPrimary, { opacity: contractSigning ? 0.6 : 1 }]}
                onPress={signContract}
                disabled={contractSigning}
                accessibilityRole="button"
                accessibilityLabel="Aceitar e assinar contrato"
              >
                {contractSigning ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={s.modalBtnPrimaryText}>✅ Aceito e assino</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Modal de cancelamento — fonte: _BookingActions.tsx linhas 262-283
          Alert.prompt não existe no Android, portanto Modal + TextInput.
          Botão desabilitado se motivo vazio — mesmo comportamento do site. ── */}
      <Modal
        visible={cancelModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => { setCancelModalVisible(false); setCancelReason("") }}
      >
        <View style={s.modalOverlay}>
          <View style={[s.modalSheet, { backgroundColor: tokens.surface }]}>
            <Text style={[s.modalTitle, { color: tokens.navy }]}>
              Cancelar reserva
            </Text>
            <Text style={[s.modalDesc, { color: tokens.muted }]}>
              Informe o motivo do cancelamento <Text style={{ color: tokens.error }}>*</Text>
            </Text>
            <TextInput
              style={[s.reasonInput, {
                color:           tokens.text,
                borderColor:     tokens.border,
                backgroundColor: tokens.bg,
              }]}
              value={cancelReason}
              onChangeText={setCancelReason}
              placeholder="Descreva o motivo..."
              placeholderTextColor={tokens.muted}
              multiline
              numberOfLines={3}
              maxLength={500}
              textAlignVertical="top"
              editable={!cancel.isPending}
            />
            <View style={s.modalActions}>
              <TouchableOpacity
                style={[s.modalBtnSecondary, { borderColor: tokens.border }]}
                onPress={() => { setCancelModalVisible(false); setCancelReason("") }}
                disabled={cancel.isPending}
                accessibilityRole="button"
                accessibilityLabel="Voltar"
              >
                <Text style={[s.modalBtnSecondaryText, { color: tokens.text }]}>Voltar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalBtnDanger, { opacity: !cancelReason.trim() || cancel.isPending ? 0.5 : 1 }]}
                onPress={() => cancel.mutate(cancelReason)}
                disabled={!cancelReason.trim() || cancel.isPending}
                accessibilityRole="button"
                accessibilityLabel="Confirmar cancelamento"
                accessibilityState={{ disabled: !cancelReason.trim() || cancel.isPending }}
              >
                {cancel.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={s.modalBtnDangerText}>Confirmar cancelamento</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const s = StyleSheet.create({
  root:   { flex: 1 },
  scroll: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  notFoundTitle: { fontSize: 16, fontWeight: "600", marginTop: 12 },

  // Header
  header: {
    flexDirection:    "row",
    alignItems:       "center",
    gap:              8,
    paddingBottom:    12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backBtn:     { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  backBtnText: { fontSize: 28, fontWeight: "700", lineHeight: 32 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "700" },

  // Status badge
  statusBadge: {
    borderRadius: 12,
    borderWidth:  1,
    paddingHorizontal: 14,
    paddingVertical:   12,
    marginBottom: 12,
  },
  statusLabel: { fontSize: 14, fontWeight: "700" },
  statusSub:   { fontSize: 12, marginTop: 4 },

  // Seção genérica
  section: {
    borderRadius: 12,
    borderWidth:  1,
    padding:      16,
    marginBottom: 12,
    overflow:     "hidden",
  },
  sectionLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.6, marginBottom: 10 },

  // Histórico
  historyToggle: {
    minHeight:      44,
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "space-between",
  },
  historyToggleLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  historyTitle:  { fontSize: 14, fontWeight: "600" },
  historyCount:  { fontSize: 12 },
  historyChevron:{ fontSize: 16 },
  historyPreview: { borderTopWidth: 1, paddingTop: 10, marginTop: 8 },
  historyPreviewLabel: { fontSize: 11 },
  historyPreviewEvent: { fontSize: 13, fontWeight: "600", marginTop: 2 },
  historyPreviewTime:  { fontSize: 11, marginTop: 1 },
  historyList:   { borderTopWidth: 1, paddingTop: 12, marginTop: 8 },
  historyItem:   { flexDirection: "row", gap: 10, marginBottom: 16 },
  historyDotCol: { alignItems: "center", width: 24 },
  historyDot: {
    width: 24, height: 24, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  historyDotCheck: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  historyDotInner: { width: 8, height: 8, borderRadius: 4 },
  historyLine:     { flex: 1, width: 1, marginTop: 3 },
  historyContent:  { flex: 1 },
  historyEventLabel: { fontSize: 13, fontWeight: "600", lineHeight: 18 },
  historyEventTime:  { fontSize: 11, marginTop: 2 },
  historyEventActor: { fontSize: 11, marginTop: 2 },

  // Item card
  itemCard: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           12,
    backgroundColor: "#FFFFFF",
  },
  itemThumb:      { width: 72, height: 72, borderRadius: 10, overflow: "hidden" },
  itemThumbEmpty: { flex: 1, alignItems: "center", justifyContent: "center" },
  itemInfo:       { flex: 1 },
  itemTitle:      { fontSize: 14, fontWeight: "700", lineHeight: 20 },
  itemCounterpart:{ fontSize: 12, marginTop: 4 },
  itemChevron:    { fontSize: 22 },

  // Itens desta locação (Story B)
  multiItemRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingVertical: 8,
  },
  multiItemThumb: { width: 36, height: 36, borderRadius: 8, overflow: "hidden" },
  multiItemTitle: { flex: 1, fontSize: 13 },
  multiItemPrice: { fontSize: 13, fontWeight: "600" },

  // Datas
  datesRow:   { flexDirection: "row", alignItems: "center", gap: 8 },
  dateSubLabel: { fontSize: 11, marginBottom: 3 },
  dateValue:    { fontSize: 14, fontWeight: "600" },
  dateSep:      { fontSize: 16, fontWeight: "600" },
  dateCaption:  { fontSize: 10, marginTop: 2 },

  // Valores
  finRow:       { flexDirection: "row", justifyContent: "space-between", marginVertical: 3 },
  finLabel:     { fontSize: 13 },
  finValue:     { fontSize: 13, fontWeight: "600" },
  finTotalLabel: { fontSize: 15, fontWeight: "700" },
  finTotalValue: { fontSize: 15, fontWeight: "700" },
  divider:      { height: 1, marginVertical: 10 },
  splitBox: {
    marginTop: 10, borderRadius: 10, padding: 10, gap: 2,
  },

  // Token de retirada
  pickupCard: {
    borderWidth: 2,
    backgroundColor: "#F0FDF4",
  },
  pickupTitle:   { fontSize: 15, fontWeight: "700", marginBottom: 6 },
  pickupHint:    { fontSize: 11, marginBottom: 10 },
  pickupCodeBox: {
    alignItems:   "center",
    borderRadius: 12,
    borderWidth:  1,
    paddingVertical:   16,
    paddingHorizontal: 24,
    marginBottom: 10,
  },
  pickupCode: {
    fontSize:      36,
    fontWeight:    "900",
    letterSpacing: 8,
  },
  pickupNote: { fontSize: 11, textAlign: "center", lineHeight: 16 },
  pickupAddressBox: {
    marginTop: 12, borderRadius: 10, borderWidth: 1, padding: 12,
  },
  pickupAddressLabel: { fontSize: 11, fontWeight: "700", color: "#92400E", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.4 },
  pickupAddressValue: { fontSize: 13, fontWeight: "500", color: "#78350F" },
  pickupAddressWarning: { fontSize: 10, color: "#B45309", marginTop: 4 },

  // Alertas de status
  alertBox: {
    flexDirection:   "row",
    alignItems:      "flex-start",
    gap:             8,
    borderRadius:    12,
    borderWidth:     1,
    padding:         14,
    marginBottom:    12,
  },
  alertTitle: { fontSize: 13, fontWeight: "600", lineHeight: 18 },
  alertDesc:  { fontSize: 12, marginTop: 3, lineHeight: 16 },

  // Nota
  noteText: { fontSize: 13, lineHeight: 20 },

  // Bottom actions
  bottomBar: {
    borderTopWidth:    1,
    paddingTop:        12,
    paddingHorizontal: 16,
    gap:               10,
  },
  actionBtn: {
    minHeight:       52,
    borderRadius:    12,
    alignItems:      "center",
    justifyContent:  "center",
  },
  actionBtnText:        { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  actionBtnOutline: {
    minHeight:         44,
    borderRadius:      12,
    borderWidth:       1,
    alignItems:        "center",
    justifyContent:    "center",
  },
  actionBtnOutlineText: { fontSize: 14, fontWeight: "700" },

  // Modal de cancelamento — fonte: _BookingActions.tsx linhas 262-283
  modalOverlay: {
    flex:             1,
    backgroundColor:  "rgba(0,0,0,0.5)",
    justifyContent:   "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius:  16,
    borderTopRightRadius: 16,
    padding:              20,
    gap:                  12,
  },
  modalTitle:   { fontSize: 17, fontWeight: "700" },
  modalDesc:    { fontSize: 13, lineHeight: 18 },
  reasonInput: {
    borderWidth:  1,
    borderRadius: 10,
    padding:      12,
    fontSize:     14,
    minHeight:    80,
  },
  modalActions: {
    flexDirection: "row",
    gap:           10,
    marginTop:     4,
  },
  modalBtnSecondary: {
    flex:            1,
    minHeight:       48,
    borderRadius:    12,
    borderWidth:     1,
    alignItems:      "center",
    justifyContent:  "center",
  },
  modalBtnSecondaryText: { fontSize: 14, fontWeight: "600" },
  modalBtnDanger: {
    flex:           1,
    minHeight:      48,
    borderRadius:   12,
    backgroundColor:"#DC2626",
    alignItems:     "center",
    justifyContent: "center",
  },
  modalBtnDangerText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },

  // ContractBanner styles — fonte: _ContractBanner.tsx
  contractBtn: {
    marginTop:       10,
    backgroundColor: "#D97706",
    borderRadius:    8,
    paddingVertical:   8,
    paddingHorizontal: 14,
    alignSelf:       "flex-start",
    minHeight:       44,
    alignItems:      "center",
    justifyContent:  "center",
  },
  contractBtnText:  { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  contractModalSheet: {
    borderTopLeftRadius:  16,
    borderTopRightRadius: 16,
    padding:              20,
    gap:                  10,
    maxHeight:            "80%",
  },
  contractScroll: { maxHeight: 260, marginVertical: 4 },
  contractText: { fontSize: 13, lineHeight: 20 },
  modalBtnPrimary: {
    flex:           1,
    minHeight:      48,
    borderRadius:   12,
    backgroundColor: "#007B3C",
    alignItems:     "center",
    justifyContent: "center",
  },
  modalBtnPrimaryText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
})

// ReturnChecklist StyleSheet — fonte: components/booking/ReturnChecklist.tsx
const sChecklist = StyleSheet.create({
  item: {
    flexDirection:  "row",
    alignItems:     "center",
    gap:            10,
    minHeight:      44,
    borderRadius:   10,
    borderWidth:    1,
    paddingHorizontal: 12,
    paddingVertical:    8,
    marginBottom:   8,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 4, borderWidth: 1.5,
    alignItems: "center", justifyContent: "center",
  },
  checkmark: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  label:     { flex: 1, fontSize: 13, lineHeight: 18 },
  progressRow: {
    flexDirection: "row", justifyContent: "space-between",
    marginTop: 4, marginBottom: 6,
  },
  progressBar: {
    height: 6, borderRadius: 3, overflow: "hidden", marginBottom: 14,
  },
  progressFill: {
    height: "100%", backgroundColor: "#007B3C", borderRadius: 3,
  },
  photoBtn: {
    borderWidth: 1.5, borderStyle: "dashed", borderRadius: 10,
    paddingVertical: 20, alignItems: "center", marginBottom: 12,
  },
  photoPreview: {
    width: "100%", height: 140, borderRadius: 10, marginBottom: 0,
  },
  photoRemove: {
    position: "absolute", top: 8, right: 8,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: "#DC2626",
    alignItems: "center", justifyContent: "center",
  },
  confirmBtn: {
    minHeight: 48, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
    marginTop: 4,
  },
  confirmText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
})

// ReturnConditionForm StyleSheet — fonte: components/booking/ReturnConditionForm.tsx
const sRC = StyleSheet.create({
  option: {
    flexDirection:  "row",
    alignItems:     "flex-start",
    gap:            10,
    minHeight:      44,
    borderRadius:   10,
    borderWidth:    1,
    paddingHorizontal: 12,
    paddingVertical:    10,
    marginBottom:   8,
  },
  radio: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 1.5,
    alignItems: "center", justifyContent: "center", marginTop: 2,
  },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#FFFFFF" },
  optLabel:  { fontSize: 13, fontWeight: "600", lineHeight: 18 },
  optDesc:   { fontSize: 11, marginTop: 2, lineHeight: 15 },
  disputeWarning: { borderRadius: 8, borderWidth: 1, padding: 10, marginTop: 8 },
})

// ReviewForm StyleSheet — fonte: app/reservas/[id]/_ReviewForm.tsx
const sReview = StyleSheet.create({
  starsRow: { flexDirection: "row", gap: 4, marginBottom: 2 },
  starBtn:  { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  btnText:  { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
})

// CheckInOut StyleSheet — fonte: app/reservas/[id]/_CheckInOut.tsx
const sCIO = StyleSheet.create({
  grid:  { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  thumb: { width: 88, height: 88, borderRadius: 8 },
})
