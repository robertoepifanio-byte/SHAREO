// Fonte: components/home/landing/Hero.tsx (site)
import React from "react"
import { View, Text, Image, StyleSheet } from "react-native"
import { useTheme } from "@/lib/theme"
import { PrelaunchBadge } from "../PrelaunchBadge"
import { UiIcon } from "../UiIcon"
import { CtaCadastro } from "./CtaCadastro"
import { HERO_BENEFICIOS, CTA_MICROCOPY } from "@/lib/landing-content"

const ALT_HERO =
  "Furadeira, câmera, caixa de som, projetor, bicicleta, escada e um carro " +
  "em volta de uma seta circular, ilustrando o caminho de um item parado até " +
  "virar renda extra."

export function Hero() {
  const { tokens } = useTheme()
  return (
    <View style={[s.section, { backgroundColor: tokens.navyDeep }]}>
      <PrelaunchBadge />

      <Text style={s.h1}>
        {"Tem algo parado?\n"}
        <Text style={s.h1Accent}>Faça isso virar dinheiro.</Text>
      </Text>

      <Text style={s.lead}>
        O ShareO vai conectar pessoas que têm coisas sem uso com{" "}
        <Text style={s.leadAccent}>quem precisa delas</Text> — perto de você, de forma
        simples e segura.
      </Text>

      <View style={s.beneficios}>
        {HERO_BENEFICIOS.map((b) => (
          <View key={b.titulo} style={s.beneficio}>
            <View style={s.beneficioIcon}>
              <UiIcon name={b.icone} color="#59C686" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.beneficioTitulo}>{b.titulo}</Text>
              <Text style={s.beneficioTexto}>{b.texto}</Text>
            </View>
          </View>
        ))}
      </View>

      <CtaCadastro>Quero ser um dos primeiros</CtaCadastro>
      <Text style={s.microcopy}>{CTA_MICROCOPY}</Text>

      <Image
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        source={require("../../../assets/campanha-hero.webp")}
        style={s.image}
        resizeMode="contain"
        accessibilityLabel={ALT_HERO}
      />
    </View>
  )
}

const s = StyleSheet.create({
  section: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 32, gap: 4 },
  h1: { fontSize: 30, fontFamily: "Montserrat_800ExtraBold", lineHeight: 34, color: "#FFFFFF", marginBottom: 12 },
  h1Accent: { color: "#59C686" },
  lead: { fontSize: 15, lineHeight: 22, color: "rgba(255,255,255,0.85)", marginBottom: 24 },
  leadAccent: { color: "#59C686", fontWeight: "600" },
  beneficios: { gap: 20, marginBottom: 28 },
  beneficio: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  beneficioIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,123,60,0.3)", alignItems: "center", justifyContent: "center" },
  beneficioTitulo: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  beneficioTexto: { fontSize: 12, lineHeight: 17, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  microcopy: { fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 12, marginBottom: 24 },
  image: { width: "100%", height: 176, borderRadius: 12 },
})
