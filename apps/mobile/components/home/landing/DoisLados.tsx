// Fonte: components/home/landing/DoisLados.tsx (site)
import React from "react"
import { View, Text, Image, StyleSheet } from "react-native"
import { useTheme } from "@/lib/theme"
import { UiIcon } from "../UiIcon"
import { CtaCadastro } from "./CtaCadastro"
import { DOIS_LADOS } from "@/lib/landing-content"

const ESTILO_LADO = {
  proprietario: { titulo: "#007B3C", selo: "#007B3C", variante: "solido" as const, icone: "moeda" as const, imagem: require("../../../assets/campanha-lado-proprietario.webp") },
  locatario: { titulo: "#144D81", selo: "#144D81", variante: "azul" as const, icone: "local" as const, imagem: require("../../../assets/campanha-lado-locatario.webp") },
}

export function DoisLados() {
  const { tokens } = useTheme()
  return (
    <View style={[s.section, { backgroundColor: tokens.bg }]}>
      <Text style={[s.titulo, { color: tokens.navy }]}>Você está de qual lado?</Text>

      {DOIS_LADOS.map((item) => {
        const estilo = ESTILO_LADO[item.lado]
        return (
          <View key={item.lado} style={[s.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
            <Image source={estilo.imagem} style={s.image} resizeMode="cover" accessibilityLabel={item.altFoto} />
            <View style={s.cardBody}>
              <View style={s.cardHeader}>
                <View style={[s.selo, { backgroundColor: estilo.selo }]}>
                  <UiIcon name={estilo.icone} size={20} color="#FFFFFF" />
                </View>
                <Text style={[s.cardTitulo, { color: estilo.titulo }]}>{item.titulo}</Text>
              </View>
              <Text style={[s.cardTexto, { color: tokens.muted }]}>{item.texto}</Text>
              <CtaCadastro variante={estilo.variante} larguraTotal>{item.cta}</CtaCadastro>
            </View>
          </View>
        )
      })}
    </View>
  )
}

const s = StyleSheet.create({
  section: { paddingHorizontal: 20, paddingVertical: 32, gap: 20 },
  titulo: { fontSize: 22, fontFamily: "Montserrat_800ExtraBold", lineHeight: 27 },
  card: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  image: { width: "100%", height: 160 },
  cardBody: { padding: 20, gap: 12 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  selo: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  cardTitulo: { fontSize: 17, fontFamily: "Montserrat_800ExtraBold", flexShrink: 1 },
  cardTexto: { fontSize: 14, lineHeight: 20 },
})
