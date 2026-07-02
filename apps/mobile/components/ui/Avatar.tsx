// Fonte: components/ui/Avatar.tsx
// Transcrição de Avatar.tsx do site para React Native / NativeWind.
// Regra principal: "se tem imageUrl mostra a foto, senão mostra a inicial" —
// mesma lógica do componente do site (src → Image; null → inicial).

import React from "react"
import { View, Text, StyleSheet } from "react-native"
import { Image } from "expo-image"

type AvatarSize = "sm" | "md" | "lg" | "xl"

interface AvatarProps {
  name:      string | null | undefined
  imageUrl?: string | null
  size?:     AvatarSize
}

// Dimensões — handoff §1.4 tabela de tamanhos
const SIZE_MAP: Record<AvatarSize, { px: number; fontSize: number }> = {
  sm: { px: 32, fontSize: 13 },
  md: { px: 44, fontSize: 16 },
  lg: { px: 72, fontSize: 26 },
  xl: { px: 88, fontSize: 32 },
}

export function Avatar({ name, imageUrl, size = "md" }: AvatarProps) {
  const { px, fontSize } = SIZE_MAP[size]
  // Lógica idêntica ao site: `name?.trim()?.charAt(0)?.toUpperCase() || "?"`
  const trimmed = name?.trim() ?? ""
  const initial = trimmed.charAt(0).toUpperCase() || "?"

  return (
    <View
      testID={`avatar-${px}`}
      style={[
        styles.circle,
        {
          width:        px,
          height:       px,
          borderRadius: px / 2,
          // fallback: fundo navy (#003366) + texto branco, igual ao site (bg-brand → bg-primary como fallback)
          backgroundColor: imageUrl ? "transparent" : "#003366",
        },
      ]}
      accessibilityRole="image"
      accessibilityLabel={name ?? "Avatar"}
    >
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={{ width: px, height: px, borderRadius: px / 2 }}
          contentFit="cover"
          accessibilityLabel={name ?? "Avatar"}
        />
      ) : (
        <Text style={[styles.initial, { fontSize, color: "#FFFFFF" }]}>
          {initial}
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  circle: {
    overflow:       "hidden",
    alignItems:     "center",
    justifyContent: "center",
    flexShrink:     0,
  },
  initial: {
    fontWeight: "700",
    lineHeight: undefined,
  },
})
