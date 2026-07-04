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

interface SkeletonBoxProps {
  width?:        number | `${number}%`
  height:        number
  borderRadius?: number
  style?:        ViewStyle
}

// Cores transcritas do handoff §1.8: de #E2E8F0 para #F1F5F9 (--muted e --surface-muted)
const COLOR_START = "#E2E8F0"
const COLOR_END   = "#F8FAFC"

export function SkeletonBox({ width, height, borderRadius = 8, style }: SkeletonBoxProps) {
  const progress = useSharedValue(0)

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
      [COLOR_START, COLOR_END],
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
  return (
    <View style={skeletonStyles.card}>
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
    backgroundColor: "#FFFFFF",
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
