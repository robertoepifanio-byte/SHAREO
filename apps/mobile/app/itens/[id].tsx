import { useState } from "react"
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from "react-native"
import { router, useLocalSearchParams } from "expo-router"
import { useQuery } from "@tanstack/react-query"
import { Image } from "expo-image"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { apiFetch } from "@/lib/api"
import { useAuth } from "@/lib/auth"

interface ItemDetail {
  id:          string
  title:       string
  description: string
  pricePerDay: number
  pricePerWeek:  number | null
  pricePerMonth: number | null
  depositAmount: number | null
  estimatedRetailPrice: number | null
  condition:   string
  voltage:     string | null
  requireIdVerification: boolean
  requirePhone:          boolean
  city:        string
  state:       string
  neighborhood: string | null
  status:      string
  ownerId:     string
  category:    { name: string }
  owner:       { id: string; name: string; isVerified: boolean; city: string | null }
  images:      { url: string }[]
  reviews:     { id: string; rating: number; comment: string | null; reviewer: { name: string } }[]
  _count:      { reviews: number; favorites: number }
}

const fmt = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100)

const CONDITION: Record<string, string> = {
  NEW: "Novo", EXCELLENT: "Seminovo", GOOD: "Bom estado", FAIR: "Regular",
}

export default function ItemDetailScreen() {
  const { id }   = useLocalSearchParams<{ id: string }>()
  const insets   = useSafeAreaInsets()
  const user     = useAuth((s) => s.user)
  const [imgIdx, setImgIdx] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ["item", id],
    queryFn:  () => apiFetch<{ data: ItemDetail }>(`/api/items/${id}`),
    enabled:  !!id,
  })

  const item = data?.data

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#007B3C" />
      </View>
    )
  }

  if (!item) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Text className="text-4xl">😕</Text>
        <Text className="mt-3 text-base font-semibold text-primary">Item não encontrado</Text>
        <TouchableOpacity className="mt-4" onPress={() => router.back()}>
          <Text className="text-sm text-brand">← Voltar</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const isOwner  = user?.id === item.ownerId
  const avgRating = item.reviews.length
    ? item.reviews.reduce((s, r) => s + r.rating, 0) / item.reviews.length
    : null

  function handleReservar() {
    if (!user) {
      Alert.alert("Login necessário", "Faça login para fazer uma reserva.", [
        { text: "Cancelar", style: "cancel" },
        { text: "Entrar", onPress: () => router.push("/(auth)/login") },
      ])
      return
    }
    Alert.alert(
      "Reservar item",
      "A seleção de datas e pagamento está disponível no site. Acesse shareo.com.br para concluir sua reserva.",
      [{ text: "OK" }]
    )
  }

  return (
    <View className="flex-1 bg-background">
      {/* Galeria */}
      <View className="relative h-64 bg-muted/20">
        {item.images[imgIdx] ? (
          <Image source={{ uri: item.images[imgIdx].url }} style={{ flex: 1 }} contentFit="cover" />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Text className="text-6xl">📦</Text>
          </View>
        )}
        {/* Botão voltar */}
        <TouchableOpacity
          className="absolute left-4 top-10 h-9 w-9 items-center justify-center rounded-full bg-black/40"
          onPress={() => router.back()}
        >
          <Text className="text-base font-bold text-white">‹</Text>
        </TouchableOpacity>
        {/* Miniaturas */}
        {item.images.length > 1 && (
          <View className="absolute bottom-2 left-0 right-0 flex-row justify-center gap-1">
            {item.images.map((_, i) => (
              <TouchableOpacity key={i} onPress={() => setImgIdx(i)}>
                <View className={`h-1.5 rounded-full ${i === imgIdx ? "w-4 bg-white" : "w-1.5 bg-white/50"}`} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {/* Categoria + Título */}
        <Text className="text-xs font-semibold uppercase tracking-widest text-brand">
          {item.category.name}
        </Text>
        <Text className="mt-1 text-xl font-bold text-primary">{item.title}</Text>

        {/* Rating */}
        {avgRating !== null && (
          <View className="mt-1 flex-row items-center gap-1">
            <Text className="text-yellow-500">{"★".repeat(Math.round(avgRating))}{"☆".repeat(5 - Math.round(avgRating))}</Text>
            <Text className="text-xs text-muted">{avgRating.toFixed(1)} ({item._count.reviews})</Text>
          </View>
        )}

        {/* Tags */}
        <View className="mt-3 flex-row flex-wrap gap-2">
          <View className="rounded-full border border-border px-3 py-1">
            <Text className="text-xs text-muted">{CONDITION[item.condition] ?? item.condition}</Text>
          </View>
          {item.voltage && (
            <View className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1">
              <Text className="text-xs font-medium text-amber-800">⚡ {item.voltage}</Text>
            </View>
          )}
          {item.neighborhood && (
            <View className="rounded-full border border-border px-3 py-1">
              <Text className="text-xs text-muted">📍 {item.neighborhood}</Text>
            </View>
          )}
        </View>

        {/* Preço */}
        <View className="mt-4 rounded-xl border border-border bg-surface p-4">
          <View className="flex-row items-baseline gap-1">
            <Text className="text-3xl font-extrabold text-foreground">{fmt(item.pricePerDay)}</Text>
            <Text className="text-sm text-muted">/dia</Text>
          </View>
          {(item.pricePerWeek || item.pricePerMonth) && (
            <View className="mt-2 flex-row gap-2">
              {item.pricePerWeek && (
                <View className="rounded-md border border-border px-2 py-1">
                  <Text className="text-xs text-muted">{fmt(item.pricePerWeek)}/sem</Text>
                </View>
              )}
              {item.pricePerMonth && (
                <View className="rounded-md border border-border px-2 py-1">
                  <Text className="text-xs text-muted">{fmt(item.pricePerMonth)}/mês</Text>
                </View>
              )}
            </View>
          )}
          {item.depositAmount != null && item.depositAmount > 0 && (
            <View className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <Text className="text-xs text-amber-800">
                🔒 Caução: <Text className="font-bold">{fmt(item.depositAmount)}</Text> — devolvida após devolução do item
              </Text>
            </View>
          )}
        </View>

        {/* Descrição */}
        <Text className="mt-4 text-sm font-bold text-primary">Sobre o item</Text>
        <Text className="mt-1 text-sm leading-relaxed text-muted">{item.description}</Text>

        {/* Proprietário */}
        <TouchableOpacity
          className="mt-4 flex-row items-center gap-3 rounded-xl border border-border bg-surface p-3"
          onPress={() => {}} activeOpacity={0.85}
        >
          <View className="h-10 w-10 items-center justify-center rounded-full bg-primary">
            <Text className="text-base font-bold text-white">{item.owner.name[0]?.toUpperCase()}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-sm font-semibold text-foreground">
              {item.owner.name}
              {item.owner.isVerified && <Text className="text-success"> ✓</Text>}
            </Text>
            {item.owner.city && <Text className="text-xs text-muted">📍 {item.owner.city}</Text>}
          </View>
          <Text className="text-xl text-muted">›</Text>
        </TouchableOpacity>

        {/* Avaliações */}
        {item.reviews.length > 0 && (
          <View className="mt-4">
            <Text className="mb-2 text-sm font-bold text-primary">
              Avaliações ({item._count.reviews})
            </Text>
            {item.reviews.map((r) => (
              <View key={r.id} className="mb-2 rounded-lg border border-border bg-surface p-3">
                <Text className="text-xs font-semibold text-foreground">{r.reviewer.name}</Text>
                <Text className="text-xs text-yellow-500">
                  {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}
                </Text>
                {r.comment && <Text className="mt-1 text-xs text-muted">{r.comment}</Text>}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* CTA fixo */}
      {!isOwner && (
        <View
          className="border-t border-border bg-surface px-4 py-3"
          style={{ paddingBottom: insets.bottom + 12 }}
        >
          <TouchableOpacity
            className="rounded-xl bg-brand py-4 items-center"
            onPress={handleReservar}
            activeOpacity={0.85}
          >
            <Text className="text-base font-bold text-white">Reservar item</Text>
          </TouchableOpacity>
          <Text className="mt-2 text-center text-xs text-muted">
            🔒 Pagamento seguro via ShareO
          </Text>
        </View>
      )}
    </View>
  )
}
