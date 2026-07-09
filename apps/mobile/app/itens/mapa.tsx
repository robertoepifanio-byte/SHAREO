// Fonte: components/items/ItemsMap.tsx + app/itens/page.tsx (botão "Ver no mapa")
// Tela dedicada do mapa nativo (não modal — gestos do Mapbox conflitam com
// bottom sheet). Busca os mesmos itens do Explorar (limit maior, sem
// paginação) e renderiza via ItemsMapNative. Ver docs/plano-mapa-nativo-mobile.md.
import React from "react"
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Platform } from "react-native"
import { router, useLocalSearchParams } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useQuery } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api"
import { useTheme } from "@/lib/theme"
import { ItemsMapNative, type MapItem } from "@/components/map/ItemsMapNative"

interface ApiItem {
  id:          string
  title:       string
  pricePerDay: number
  latitude:    number | null
  longitude:   number | null
}
interface ApiResponse { data: ApiItem[] }

export default function MapaScreen() {
  const insets = useSafeAreaInsets()
  const { tokens } = useTheme()
  const params = useLocalSearchParams<{ q?: string }>()

  const { data, isLoading, isError } = useQuery<ApiResponse>({
    queryKey: ["items-map", params.q ?? ""],
    queryFn:  () => {
      const p = new URLSearchParams({ limit: "100" })
      if (params.q) p.set("search", params.q)
      return apiFetch<ApiResponse>(`/api/items?${p}`)
    },
  })

  const items: MapItem[] = (data?.data ?? [])
    .filter((i) => i.latitude != null && i.longitude != null)
    .map((i) => ({ id: i.id, title: i.title, pricePerDay: i.pricePerDay, lat: i.latitude!, lng: i.longitude! }))

  return (
    <View style={[s.root, { backgroundColor: tokens.bg }]}>
      {/* ── Header ── */}
      <View
        style={[
          s.header,
          { paddingTop: insets.top + 8, backgroundColor: tokens.surface, borderBottomColor: tokens.border },
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
        <Text style={[s.headerTitle, { color: tokens.navy }]}>Mapa de itens</Text>
      </View>

      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={tokens.green} />
        </View>
      ) : isError ? (
        <View style={s.center}>
          <Text style={{ fontSize: 40 }}>🗺️</Text>
          <Text style={[s.errorText, { color: tokens.muted }]}>Não foi possível carregar o mapa.</Text>
        </View>
      ) : items.length === 0 ? (
        // Empty-state: sem itens com coordenadas → o mapa renderizaria em branco
        // sem explicação (achado revisão s41). Feedback explícito.
        <View style={s.center}>
          <Text style={{ fontSize: 40 }}>📍</Text>
          <Text style={[s.errorText, { color: tokens.muted }]}>
            Nenhum item com localização disponível no momento.
          </Text>
        </View>
      ) : (
        <ItemsMapNative items={items} onOpen={(id) => router.push(`/itens/${id}`)} />
      )}
    </View>
  )
}

const s = StyleSheet.create({
  root:   { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  header: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingBottom: 12, paddingHorizontal: 16,
    borderBottomWidth: 1,
    ...Platform.select({
      ios:     { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  backBtn:     { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  backBtnText: { fontSize: 28, fontWeight: "700", lineHeight: 32 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: "700" },
  errorText:   { fontSize: 13, textAlign: "center", paddingHorizontal: 32 },
})
