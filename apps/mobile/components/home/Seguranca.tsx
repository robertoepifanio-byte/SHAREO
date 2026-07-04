// Fonte: components/home/Seguranca.tsx
// Transcrição literal — 3 pilares de segurança. Taxa/teto vêm de /api/stats
// (nunca hardcode — mesma regra do getPlatformFeeRate() do site).

import React from "react"
import { View, Text, TouchableOpacity, StyleSheet, Linking } from "react-native"
import { Image } from "expo-image"
import Svg, { Polyline, Path } from "react-native-svg"
import { API_URL } from "@/lib/api"
import { useTheme } from "@/lib/theme"

const LockIcon = <Image source={require("../../assets/icons/cadeado-shareo.png")} style={{ width: 28, height: 28 }} contentFit="contain" accessibilityLabel="" />
const CheckIcon = <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#007B3C" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><Polyline points="20 6 9 17 4 12" /></Svg>
const ShieldIcon = (
  <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#007B3C" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <Path d="M9 12l2 2 4-4" />
  </Svg>
)

export function Seguranca({ feeRate, checkoutMaxCents }: { feeRate: number | null; checkoutMaxCents: number | null }) {
  const { tokens, mode } = useTheme()
  // #D1FAE5 (green-100 tint) — sem token direto; tint decorativo para wrap de ícone
  const iconWrapBg = mode === "dark" ? "rgba(0,123,60,0.25)" : "#D1FAE5"

  const feePct = feeRate != null ? (feeRate / 100).toLocaleString("pt-BR") : "…"
  const maxBRL = checkoutMaxCents != null ? (checkoutMaxCents / 100).toLocaleString("pt-BR") : "…"

  const pillars = [
    {
      title: "Pagamento protegido", icon: LockIcon,
      bullets: [
        "Você só paga depois que o proprietário confirma a reserva.",
        "O valor fica retido na plataforma até o repasse semanal via PIX — toda segunda-feira.",
        `Taxa transparente de ${feePct}% e limite de R$ ${maxBRL} por locação no MVP.`,
      ],
    },
    {
      title: "Usuários verificados", icon: CheckIcon,
      bullets: [
        "Cadastro com CPF/CNPJ e verificação de e-mail e celular.",
        "Avaliações públicas após cada locação — você sabe com quem negocia.",
      ],
    },
    {
      title: "Proteção em caso de dano", icon: ShieldIcon,
      bullets: [
        "Fotos de check-in e check-out ficam vinculadas a cada reserva.",
        "Disputa com mediação da nossa equipe em até 5 dias úteis.",
        "O repasse ao proprietário fica suspenso até a resolução.",
      ],
    },
  ]

  return (
    <View style={[s.section, { backgroundColor: tokens.surface }]}>
      <Text style={[s.title, { color: mode === "dark" ? tokens.text : "#003366" }]}>Alugue e anuncie com segurança</Text>
      <Text style={[s.subtitle, { color: tokens.muted }]}>Cada transação é protegida pela plataforma do início ao fim.</Text>

      {pillars.map((p) => (
        <View key={p.title} style={[s.card, { borderColor: tokens.border, backgroundColor: tokens.bg }]}>
          <View style={[s.iconWrap, { backgroundColor: iconWrapBg }]}>{p.icon}</View>
          <Text style={[s.cardTitle, { color: mode === "dark" ? tokens.text : "#003366" }]}>{p.title}</Text>
          {p.bullets.map((b) => (
            <View key={b} style={s.bulletRow}>
              <Text style={s.bulletCheck}>✓</Text>
              <Text style={[s.bulletText, { color: tokens.muted }]}>{b}</Text>
            </View>
          ))}
        </View>
      ))}

      {/* Sem tela nativa equivalente a /seguranca — abre a página real do site */}
      <TouchableOpacity onPress={() => Linking.openURL(`${API_URL}/seguranca`)} accessibilityRole="link">
        <Text style={[s.footer, { color: tokens.muted }]}>
          Quer os detalhes técnicos? <Text style={s.footerLink}>Veja como protegemos seus dados</Text>.
        </Text>
      </TouchableOpacity>
    </View>
  )
}

const s = StyleSheet.create({
  section: { backgroundColor: "#FFFFFF", padding: 20 },
  title: { fontSize: 20, fontFamily: "Montserrat_700Bold", color: "#003366", textAlign: "center", marginBottom: 6 },
  subtitle: { fontSize: 14, color: "#64748B", textAlign: "center", marginBottom: 20 },
  card: { alignItems: "center", gap: 10, borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC", borderRadius: 12, padding: 20, marginBottom: 14 },
  iconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#D1FAE5", alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 15, fontFamily: "Montserrat_700Bold", color: "#003366", textAlign: "center" },
  bulletRow: { flexDirection: "row", gap: 6, alignSelf: "stretch" },
  bulletCheck: { color: "#007B3C", fontSize: 13, marginTop: 1 },
  bulletText: { flex: 1, fontSize: 13, color: "#64748B", lineHeight: 19 },
  footer: { fontSize: 13, color: "#64748B", textAlign: "center", marginTop: 8 },
  footerLink: { fontWeight: "600", color: "#007B3C", textDecorationLine: "underline" },
})
