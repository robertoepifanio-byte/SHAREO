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

  // `disabled` é atalho semântico; se ambos forem passados, `disabled` tem prioridade.
  const isEditable = disabled ? false : (editable ?? true)

  const borderColor = error
    ? "#C0392B"   // --destructive
    : focused
      ? "#007B3C"  // --ring (verde, igual ao site)
      : "#E2E8F0"  // --border

  const bgColor = error
    ? "#FFF5F5"   // fundo erro (handoff §1.2)
    : !isEditable
      ? "#F1F5F9"  // --disabled-bg aproximado
      : "#F8FAFC"  // --surface-muted / default do handoff §1.2

  return (
    <View style={styles.wrapper}>
      {label && (
        <View style={styles.labelRow}>
          <Text style={styles.label}>
            {label.toUpperCase()}
          </Text>
          {required && (
            <Text style={styles.required} accessibilityLabel="campo obrigatório">
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
            color: !isEditable ? "#64748B" : "#0F172A",
            // shadow de foco — traduzido de "focus:ring-2 focus:ring-ring/20"
            ...(focused && !error
              ? {
                  shadowColor:  "#007B3C",
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.12,
                  shadowRadius:  3,
                  elevation:     2,
                }
              : {}),
          },
          style,
        ]}
        placeholderTextColor="#64748B"
        {...props}
      />

      <View style={styles.footer}>
        {error ? (
          <Text style={styles.error} role="alert">
            {error}
          </Text>
        ) : hint ? (
          <Text style={styles.hint}>{hint}</Text>
        ) : (
          <View />
        )}

        {charCount && maxLength != null && (
          <Text style={styles.counter}>
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
    // handoff §1.2: "11px, semibold, uppercase, #64748B"
    fontSize:    11,
    fontWeight:  "600",
    color:       "#64748B",
    letterSpacing: 0.4,
  },
  required: {
    fontSize:  11,
    fontWeight: "600",
    color:     "#C0392B",  // --destructive
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
    fontSize: 11,
    color:    "#C0392B",
    flex:     1,
  },
  hint: {
    fontSize: 11,
    color:    "#64748B",
    flex:     1,
  },
  counter: {
    // handoff §1.2: "10px, muted, alinhado à direita"
    fontSize: 10,
    color:    "#64748B",
    marginLeft: 8,
  },
})
