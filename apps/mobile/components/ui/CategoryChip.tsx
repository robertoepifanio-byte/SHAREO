// Fonte: app/itens/page.tsx linhas 288-330 (chips de categoria do Explorar) + CategoriasSection.tsx (Início)
// Card vertical: PNG real em cima + rótulo (até 2 linhas) embaixo, centralizado.
// Correção 2026-07-09: a variante "pill horizontal" (rótulo AO LADO) com ícone 96px
// cortava o rótulo no Android — o ícone ocupava toda a largura/altura do chip e o
// rótulo era empurrado pra fora da ScrollView (confirmado em device via build EAS limpo).
// Ajuste 2026-07-09 (2): chip com largura do CONTEÚDO (não fixa) → o ícone centraliza
// sobre o rótulo. Antes, com largura fixa 96px, rótulos longos ("Eletrodomésticos")
// transbordavam pra direita e o ícone parecia encostado à esquerda. Rótulo multi-palavra
// quebra em 2 linhas (split ao meio) pra manter o chip compacto.

import React from "react"
import { View, Text, Pressable, StyleSheet } from "react-native"
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
  // Rótulo multi-palavra quebra ao meio em 2 linhas (mantém o chip compacto).
  // Fonte: page.tsx linhas 322-330.
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
        pressed && styles.chipPressed,
      ]}
    >
      {icon && (
        <Image source={icon} style={styles.icon} contentFit="contain" accessibilityLabel="" />
      )}
      <View style={styles.labelWrap}>
        <Text style={[styles.label, { color: active ? tokens.green : tokens.muted }]} numberOfLines={1}>
          {line1}
        </Text>
        {line2 ? (
          <Text style={[styles.label, { color: active ? tokens.green : tokens.muted }]} numberOfLines={1}>
            {line2}
          </Text>
        ) : null}
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  // Sem largura fixa: o chip encolhe/cresce com o conteúdo (rótulo) e o ícone
  // centraliza sobre ele (alignItems center). paddingHorizontal separa os chips.
  chip: {
    flexShrink:        0,
    alignItems:        "center",
    gap:               6,
    paddingVertical:   4,
    paddingHorizontal: 8,
  },
  chipPressed: { opacity: 0.7 },
  // 80px — decisão do fundador (2026-07-09): ícones maiores que o Início (64px).
  icon: { width: 80, height: 80 },
  labelWrap: { alignItems: "center" },
  label: {
    fontSize:   12,
    fontWeight: "600",
    lineHeight: 15,
    textAlign:  "center",
  },
})
