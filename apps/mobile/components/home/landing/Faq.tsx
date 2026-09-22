// Fonte: components/home/landing/Faq.tsx (site)
// <details>/<summary> do site vira estado local (useState) no app.
import React, { useState } from "react"
import { View, Text, Pressable, StyleSheet } from "react-native"
import { useTheme } from "@/lib/theme"
import { UiIcon } from "../UiIcon"
import { CtaCadastro } from "./CtaCadastro"
import { CTA_MICROCOPY, FAQ } from "@/lib/landing-content"

export function Faq() {
  const { tokens } = useTheme()
  const [aberto, setAberto] = useState<string | null>(null)

  return (
    <View style={[s.section, { backgroundColor: tokens.bg }]}>
      <Text style={[s.titulo, { color: tokens.navy }]}>Perguntas frequentes</Text>
      <Text style={[s.subtitulo, { color: tokens.muted }]}>Ainda ficou com alguma dúvida?</Text>

      {FAQ.map((item) => {
        const open = aberto === item.p
        return (
          <View key={item.p} style={[s.item, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
            <Pressable
              onPress={() => setAberto(open ? null : item.p)}
              accessibilityRole="button"
              accessibilityLabel={item.p}
              accessibilityState={{ expanded: open }}
              style={s.pergunta}
            >
              <Text style={[s.perguntaTexto, { color: tokens.text }]}>{item.p}</Text>
              <View style={{ transform: [{ rotate: open ? "45deg" : "0deg" }] }}>
                <UiIcon name="mais" size={18} color={tokens.green} />
              </View>
            </Pressable>
            {open && <Text style={[s.resposta, { color: tokens.muted }]}>{item.r}</Text>}
          </View>
        )
      })}

      <View style={[s.aside, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
        <Text style={[s.asideTitulo, { color: tokens.navy }]}>Estamos começando agora.</Text>
        <Text style={[s.asideTexto, { color: tokens.muted }]}>
          E queremos você entre os primeiros. Entrar na lista leva menos de um minuto.
        </Text>
        <CtaCadastro larguraTotal>Quero ser um fundador</CtaCadastro>
        <Text style={[s.microcopy, { color: tokens.muted }]}>{CTA_MICROCOPY}</Text>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  section: { paddingHorizontal: 20, paddingVertical: 32 },
  titulo: { fontSize: 20, fontFamily: "Montserrat_800ExtraBold", marginBottom: 4 },
  subtitulo: { fontSize: 14, marginBottom: 16 },
  item: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, marginBottom: 10 },
  pergunta: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingVertical: 12 },
  perguntaTexto: { fontSize: 14, fontWeight: "700", flex: 1 },
  resposta: { fontSize: 13, lineHeight: 19, paddingBottom: 14 },
  aside: { borderRadius: 16, borderWidth: 1, padding: 20, marginTop: 8 },
  asideTitulo: { fontSize: 17, fontFamily: "Montserrat_800ExtraBold", marginBottom: 8 },
  asideTexto: { fontSize: 13, lineHeight: 19, marginBottom: 16 },
  microcopy: { fontSize: 11, marginTop: 12 },
})
