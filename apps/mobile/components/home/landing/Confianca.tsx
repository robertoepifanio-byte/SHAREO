// Fonte: components/home/landing/Confianca.tsx (site)
import React from "react"
import { View, Text, StyleSheet } from "react-native"
import { useTheme } from "@/lib/theme"
import { UiIcon } from "../UiIcon"
import { PILARES } from "@/lib/landing-content"

export function Confianca() {
  const { tokens } = useTheme()
  return (
    <View style={[s.section, { backgroundColor: tokens.navyDeep }]}>
      <Text style={s.titulo}>E se eu emprestar meu item para um desconhecido?</Text>
      <Text style={s.lead}>
        O ShareO está sendo desenhado para tornar essa experiência mais segura e transparente
        para os dois lados.
      </Text>

      {PILARES.map((pilar) => (
        <View key={pilar.titulo} style={s.card}>
          <View style={s.icon}>
            <UiIcon name={pilar.icone} size={22} color="#59C686" />
          </View>
          <Text style={s.cardTitulo}>{pilar.titulo}</Text>
          <Text style={s.cardTexto}>{pilar.texto}</Text>
        </View>
      ))}
    </View>
  )
}

const s = StyleSheet.create({
  section: { paddingHorizontal: 20, paddingVertical: 32, gap: 4 },
  titulo: { fontSize: 22, fontFamily: "Montserrat_800ExtraBold", color: "#FFFFFF", lineHeight: 27, marginBottom: 8 },
  lead: { fontSize: 15, lineHeight: 22, color: "rgba(255,255,255,0.85)", marginBottom: 20 },
  card: { borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", backgroundColor: "rgba(255,255,255,0.07)", padding: 16, marginBottom: 12, gap: 6 },
  icon: { width: 44, height: 44, borderRadius: 10, backgroundColor: "rgba(0,123,60,0.3)", alignItems: "center", justifyContent: "center" },
  cardTitulo: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  cardTexto: { fontSize: 12, lineHeight: 17, color: "rgba(255,255,255,0.75)" },
})
