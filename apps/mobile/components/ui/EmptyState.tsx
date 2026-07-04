// Fonte: components/ui/EmptyState.tsx
// Transcrição de EmptyState.tsx do site para React Native / NativeWind.

import React from "react"
import { View, Text, StyleSheet } from "react-native"
import { Button } from "./Button"
import { useTheme } from "@/lib/theme"

interface EmptyStateProps {
  icon?:            string   // emoji — handoff §1.6
  title:            string
  description?:     string
  action?:          { label: string; onPress: () => void }
  secondaryAction?: { label: string; onPress: () => void }
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
}: EmptyStateProps) {
  const { tokens, mode } = useTheme()
  return (
    <View style={styles.container}>
      {icon && (
        <View style={[styles.iconWrapper, { backgroundColor: tokens.border }]}>
          {/* handoff §1.6: icon 52px */}
          <Text style={styles.icon}>{icon}</Text>
        </View>
      )}

      {/* handoff §1.6: título Montserrat 18px bold navy
          dark: navy (#003366) seria invisível sobre fundo escuro — usa tokens.text */}
      <Text style={[styles.title, { color: mode === "dark" ? tokens.text : "#003366" }]}>{title}</Text>

      {description && (
        // handoff §1.6: descrição Inter 13px muted, max-width 220px
        <Text style={[styles.description, { color: tokens.muted }]}>{description}</Text>
      )}

      {action && (
        <Button
          variant="primary"
          size="md"
          onPress={action.onPress}
          style={styles.button}
        >
          {action.label}
        </Button>
      )}

      {secondaryAction && (
        <Button
          variant="ghost"
          size="md"
          onPress={secondaryAction.onPress}
          style={styles.buttonSecondary}
        >
          {secondaryAction.label}
        </Button>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    // handoff §1.6: "coluna centralizada, padding 48px vertical"
    flex:           1,
    alignItems:     "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
    textAlign:      "center",
  },
  iconWrapper: {
    // handoff §1.6: "Icon 52px" em círculo bg-muted — backgroundColor agora inline via tokens.border
    width:          64,
    height:         64,
    borderRadius:   32,
    alignItems:     "center",
    justifyContent: "center",
    marginBottom:   16,
  },
  icon: {
    fontSize: 28,
  },
  title: {
    // handoff §1.6: "Montserrat 18px bold navy" — color agora inline (mode-aware)
    fontFamily:  "Montserrat_700Bold",
    fontSize:    18,
    fontWeight:  "700",
    textAlign:   "center",
    marginBottom: 8,
  },
  description: {
    // handoff §1.6: "Inter 13px muted, max-width 220px" — color agora inline via tokens.muted
    fontSize:   13,
    textAlign:  "center",
    maxWidth:   220,
    lineHeight: 18,
    marginBottom: 4,
  },
  button: {
    marginTop:    16,
    paddingHorizontal: 24,
  },
  buttonSecondary: {
    marginTop: 8,
  },
})
