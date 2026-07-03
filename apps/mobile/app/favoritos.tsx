// Fonte: app/favoritos/page.tsx + components/items/ItemCard.tsx
// Tela de favoritos do app mobile — adota StyleSheet + tokens do design system.
// Funcionalidade preservada: GET /api/favorites, desfavoritar (optimistic, dentro
// do próprio ItemCard compartilhado).
//
// Layout corrigido nesta rodada (auditoria de código, sem device): a versão
// anterior renderizava uma lista de linhas horizontais (1 coluna) — o site usa
// "grid grid-cols-2" (app/favoritos/page.tsx linha 66) com o mesmo ItemCard do
// Explorar. Agora reusa components/items/ItemCard.tsx (extraído de explorar.tsx
// nesta mesma rodada) num FlatList numColumns=2, igual à grade real do site.

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
import { useQuery } from "@tanstack/react-query"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { apiFetch } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useTheme } from "@/lib/theme"
import { ItemCard, type ItemCardItem } from "@/components/items/ItemCard"

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface FavoriteItem extends ItemCardItem {
  favoritedAt: string
}

interface FavoritesResponse { data: FavoriteItem[] }

// ── Tela ──────────────────────────────────────────────────────────────────────
export default function FavoritosScreen() {
  const insets     = useSafeAreaInsets()
  const user       = useAuth((s) => s.user)
  const { tokens } = useTheme()

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ["favorites"],
    queryFn:  () => apiFetch<FavoritesResponse>("/api/favorites"),
    enabled:  !!user,
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

      {/* ── Contador — verbatim de favoritos/page.tsx linhas 53-57 ── */}
      {!isLoading && (
        <Text style={[s.counter, { color: tokens.muted }]}>
          {items.length === 0
            ? "Nenhum item salvo ainda."
            : `${items.length} ${items.length === 1 ? "item salvo" : "itens salvos"}`}
        </Text>
      )}

      {/* ── Grid 2 colunas — fonte: favoritos/page.tsx linha 66 "grid grid-cols-2" ── */}
      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={tokens.green} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          numColumns={2}
          columnWrapperStyle={s.row}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={tokens.green}
            />
          }
          ListEmptyComponent={
            // Fonte: favoritos/page.tsx linhas 60-64 — EmptyState sem prop `action`
            // (nenhum botão no site). Ícone mantido por convenção já usada em
            // outros empty states do app (explorar.tsx), mas sem CTA inventado.
            <View style={s.emptyState}>
              <Text style={{ fontSize: 48 }}>❤️</Text>
              <Text style={[s.emptyTitle, { color: tokens.navy }]}>
                Nenhum favorito ainda
              </Text>
              <Text style={[s.emptyDesc, { color: tokens.muted }]}>
                Toque no coração em qualquer item para salvá-lo aqui.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <ItemCard item={item} onPress={() => router.push(`/itens/${item.id}` as never)} />
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
  counter:      { fontSize: 12, paddingHorizontal: 16, paddingTop: 12 },

  // Guard / empty
  guardTitle: { fontSize: 16, fontWeight: "600", marginTop: 12, marginBottom: 24, textAlign: "center" },
  emptyState: { alignItems: "center", paddingVertical: 80 },
  emptyTitle: { fontSize: 16, fontWeight: "700", marginTop: 12 },
  emptyDesc:  { fontSize: 13, marginTop: 4, textAlign: "center" },

  // CTA (guard "Entrar")
  ctaBtn:    { borderRadius: 12, paddingHorizontal: 32, paddingVertical: 12, marginTop: 20, minHeight: 44 },
  ctaBtnText:{ color: "#FFFFFF", fontSize: 14, fontWeight: "700" },

  // Grid — card em si vive em components/items/ItemCard.tsx
  row: { gap: 12 },
})
