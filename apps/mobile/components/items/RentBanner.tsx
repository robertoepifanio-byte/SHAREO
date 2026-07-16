// Fonte: app/itens/_RentBanner.tsx
// Card "Como alugar no ShareO" com 3 passos numerados + link para Central de Ajuda + dismiss.

import { useState, useEffect } from "react"
import { View, Text, TouchableOpacity, StyleSheet } from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { router } from "expo-router"
import Svg, { Line } from "react-native-svg"
import { useTheme } from "@/lib/theme"

const DISMISS_KEY = "shareo-rent-banner-dismissed"

export function RentBanner() {
  const { tokens } = useTheme()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    ;(async () => {
      const dismissed = await AsyncStorage.getItem(DISMISS_KEY)
      if (dismissed !== "1") setVisible(true)
    })()
  }, [])

  async function dismiss() {
    setVisible(false)
    await AsyncStorage.setItem(DISMISS_KEY, "1")
  }

  if (!visible) return null

  const styles = StyleSheet.create({
    container: {
      marginBottom: 24,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: tokens.green + "4d", // green/30
      backgroundColor: tokens.green + "0d", // green/5
      paddingHorizontal: 20,
      paddingVertical: 16,
      flexDirection: "row",
      gap: 16,
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: tokens.green + "1a", // green/10
      justifyContent: "center",
      alignItems: "center",
      flexShrink: 0,
    },
    iconText: {
      fontSize: 20,
    },
    content: {
      flex: 1,
    },
    title: {
      fontSize: 14,
      fontWeight: "600",
      color: tokens.text,
      marginBottom: 8,
    },
    step: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 4,
    },
    stepBadge: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: tokens.green,
      justifyContent: "center",
      alignItems: "center",
      flexShrink: 0,
    },
    stepBadgeText: {
      fontSize: 8,
      fontWeight: "700",
      color: "white",
    },
    stepText: {
      fontSize: 14,
      color: tokens.muted,
      flex: 1,
    },
    stepTextBold: {
      fontWeight: "600",
      color: tokens.text,
    },
    link: {
      marginTop: 8,
    },
    linkText: {
      fontSize: 12,
      fontWeight: "500",
      color: tokens.green,
    },
    closeButton: {
      flexShrink: 0,
      padding: 4,
      justifyContent: "center",
      alignItems: "center",
    },
    closeIcon: {
      width: 16,
      height: 16,
    },
  })

  return (
    <View style={styles.container}>
      {/* Ícone */}
      <View style={styles.iconContainer}>
        <Text style={styles.iconText}>🛒</Text>
      </View>

      {/* Conteúdo */}
      <View style={styles.content}>
        <Text style={styles.title}>Como alugar no ShareO</Text>

        {/* Passo 1 */}
        <View style={styles.step}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>1</Text>
          </View>
          <Text style={styles.stepText}>
            Escolha um item e clique em
            <Text style={styles.stepTextBold}> "Reservar"</Text>
          </Text>
        </View>

        {/* Passo 2 */}
        <View style={styles.step}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>2</Text>
          </View>
          <Text style={styles.stepText}>
            Informe as datas e aguarde a aprovação do dono
          </Text>
        </View>

        {/* Passo 3 */}
        <View style={styles.step}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>3</Text>
          </View>
          <Text style={styles.stepText}>
            Combine a retirada e aproveite!
          </Text>
        </View>

        {/* Link para Central de Ajuda */}
        <TouchableOpacity
          style={styles.link}
          onPress={() => router.push("/ajuda?anchor=como-alugar")}
        >
          <Text style={styles.linkText}>
            Saiba mais na Central de Ajuda →
          </Text>
        </TouchableOpacity>
      </View>

      {/* Botão Fechar */}
      <TouchableOpacity style={styles.closeButton} onPress={dismiss}>
        <Svg
          width={16}
          height={16}
          viewBox="0 0 24 24"
          fill="none"
          stroke={tokens.muted}
          strokeWidth={2}
          style={styles.closeIcon}
        >
          <Line x1="18" y1="6" x2="6" y2="18" />
          <Line x1="6" y1="6" x2="18" y2="18" />
        </Svg>
      </TouchableOpacity>
    </View>
  )
}
