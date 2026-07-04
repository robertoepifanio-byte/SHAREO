// Fonte: components/ui/EmptyState.tsx (padrão de loading states no site)
// Implementação nativa com Reanimated conforme handoff §1.8.

import React, { useEffect } from "react"
import { View, StyleSheet, type ViewStyle } from "react-native"
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolateColor,
  Easing,
} from "react-native-reanimated"
import { useTheme } from "@/lib/theme"

interface SkeletonBoxProps {
  width?:        number | `${number}%`
  height:        number
  borderRadius?: number
  style?:        ViewStyle
}

export function SkeletonBox({ width, height, borderRadius = 8, style }: SkeletonBoxProps) {
  const { tokens } = useTheme()
  const progress  = useSharedValue(0)
  // Shared values para os extremos da animação — atualizados quando o tema muda.
  // tokens.border: #E2E8F0 light / #26395A dark (cor inicial, mais escura)
  // tokens.bg:     #F8FAFC light / #0B1524 dark (cor final, mais clara no light / mais escura no dark)
  const colorFrom = useSharedValue(tokens.border)
  const colorTo   = useSharedValue(tokens.bg)

  // Sincroniza as cores dos shared values quando o tema troca
  useEffect(() => {
    colorFrom.value = tokens.border
    colorTo.value   = tokens.bg
  }, [tokens.border, tokens.bg, colorFrom, colorTo])

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    )
  }, [progress])

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [colorFrom.value, colorTo.value],
    ),
  }))

  return (
    <Animated.View
      style={[
        animatedStyle,
        { width, height, borderRadius },
        style,
      ]}
      accessibilityLabel="Carregando"
      accessibilityRole="progressbar"
    />
  )
}

// ── ItemCardSkeleton — handoff §1.8 ─────────────────────────────────────────
export function ItemCardSkeleton() {
  const { tokens } = useTheme()
  return (
    <View style={[skeletonStyles.card, { backgroundColor: tokens.surface }]}>
      {/* imagem 4:3 */}
      <SkeletonBox height={140} borderRadius={12} style={{ width: "100%" }} />
      <View style={skeletonStyles.body}>
        <SkeletonBox height={10} width="40%" borderRadius={4} />
        <SkeletonBox height={14} width="80%" borderRadius={4} />
        <SkeletonBox height={14} width="60%" borderRadius={4} />
        <View style={skeletonStyles.footer}>
          <SkeletonBox height={18} width="35%" borderRadius={4} />
          <SkeletonBox height={10} width="25%" borderRadius={4} />
        </View>
      </View>
    </View>
  )
}

// ── CategoryChipSkeleton — handoff §1.8 ──────────────────────────────────────
export function CategoryChipSkeleton() {
  return (
    <View style={skeletonStyles.chip}>
      <SkeletonBox height={36} width={36} borderRadius={18} />
      <SkeletonBox height={10} width={48} borderRadius={4} />
    </View>
  )
}

const skeletonStyles = StyleSheet.create({
  card: {
    borderRadius: 12,
    overflow:     "hidden",
    // backgroundColor removido — agora inline via tokens.surface
  },
  body: {
    padding: 12,
    gap:     8,
  },
  footer: {
    flexDirection:  "row",
    justifyContent: "space-between",
    alignItems:     "center",
    marginTop:      4,
  },
  chip: {
    alignItems: "center",
    gap:        6,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
})
