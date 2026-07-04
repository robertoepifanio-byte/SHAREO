// Fonte: components/home/ItensProcurados.tsx
// Transcrição literal — grid 2 colunas de itens em alta.

import React from "react"
import { View, Text, TouchableOpacity, StyleSheet } from "react-native"
import { router } from "expo-router"
import { ProcuradoIcon, type ProcuradoIconName } from "./ProcuradoIcon"
import { useTheme } from "@/lib/theme"

const ITEMS: { name: string; icon: ProcuradoIconName; demand: "alta" | "media" }[] = [
  { name: "Furadeiras", icon: "furadeira", demand: "alta" },
  { name: "Escadas", icon: "escada", demand: "alta" },
  { name: "Lavadoras de Pressão", icon: "lavadora", demand: "media" },
  { name: "Máquinas de Limpeza", icon: "aspirador", demand: "alta" },
  { name: "Projetores", icon: "projetor", demand: "alta" },
  { name: "Caixas de Som", icon: "som", demand: "alta" },
  { name: "Mesas e Cadeiras p/ Festas", icon: "mesa-cadeiras", demand: "media" },
  { name: "Barracas de Camping", icon: "barraca", demand: "media" },
  { name: "Bicicletas", icon: "bicicleta", demand: "alta" },
  { name: "Ferramentas Elétricas", icon: "ferramenta-eletrica", demand: "alta" },
]

export function ItensProcurados() {
  const { tokens, mode } = useTheme()
  // #F1F5F9 (slate-100) — sem token exato; usa tokens.bg em dark, preserva original em light
  const sectionBg = mode === "dark" ? tokens.bg : "#F1F5F9"
  // Badge tints decorativos sem token direto
  const badgeAltaBg  = mode === "dark" ? "rgba(0,123,60,0.25)"    : "#D1FAE5"
  const badgeMediaBg = mode === "dark" ? "rgba(194,65,12,0.20)"   : "#FFEDD5"

  return (
    <View style={[s.section, { backgroundColor: sectionBg }]}>
      <View style={s.headerRow}>
        <Text style={[s.title, { color: mode === "dark" ? tokens.text : "#003366" }]}>Itens mais procurados agora</Text>
        <TouchableOpacity onPress={() => router.push("/explorar")} accessibilityRole="link">
          <Text style={s.seeAll}>Ver todos →</Text>
        </TouchableOpacity>
      </View>
      <Text style={[s.subtitle, { color: tokens.muted }]}>Itens com alta demanda — ótimas oportunidades para anunciar.</Text>

      <View style={s.grid}>
        {ITEMS.map((item) => (
          <TouchableOpacity
            key={item.name}
            style={[s.card, { borderColor: tokens.border, backgroundColor: tokens.surface }]}
            onPress={() => router.push(`/explorar?q=${encodeURIComponent(item.name)}` as never)}
            accessibilityRole="button"
            accessibilityLabel={`Buscar ${item.name}`}
          >
            <ProcuradoIcon name={item.icon} size={40} color="#007B3C" />
            <Text style={[s.cardName, { color: tokens.text }]} numberOfLines={2}>{item.name}</Text>
            <View style={[s.badge, { backgroundColor: item.demand === "alta" ? badgeAltaBg : badgeMediaBg }]}>
              <Text style={[s.badgeText, item.demand === "alta" ? s.badgeTextAlta : s.badgeTextMedia]}>
                {item.demand === "alta" ? "Alta demanda" : "Demanda moderada"}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  section: { backgroundColor: "#F1F5F9", padding: 20 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 20, fontFamily: "Montserrat_700Bold", color: "#003366", flexShrink: 1 },
  seeAll: { fontSize: 13, fontWeight: "600", color: "#007B3C" },
  subtitle: { fontSize: 14, color: "#64748B", marginTop: 4, marginBottom: 16 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  card: {
    width: "47%", minHeight: 44, borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 12,
    backgroundColor: "#FFFFFF", paddingVertical: 16, paddingHorizontal: 10, alignItems: "center", gap: 8,
  },
  cardName: { fontSize: 13, fontWeight: "600", color: "#0F172A", textAlign: "center" },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgeAlta: { backgroundColor: "#D1FAE5" },
  badgeMedia: { backgroundColor: "#FFEDD5" },
  badgeText: { fontSize: 10, fontWeight: "600" },
  badgeTextAlta: { color: "#007B3C" },
  badgeTextMedia: { color: "#C2410C" },
})
