// Fonte: components/items/ItemsMap.tsx (Popup do site, linhas 155-183)
// Card exibido ao tocar um pin no mapa nativo — título + preço/dia + navega
// pro detalhe do item. Site não tem thumbnail no popup do mapa (só título+preço);
// mantido idêntico, sem inventar campo que o componente-fonte não tem.
import React from "react"
import { View, Text, TouchableOpacity, StyleSheet } from "react-native"
import { useTheme } from "@/lib/theme"

const fmt = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100)

export interface MapPin {
  id:          string
  title:       string
  pricePerDay: number
}

interface Props {
  pin:        MapPin
  onPress:    () => void
  onClose:    () => void
}

export function MarkerPopupCard({ pin, onPress, onClose }: Props) {
  const { tokens } = useTheme()
  return (
    <View style={[s.card, { backgroundColor: tokens.surface, borderColor: tokens.border, shadowColor: "#000" }]}>
      <TouchableOpacity
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Fechar"
        style={s.closeBtn}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={[s.closeText, { color: tokens.muted }]}>×</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onPress} accessibilityRole="link" style={s.content}>
        {/* tokens.text (não navy): navy #003366 como TEXTO fica invisível no
            dark (contraste ~1.25:1 sobre surface). tokens.success (não green):
            verde de texto legível no dark (#5BD08B); idêntico ao green no light.
            Achado revisão s41 (P0 título + P1 preço/CTA). */}
        <Text style={[s.title, { color: tokens.text }]} numberOfLines={2}>
          {pin.title}
        </Text>
        <Text style={[s.price, { color: tokens.success }]}>{fmt(pin.pricePerDay)}/dia</Text>
        <Text style={[s.cta, { color: tokens.success }]}>Ver detalhes →</Text>
      </TouchableOpacity>
    </View>
  )
}

const s = StyleSheet.create({
  card: {
    position:      "absolute",
    left:          16,
    right:         16,
    bottom:        16,
    borderRadius:  12,
    borderWidth:   1,
    padding:       14,
    paddingRight:  36,
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius:  10,
    elevation:     6,
  },
  closeBtn: {
    position:       "absolute",
    top:            4,
    right:          6,
    width:          32,
    height:         32,
    alignItems:     "center",
    justifyContent: "center",
  },
  closeText: { fontSize: 20, fontWeight: "600" },
  content:   { gap: 2 },
  title:     { fontSize: 14, fontWeight: "700", lineHeight: 18 },
  price:     { fontSize: 13, fontWeight: "700", marginTop: 2 },
  cta:       { fontSize: 12, fontWeight: "600", marginTop: 4 },
})
