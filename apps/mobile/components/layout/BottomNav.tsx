// Fonte: components/layout/BottomNav.tsx
// Transcrição LITERAL de BottomNav.tsx do site para React Native.
// SVGs, rótulos, ordem e comportamento do FAB transcritos verbatim do arquivo-fonte.
// Lote 2: rotas ajustadas para expo-router — /explorar (tab Explorar), /chat (tab Chat), /perfil (tab Perfil).

import React from "react"
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from "react-native"
import { usePathname, router } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import Svg, { Path, Circle, Line, Polyline } from "react-native-svg"
import { useTheme } from "@/lib/theme"
import type { Tokens } from "@/lib/theme"

// ── Lógica de rota ativa — transcrita de BottomNav.tsx do site ───────────────
function useActiveTab() {
  const pathname = usePathname()
  return {
    isHome:     pathname === "/" || pathname === "/index",
    isExplore:  pathname === "/explorar" || (pathname.startsWith("/itens") && !pathname.includes("/novo")),
    isAnunciar: pathname.includes("/novo") || pathname.startsWith("/anunciar"),
    isChat:     pathname === "/chat" || pathname.startsWith("/mensagens"),
    isDash:     (
      pathname === "/perfil" ||
      pathname === "/dashboard" ||
      pathname.startsWith("/perfil") ||
      pathname === "/reservas" ||
      pathname.startsWith("/meus-anuncios")
    ),
  }
}

// ── Indicador de aba ativa — transcrito de BottomNav.tsx do site ─────────────
// "barra 2.5px no topo do item" (handoff §1.16)
function ActiveIndicator({ tokens }: { tokens: Tokens }) {
  return (
    <View
      style={[styles.indicator, { backgroundColor: tokens.navy }]}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  )
}

// ── Tab item genérico ─────────────────────────────────────────────────────────
interface TabItemProps {
  active:           boolean
  label:            string
  onPress:          () => void
  accessibilityCurrent?: boolean
  children:         React.ReactNode
  tokens:           Tokens
}

function TabItem({ active, label, onPress, accessibilityCurrent, children, tokens }: TabItemProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      aria-current={accessibilityCurrent ? "page" : undefined}
      style={styles.tabItem}
    >
      {active && <ActiveIndicator tokens={tokens} />}
      {children}
      <Text
        style={[
          styles.tabLabel,
          { color: active ? tokens.navy : tokens.muted },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  )
}

// ── SVGs — viewBox 0 0 24 24, transcritos VERBATIM de BottomNav.tsx ──────────
function HomeIcon({ active, tokens }: { active: boolean; tokens: Tokens }) {
  const c = active ? tokens.navy : tokens.muted
  const w = active ? 2.5 : 2
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <Polyline points="9 22 9 12 15 12 15 22"/>
    </Svg>
  )
}

function ExploreIcon({ active, tokens }: { active: boolean; tokens: Tokens }) {
  const c = active ? tokens.navy : tokens.muted
  const w = active ? 2.5 : 2
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={w} strokeLinecap="round">
      <Circle cx="11" cy="11" r="8"/>
      <Path d="m21 21-4.35-4.35"/>
    </Svg>
  )
}

// PlusIcon: ícone branco sobre fundo verde (brand fill) — inalterado nos dois modos.
function PlusIcon() {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round">
      <Line x1="12" y1="5" x2="12" y2="19"/>
      <Line x1="5" y1="12" x2="19" y2="12"/>
    </Svg>
  )
}

function ChatIcon({ active, tokens }: { active: boolean; tokens: Tokens }) {
  const c = active ? tokens.navy : tokens.muted
  const w = active ? 2.5 : 2
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={w} strokeLinecap="round">
      <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </Svg>
  )
}

function ProfileIcon({ active, tokens }: { active: boolean; tokens: Tokens }) {
  const c = active ? tokens.navy : tokens.muted
  const w = active ? 2.5 : 2
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={w} strokeLinecap="round">
      <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <Circle cx="12" cy="7" r="4"/>
    </Svg>
  )
}

