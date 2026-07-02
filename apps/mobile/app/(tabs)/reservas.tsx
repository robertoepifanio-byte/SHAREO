import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native"
import { router } from "expo-router"
import { useQuery } from "@tanstack/react-query"
import { Image } from "expo-image"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { apiFetch } from "@/lib/api"
import { useAuth } from "@/lib/auth"

interface Booking {
  id:        string
  status:    string
  startDate: string
  endDate:   string
  totalPrice: number
  item: { id: string; title: string; images: { url: string }[] }
  owner:     { name: string }
  borrower:  { name: string }
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
  new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })

export default function ReservasScreen() {
  const insets = useSafeAreaInsets()
  const user   = useAuth((s) => s.user)

  const { data, isLoading, isRefetching, isError, refetch } = useQuery({
    queryKey: ["bookings"],
    queryFn:  () => apiFetch<{ data: Booking[] }>("/api/bookings"),
    enabled:  !!user,
  })

  const bookings = data?.data ?? []

  if (!user) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Text className="text-4xl">🔒</Text>
        <Text className="mt-3 text-base font-semibold text-primary">Faça login para ver suas reservas</Text>
        <TouchableOpacity
          className="mt-6 rounded-xl bg-brand px-8 py-3"
          onPress={() => router.push("/(auth)/login")}
        >
          <Text className="font-bold text-white">Entrar</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="border-b border-border bg-surface px-4 pb-3 pt-4">
        <Text className="text-xl font-bold text-primary">Minhas Reservas</Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#007B3C" />
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(b) => b.id}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#007B3C" />}
          renderItem={({ item: b }) => {
            const st = STATUS_LABEL[b.status] ?? { label: b.status, color: "text-muted", bg: "bg-gray-50 border-border" }
            const thumb = b.item.images[0]?.url
            return (
              <TouchableOpacity
                className="mb-3 flex-row overflow-hidden rounded-2xl bg-surface p-3 shadow-sm"
                onPress={() => router.push(`/reservas/${b.id}`)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={`${b.item.title} — ${st.label} — ${fmtDate(b.startDate)} a ${fmtDate(b.endDate)} — ${fmt(b.totalPrice)}`}
              >
                <View className="h-16 w-16 overflow-hidden rounded-xl bg-muted/20">
                  {thumb ? (
                    <Image source={{ uri: thumb }} style={{ flex: 1 }} contentFit="cover" />
                  ) : (
                    <View className="flex-1 items-center justify-center">
                      <Text className="text-xl">📦</Text>
                    </View>
                  )}
                </View>
                <View className="ml-3 flex-1">
                  <View className="flex-row items-start justify-between gap-2">
                    <Text className="flex-1 text-sm font-bold text-primary" numberOfLines={2}>
                      {b.item.title}
                    </Text>
                  </View>
                  <View className={`mt-1 self-start rounded-full border px-2 py-0.5 ${st.bg}`}>
                    <Text className={`text-[11px] font-semibold ${st.color}`}>{st.label}</Text>
                  </View>
                  <Text className="mt-1 text-xs text-muted">
                    {fmtDate(b.startDate)} → {fmtDate(b.endDate)}
                  </Text>
                  <Text className="mt-1 text-base font-extrabold text-foreground">
                    {fmt(b.totalPrice)}
                  </Text>
                </View>
              </TouchableOpacity>
            )
          }}
          ListEmptyComponent={
            isError ? (
              <View className="items-center py-16">
                <Text className="text-4xl">⚠️</Text>
                <Text className="mt-3 text-base font-semibold text-primary">Não foi possível carregar suas reservas</Text>
                <Text className="mt-1 text-sm text-muted">Verifique sua conexão e tente novamente</Text>
                <TouchableOpacity
                  className="mt-4 min-h-[44px] justify-center rounded-xl bg-brand px-6"
                  onPress={() => refetch()}
                  accessibilityRole="button"
                  accessibilityLabel="Tentar novamente"
                >
                  <Text className="text-sm font-bold text-white">Tentar novamente</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View className="items-center py-16">
                <Text className="text-4xl">📦</Text>
                <Text className="mt-3 text-base font-semibold text-primary">Nenhuma reserva ainda</Text>
                <Text className="mt-1 text-sm text-muted">Explore itens e faça sua primeira reserva</Text>
                <TouchableOpacity
                  className="mt-6 rounded-xl bg-brand px-8 py-3"
                  onPress={() => router.push("/(tabs)")}
                >
                  <Text className="font-bold text-white">Explorar itens</Text>
                </TouchableOpacity>
              </View>
            )
          }
        />
      )}
    </View>
  )
}
