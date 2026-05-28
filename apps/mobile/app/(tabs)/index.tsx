import { useState } from "react"
import {
  View, Text, TextInput, FlatList,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from "react-native"
import { router } from "expo-router"
import { useQuery } from "@tanstack/react-query"
import { Image } from "expo-image"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { apiFetch } from "@/lib/api"

interface Item {
  id:          string
  title:       string
  pricePerDay: number
  city:        string
  state:       string
  neighborhood: string | null
  condition:   string
  images:      { url: string }[]
  category:    { name: string; slug: string }
  owner:       { name: string; isVerified: boolean }
  _count:      { reviews: number; favorites: number }
}

interface ApiResponse { data: Item[]; meta: { total: number } }

const fmt = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100)

function ItemCard({ item, onPress }: { item: Item; onPress: () => void }) {
  const thumb = item.images[0]?.url
  return (
    <TouchableOpacity
      className="mb-3 overflow-hidden rounded-2xl border border-border bg-surface"
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* Imagem */}
      <View className="h-44 bg-muted/20">
        {thumb ? (
          <Image source={{ uri: thumb }} style={{ flex: 1 }} contentFit="cover" />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Text className="text-4xl">📦</Text>
          </View>
        )}
        {/* Eco badge */}
        <View className="absolute right-2 top-2 rounded-full bg-success/90 px-2 py-0.5">
          <Text className="text-[10px] font-bold text-white">🌿 Eco</Text>
        </View>
      </View>

      {/* Info */}
      <View className="p-3">
        <Text className="text-[10px] font-semibold uppercase tracking-widest text-brand">
          {item.category.name}
        </Text>
        <Text className="mt-0.5 text-sm font-bold text-primary" numberOfLines={2}>
          {item.title}
        </Text>
        <View className="mt-1.5 flex-row items-center justify-between">
          <View>
            <Text className="text-lg font-extrabold text-foreground">{fmt(item.pricePerDay)}</Text>
            <Text className="text-xs text-muted">/dia</Text>
          </View>
          <Text className="text-xs text-muted">
            📍 {item.neighborhood ?? item.city}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

export default function ExplorarScreen() {
  const insets = useSafeAreaInsets()
  const [query, setQuery] = useState("")
  const [search, setSearch] = useState("")

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ["items", search],
    queryFn:  () => apiFetch<ApiResponse>(`/api/items?q=${encodeURIComponent(search)}&limit=20`),
  })

  const items = data?.data ?? []

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="border-b border-border bg-surface px-4 pb-3 pt-4">
        <Text className="mb-3 text-xl font-black text-primary">
          Share<Text className="text-brand">O</Text>
        </Text>
        <TextInput
          className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground"
          placeholder="🔍  Buscar itens para alugar..."
          placeholderTextColor="#94A3B8"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => setSearch(query)}
          returnKeyType="search"
        />
      </View>

      {/* Lista */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#007B3C" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <ItemCard
              item={item}
              onPress={() => router.push(`/itens/${item.id}`)}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#007B3C"
            />
          }
          ListEmptyComponent={
            <View className="items-center py-16">
              <Text className="text-4xl">🔍</Text>
              <Text className="mt-3 text-base font-semibold text-primary">Nenhum item encontrado</Text>
              <Text className="mt-1 text-sm text-muted">Tente outra busca</Text>
            </View>
          }
          ListHeaderComponent={
            data?.meta.total ? (
              <Text className="mb-3 text-xs text-muted">{data.meta.total} itens disponíveis</Text>
            ) : null
          }
        />
      )}
    </View>
  )
}
