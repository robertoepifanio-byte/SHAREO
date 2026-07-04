// Fonte: components/ui/Input.tsx
// Transcrição de Input.tsx do site para React Native / NativeWind.

import React, { useState } from "react"
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  type TextInputProps,
} from "react-native"
import { useTheme } from "@/lib/theme"

interface InputProps extends TextInputProps {
  label?:     string
  hint?:      string
  error?:     string
  required?:  boolean
  charCount?: boolean
  maxLength?: number
  /** Atalho semântico para editable={false} — equivalente a passar editable={false} */
  disabled?:  boolean
}

export function Input({
  label,
  hint,
  error,
  required,
  charCount,
  maxLength,
  style,
  value,
  onFocus,
  onBlur,
  disabled,
  editable,
  ...props
}: InputProps) {
  const [focused, setFocused] = useState(false)
  const { tokens, mode } = useTheme()

  // `disabled` é atalho semântico; se ambos forem passados, `disabled` tem prioridade.
  const isEditable = disabled ? false : (editable ?? true)

  const borderColor = error
    ? tokens.error                // --destructive
    : focused
      ? tokens.green              // --ring (verde, igual ao site; fill preservado)
      : tokens.border             // --border

  // error bg: tint rosado claro — sem token direto, ternário para dark
  // disabled bg: #F1F5F9 no site (slate-100) — ligeiramente diferente de tokens.disabledBg (#E2E8F0); ternário preserva light
  // default bg: tokens.bg (#F8FAFC light / #0B1524 dark)
  const bgColor = error
    ? (mode === "dark" ? "#2D1515" : "#FFF5F5")
    : !isEditable
      ? (mode === "dark" ? tokens.disabledBg : "#F1F5F9")
      : tokens.bg

  return (
    <View style={styles.wrapper}>
      {label && (
        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: tokens.muted }]}>
            {label.toUpperCase()}
          </Text>
          {required && (
            <Text style={[styles.required, { color: tokens.error }]} accessibilityLabel="campo obrigatório">
              {" "}*
            </Text>
          )}
        </View>
      )}

      <TextInput
        value={value}
        maxLength={maxLength}
        editable={isEditable}
        accessibilityLabel={label}
        accessibilityHint={hint}
        onFocus={(e) => {
          setFocused(true)
          onFocus?.(e)
        }}
        onBlur={(e) => {
          setFocused(false)
          onBlur?.(e)
        }}
        style={[
          styles.input,
          {
            borderColor,
            backgroundColor: bgColor,
            color: !isEditable ? tokens.muted : tokens.text,
            // shadow de foco — traduzido de "focus:ring-2 focus:ring-ring/20"
            ...(focused && !error
              ? {
                  shadowColor:  tokens.green,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.12,
                  shadowRadius:  3,
                  elevation:     2,
                }
              : {}),
          },
          style,
        ]}
        placeholderTextColor={tokens.muted}
        {...props}
      />

      <View style={styles.footer}>
        {error ? (
          <Text style={[styles.error, { color: tokens.error }]} role="alert">
            {error}
          </Text>
        ) : hint ? (
          <Text style={[styles.hint, { color: tokens.muted }]}>{hint}</Text>
        ) : (
          <View />
        )}

        {charCount && maxLength != null && (
          <Text style={[styles.counter, { color: tokens.muted }]}>
            {(value as string)?.length ?? 0}/{maxLength}
          </Text>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 4,
  },
  labelRow: {
    flexDirection: "row",
    alignItems:    "center",
    marginBottom:  2,
  },
  label: {
    // handoff §1.2: "11px, semibold, uppercase, #64748B" — color agora inline via tokens.muted
    fontSize:    11,
    fontWeight:  "600",
    letterSpacing: 0.4,
  },
  required: {
    // color agora inline via tokens.error
    fontSize:  11,
    fontWeight: "600",
  },
  input: {
    minHeight:     44,    // tap target mínimo
    borderWidth:   1,
    borderRadius:  8,     // --radius-md
    paddingHorizontal: 12,
    paddingVertical:   10,
    fontSize:      14,
    fontWeight:    "400",
  },
  footer: {
    flexDirection:  "row",
    justifyContent: "space-between",
    alignItems:     "center",
    minHeight:      16,
  },
  error: {
    // color agora inline via tokens.error
    fontSize: 11,
    flex:     1,
  },
  hint: {
    // color agora inline via tokens.muted
    fontSize: 11,
    flex:     1,
  },
  counter: {
    // handoff §1.2: "10px, muted, alinhado à direita" — color agora inline via tokens.muted
    fontSize: 10,
    marginLeft: 8,
  },
})
