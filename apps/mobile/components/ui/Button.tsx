// Fonte: components/ui/Button.tsx
// Transcrição de Button.tsx do site para React Native / NativeWind.

import React from "react"
import {
  ActivityIndicator,
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  type TouchableOpacityProps,
} from "react-native"
import { useTheme } from "@/lib/theme"

type Variant = "primary" | "secondary" | "ghost" | "danger"
type Size    = "sm" | "md" | "lg"

interface ButtonProps extends TouchableOpacityProps {
  variant?:  Variant
  size?:     Size
  loading?:  boolean
  fullWidth?: boolean
  children:  React.ReactNode
}

// Tokens transcritos de components/ui/Button.tsx sizeClasses
const SIZE_STYLES: Record<Size, { minHeight: number; paddingHorizontal: number; fontSize: number; borderRadius: number }> = {
  sm: { minHeight: 36, paddingHorizontal: 16, fontSize: 13, borderRadius: 6  },  // h-9
  md: { minHeight: 44, paddingHorizontal: 24, fontSize: 13, borderRadius: 8  },  // h-11 (tap target)
  lg: { minHeight: 52, paddingHorizontal: 32, fontSize: 15, borderRadius: 8  },  // h-12 + (lg usa 52)
}

export function Button({
  variant  = "primary",
  size     = "md",
  loading  = false,
  fullWidth = false,
  disabled,
  children,
  style,
  ...props
}: ButtonProps) {
  const { tokens } = useTheme()
  const isDisabled = disabled || loading

  // Variant styles computados com tokens — danger usa tokens.error (difere entre modos);
  // secondary/ghost usam tokens.navy/green (fill preservado, mesmo valor em ambos os modos).
  const VARIANT_STYLES: Record<Variant, { bg: string; text: string; border?: string }> = {
    primary:   { bg: "#007B3C", text: "#FFFFFF" },                             // bg-brand text-white (fill preservado)
    secondary: { bg: "transparent", text: tokens.navy, border: tokens.navy },  // border text-primary
    ghost:     { bg: "transparent", text: tokens.green, border: tokens.green },// border-brand text-brand
    danger:    { bg: tokens.error,  text: "#FFFFFF" },                         // bg-destructive text-white
  }

  const v = VARIANT_STYLES[variant]
  const s = SIZE_STYLES[size]

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={[
        styles.base,
        {
          minHeight:        s.minHeight,
          paddingHorizontal: s.paddingHorizontal,
          borderRadius:     s.borderRadius,
          backgroundColor:  isDisabled ? tokens.disabledBg : v.bg,
          borderWidth:      v.border ? 1.5 : 0,
          borderColor:      isDisabled ? tokens.disabledBorder : v.border ?? "transparent",
          width:            fullWidth ? "100%" : undefined,
          opacity:          loading ? 0.55 : 1,
        },
        style,
      ]}
      {...props}
    >
      <View style={styles.inner}>
        {loading && (
          <ActivityIndicator
            size="small"
            color={variant === "primary" || variant === "danger" ? "#FFFFFF" : "#007B3C"}
            style={styles.spinner}
            accessibilityLabel="Carregando"
          />
        )}
        <Text
          style={[
            styles.label,
            {
              fontSize:  s.fontSize,
              color:     isDisabled ? tokens.disabledText : v.text,
              // primary usa uppercase + tracking-wide, como no site
              textTransform: variant === "primary" ? "uppercase" : "none",
              letterSpacing: variant === "primary" ? 0.5 : 0,
            },
          ]}
          numberOfLines={1}
        >
          {children}
        </Text>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  base: {
    alignItems:     "center",
    justifyContent: "center",
  },
  inner: {
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "center",
    gap:            8,
  },
  label: {
    fontWeight: "700",
  },
  spinner: {
    marginRight: 4,
  },
})
