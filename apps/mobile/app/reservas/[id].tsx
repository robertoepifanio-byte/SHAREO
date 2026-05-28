import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from "react-native"
import { router, useLocalSearchParams } from "expo-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Image } from "expo-image"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { apiFetch } from "@/lib/api"
import { useAuth } from "@/lib/auth"

interface BookingDetail {
  id:         string
  status:     string
  startDate:  string
  endDate:    string
  totalPrice: number
  depositAmount: number | null
  notes:      string | null
  createdAt:  string
  item: {
    id: string; title: string
    images: { url: string }[]
    pricePerDay: number
  }
  owner:    { id: string; name: string }
  borrower: { id: string; name: string }
  conversation: { id: string } | null
}

const STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:   { label: "Aguardando aprovação", color: "text-amber-700",  bg: "bg-amber-50 border-amber-200" },
  ACTIVE:    { label: "Em andamento",          color: "text-brand",      bg: "bg-emerald-50 border-emerald-200" },
  COMPLETED: { label: "Concluída",             color: "text-success",   bg: "bg-emerald-50 border-emerald-200" },
  CANCELLED: { label: "Cancelada",             color: "text-muted",     bg: "bg-gray-50 border-border" },
  DISPUTED:  { label: "Em disputa",            color: "text-red-600",   bg: "bg-red-50 border-red-200" },
}

const fmt = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100)

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })

