// Fonte: components/home/SimuladorRenda.tsx
// Transcrição literal — tabela estática + busca com match de keywords + output.

import React, { useMemo, useState } from "react"
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native"
import { router } from "expo-router"
import Svg, { Circle, Path } from "react-native-svg"
import { ProcuradoIcon, type ProcuradoIconName } from "./ProcuradoIcon"
import { useTheme } from "@/lib/theme"

interface SimuladorItem {
  keywords: string[]
  label: string
  rangeMin: number
  rangeMax: number
  demand: "alta" | "media"
}

const DEFAULT_DATA: SimuladorItem[] = [
  { keywords: ["furadeira", "furar", "broca"], label: "Furadeira", rangeMin: 90, rangeMax: 150, demand: "alta" },
  { keywords: ["projetor", "projeção"], label: "Projetor", rangeMin: 200, rangeMax: 350, demand: "alta" },
  { keywords: ["caixa de som", "som", "jbl"], label: "Caixa de Som", rangeMin: 250, rangeMax: 420, demand: "alta" },
  { keywords: ["barraca", "camping", "tenda"], label: "Barraca de Camping", rangeMin: 120, rangeMax: 240, demand: "media" },
  { keywords: ["lava estofados", "lavadora de estofados", "extratora"], label: "Lavadora de Estofados", rangeMin: 350, rangeMax: 550, demand: "alta" },
  { keywords: ["escada"], label: "Escada", rangeMin: 80, rangeMax: 160, demand: "alta" },
  { keywords: ["bicicleta", "bike"], label: "Bicicleta", rangeMin: 150, rangeMax: 300, demand: "alta" },
]

const CHIPS = ["Furadeira", "Projetor", "Caixa de Som", "Barraca", "Lava Estofados"]
const CHIP_KEYWORD_MAP: Record<string, string> = {
  "Furadeira": "furadeira", "Projetor": "projetor", "Caixa de Som": "caixa de som",
  "Barraca": "barraca", "Lava Estofados": "lava estofados",
}

const TABLE_ROWS: { icon: ProcuradoIconName; name: string; range: string; highlight: boolean }[] = [
  { icon: "furadeira", name: "Furadeira", range: "R$ 90 a R$ 150", highlight: false },
  { icon: "som", name: "Caixa de Som", range: "R$ 250 a R$ 420", highlight: false },
  { icon: "barraca", name: "Barraca de Camping", range: "R$ 120 a R$ 240", highlight: false },
  { icon: "lavadora", name: "Máquina Lava Estofados", range: "R$ 350 a R$ 550", highlight: false },
  { icon: "projetor", name: "Projetor", range: "R$ 200 a R$ 350", highlight: true },
]

function simularRenda(query: string, data: SimuladorItem[]): SimuladorItem | null {
  const q = query.toLowerCase().trim()
  if (!q) return null
  return data.find((item) => item.keywords.some((kw) => q.includes(kw) || kw.includes(q))) ?? null
}

