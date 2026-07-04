// Fonte: components/ui/EmptyState.tsx
// Transcrição de EmptyState.tsx do site para React Native / NativeWind.

import React from "react"
import { View, Text, StyleSheet } from "react-native"
import { Button } from "./Button"

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
  return (
    <View style={styles.container}>
      {icon && (
        <View style={styles.iconWrapper}>
          {/* handoff §1.6: icon 52px */}
          <Text style={styles.icon}>{icon}</Text>
        </View>
      )}

      {/* handoff §1.6: título Montserrat 18px bold navy */}
      <Text style={styles.title}>{title}</Text>

      {description && (
        // handoff §1.6: descrição Inter 13px muted, max-width 220px
        <Text style={styles.description}>{description}</Text>
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
    // handoff §1.6: "Icon 52px" em círculo bg-muted (--muted #E2E8F0)
    width:          64,
    height:         64,
    borderRadius:   32,
    backgroundColor: "#E2E8F0",
    alignItems:     "center",
    justifyContent: "center",
    marginBottom:   16,
  },
  icon: {
    fontSize: 28,
  },
  title: {
    // handoff §1.6: "Montserrat 18px bold navy"
    fontFamily:  "Montserrat_700Bold",
    fontSize:    18,
    fontWeight:  "700",
    color:       "#003366",
    textAlign:   "center",
    marginBottom: 8,
  },
  description: {
    // handoff §1.6: "Inter 13px muted, max-width 220px"
    fontSize:   13,
    color:      "#64748B",
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
