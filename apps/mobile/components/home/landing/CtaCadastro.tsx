// Fonte: components/home/landing/CtaCadastro.tsx (site)
// Botão-CTA da landing transcrita — sempre navega pra /(auth)/register.
import React from "react"
import { Text, Pressable, StyleSheet, ViewStyle } from "react-native"
import { router } from "expo-router"
import { useTheme } from "@/lib/theme"
import { UiIcon } from "../UiIcon"

type Variante = "solido" | "azul"

export function CtaCadastro({
  children,
  variante = "solido",
  larguraTotal = false,
  destino = "/(auth)/register",
  style,
}: {
  children: string
  variante?: Variante
  larguraTotal?: boolean
  destino?: string
  style?: ViewStyle
}) {
  const { tokens } = useTheme()
  return (
    <Pressable
      onPress={() => router.push(destino as never)}
      accessibilityRole="button"
      accessibilityLabel={children}
      style={[
        s.base,
        { backgroundColor: variante === "azul" ? tokens.blueMedium : tokens.green },
        larguraTotal && s.larguraTotal,
        style,
      ]}
    >
      <Text style={s.text}>{children}</Text>
      <UiIcon name="seta-direita" size={16} color="#FFFFFF" />
    </Pressable>
  )
}

const s = StyleSheet.create({
  base: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  larguraTotal: { alignSelf: "stretch" },
  text: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
})
