// Fonte: apps/mobile/app/meus-anuncios/integracoes.tsx (linhas 353-361 + estilos 732-741)
//         + components/premium/PjGate.tsx (badge, CTA e rodapé — texto verbatim)
//
// Componente reutilizável que exibe um card "gate" para funcionalidades exclusivas PJ.
// Transcrição literal do bloco inline de integracoes.tsx, com o badge/CTA/rodapé
// verbatim de components/premium/PjGate.tsx (grid de benefícios do site não entra —
// é a versão desktop completa; integracoes.tsx só usava título+descrição).

import React from "react"
import { View, Text, TouchableOpacity, StyleSheet } from "react-native"
import { router } from "expo-router"
import { useTheme } from "@/lib/theme"

interface PjGateProps {
  /** Título do gate. Default: rótulo verbatim de integracoes.tsx */
  title?:       string
  /** Descrição do gate. Default: descrição verbatim de integracoes.tsx */
  description?: string
}

export function PjGate({
  title       = "Recurso exclusivo para contas PJ",
  description = "Este recurso está disponível apenas para contas de Pessoa Jurídica verificadas.",
}: PjGateProps) {
  const { tokens } = useTheme()

  return (
    <View style={[s.gateCard, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
      <View style={[s.badge, { backgroundColor: `${tokens.green}1A` }]}>
        <Text style={[s.badgeText, { color: tokens.green }]}>Exclusivo PJ</Text>
      </View>

      <Text style={[s.gateTitle, { color: tokens.navy }]}>{title}</Text>
      <Text style={[s.gateDesc,  { color: tokens.muted }]}>{description}</Text>

      <TouchableOpacity
        style={[s.cta, { backgroundColor: tokens.green }]}
        onPress={() => router.push("/perfil")}
        accessibilityRole="button"
        accessibilityLabel="Fazer upgrade para conta PJ"
      >
        <Text style={s.ctaText}>Fazer upgrade para conta PJ</Text>
      </TouchableOpacity>

      <Text style={[s.footer, { color: tokens.muted }]}>
        Vá em <Text style={[s.footerStrong, { color: tokens.text }]}>Perfil → Conta</Text> e informe seu CNPJ para ativar gratuitamente.
      </Text>
    </View>
  )
}

const s = StyleSheet.create({
  gateCard: {
    margin:       16,
    borderWidth:  1,
    borderRadius: 16,
    padding:      20,
    gap:          8,
    alignItems:   "center",
  },
  badge: {
    borderRadius:     999,
    paddingHorizontal: 12,
    paddingVertical:   4,
    marginBottom:      4,
  },
  badgeText:  { fontSize: 12, fontWeight: "700" },
  gateTitle:  { fontSize: 16, fontWeight: "700", textAlign: "center" },
  gateDesc:   { fontSize: 14, lineHeight: 20, textAlign: "center" },
  cta: {
    marginTop:         12,
    minHeight:         44,
    paddingHorizontal: 24,
    borderRadius:      8,
    alignItems:        "center",
    justifyContent:    "center",
  },
  ctaText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  footer:       { fontSize: 12, textAlign: "center", marginTop: 4 },
  footerStrong: { fontWeight: "700" },
})