export function SimuladorRenda() {
  const { tokens, mode } = useTheme()
  // Tints decorativos sem token direto — preserva exato em light, usa rgba semi-transparente em dark
  const headingColor    = mode === "dark" ? tokens.text : "#003366"
  const tintGreenBg80   = mode === "dark" ? "rgba(0,123,60,0.12)" : "#D1FAE580"   // tableRowHighlight, chipActive
  const tintGreenBorder = mode === "dark" ? "#2A7A4A"              : "#86EFAC"    // outputResult border
  const tintGreenBg60   = mode === "dark" ? "rgba(0,123,60,0.10)" : "#D1FAE560"  // outputResult bg

  const [query, setQuery] = useState("")
  const [activeChip, setActiveChip] = useState<string | null>(null)
  const result = useMemo(() => simularRenda(query, DEFAULT_DATA), [query])

  return (
    <View style={[s.section, { backgroundColor: tokens.surface }]}>
      <View style={s.header}>
        <Text style={[s.title, { color: headingColor }]}>Quanto seus itens podem render?</Text>
        <Text style={[s.subtitle, { color: tokens.muted }]}>Descubra o potencial de renda de itens que você já tem em casa.</Text>
      </View>

      {/* Tabela */}
      <Text style={[s.h3, { color: headingColor }]}>Estimativa por item</Text>
      <View style={s.table}>
        <View style={[s.tableHeadRow, { borderBottomColor: tokens.border }]}>
          <Text style={[s.tableHeadCell, { color: tokens.muted }]}>ITEM</Text>
          <Text style={[s.tableHeadCell, { color: tokens.muted, textAlign: "right" }]}>RENDA MENSAL ESTIMADA</Text>
        </View>
        {TABLE_ROWS.map((row) => (
          <View
            key={row.name}
            style={[
              s.tableRow,
              { borderBottomColor: tokens.border },
              row.highlight && { backgroundColor: tintGreenBg80 },
            ]}
          >
            <View style={s.tableRowLeft}>
              <ProcuradoIcon name={row.icon} size={18} color="#007B3C" />
              <Text style={[s.tableRowName, { color: tokens.text }]}>{row.name}</Text>
            </View>
            <Text style={s.tableRowValue}>{row.range}</Text>
          </View>
        ))}
      </View>
      <Text style={[s.note, { color: tokens.muted }]}>* Estimativa baseada em média de 3–4 locações/mês. Resultados variam conforme demanda local.</Text>

      {/* Simulador interativo */}
      <Text style={[s.h3, { color: headingColor, marginTop: 24 }]}>Descubra quanto você pode ganhar</Text>
      <View style={[s.searchWrap, { borderColor: tokens.border }]}>
        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={tokens.muted} strokeWidth={2} strokeLinecap="round" style={s.searchIcon}>
          <Circle cx="11" cy="11" r="8" />
          <Path d="m21 21-4.35-4.35" />
        </Svg>
        <TextInput
          value={query}
          onChangeText={(v) => { setQuery(v); setActiveChip(null) }}
          placeholder="Ex: Furadeira, Projetor, Caixa de Som..."
          placeholderTextColor="#94A3B8"
          style={[s.searchInput, { color: tokens.text }]}
          accessibilityLabel="Digite o nome do item que você quer anunciar"
        />
      </View>

      <View style={s.chipsRow}>
        {CHIPS.map((chip) => {
          const active = activeChip === chip
          return (
            <TouchableOpacity
              key={chip}
              onPress={() => { setActiveChip(chip); setQuery(CHIP_KEYWORD_MAP[chip] ?? chip.toLowerCase()) }}
              style={[
                s.chip,
                { borderColor: tokens.border },
                active && { borderColor: "#007B3C", backgroundColor: tintGreenBg80 },
              ]}
              accessibilityRole="button"
            >
              <Text style={[s.chipText, { color: tokens.text }, active && s.chipTextActive]}>{chip}</Text>
            </TouchableOpacity>
          )
        })}
      </View>

      <View style={s.outputWrap} accessibilityRole="none">
        {result ? (
          <View style={[s.outputResult, { borderColor: tintGreenBorder, backgroundColor: tintGreenBg60 }]}>
            <Text style={[s.outputLabel, { color: tokens.muted }]}>Potencial de renda:</Text>
            <Text style={s.outputValue}>
              R$ {result.rangeMin} a R$ {result.rangeMax}<Text style={s.outputUnit}>/mês</Text>
            </Text>
            <Text style={[s.outputSub, { color: tokens.muted }]}>
              {result.label} · Demanda{" "}
              {/* #007B3C (brand, preserved) e #C2410C (sem token dark — contraste aceitável em dark) */}
              <Text style={{ fontWeight: "700", color: result.demand === "alta" ? "#007B3C" : "#C2410C" }}>
                {result.demand === "alta" ? "alta" : "moderada"}
              </Text>{" "}na região
            </Text>
          </View>
        ) : query.trim() ? (
          <View style={[s.outputEmpty, { borderColor: tokens.border, backgroundColor: tokens.bg }]}>
            <Text style={[s.outputEmptyText, { color: tokens.muted }]}>Não temos dados para esse item ainda — mas você pode anunciá-lo!</Text>
          </View>
        ) : (
          <View style={s.outputIdle}>
            <Svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke={tokens.border} strokeWidth={1.5} strokeLinecap="round" style={{ marginBottom: 10 }}>
              <Circle cx="12" cy="12" r="10" />
              <Path d="M12 6v2m0 8v2M9.5 9.5a2.5 2.5 0 0 1 5 0c0 1.5-2.5 3-2.5 3" />
            </Svg>
            <Text style={[s.outputEmptyText, { color: tokens.muted }]}>Selecione um item acima ou digite o nome</Text>
          </View>
        )}
      </View>

      <TouchableOpacity style={s.cta} onPress={() => router.push("/itens/novo")} accessibilityRole="button">
        <Text style={s.ctaText}>CADASTRAR MEU ITEM AGORA</Text>
      </TouchableOpacity>
    </View>
  )
}

