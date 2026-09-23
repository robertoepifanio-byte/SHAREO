// Fonte: components/home/landing/ComoFunciona.tsx (site)
import React from "react"
import { View, Text, StyleSheet } from "react-native"
import { useTheme } from "@/lib/theme"
import { TRILHAS } from "@/lib/landing-content"

const COR = { tem: "#007B3C", precisa: "#144D81" }

export function ComoFunciona() {
  const { tokens } = useTheme()
  return (
    <View style={[s.section, { backgroundColor: tokens.navyDeep }]}>
      <Text style={s.titulo}>Como vai funcionar</Text>
      <Text style={s.lead}>É simples. Você tem algo. Alguém precisa. O ShareO conecta os dois.</Text>

      {(["tem", "precisa"] as const).map((chave) => {
        const trilha = TRILHAS[chave]
        const cor = COR[chave]
        return (
          <View key={chave} style={s.trilha}>
            <View style={[s.etiqueta, { backgroundColor: cor }]}>
              <Text style={s.etiquetaTexto}>{trilha.etiqueta}</Text>
            </View>

            {trilha.passos.map((passo, indice) => (
              <View key={passo.titulo} style={s.passo}>
                <View style={[s.numero, { backgroundColor: cor }]}>
                  <Text style={s.numeroTexto}>{indice + 1}</Text>
                </View>
                <Text style={s.passoTitulo}>{passo.titulo}</Text>
                <Text style={s.passoTexto}>{passo.texto}</Text>
              </View>
            ))}
          </View>
        )
      })}
    </View>
  )
}

const s = StyleSheet.create({
  section: { paddingHorizontal: 20, paddingVertical: 32, gap: 4 },
  titulo: { fontSize: 22, fontFamily: "Montserrat_800ExtraBold", color: "#FFFFFF", marginBottom: 8 },
  lead: { fontSize: 15, lineHeight: 22, color: "rgba(255,255,255,0.85)", marginBottom: 24 },
  trilha: { borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", backgroundColor: "rgba(255,255,255,0.07)", padding: 20, marginBottom: 16, gap: 16 },
  etiqueta: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 4 },
  etiquetaTexto: { fontSize: 11, fontWeight: "700", color: "#FFFFFF", textTransform: "uppercase", letterSpacing: 0.6 },
  passo: { gap: 4 },
  numero: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  numeroTexto: { fontSize: 13, fontFamily: "Montserrat_800ExtraBold", color: "#FFFFFF" },
  passoTitulo: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  passoTexto: { fontSize: 12, lineHeight: 17, color: "rgba(255,255,255,0.75)" },
})
