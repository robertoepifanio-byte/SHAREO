// Fonte: components/layout/BottomNav.tsx + components/layout/AppHeader.tsx + components/layout/MobileMenu.tsx
// Substitui a Tabs nativa do expo-router pelo BottomNav do Lote 1 (5 itens com SVG).
// AppHeader + MobileMenu drawer navy encapsulados aqui para todas as tabs.

import { useState } from "react"
import { View, StyleSheet } from "react-native"
import { Slot, router } from "expo-router"
import { BottomNav } from "@/components/layout/BottomNav"
import { AppHeader } from "@/components/layout/AppHeader"
import { MobileMenu } from "@/components/layout/MobileMenu"
import { useAuth } from "@/lib/auth"
import { useTheme } from "@/lib/theme"

export default function TabsLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { user, logout } = useAuth()
  const { tokens } = useTheme()

  async function handleLogout() {
    await logout()
    router.replace("/(auth)/login")
  }

  return (
    <View style={[styles.container, { backgroundColor: tokens.bg }]}>
      {/* Header fixo no topo — transcrito de AppHeader.tsx do site */}
      <AppHeader
        menuOpen={menuOpen}
        onToggleMenu={() => setMenuOpen((v) => !v)}
        notificationCount={0}
      />

      {/* Conteúdo da tela ativa */}
      <View style={styles.content}>
        <Slot />
      </View>

      {/* BottomNav com 5 itens + FAB — transcrito de BottomNav.tsx do site */}
      <BottomNav />

      {/* MobileMenu drawer navy — transcrito de MobileMenu.tsx do site */}
      <MobileMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        isLoggedIn={!!user}
        role={user?.role ?? null}
        onLogout={handleLogout}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor aplicado dinamicamente via tokens.bg
  },
  content: {
    flex: 1,
    overflow: "hidden",
  },
})
