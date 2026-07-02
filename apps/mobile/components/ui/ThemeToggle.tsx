// Fonte: components/layout/ThemeToggle.tsx (variant="menu")
// Transcrição do ThemeToggle do site para React Native.
// Usado dentro do MobileMenu (drawer navy), conforme handoff §1.17.

import React from "react"
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from "react-native"
import Svg, { Path, Circle, Line } from "react-native-svg"
import { type ThemePreference } from "@/lib/theme"

// ── Ícones SVG — equivalentes aos Lucide Sun/Monitor/Moon do site ─────────────
function SunIcon({ color }: { color: string }) {
  const s = { stroke: color, strokeWidth: 2, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const }
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24">
      <Circle {...s} cx="12" cy="12" r="5"/>
      <Line {...s} x1="12" y1="1"  x2="12" y2="3"/>
      <Line {...s} x1="12" y1="21" x2="12" y2="23"/>
      <Line {...s} x1="4.22" y1="4.22"   x2="5.64" y2="5.64"/>
      <Line {...s} x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <Line {...s} x1="1"  y1="12" x2="3"  y2="12"/>
      <Line {...s} x1="21" y1="12" x2="23" y2="12"/>
      <Line {...s} x1="4.22" y1="19.78"  x2="5.64" y2="18.36"/>
      <Line {...s} x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </Svg>
  )
}

function MonitorIcon({ color }: { color: string }) {
  const s = { stroke: color, strokeWidth: 2, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const }
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24">
      <Path {...s} d="M2 3h20v14H2z" rx="2" ry="2"/>
      <Path {...s} d="M8 21h8m-4-4v4"/>
    </Svg>
  )
}

function MoonIcon({ color }: { color: string }) {
  const s = { stroke: color, strokeWidth: 2, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const }
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24">
      <Path {...s} d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </Svg>
  )
}

// ── Opções — rótulos VERBATIM do site (ThemeToggle.tsx linhas 80-83) ──────────
const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "light",  label: "Claro" },
  { value: "system", label: "Sistema" },
  { value: "dark",   label: "Escuro" },
]

interface ThemeToggleProps {
  value:    ThemePreference
  onChange: (pref: ThemePreference) => void
}

export function ThemeToggle({ value, onChange }: ThemeToggleProps) {
  return (
    <View
      style={styles.container}
      accessibilityRole="radiogroup"
      accessibilityLabel="Selecionar tema"
    >
      {OPTIONS.map(({ value: opt, label }) => {
        const isActive = value === opt
        // handoff §1.17:
        // ativo: bg #007B3C, border #007B3C, text #fff
        // inativo (sobre navy): bg transparente, border rgba(255,255,255,.3), text rgba(255,255,255,.7)
        const iconColor = isActive ? "#FFFFFF" : "rgba(255,255,255,0.7)"

        return (
          <Pressable
            key={opt}
            onPress={() => onChange(opt)}
            accessibilityRole="radio"
            accessibilityState={{ checked: isActive }}
            accessibilityLabel={label}
            style={[
              styles.option,
              isActive ? styles.optionActive : styles.optionInactive,
            ]}
          >
            {opt === "light"  && <SunIcon color={iconColor} />}
            {opt === "system" && <MonitorIcon color={iconColor} />}
            {opt === "dark"   && <MoonIcon color={iconColor} />}
            <Text style={[styles.label, { color: iconColor }]}>
              {label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderWidth:   1,
    borderColor:   "rgba(255,255,255,0.2)",
    borderRadius:  8,
    overflow:      "hidden",
    marginHorizontal: 16,
  },
  option: {
    // handoff §1.17: "flex: 1, altura 36px, border-radius 8px"
    flex:           1,
    height:         44,          // tap target mínimo (>36px do handoff)
    alignItems:     "center",
    justifyContent: "center",
    gap:            3,
  },
  optionActive: {
    backgroundColor: "#007B3C",
  },
  optionInactive: {
    backgroundColor: "transparent",
  },
  label: {
    fontSize:   10,
    fontWeight: "500",
    lineHeight: 12,
  },
})
