// Fonte: components/layout/AppHeader.tsx
// Transcrição de AppHeader.tsx do site para React Native.
// Estrutura: barra navy, card branco c/ logo, sino c/ badge (logado)
//            ou botão "Entrar" (deslogado), hambúrguer.

import React from "react"
import {
  View,
  Image,
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from "react-native"
import { router } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import Svg, { Path, Line, Circle } from "react-native-svg"

// ── Ícone Hambúrguer — SVG transcrito de MobileMenu.tsx do site ──────────────
function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round">
      {open ? (
        <>
          <Line x1="18" y1="6"  x2="6"  y2="18"/>
          <Line x1="6"  y1="6"  x2="18" y2="18"/>
        </>
      ) : (
        <>
          <Line x1="3" y1="7"  x2="21" y2="7"/>
          <Line x1="3" y1="12" x2="21" y2="12"/>
          <Line x1="3" y1="17" x2="21" y2="17"/>
        </>
      )}
    </Svg>
  )
}

// ── Ícone Sino — transcrito de NotificationBell do site ──────────────────────
function BellIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <Path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </Svg>
  )
}

interface AppHeaderProps {
  menuOpen:           boolean
  onToggleMenu:       () => void
  notificationCount?: number
  /** Transcrito de AppHeader.tsx do site: mostra sino quando logado, "Entrar" quando não. */
  isLoggedIn?:        boolean
}

export function AppHeader({ menuOpen, onToggleMenu, notificationCount = 0, isLoggedIn = true }: AppHeaderProps) {
  const insets = useSafeAreaInsets()

  return (
    <View
      style={[
        styles.header,
        { paddingTop: insets.top + 8 },
      ]}
      accessibilityRole="header"
    >
      {/* Logo — "rounded-lg overflow-hidden bg-white px-2 py-1" — AppHeader.tsx do site */}
      <View style={styles.logoWrapper} accessibilityRole="image" accessibilityLabel="ShareO — página inicial">
        <Image
          source={require("../../assets/shareo-logo.png")}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="ShareO"
        />
      </View>

      {/* Espaçador */}
      <View style={{ flex: 1 }} />

      {/* Auth area — transcrito de AppHeader.tsx do site:
          logado → sino; deslogado → botão "Entrar" */}
      {isLoggedIn ? (
        <Pressable
          onPress={() => { /* navegar para /notificacoes quando existir */ }}
          accessibilityRole="button"
          accessibilityLabel={
            notificationCount > 0
              ? `${notificationCount} notificações`
              : "Notificações"
          }
          style={styles.iconBtn}
        >
          <BellIcon />
          {notificationCount > 0 && (
            <View style={styles.badge} accessibilityElementsHidden>
              <Text style={styles.badgeText}>
                {notificationCount > 9 ? "9+" : notificationCount}
              </Text>
            </View>
          )}
        </Pressable>
      ) : (
        <Pressable
          onPress={() => router.push("/(auth)/login")}
          accessibilityRole="button"
          accessibilityLabel="Entrar"
          style={styles.entrarBtn}
        >
          <Text style={styles.entrarText}>Entrar</Text>
        </Pressable>
      )}

      {/* Hambúrguer — "md:hidden" no site, aqui sempre visível (app mobile-only) */}
      <Pressable
        onPress={onToggleMenu}
        accessibilityRole="button"
        accessibilityLabel={menuOpen ? "Fechar menu" : "Abrir menu"}
        accessibilityState={{ expanded: menuOpen }}
        style={styles.iconBtn}
      >
        <HamburgerIcon open={menuOpen} />
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    // "bg-primary h-16" — AppHeader.tsx do site
    flexDirection:   "row",
    alignItems:      "center",
    backgroundColor: "#003366",   // bg-primary / navy
    paddingHorizontal: 16,
    paddingBottom:    8,
    gap:              8,
    // Sombra suave
    ...Platform.select({
      ios: {
        shadowColor:   "#000000",
        shadowOffset:  { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius:  4,
      },
      android: { elevation: 4 },
    }),
  },
  // "rounded-lg overflow-hidden bg-white px-2 py-1" — AppHeader.tsx do site
  logoWrapper: {
    backgroundColor: "#FFFFFF",
    borderRadius:    8,
    paddingHorizontal: 8,
    paddingVertical:   4,
    overflow:        "hidden",
  },
  logo: {
    width:  120,
    height: 32,
  },
  iconBtn: {
    width:          44,
    height:         44,
    alignItems:     "center",
    justifyContent: "center",
    borderRadius:   8,
    position:       "relative",
  },
  badge: {
    position:        "absolute",
    top:             6,
    right:           6,
    backgroundColor: "#C0392B",
    borderRadius:    8,
    minWidth:        16,
    height:          16,
    alignItems:      "center",
    justifyContent:  "center",
    paddingHorizontal: 3,
    borderWidth:     1.5,
    borderColor:     "#003366",
  },
  badgeText: {
    fontSize:   9,
    fontWeight: "700",
    color:      "#FFFFFF",
    lineHeight: 13,
  },
  // "inline-flex h-11 items-center px-4 ... border border-white/30 text-white" — AppHeader.tsx do site
  entrarBtn: {
    height:            44,
    alignItems:        "center",
    justifyContent:    "center",
    paddingHorizontal: 16,
    borderRadius:      8,
    borderWidth:       1,
    borderColor:       "rgba(255,255,255,0.3)",
  },
  entrarText: {
    fontSize:   14,
    fontWeight: "600",
    color:      "#FFFFFF",
  },
})
