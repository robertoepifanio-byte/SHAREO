// Fonte: components/home/landing/Fechamento.tsx (site) — troca o form
// (ListaVIP) por um CTA de Cadastro, a mesma decisão do site (22/09/2026).
import React from "react"
import { View, Text, Image, StyleSheet } from "react-native"
import { useTheme } from "@/lib/theme"
import { CtaCadastro } from "./CtaCadastro"

export function Fechamento() {
  const { tokens } = useTheme()
  return (
    <View style={[s.section, { backgroundColor: tokens.navyDeep }]}>
      <Image
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        source={require("../../../assets/campanha-cidade.webp")}
        style={s.image}
        resizeMode="cover"
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <Text style={s.titulo}>
        O que está parado na sua casa pode estar sendo procurado por alguém perto de você.
      </Text>
      <CtaCadastro>Quero me cadastrar</CtaCadastro>
    </View>
  )
}

const s = StyleSheet.create({
  section: { paddingHorizontal: 20, paddingVertical: 32, position: "relative", overflow: "hidden" },
  image: { position: "absolute", left: 0, right: 0, bottom: 0, width: "100%", height: 80, opacity: 0.4 },
  titulo: { fontSize: 20, fontFamily: "Montserrat_800ExtraBold", lineHeight: 25, color: "#FFFFFF", marginBottom: 20 },
})
