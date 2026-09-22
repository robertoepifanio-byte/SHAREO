// Fonte: components/home/landing/Fundadores.tsx (site)
import React from "react"
import { View, Text, StyleSheet } from "react-native"
import { useTheme } from "@/lib/theme"
import { UiIcon } from "../UiIcon"
import { CtaCadastro } from "./CtaCadastro"
import { FUNDADORES_BENEFICIOS, FUNDADORES_CHAMADA, FUNDADORES_VAGAS } from "@/lib/landing-content"

export function Fundadores() {
  const { tokens } = useTheme()
  return (
    <View style={[s.section, { backgroundColor: tokens.bg }]}>
      <View style={[s.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
        <View style={s.icon}>
          <UiIcon name="foguete" size={26} color={tokens.green} />
        </View>

        <Text style={[s.titulo, { color: tokens.navy }]}>Faça parte do grupo fundador do ShareO</Text>
        <Text style={[s.chamada, { color: tokens.muted }]}>{FUNDADORES_CHAMADA}</Text>
        <Text style={[s.vagas, { color: tokens.text }]}>
          São {FUNDADORES_VAGAS.toLocaleString("pt-BR")} vagas para os primeiros usuários a entrar
          na lista.
        </Text>

        <CtaCadastro style={{ marginBottom: 24 }}>Quero ser um fundador</CtaCadastro>

        <Text style={[s.subtitulo, { color: tokens.muted }]}>Você vai ter</Text>
        {FUNDADORES_BENEFICIOS.map((beneficio) => (
          <View key={beneficio} style={s.beneficio}>
            <View style={[s.check, { backgroundColor: tokens.bg }]}>
              <UiIcon name="check" size={13} color={tokens.green} />
            </View>
            <Text style={[s.beneficioTexto, { color: tokens.text }]}>{beneficio}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  section: { paddingHorizontal: 20, paddingVertical: 32 },
  card: { borderRadius: 16, borderWidth: 1, padding: 20, gap: 4 },
  icon: { width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(0,123,60,0.1)", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  titulo: { fontSize: 20, fontFamily: "Montserrat_800ExtraBold", lineHeight: 25, marginBottom: 8 },
  chamada: { fontSize: 14, lineHeight: 20, marginBottom: 8 },
  vagas: { fontSize: 14, fontWeight: "600", marginBottom: 20 },
  subtitulo: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 12 },
  beneficio: { flexDirection: "row", gap: 10, alignItems: "flex-start", marginBottom: 10 },
  check: { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", marginTop: 1 },
  beneficioTexto: { fontSize: 13, lineHeight: 19, flex: 1 },
})
