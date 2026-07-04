// Fonte: app/page.tsx linhas 257-288 (seção "Explorar por categoria" da Home)
// Cards maiores com PNG real (mesmos assets do CategoryChip do Explorar).

import React from "react"
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native"
import { router } from "expo-router"
import { Image } from "expo-image"
import { useTheme } from "@/lib/theme"

interface Category { id: string; name: string; slug: string }

const ICON_SOURCES: Record<string, number> = {
  "todas":       require("../../assets/icons/todas.png"),
  "casa-jardim": require("../../assets/icons/casa-jardim.png"),
  "construcao":  require("../../assets/icons/construcao.png"),
  "eletronicos": require("../../assets/icons/eletronicos.png"),
  "esporte":     require("../../assets/icons/esporte.png"),
  "ferramentas": require("../../assets/icons/ferramentas.png"),
  "festas":      require("../../assets/icons/festas.png"),
  "moda":        require("../../assets/icons/moda.png"),
}

export function CategoriasSection({ categories }: { categories: Category[] }) {
  const { tokens, mode } = useTheme()
  if (categories.length === 0) return null

  return (
    <View style={[s.section, { backgroundColor: tokens.bg }]}>
      <Text style={[s.title, { color: mode === "dark" ? tokens.text : "#003366" }]}>Explorar por categoria</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[s.card, { borderColor: tokens.border, backgroundColor: tokens.surface }]}
            onPress={() => router.push(`/explorar?categoryId=${cat.id}` as never)}
            accessibilityRole="button"
            accessibilityLabel={cat.name}
          >
            {ICON_SOURCES[cat.slug] && (
              <Image source={ICON_SOURCES[cat.slug]} style={s.icon} contentFit="contain" accessibilityLabel="" />
            )}
            <Text style={[s.cardLabel, { color: mode === "dark" ? tokens.text : "#003366" }]} numberOfLines={2}>{cat.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  section: { backgroundColor: "#F8FAFC", padding: 20, paddingBottom: 12 },
  title: { fontSize: 20, fontFamily: "Montserrat_700Bold", color: "#003366", marginBottom: 16 },
  row: { flexDirection: "row", gap: 12, paddingBottom: 4 },
  card: {
    minWidth: 110, flexShrink: 0, alignItems: "center", gap: 8,
    borderWidth: 2, borderColor: "#E2E8F0", borderRadius: 8,
    backgroundColor: "#FFFFFF", paddingHorizontal: 12, paddingVertical: 12,
  },
  icon: { width: 64, height: 64 },
  cardLabel: { fontSize: 12, fontWeight: "600", color: "#003366", textAlign: "center" },
})
