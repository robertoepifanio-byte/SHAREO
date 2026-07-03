// Fonte: components/home/CasosRenda.tsx
// Transcrição literal — cards de depoimento ilustrativos.

import React from "react"
import { View, Text, StyleSheet } from "react-native"

const CASES = [
  { initial: "C", name: "Carlos Souza", role: "Proprietário · São Paulo, SP", item: "Furadeira Bosch", itemEmoji: "🔧", renda: "R$ 135", highlight: false,
    quote: "Minha furadeira ficava meses parada. Agora ela 'trabalha' por mim todo fim de semana." },
  { initial: "F", name: "Fernanda Lima", role: "Proprietária · Belo Horizonte, MG", item: "Caixa de Som JBL", itemEmoji: "🔊", renda: "R$ 420", highlight: true,
    quote: "Não acreditei quando fiz a primeira locação. Agora é minha renda extra mais consistente." },
  { initial: "M", name: "Marcos Silva", role: "Proprietário · Curitiba, PR", item: "Projetor Epson Full HD", itemEmoji: "📽️", renda: "R$ 280", highlight: false,
    quote: "Tenho 8 itens anunciados e já ganhei mais de R$2.000 este mês. O ShareO virou renda real." },
]

export function CasosRenda() {
  return (
    <View style={s.section}>
      <Text style={s.title}>Quem já está ganhando</Text>
      <Text style={s.subtitle}>Veja o potencial de quem transforma itens parados em renda extra.</Text>

      {CASES.map((c) => (
        <View key={c.name} style={s.card}>
          <View style={s.cardHeader}>
            <View style={s.avatar}><Text style={s.avatarText}>{c.initial}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{c.name}</Text>
              <Text style={s.role}>{c.role}</Text>
            </View>
            <View style={[s.rendaBadge, c.highlight && s.rendaBadgeHighlight]}>
              <Text style={s.rendaValue}>{c.renda}<Text style={s.rendaUnit}>/mês</Text></Text>
            </View>
          </View>

          <View style={s.itemChip}>
            <Text>{c.itemEmoji}</Text>
            <Text style={s.itemChipText}>{c.item}</Text>
          </View>

          <Text style={s.quote}>&ldquo;{c.quote}&rdquo;</Text>
          <Text style={s.stars}>★★★★★</Text>
        </View>
      ))}

      <Text style={s.disclaimer}>
        Personagens e valores ilustrativos, baseados em estimativas de uso típico
        (3–4 locações/mês). Resultados reais variam conforme o item, a demanda e a região.
      </Text>
    </View>
  )
}

const s = StyleSheet.create({
  section: { backgroundColor: "#F1F5F9", padding: 20 },
  title: { fontSize: 20, fontFamily: "Montserrat_700Bold", color: "#003366", marginBottom: 4 },
  subtitle: { fontSize: 14, color: "#64748B", marginBottom: 16 },
  card: { backgroundColor: "#144D81", borderRadius: 16, padding: 20, marginBottom: 12, gap: 10 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#007B3C", alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  name: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  role: { color: "rgba(255,255,255,0.8)", fontSize: 12 },
  rendaBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: "rgba(0,123,60,0.3)", borderWidth: 1, borderColor: "rgba(89,198,134,0.4)" },
  rendaBadgeHighlight: { backgroundColor: "rgba(0,123,60,0.5)", borderColor: "rgba(89,198,134,0.6)" },
  rendaValue: { color: "#FFFFFF", fontSize: 17, fontFamily: "Montserrat_800ExtraBold" },
  rendaUnit: { fontSize: 11, fontWeight: "500", color: "rgba(255,255,255,0.9)" },
  itemChip: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, alignSelf: "flex-start" },
  itemChipText: { color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: "600" },
  quote: { color: "rgba(255,255,255,0.9)", fontSize: 13, fontStyle: "italic", lineHeight: 19 },
  stars: { color: "#59C686", fontSize: 13 },
  disclaimer: { fontSize: 11, color: "#64748B", lineHeight: 16, marginTop: 4 },
})
