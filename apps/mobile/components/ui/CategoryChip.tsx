// Fonte: app/itens/page.tsx linhas 288-330 + components/ui/CategoryIcon.tsx
// Transcrição literal — pill horizontal com PNG real (não SVG recriado) + label
// de 2 linhas empilhado ao lado. Corrige transcrição anterior que inventou um
// card vertical com fundo colorido/SVG de linha (achado em teste de device real).

import React from "react"
import { View, Text, Pressable, StyleSheet } from "react-native"
import { Image } from "expo-image"

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

interface CategoryChipProps {
  slug:    string
  label:   string
  active?: boolean
  onPress?: () => void
}

export function CategoryChip({ slug, label, active = false, onPress }: CategoryChipProps) {
  const icon = ICON_SOURCES[slug]
  // Label em até 2 linhas — fonte: page.tsx linhas 322-330 (split ao meio das palavras)
  const words = label.split(" ")
  const mid = Math.ceil(words.length / 2)
  const line1 = words.length > 1 ? words.slice(0, mid).join(" ") : label
  const line2 = words.length > 1 ? words.slice(mid).join(" ") : ""

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.chip,
        active ? styles.chipActive : styles.chipInactive,
        pressed && styles.chipPressed,
      ]}
    >
      {icon && (
        <Image source={icon} style={styles.icon} contentFit="contain" accessibilityLabel="" />
      )}
      <View style={styles.labelWrap}>
        <Text style={[styles.label, { color: active ? "#007B3C" : "#64748B" }]} numberOfLines={1}>
          {line1}
        </Text>
        {line2 ? (
          <Text style={[styles.label, { color: active ? "#007B3C" : "#64748B" }]} numberOfLines={1}>
            {line2}
          </Text>
        ) : null}
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  // "inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5" — page.tsx:298
  chip: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               6,
    borderRadius:      999,
    borderWidth:       1,
    paddingHorizontal: 12,
    paddingVertical:   6,
    minHeight:         44,
  },
  // "border-brand bg-brand/10 text-brand" — page.tsx:300
  chipActive:   { borderColor: "#007B3C", backgroundColor: "rgba(0,123,60,0.10)" },
  // "border-border bg-surface text-muted-foreground" — page.tsx:301
  chipInactive: { borderColor: "#E2E8F0", backgroundColor: "#FFFFFF" },
  chipPressed:  { opacity: 0.8 },
  // size={52} no site — page.tsx:304,321
  icon: { width: 40, height: 40 },
  labelWrap: {
    // "flex flex-col items-center leading-tight" — page.tsx:305,322
    alignItems: "center",
  },
  label: {
    fontSize:   11,
    fontWeight: "600",
    lineHeight: 13,
  },
})
