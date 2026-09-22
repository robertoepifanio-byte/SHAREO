// Fonte: components/home/landing/ItensParados.tsx (site)
import React from "react"
import { View, Text, StyleSheet } from "react-native"
import { useTheme } from "@/lib/theme"
import { ProcuradoIcon } from "../ProcuradoIcon"
import { CATEGORIAS_EXTRA_ROTULO, ITENS_PARADOS_EXEMPLOS, PRECOS } from "@/lib/landing-content"

export function ItensParados() {
  const { tokens } = useTheme()
  return (
    <View style={[s.section, { backgroundColor: tokens.bg }]}>
      <Text style={[s.titulo, { color: tokens.navy }]}>
        Quantas coisas você tem que ficam <Text style={{ color: tokens.green }}>paradas</Text> a
        maior parte do tempo?
      </Text>

      <Text style={[s.exemplos, { color: tokens.text }]}>{ITENS_PARADOS_EXEMPLOS}</Text>

      <Text style={[s.paragrafo, { color: tokens.muted }]}>
        Você comprou. Usou algumas vezes. E agora…{" "}
        <Text style={{ color: tokens.green, fontWeight: "700" }}>está parado.</Text>
      </Text>

      <Text style={[s.paragrafo, { color: tokens.muted }]}>
        Enquanto isso, alguém perto de você pode estar precisando exatamente desse item.
      </Text>

      <Text style={[s.paragrafoForte, { color: tokens.text }]}>
        O ShareO vai conectar essas duas pessoas.
      </Text>

      <View style={s.grid}>
        {PRECOS.map((categoria) => (
          <View key={categoria.slug} style={[s.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
            <ProcuradoIcon name={categoria.icone} size={32} color={tokens.navy} />
            <Text style={[s.cardTexto, { color: tokens.text }]}>{categoria.nome}</Text>
          </View>
        ))}
        <View style={[s.card, s.cardExtra, { borderColor: tokens.border, backgroundColor: tokens.bg }]}>
          <Text style={[s.cardTexto, { color: tokens.muted }]}>{CATEGORIAS_EXTRA_ROTULO}</Text>
        </View>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  section: { paddingHorizontal: 20, paddingVertical: 32, gap: 4 },
  titulo: { fontSize: 22, fontFamily: "Montserrat_800ExtraBold", lineHeight: 27, marginBottom: 16 },
  exemplos: { fontSize: 15, fontWeight: "600", marginBottom: 8 },
  paragrafo: { fontSize: 15, lineHeight: 22, marginBottom: 8 },
  paragrafoForte: { fontSize: 15, fontWeight: "700", marginBottom: 20 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  card: {
    width: "31%",
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: 8,
  },
  cardExtra: { borderStyle: "dashed" },
  cardTexto: { fontSize: 11, fontWeight: "700", textAlign: "center" },
})
