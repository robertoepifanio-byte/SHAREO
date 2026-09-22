// Fonte: components/home/PrelaunchBadge.tsx (site)
// Cores literais do Tailwind amber-400/amber-200 (não são tokens do design
// system — o site também usa a utility class direto, não uma var do tema).
import React from "react"
import { View, Text, StyleSheet } from "react-native"
import Svg, { Circle, Polyline } from "react-native-svg"

export function PrelaunchBadge() {
  return (
    <View style={s.badge} accessibilityRole="text">
      <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#FDE68A" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Circle cx="12" cy="12" r="10" />
        <Polyline points="12 6 12 12 16 14" />
      </Svg>
      <Text style={s.text}>Pré-lançamento · Primeiros no Brasil</Text>
    </View>
  )
}

const s = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.5)",
    backgroundColor: "rgba(251,191,36,0.2)",
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  text: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FDE68A",
  },
})
