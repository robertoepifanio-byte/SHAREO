// Fonte: app/itens/page.tsx linhas 288-330 (chips de categoria do Explorar) + CategoriasSection.tsx (Início)
// Card vertical: PNG real em cima + rótulo (até 2 linhas) embaixo, centralizado.
// Correção 2026-07-09: a variante "pill horizontal" (rótulo AO LADO) com ícone 96px
// cortava o rótulo no Android — o ícone ocupava toda a largura/altura do chip e o
// rótulo era empurrado pra fora da ScrollView (confirmado em device via build EAS limpo).
// Padrão vertical espelha o CategoriasSection do Início (mesma família de assets, ícone 64px).

import React from "react"
import { Text, Pressable, StyleSheet } from "react-native"
import { Image } from "expo-image"
import { useTheme } from "@/lib/theme"

const ICON_SOURCES: Record<string, number> = {
  "todas":       require("../../assets/icons/todas.png"),
  "casa-jardim": require("../../assets/icons/casa-jardim.png"),
  "construcao":  require("../../assets/icons/construcao.png"),
  "eletronicos": require("../../assets/icons/eletronicos.png"),
  "esporte":     require("../../assets/icons/esporte.png"),
  "ferramentas": require("../../assets/icons/ferramentas.png"),
  "festas":      require("../../assets/icons/festas.png"),
}

interface CategoryChipProps {
  slug:    string
  label:   string
  active?: boolean
  onPress?: () => void
}

export function CategoryChip({ slug, label, active = false, onPress }: CategoryChipProps) {
  const { tokens } = useTheme()
  const icon = ICON_SOURCES[slug]

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.chip,
        pressed && styles.chipPressed,
      ]}
    >
      {icon && (
        <Image source={icon} style={styles.icon} contentFit="contain" accessibilityLabel="" />
      )}
      <Text
        style={[styles.label, { color: active ? tokens.green : tokens.muted }]}
        numberOfLines={2}
      >
        {label}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  chip: {
    width:        96,
    flexShrink:   0,
    alignItems:   "center",
    gap:          6,
    paddingVertical:   4,
    paddingHorizontal: 2,
  },
  chipPressed: { opacity: 0.7 },
  // 80px — decisão do fundador (2026-07-09): ícones maiores que o Início (64px),
  // mas em card vertical o rótulo continua visível abaixo (sem o corte do layout antigo de 96px).
  icon: { width: 80, height: 80 },
  label: {
    fontSize:   12,
    fontWeight: "600",
    lineHeight: 15,
    textAlign:  "center",
  },
})