export default function BookingDetailScreen() {
  const { id }   = useLocalSearchParams<{ id: string }>()
  const insets   = useSafeAreaInsets()
  const user     = useAuth((s) => s.user)
  const qc       = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ["booking", id],
    queryFn:  () => apiFetch<{ data: BookingDetail }>(`/api/bookings/${id}`),
    enabled:  !!id && !!user,
  })

  const cancel = useMutation({
    mutationFn: () => apiFetch(`/api/bookings/${id}/cancel`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["booking", id] })
      qc.invalidateQueries({ queryKey: ["bookings"] })
    },
    onError: () => Alert.alert("Erro", "Não foi possível cancelar a reserva."),
  })

  const booking = data?.data

  if (!user) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Text className="text-base text-muted">Login necessário</Text>
      </View>
    )
  }

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#007B3C" />
      </View>
    )
  }

  if (!booking) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Text className="text-4xl">😕</Text>
        <Text className="mt-3 text-base font-semibold text-primary">Reserva não encontrada</Text>
        <TouchableOpacity className="mt-4" onPress={() => router.back()}>
          <Text className="text-sm text-brand">← Voltar</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const st = STATUS_LABEL[booking.status] ?? { label: booking.status, color: "text-muted", bg: "bg-gray-50 border-border" }
  const isOwner    = user.id === booking.owner.id
  const isBorrower = user.id === booking.borrower.id
  const canCancel  = (booking.status === "PENDING" || booking.status === "ACTIVE") && isBorrower
  const thumb      = booking.item.images[0]?.url

  function handleCancel() {
    Alert.alert(
      "Cancelar reserva",
      "Tem certeza que deseja cancelar esta reserva? Esta ação não pode ser desfeita.",
      [
        { text: "Voltar", style: "cancel" },
        { text: "Cancelar reserva", style: "destructive", onPress: () => cancel.mutate() },
      ]
    )
  }

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View
        className="flex-row items-center gap-3 border-b border-border bg-surface px-4 pb-3"
        style={{ paddingTop: insets.top + 8 }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-2xl text-muted">‹</Text>
        </TouchableOpacity>
        <Text className="flex-1 text-lg font-bold text-primary">Reserva</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>

        {/* Status badge */}
        <View className={`mb-4 rounded-xl border px-4 py-3 ${st.bg}`}>
          <Text className={`text-sm font-bold ${st.color}`}>{st.label}</Text>
          <Text className="mt-0.5 text-xs text-muted">
            Criada em {fmtDate(booking.createdAt)}
          </Text>
        </View>

        {/* Item card */}
        <TouchableOpacity
          className="mb-4 flex-row overflow-hidden rounded-2xl border border-border bg-surface"
          onPress={() => router.push(`/itens/${booking.item.id}`)}
          activeOpacity={0.85}
        >
          <View className="h-20 w-20 bg-muted/20">
            {thumb ? (
              <Image source={{ uri: thumb }} style={{ flex: 1 }} contentFit="cover" />
            ) : (
              <View className="flex-1 items-center justify-center">
                <Text className="text-2xl">📦</Text>
              </View>
            )}
          </View>
          <View className="flex-1 justify-center p-3">
            <Text className="text-sm font-bold text-primary" numberOfLines={2}>
              {booking.item.title}
            </Text>
            <Text className="mt-0.5 text-xs text-muted">
              {isOwner ? `Locatário: ${booking.borrower.name}` : `Proprietário: ${booking.owner.name}`}
            </Text>
          </View>
          <View className="items-center justify-center pr-3">
            <Text className="text-xl text-muted">›</Text>
          </View>
        </TouchableOpacity>

        {/* Datas */}
        <View className="mb-4 rounded-xl border border-border bg-surface p-4">
          <Text className="mb-2 text-xs font-bold uppercase tracking-widest text-muted">Período</Text>
          <View className="flex-row items-center gap-3">
            <View className="flex-1">
              <Text className="text-xs text-muted">Início</Text>
              <Text className="text-sm font-semibold text-foreground">{fmtDate(booking.startDate)}</Text>
            </View>
            <Text className="text-muted">→</Text>
            <View className="flex-1 items-end">
              <Text className="text-xs text-muted">Fim</Text>
              <Text className="text-sm font-semibold text-foreground">{fmtDate(booking.endDate)}</Text>
            </View>
          </View>
        </View>

        {/* Valores */}
        <View className="mb-4 rounded-xl border border-border bg-surface p-4">
          <Text className="mb-2 text-xs font-bold uppercase tracking-widest text-muted">Valores</Text>
          <View className="flex-row items-center justify-between">
            <Text className="text-sm text-muted">Total do aluguel</Text>
            <Text className="text-sm font-bold text-foreground">{fmt(booking.totalPrice)}</Text>
          </View>
          {booking.depositAmount != null && booking.depositAmount > 0 && (
            <View className="mt-2 flex-row items-center justify-between">
              <Text className="text-sm text-muted">Caução (devolvida)</Text>
              <Text className="text-sm font-medium text-amber-700">{fmt(booking.depositAmount)}</Text>
            </View>
          )}
        </View>

        {/* Observações */}
        {booking.notes && (
          <View className="mb-4 rounded-xl border border-border bg-surface p-4">
            <Text className="mb-1 text-xs font-bold uppercase tracking-widest text-muted">Observações</Text>
            <Text className="text-sm text-foreground leading-relaxed">{booking.notes}</Text>
          </View>
        )}

      </ScrollView>

      {/* Bottom actions */}
      <View
        className="border-t border-border bg-surface px-4 py-3 gap-3"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        {booking.conversation && (
          <TouchableOpacity
            className="rounded-xl border border-brand py-3 items-center"
            onPress={() => router.push(`/mensagens/${booking.conversation!.id}`)}
            activeOpacity={0.85}
          >
            <Text className="text-sm font-bold text-brand">💬 Abrir conversa</Text>
          </TouchableOpacity>
        )}
        {canCancel && (
          <TouchableOpacity
            className="rounded-xl bg-red-50 border border-red-200 py-3 items-center"
            onPress={handleCancel}
            activeOpacity={0.85}
            disabled={cancel.isPending}
          >
            {cancel.isPending ? (
              <ActivityIndicator size="small" color="#dc2626" />
            ) : (
              <Text className="text-sm font-bold text-red-600">Cancelar reserva</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}
