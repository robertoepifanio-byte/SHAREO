// Fonte: components/home/landing/QuantoVale.tsx (site)
import React from "react"
import { View, Text, StyleSheet } from "react-native"
import { useTheme } from "@/lib/theme"
import { ProcuradoIcon } from "../ProcuradoIcon"
import { CtaCadastro } from "./CtaCadastro"
import { PRECOS, PRECOS_DISCLAIMER } from "@/lib/landing-content"

export function QuantoVale() {
  const { tokens } = useTheme()
  return (
    <View style={[s.section, { backgroundColor: tokens.bg }]}>
      <Text style={[s.titulo, { color: tokens.navy }]}>Quanto vale o que está parado?</Text>
      <Text style={[s.paragrafo, { color: tokens.muted }]}>
        Seu item pode estar parado. Seu dinheiro não precisa estar.
      </Text>
      <Text style={[s.chamada, { color: tokens.green }]}>Veja alguns exemplos:</Text>

      <CtaCadastro style={{ marginBottom: 24 }}>Quero anunciar meu item</CtaCadastro>

      <View style={s.grid}>
        {PRECOS.map((categoria) => (
          <View key={categoria.slug} style={[s.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
            <ProcuradoIcon name={categoria.icone} size={28} color={tokens.navy} />
            <Text style={[s.cardNome, { color: tokens.text }]}>{categoria.nome}</Text>
            <Text style={[s.cardExemplos, { color: tokens.muted }]}>{categoria.exemplos}</Text>
            <Text style={[s.cardPreco, { color: tokens.green }]}>
              cerca de R$ {categoria.diaria}
              <Text style={[s.cardPrecoUnidade, { color: tokens.muted }]}>/dia</Text>
            </Text>
          </View>
        ))}
      </View>

      <Text style={[s.disclaimer, { color: tokens.muted }]}>{PRECOS_DISCLAIMER}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  section: { paddingHorizontal: 20, paddingVertical: 32 },
  titulo: { fontSize: 22, fontFamily: "Montserrat_800ExtraBold", lineHeight: 27, marginBottom: 16 },
  paragrafo: { fontSize: 15, lineHeight: 22, marginBottom: 4 },
  chamada: { fontSize: 15, fontWeight: "600", marginBottom: 20 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  card: { width: "47%", borderRadius: 12, borderWidth: 1, padding: 14, gap: 4 },
  cardNome: { fontSize: 14, fontWeight: "700" },
  cardExemplos: { fontSize: 11, lineHeight: 15 },
  cardPreco: { fontSize: 16, fontFamily: "Montserrat_800ExtraBold", marginTop: 6 },
  cardPrecoUnidade: { fontSize: 11, fontWeight: "700" },
  disclaimer: { fontSize: 11, lineHeight: 16 },
})
