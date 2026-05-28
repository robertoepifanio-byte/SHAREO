import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native"
import { router } from "expo-router"
import { useQuery } from "@tanstack/react-query"
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

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  PENDING:   { label: "Aguardando aprovação", color: "text-amber-600" },
  ACTIVE:    { label: "Em andamento",          color: "text-brand" },
  COMPLETED: { label: "Concluída",             color: "text-success" },
  CANCELLED: { label: "Cancelada",             color: "text-muted" },
  DISPUTED:  { label: "Em disputa",            color: "text-red-600" },
}

const fmt = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100)

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })

export default function ReservasScreen() {
  const insets = useSafeAreaInsets()
  const user   = useAuth((s) => s.user)

  const { data, isLoading, isRefetching, refetch } = useQuery({
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
            const st = STATUS_LABEL[b.status] ?? { label: b.status, color: "text-muted" }
            return (
              <TouchableOpacity
                className="mb-3 rounded-2xl border border-border bg-surface p-4"
                onPress={() => router.push(`/reservas/${b.id}`)}
                activeOpacity={0.85}
              >
                <View className="flex-row items-start justify-between">
                  <Text className="flex-1 text-sm font-bold text-primary" numberOfLines={2}>
                    {b.item.title}
                  </Text>
                  <Text className={`ml-2 text-xs font-semibold ${st.color}`}>{st.label}</Text>
                </View>
                <Text className="mt-1 text-xs text-muted">
                  {fmtDate(b.startDate)} → {fmtDate(b.endDate)}
                </Text>
                <Text className="mt-2 text-base font-extrabold text-foreground">
                  {fmt(b.totalPrice)}
                </Text>
              </TouchableOpacity>
            )
          }}
          ListEmptyComponent={
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
          }
        />
      )}
    </View>
  )
}
