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
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from "react-native"
import { Image } from "expo-image"
import { useTheme } from "@/lib/theme"

// ── Métricas do chip ─────────────────────────────────────────────────────────
// Exportadas de propósito: a ScrollView horizontal que hospeda os chips precisa
// de altura EXPLÍCITA (no Android ela não cresce com o conteúdo), e essa altura
// tem que vir daqui. Enquanto era um 150 solto no explorar.tsx, qualquer ajuste
// no chip descolava os dois e o rótulo voltava a ser cortado — foi o que
// aconteceu em 09/07, 16/07 e de novo em 10/08.
const ICON       = 80  // decisão do fundador (2026-07-09): maior que o Início (64px)
const GAP        = 6   // ícone → rótulo
const PAD_V      = 4   // paddingVertical do chip (×2)
const LINE       = 15  // lineHeight do rótulo em fontScale 1
const LABEL_LINES = 2  // rótulo quebra em até 2 linhas

/**
 * Altura que um chip ocupa para um dado `fontScale` do sistema.
 *
 * O `fontSize` do rótulo é escalado pelo Android, mas `lineHeight` NÃO é — por
 * isso o lineHeight também é multiplicado aqui e no estilo. Sem isso, com fonte
 * ampliada o glifo cresce dentro de uma caixa de linha parada e os descendentes
 * (g, p, q) são cortados dentro do próprio rótulo.
 */
export function categoryChipHeight(fontScale: number): number {
  return PAD_V * 2 + ICON + GAP + LABEL_LINES * LINE * fontScale
}

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
  const { fontScale } = useWindowDimensions()
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
        <Text style={[styles.label, { color: active ? tokens.green : tokens.muted, lineHeight: LINE * fontScale }]} numberOfLines={1}>
          {line1}
        </Text>
        {line2 ? (
          <Text style={[styles.label, { color: active ? tokens.green : tokens.muted, lineHeight: LINE * fontScale }]} numberOfLines={1}>
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
    gap:               GAP,
    paddingVertical:   PAD_V,
    paddingHorizontal: 8,
  },
  chipPressed: { opacity: 0.7 },
  icon: { width: ICON, height: ICON },
  labelWrap: { alignItems: "center" },
  label: {
    fontSize:   12,
    fontWeight: "600",
    // lineHeight aplicado inline (LINE * fontScale) — ver categoryChipHeight.
    textAlign:  "center",
  },
})
