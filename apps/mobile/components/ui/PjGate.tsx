// Fonte: apps/mobile/app/meus-anuncios/integracoes.tsx (linhas 353-361 + estilos 732-741)
//
// Componente reutilizável que exibe um card "gate" para funcionalidades exclusivas PJ.
// Transcrição literal do bloco inline de integracoes.tsx — sem invenção de UX.

import React from "react"
import { View, Text, StyleSheet } from "react-native"
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
      <Text style={[s.gateTitle, { color: tokens.navy }]}>{title}</Text>
      <Text style={[s.gateDesc,  { color: tokens.muted }]}>{description}</Text>
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
  },
  gateTitle: { fontSize: 16, fontWeight: "700" },
  gateDesc:  { fontSize: 14, lineHeight: 20 },
})
