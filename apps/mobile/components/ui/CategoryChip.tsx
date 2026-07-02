// Fonte: components/ui/CategoryIcon.tsx
// Transcrição de CategoryIcon.tsx do site para React Native / NativeWind.
// Ícones SVG via react-native-svg (substitui Lucide que usa SVG web).
// Paleta de fundo por slug transcrita do handoff §1.10.

import React from "react"
import { View, Text, Pressable, StyleSheet } from "react-native"
import Svg, { Path, Circle, Rect, Polyline, Polygon, Line } from "react-native-svg"

// ── Paleta por slug — handoff §1.10 (VERBATIM) ───────────────────────────────
const CATEGORY_PALETTE: Record<string, { bg: string; stroke: string }> = {
  "ferramentas": { bg: "#DBEAFE", stroke: "#1D4ED8" },
  "eletronicos": { bg: "#EDE9FE", stroke: "#7C3AED" },
  "casa-jardim": { bg: "#DCFCE7", stroke: "#16A34A" },
  "construcao":  { bg: "#FEF9C3", stroke: "#CA8A04" },
  "esporte":     { bg: "#FEE2E2", stroke: "#DC2626" },
  "moda":        { bg: "#FDF4FF", stroke: "#9333EA" },
  "festas":      { bg: "#FFF7ED", stroke: "#EA580C" },
  "todas":       { bg: "#EFF6FF", stroke: "#1E40AF" },
}

// ── Ícones SVG por slug — transcritos de CategoryIcon.tsx (LUCIDE_BY_SLUG) ──
// Paths extraídos dos mesmos ícones Lucide usados como fallback no site.
function CategorySvgIcon({ slug, stroke, size = 20 }: { slug: string; stroke: string; size?: number }) {
  const s = { stroke, strokeWidth: 1.75, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const }
  switch (slug) {
    case "ferramentas": // Wrench
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path {...s} d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
        </Svg>
      )
    case "eletronicos": // Smartphone
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect {...s} x="5" y="2" width="14" height="20" rx="2" ry="2"/>
          <Line {...s} x1="12" y1="18" x2="12.01" y2="18"/>
        </Svg>
      )
    case "casa-jardim": // Refrigerator / Home
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path {...s} d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <Polyline {...s} points="9 22 9 12 15 12 15 22"/>
        </Svg>
      )
    case "construcao": // Hammer
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path {...s} d="M15 12l-8.5 8.5c-.83.83-2.17.83-3 0 0 0 0 0 0 0a2.12 2.12 0 0 1 0-3L12 9"/>
          <Path {...s} d="M17.64 15 22 10.64"/>
          <Path {...s} d="m20.91 11.7-1.25-1.25c-.6-.6-.93-1.4-.93-2.25v-.86L16.01 4.6a5.56 5.56 0 0 0-3.94-1.64H9l.92.82A6.18 6.18 0 0 1 12 8.4v1.56l2 2h2.47l2.26 1.91"/>
        </Svg>
      )
    case "esporte": // Dumbbell
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path {...s} d="m6.5 6.5 11 11"/>
          <Path {...s} d="m21 21-1-1"/>
          <Path {...s} d="m3 3 1 1"/>
          <Path {...s} d="m18 22 4-4"/>
          <Path {...s} d="m2 6 4-4"/>
          <Path {...s} d="m3 10 7-7"/>
          <Path {...s} d="m14 21 7-7"/>
        </Svg>
      )
    case "moda": // ShoppingBag
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path {...s} d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
          <Line {...s} x1="3" y1="6" x2="21" y2="6"/>
          <Path {...s} d="M16 10a4 4 0 0 1-8 0"/>
        </Svg>
      )
    case "festas": // Gift
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Polyline {...s} points="20 12 20 22 4 22 4 12"/>
          <Rect {...s} x="2" y="7" width="20" height="5"/>
          <Line {...s} x1="12" y1="22" x2="12" y2="7"/>
          <Path {...s} d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
          <Path {...s} d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
        </Svg>
      )
    case "todas": // Home (ícone genérico para "Todas")
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path {...s} d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <Polyline {...s} points="9 22 9 12 15 12 15 22"/>
        </Svg>
      )
    default:
      return null
  }
}

// ── CategoryChip — handoff §1.10 ─────────────────────────────────────────────
interface CategoryChipProps {
  slug:    string
  label:   string
  active?: boolean
  onPress?: () => void
}

export function CategoryChip({ slug, label, active = false, onPress }: CategoryChipProps) {
  const palette = CATEGORY_PALETTE[slug] ?? { bg: "#F1F5F9", stroke: "#64748B" }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.chip,
        active && styles.chipActive,
        pressed && styles.chipPressed,
      ]}
    >
      {/* Fundo colorido arredondado 36×36px — handoff §1.10 */}
      <View
        style={[
          styles.iconWrapper,
          {
            backgroundColor: palette.bg,
            borderColor: active ? "#007B3C" : palette.stroke + "33",
          },
        ]}
      >
        <CategorySvgIcon slug={slug} stroke={active ? "#007B3C" : palette.stroke} size={18} />
      </View>

      <Text
        style={[
          styles.label,
          { color: active ? "#007B3C" : "#64748B" },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  chip: {
    // handoff §1.10: "coluna, padding 10px 14px, min 68×68px, border 1.5px"
    alignItems:      "center",
    paddingHorizontal: 14,
    paddingVertical:   10,
    minWidth:          68,
    minHeight:         68,
    borderRadius:      12,
    borderWidth:       1.5,
    borderColor:       "#E2E8F0",
    backgroundColor:   "#FFFFFF",
    gap:               6,
  },
  chipActive: {
    borderColor:     "#007B3C",
    backgroundColor: "#D1FAE5",
  },
  chipPressed: {
    opacity: 0.8,
  },
  iconWrapper: {
    // handoff §1.10: "fundo colorido arredondado 36×36px"
    width:          36,
    height:         36,
    borderRadius:   10,
    alignItems:     "center",
    justifyContent: "center",
    borderWidth:    1,
  },
  label: {
    fontSize:    11,
    fontWeight:  "600",
    textAlign:   "center",
  },
})
