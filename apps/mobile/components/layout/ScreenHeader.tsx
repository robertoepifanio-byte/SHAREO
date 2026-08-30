// Fonte: apps/mobile/app/termos.tsx, privacidade.tsx, politicas.tsx, suporte.tsx,
//        sobre.tsx, comunidade.tsx, ajuda.tsx, seguranca.tsx, ganhar.tsx,
//        anunciar/dicas.tsx, itens/novo.tsx, itens/[id]/editar.tsx, perfil/dados.tsx
//
// Cabeçalho de tela canônico: botão ‹ Voltar + título + slot direito opcional.
// Exporta getScreenHeaderHeight() para que telas empilhadas calculem offsets
// sem adivinhar a altura — lição do bug de corte de rótulo que se repetiu 3×.

import React from "react"
import { View, Text, TouchableOpacity, StyleSheet, PixelRatio } from "react-native"
import { router } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTheme } from "@/lib/theme"

export interface ScreenHeaderProps {
  title: string
  /** Callback do botão voltar. Padrão: router.back(). */
  onBack?: () => void
  /** Elemento opcional no lado direito (ex: botão de ação). */
  right?: React.ReactNode
  /** accessibilityLabel do botão voltar. Padrão: "Voltar". */
  backLabel?: string
}

/**
 * Altura total do cabeçalho em pixels lógicos, incluindo safe-area.
 *
 * Exposta para que telas que precisam calcular offsets (ex: posicionamento
 * de listas absolutas sobre o header) não precisem duplicar a lógica.
 *
 * Soma fontScale no lineHeight do título porque no Android o lineHeight
 * não escala automaticamente com as preferências de acessibilidade do sistema.
 *
 * Composição:
 *   paddingTop  = insetsTop + 8
 *   content     = max(44 minHeight do backBtn, ceil(18 × fontScale × 1.4))
 *   paddingBottom = 12
 *   border        = 1
 */
export function getScreenHeaderHeight(insetsTop: number, fontScale: number): number {
  const titleLineHeight = Math.ceil(18 * fontScale * 1.4)
  const contentHeight   = Math.max(44, titleLineHeight)
  return insetsTop + 8 + contentHeight + 12 + 1
}

export function ScreenHeader({
  title,
  onBack,
  right,
  backLabel = "Voltar",
}: ScreenHeaderProps) {
  const { tokens } = useTheme()
  const insets      = useSafeAreaInsets()

  return (
    <View
      style={[
        s.header,
        {
          paddingTop:      insets.top + 8,
          backgroundColor: tokens.surface,
          borderBottomColor: tokens.border,
        },
      ]}
    >
      <TouchableOpacity
        onPress={onBack ?? (() => router.back())}
        accessibilityLabel={backLabel}
        accessibilityRole="button"
        style={s.backBtn}
      >
        <Text style={[s.backArrow, { color: tokens.muted }]}>‹</Text>
      </TouchableOpacity>

      <Text style={[s.headerTitle, { color: tokens.navy }]}>{title}</Text>

      {/* Slot direito — mantém simetria visual quando presente.
          Sem right: nenhum elemento extra (o título já usa flex:1). */}
      {right != null && <View style={s.rightSlot}>{right}</View>}
    </View>
  )
}

const s = StyleSheet.create({
  header: {
    flexDirection:    "row",
    alignItems:       "center",
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingBottom:     12,
  },
  backBtn: {
    minHeight:      44,
    minWidth:       44,
    alignItems:     "center",
    justifyContent: "center",
  },
  backArrow:   { fontSize: 28, lineHeight: 32 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "700" },
  rightSlot:   { minWidth: 44, alignItems: "flex-end" },
})