const s = StyleSheet.create({
  section: { backgroundColor: "#FFFFFF", padding: 20 },
  header: { marginBottom: 24, alignItems: "center" },
  title: { fontSize: 20, fontFamily: "Montserrat_700Bold", color: "#003366", textAlign: "center", marginBottom: 6 },
  subtitle: { fontSize: 14, color: "#64748B", textAlign: "center" },
  h3: { fontSize: 15, fontFamily: "Montserrat_700Bold", color: "#003366", marginBottom: 12 },
  table: { borderTopWidth: 0 },
  tableHeadRow: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 2, borderBottomColor: "#E2E8F0", paddingBottom: 8, marginBottom: 4 },
  tableHeadCell: { fontSize: 10, fontWeight: "700", color: "#64748B", textTransform: "uppercase", letterSpacing: 0.5 },
  tableRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#E2E8F0" },
  tableRowHighlight: { backgroundColor: "#D1FAE580" },
  tableRowLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  tableRowName: { fontSize: 13, fontWeight: "500", color: "#0F172A" },
  tableRowValue: { fontSize: 13, fontWeight: "800", color: "#007B3C" },
  note: { fontSize: 11, color: "#64748B", marginTop: 10, lineHeight: 16 },
  searchWrap: { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 8, paddingHorizontal: 12, minHeight: 44 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: "#0F172A", padding: 0 },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  chip: { minHeight: 44, borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 999, paddingHorizontal: 14, alignItems: "center", justifyContent: "center" },
  chipActive: { borderColor: "#007B3C", backgroundColor: "#D1FAE580" },
  chipText: { fontSize: 14, fontWeight: "500", color: "#0F172A" },
  chipTextActive: { color: "#007B3C" },
  outputWrap: { marginTop: 16 },
  outputResult: { borderWidth: 1.5, borderColor: "#86EFAC", backgroundColor: "#D1FAE560", borderRadius: 12, padding: 20, alignItems: "center" },
  outputLabel: { fontSize: 13, fontWeight: "600", color: "#64748B", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  outputValue: { fontSize: 26, fontFamily: "Montserrat_800ExtraBold", color: "#007B3C", marginBottom: 6 },
  outputUnit: { fontSize: 14 },
  outputSub: { fontSize: 13, color: "#64748B", textAlign: "center" },
  outputEmpty: { borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC", borderRadius: 12, padding: 20, alignItems: "center" },
  outputEmptyText: { fontSize: 13, color: "#64748B", textAlign: "center" },
  outputIdle: { paddingVertical: 24, alignItems: "center" },
  cta: { marginTop: 20, backgroundColor: "#007B3C", borderRadius: 8, minHeight: 48, alignItems: "center", justifyContent: "center" },
  ctaText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700", letterSpacing: 0.4 },
})
