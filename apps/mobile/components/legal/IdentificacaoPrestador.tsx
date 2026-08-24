// Fonte: components/legal/IdentificacaoPrestador.tsx
//
// Transcrição literal do bloco do site: mesma ordem, mesmos rótulos, mesmas
// frases. Os dados vêm de @/lib/legalConfig (espelho de lib/legal-config.ts).

import { View, Text, StyleSheet, Linking } from "react-native"
import { useTheme } from "@/lib/theme"
import { LEGAL_ENTITY } from "@/lib/legalConfig"

export function IdentificacaoPrestador({
  papel = "prestador",
}: {
  papel?: "prestador" | "controlador"
}) {
  const { tokens } = useTheme()

  const abertura =
    papel === "controlador"
      ? "O controlador dos dados pessoais tratados nesta plataforma é:"
      : "A plataforma ShareO é operada por:"

  return (
    <View
      accessibilityLabel="Identificação da empresa responsável pela plataforma"
      style={[s.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]}
    >
      <Text style={[s.linha, { color: tokens.muted }]}>{abertura}</Text>
      <Text style={[s.razaoSocial, { color: tokens.text }]}>{LEGAL_ENTITY.razaoSocial}</Text>
      <Text style={[s.linha, { color: tokens.muted }]}>CNPJ {LEGAL_ENTITY.cnpj}</Text>
      {LEGAL_ENTITY.enderecoSede ? (
        <Text style={[s.linha, { color: tokens.muted }]}>{LEGAL_ENTITY.enderecoSede}</Text>
      ) : null}
      <Text style={[s.contato, { color: tokens.muted }]}>
        Contato:{" "}
        <Text
          style={{ color: tokens.green }}
          accessibilityRole="link"
          onPress={() => Linking.openURL(`mailto:${LEGAL_ENTITY.emailContato}`)}
        >
          {LEGAL_ENTITY.emailContato}
        </Text>
      </Text>
    </View>
  )
}

const s = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  linha: {
    fontSize: 13,
    lineHeight: 20,
  },
  razaoSocial: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
    marginTop: 6,
  },
  contato: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
})