// ── BottomNav ─────────────────────────────────────────────────────────────────
export function BottomNav() {
  const { isHome, isExplore, isAnunciar, isChat, isDash } = useActiveTab()
  const insets = useSafeAreaInsets()
  const { tokens } = useTheme()

  return (
    <View
      style={[
        styles.nav,
        {
          paddingBottom:   Math.max(insets.bottom, 8),
          backgroundColor: tokens.surface,   // #FFFFFF (light) → #15233B (dark)
          borderTopColor:  tokens.border,    // #E2E8F0 (light) → #26395A (dark)
        },
      ]}
      accessibilityRole="tablist"
      accessibilityLabel="Navegação mobile"
    >
      {/* 1. Início — tab index "/" */}
      <TabItem active={isHome} label="Início" onPress={() => router.push("/")} accessibilityCurrent={isHome} tokens={tokens}>
        <HomeIcon active={isHome} tokens={tokens} />
      </TabItem>

      {/* 2. Explorar — tab "/explorar" */}
      <TabItem active={isExplore} label="Explorar" onPress={() => router.push("/explorar")} accessibilityCurrent={isExplore} tokens={tokens}>
        <ExploreIcon active={isExplore} tokens={tokens} />
      </TabItem>

      {/* 3. Anunciar — FAB elevado (círculo 52×52px bg #007B3C, marginTop -10) */}
      {/* FAB: fundo verde #007B3C = tokens.green (fill preservado nos dois modos) */}
      <Pressable
        onPress={() => router.push("/itens/novo")}
        accessibilityRole="button"
        accessibilityLabel="Anunciar item"
        style={styles.fabWrapper}
      >
        <View
          style={[
            styles.fab,
            isAnunciar ? styles.fabActive : styles.fabInactive,
          ]}
        >
          <PlusIcon />
        </View>
        <Text style={styles.fabLabel}>Anunciar</Text>
      </Pressable>

      {/* 4. Chat — tab "/chat" (wrapper de mensagens) */}
      <TabItem active={isChat} label="Chat" onPress={() => router.push("/chat")} accessibilityCurrent={isChat} tokens={tokens}>
        <ChatIcon active={isChat} tokens={tokens} />
      </TabItem>

      {/* 5. Perfil — tab "/perfil" */}
      <TabItem active={isDash} label="Perfil" onPress={() => router.push("/perfil")} accessibilityCurrent={isDash} tokens={tokens}>
        <ProfileIcon active={isDash} tokens={tokens} />
      </TabItem>
    </View>
  )
}

const styles = StyleSheet.create({
  nav: {
    // "h-[72px]" + "border-t" + "bg-surface" + "shadow" — BottomNav.tsx do site
    flexDirection:   "row",
    alignItems:      "stretch",
    height:          72,
    backgroundColor: "#FFFFFF",      // bg-surface
    borderTopWidth:  1,
    borderTopColor:  "#E2E8F0",      // border-border
    // shadow-[0_-4px_20px_rgba(0,0,0,0.08)] do site
    ...Platform.select({
      ios: {
        shadowColor:   "#000000",
        shadowOffset:  { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius:  10,
      },
      android: { elevation: 8 },
    }),
  },
  tabItem: {
    flex:           1,
    alignItems:     "center",
    justifyContent: "center",
    gap:            3,
    position:       "relative",
    minHeight:      44,  // tap target
  },
  tabLabel: {
    // "text-[10px] font-semibold" — BottomNav.tsx do site
    fontSize:   10,
    fontWeight: "600",
  },
  indicator: {
    // "absolute top-0 left-[18%] right-[18%] h-[2.5px] rounded-b bg-primary"
    position:        "absolute",
    top:             0,
    left:            "18%",
    right:           "18%",
    height:          2.5,
    borderBottomLeftRadius:  2,
    borderBottomRightRadius: 2,
    backgroundColor: "#003366",  // bg-primary
  },
  fabWrapper: {
    flex:           1,
    alignItems:     "center",
    justifyContent: "center",
    gap:            3,
    // "marginTop: -10" — FAB elevado (handoff §1.16)
    marginTop:      -10,
  },
  fab: {
    // "h-[52px] w-[52px] rounded-full" — BottomNav.tsx do site
    width:          52,
    height:         52,
    borderRadius:   26,
    alignItems:     "center",
    justifyContent: "center",
  },
  fabActive: {
    backgroundColor: "#007B3C",
    // "shadow-[0_4px_16px_rgba(0,123,60,0.55)]"
    shadowColor:     "#007B3C",
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.55,
    shadowRadius:    8,
    elevation:       8,
    opacity:         0.9,
  },
  fabInactive: {
    backgroundColor: "#007B3C",
    // "shadow-[0_4px_16px_rgba(0,123,60,0.40)]"
    shadowColor:     "#007B3C",
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.40,
    shadowRadius:    8,
    elevation:       6,
  },
  fabLabel: {
    // "text-brand text-[10px] font-semibold" — BottomNav.tsx do site
    fontSize:   10,
    fontWeight: "600",
    color:      "#007B3C",
  },
})
