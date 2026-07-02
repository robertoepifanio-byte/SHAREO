/**
 * FavoritosScreen — apps/mobile/app/favoritos.tsx
 *
 * Lista de itens favoritados pelo usuário.
 * Usa GET /api/favorites (agora com resolveUserId — Bearer aceito).
 */
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native"
import { router } from "expo-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Image } from "expo-image"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { apiFetch } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { fmtCurrency } from "@/lib/pricing"

interface FavoriteItem {
  id:           string
  title:        string
  pricePerDay:  number
  condition:    string
  city:         string
  state:        string
  neighborhood: string | null
  images:       { url: string }[]
  category:     { name: string }
  owner:        { name: string; isVerified: boolean }
  _count:       { reviews: number; favorites: number }
  favoritedAt:  string
}

interface FavoritesResponse { data: FavoriteItem[] }
interface ToggleResponse    { data: { favorited: boolean } }

export default function FavoritosScreen() {
  const insets = useSafeAreaInsets()
  const user   = useAuth((s) => s.user)
  const qc     = useQueryClient()

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ["favorites"],
    queryFn:  () => apiFetch<FavoritesResponse>("/api/favorites"),
    enabled:  !!user,
  })

  const unfavorite = useMutation({
    mutationFn: (itemId: string) =>
      apiFetch<ToggleResponse>(`/api/items/${itemId}/favorite`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["favorites"] })
    },
    onError: () => Alert.alert("Erro", "Não foi possível remover dos favoritos. Tente novamente."),
  })

  const items = data?.data ?? []

  if (!user) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6" style={{ paddingTop: insets.top }}>
        <Text className="text-5xl">❤️</Text>
        <Text className="mt-3 text-base font-semibold text-primary">Faça login para ver seus favoritos</Text>
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
    <View className="flex-1 bg-background">
      {/* Header */}
      <View
        className="flex-row items-center gap-3 border-b border-border bg-surface px-4 pb-3"
        style={{ paddingTop: insets.top + 8 }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityLabel="Voltar"
          accessibilityRole="button"
          className="min-h-[44px] min-w-[44px] items-center justify-center"
        >
          <Text className="text-2xl text-muted">‹</Text>
        </TouchableOpacity>
        <Text className="flex-1 text-lg font-bold text-primary">Favoritos</Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#007B3C" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#007B3C"
            />
          }
          ListEmptyComponent={
            <View className="items-center py-20">
              <Text className="text-5xl">❤️</Text>
              <Text className="mt-3 text-base font-semibold text-primary">
                Nenhum favorito ainda
              </Text>
              <Text className="mt-1 text-sm text-muted">
                Toque no coração em qualquer item para salvar
              </Text>
              <TouchableOpacity
                className="mt-6 rounded-xl bg-brand px-8 py-3"
                onPress={() => router.push("/(tabs)/index" as never)}
              >
                <Text className="font-bold text-white">Explorar itens</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push(`/itens/${item.id}`)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={`Ver detalhes de ${item.title}`}
              className="mb-3 overflow-hidden rounded-2xl bg-surface shadow-sm"
            >
              <View className="flex-row">
                {/* Thumb */}
                <View className="h-24 w-24 bg-muted/20">
                  {item.images[0]?.url ? (
                    <Image
                      source={{ uri: item.images[0].url }}
                      style={{ width: 96, height: 96 }}
                      contentFit="cover"
                    />
                  ) : (
                    <View className="flex-1 items-center justify-center">
                      <Text className="text-3xl">📦</Text>
                    </View>
                  )}
                </View>

                {/* Info */}
                <View className="flex-1 justify-between p-3">
                  <View>
                    <Text className="text-[10px] font-semibold uppercase tracking-widest text-brand">
                      {item.category.name}
                    </Text>
                    <Text className="mt-0.5 text-sm font-bold text-primary" numberOfLines={2}>
                      {item.title}
                    </Text>
                    <Text className="mt-0.5 text-xs text-muted">
                      📍 {item.neighborhood ?? item.city}, {item.state}
                    </Text>
                  </View>
                  <View className="flex-row items-center justify-between">
                    <Text className="text-base font-extrabold text-foreground">
                      {fmtCurrency(item.pricePerDay)}<Text className="text-xs font-normal text-muted">/dia</Text>
                    </Text>
                    {/* Desfavoritar */}
                    <TouchableOpacity
                      onPress={() => unfavorite.mutate(item.id)}
                      disabled={unfavorite.isPending}
                      accessibilityRole="button"
                      accessibilityLabel="Remover dos favoritos"
                      className="min-h-[44px] min-w-[44px] items-center justify-center"
                    >
                      <Text className="text-xl">❤️</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  )
}
