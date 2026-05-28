import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native"
import { router } from "expo-router"
import { useQuery } from "@tanstack/react-query"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { apiFetch } from "@/lib/api"
import { useAuth } from "@/lib/auth"

interface Conversation {
  id:          string
  updatedAt:   string
  unreadCount: number
  otherUser:   { id: string; name: string; avatarUrl: string | null } | null
  lastMessage: { body: string; createdAt: string } | null
  booking:     { item: { title: string } } | null
}

function relTime(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return "agora"
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

export default function MensagensScreen() {
  const insets = useSafeAreaInsets()
  const user   = useAuth((s) => s.user)

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ["conversations"],
    queryFn:  () => apiFetch<{ data: Conversation[] }>("/api/conversations"),
    enabled:  !!user,
  })

  const convs = data?.data ?? []

  if (!user) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Text className="text-4xl">💬</Text>
        <Text className="mt-3 text-base font-semibold text-primary">Faça login para ver suas mensagens</Text>
        <TouchableOpacity className="mt-6 rounded-xl bg-brand px-8 py-3" onPress={() => router.push("/(auth)/login")}>
          <Text className="font-bold text-white">Entrar</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="border-b border-border bg-surface px-4 pb-3 pt-4">
        <Text className="text-xl font-bold text-primary">Mensagens</Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#007B3C" />
        </View>
      ) : (
        <FlatList
          data={convs}
          keyExtractor={(c) => c.id}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#007B3C" />}
          renderItem={({ item: c }) => (
            <TouchableOpacity
              className="flex-row items-center gap-3 border-b border-border bg-surface px-4 py-3"
              onPress={() => router.push(`/mensagens/${c.id}`)}
              activeOpacity={0.85}
            >
              {/* Avatar */}
              <View className="h-11 w-11 items-center justify-center rounded-full bg-primary">
                <Text className="text-base font-bold text-white">
                  {c.otherUser?.name[0]?.toUpperCase() ?? "?"}
                </Text>
              </View>

              <View className="flex-1 min-w-0">
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm font-semibold text-foreground">{c.otherUser?.name ?? "Usuário"}</Text>
                  {c.lastMessage && (
                    <Text className="text-xs text-muted">{relTime(c.lastMessage.createdAt)}</Text>
                  )}
                </View>
                {c.booking?.item.title && (
                  <Text className="text-[10px] text-brand font-medium" numberOfLines={1}>
                    📦 {c.booking.item.title}
                  </Text>
                )}
                {c.lastMessage && (
                  <Text className="text-xs text-muted" numberOfLines={1}>{c.lastMessage.body}</Text>
                )}
              </View>

              {c.unreadCount > 0 && (
                <View className="h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1">
                  <Text className="text-[10px] font-bold text-white">{c.unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View className="items-center py-16">
              <Text className="text-4xl">💬</Text>
              <Text className="mt-3 text-base font-semibold text-primary">Nenhuma conversa ainda</Text>
              <Text className="mt-1 text-sm text-muted">Inicie uma reserva para conversar com o proprietário</Text>
            </View>
          }
        />
      )}
    </View>
  )
}
