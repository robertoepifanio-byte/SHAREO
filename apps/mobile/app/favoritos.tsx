// Fonte: app/favoritos/page.tsx + components/ui/ItemCard.tsx
// Tela de favoritos do app mobile — adota StyleSheet + tokens do design system.
// Funcionalidade preservada: GET /api/favorites, desfavoritar (optimistic).

import React from "react"
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Platform,
} from "react-native"
import { router } from "expo-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Image } from "expo-image"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { apiFetch } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { fmtCurrency } from "@/lib/pricing"
import { useTheme } from "@/lib/theme"

// ── Tipos ─────────────────────────────────────────────────────────────────────
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

// ── Tela ──────────────────────────────────────────────────────────────────────
export default function FavoritosScreen() {
  const insets     = useSafeAreaInsets()
  const user       = useAuth((s) => s.user)
  const qc         = useQueryClient()
  const { tokens } = useTheme()

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
  })

  const items = data?.data ?? []

  // ── Guard: não autenticado ─────────────────────────────────────────────────
  if (!user) {
    return (
      <View style={[s.center, { backgroundColor: tokens.bg, paddingTop: insets.top, paddingHorizontal: 24 }]}>
        <Text style={{ fontSize: 48 }}>❤️</Text>
        <Text style={[s.guardTitle, { color: tokens.navy }]}>
          Faça login para ver seus favoritos
        </Text>
        <TouchableOpacity
          style={[s.ctaBtn, { backgroundColor: tokens.green }]}
          onPress={() => router.push("/(auth)/login")}
          accessibilityRole="button"
          accessibilityLabel="Entrar"
        >
          <Text style={s.ctaBtnText}>Entrar</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={[s.root, { backgroundColor: tokens.bg }]}>

      {/* ── Header — verbatim do AppHeader do site ── */}
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
          accessibilityLabel="Voltar"
        >
          <Text style={[s.backBtnText, { color: tokens.muted }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: tokens.navy }]}>Favoritos</Text>
      </View>

      {/* ── Lista ── */}
      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={tokens.green} />
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
              tintColor={tokens.green}
            />
          }
          ListEmptyComponent={
            <View style={s.emptyState}>
              <Text style={{ fontSize: 48 }}>❤️</Text>
              <Text style={[s.emptyTitle, { color: tokens.navy }]}>
                Nenhum favorito ainda
              </Text>
              <Text style={[s.emptyDesc, { color: tokens.muted }]}>
                Toque no coração em qualquer item para salvar
              </Text>
              <TouchableOpacity
                style={[s.ctaBtn, { backgroundColor: tokens.green }]}
                onPress={() => router.push("/" as never)}
                accessibilityRole="button"
                accessibilityLabel="Explorar itens"
              >
                <Text style={s.ctaBtnText}>Explorar itens</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push(`/itens/${item.id}` as never)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={`Ver detalhes de ${item.title}`}
              style={[s.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]}
            >
              <View style={s.cardInner}>
                {/* Thumbnail */}
                <View style={s.thumb}>
                  {item.images[0]?.url ? (
                    <Image
                      source={{ uri: item.images[0].url }}
                      style={StyleSheet.absoluteFillObject}
                      contentFit="cover"
                      accessibilityLabel={`Foto de ${item.title}`}
                    />
                  ) : (
                    <View style={s.thumbPlaceholder}>
                      <Text style={{ fontSize: 28 }}>📦</Text>
                    </View>
                  )}
                </View>

                {/* Info */}
                <View style={s.info}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.category, { color: tokens.green }]}>
                      {item.category.name.toUpperCase()}
                    </Text>
                    <Text style={[s.title, { color: tokens.navy }]} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <Text style={[s.location, { color: tokens.muted }]}>
                      {item.neighborhood ?? item.city}, {item.state}
                    </Text>
                  </View>
                  <View style={s.footer}>
                    <Text style={[s.price, { color: tokens.text }]}>
                      {fmtCurrency(item.pricePerDay)}
                      <Text style={[s.priceUnit, { color: tokens.muted }]}>/dia</Text>
                    </Text>
                    <TouchableOpacity
                      onPress={() => unfavorite.mutate(item.id)}
                      disabled={unfavorite.isPending}
                      accessibilityRole="button"
                      accessibilityLabel="Remover dos favoritos"
                      style={s.heartBtn}
                    >
                      <Text style={{ fontSize: 20 }}>❤️</Text>
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

// ── Estilos ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:   { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  // Header
  header: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingBottom: 12, paddingHorizontal: 16,
    borderBottomWidth: 1,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  backBtn:      { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  backBtnText:  { fontSize: 28, fontWeight: "700", lineHeight: 32 },
  headerTitle:  { flex: 1, fontSize: 17, fontWeight: "700" },

  // Guard / empty
  guardTitle: { fontSize: 16, fontWeight: "600", marginTop: 12, marginBottom: 24, textAlign: "center" },
  emptyState: { alignItems: "center", paddingVertical: 80 },
  emptyTitle: { fontSize: 16, fontWeight: "700", marginTop: 12 },
  emptyDesc:  { fontSize: 13, marginTop: 4, textAlign: "center" },

  // CTA
  ctaBtn:    { borderRadius: 12, paddingHorizontal: 32, paddingVertical: 12, marginTop: 20, minHeight: 44 },
  ctaBtnText:{ color: "#FFFFFF", fontSize: 14, fontWeight: "700" },

  // Card
  card: {
    borderRadius: 16, borderWidth: 1, marginBottom: 12, overflow: "hidden",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },
  cardInner:  { flexDirection: "row" },
  thumb:      { width: 96, height: 96, position: "relative" },
  thumbPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F1F5F9" },
  info:       { flex: 1, padding: 12, justifyContent: "space-between" },
  category:   { fontSize: 9, fontWeight: "700", letterSpacing: 0.8 },
  title:      { fontSize: 13, fontWeight: "700", marginTop: 2 },
  location:   { fontSize: 11, marginTop: 2 },
  footer:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 },
  price:      { fontSize: 15, fontWeight: "800" },
  priceUnit:  { fontSize: 11, fontWeight: "400" },
  heartBtn:   { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
})
