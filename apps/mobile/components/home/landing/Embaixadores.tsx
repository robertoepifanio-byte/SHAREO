// Fonte: components/home/landing/Embaixadores.tsx (site)
import React from "react"
import { View, Text, StyleSheet } from "react-native"
import { useTheme } from "@/lib/theme"
import { EMBAIXADORES_NOTA, EMBAIXADOR_TIERS } from "@/lib/landing-content"

export function Embaixadores() {
  const { tokens } = useTheme()
  return (
    <View style={[s.section, { backgroundColor: tokens.bg }]}>
      <Text style={[s.titulo, { color: tokens.navy }]}>Indique um amigo e seja um Embaixador</Text>
      <Text style={[s.lead, { color: tokens.muted }]}>
        Quando a plataforma abrir, quem convidar amigos vai receber uma parte da comissão das
        locações de quem indicou. Quanto mais indicados ativos, maior a faixa.
      </Text>

      <View style={s.grid}>
        {EMBAIXADOR_TIERS.map((tier) => (
          <View key={tier.nome} style={[s.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
            <Text style={[s.nome, { color: tokens.muted }]}>{tier.nome.toUpperCase()}</Text>
            <Text style={[s.percentual, { color: tokens.green }]}>{tier.percentual}%</Text>
            <Text style={[s.faixa, { color: tokens.muted }]}>{tier.faixa}</Text>
          </View>
        ))}
      </View>

      <Text style={[s.nota, { color: tokens.muted }]}>{EMBAIXADORES_NOTA}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  section: { paddingHorizontal: 20, paddingVertical: 32 },
  titulo: { fontSize: 20, fontFamily: "Montserrat_800ExtraBold", lineHeight: 25, marginBottom: 8 },
  lead: { fontSize: 14, lineHeight: 20, marginBottom: 20 },
  grid: { flexDirection: "row", gap: 8, marginBottom: 16 },
  card: { flex: 1, borderRadius: 12, borderWidth: 1, padding: 14, alignItems: "center" },
  nome: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  percentual: { fontSize: 26, fontFamily: "Montserrat_800ExtraBold", marginBottom: 2 },
  faixa: { fontSize: 10, textAlign: "center" },
  nota: { fontSize: 11, lineHeight: 16 },
})
