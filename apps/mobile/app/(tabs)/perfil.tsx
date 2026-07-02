// Fonte: app/(tabs)/perfil.tsx (lógica existente) + docs/design/mobile-app-handoff.md §0 (pendências D2)
// Perfil logado: Avatar do Lote 1 + nome + email + badge verificado + menu de itens com SVG.
// Stats rápidos (D2): omitidos — requer endpoint /api/users/me com agregados (pendência handoff §0).
// Ícones: SVG (substituem emoji) para consistência com design system.

import { View, Text, TouchableOpacity, ScrollView, Alert, StyleSheet } from "react-native"
import { router } from "expo-router"
import { useAuth } from "@/lib/auth"
import { useTheme } from "@/lib/theme"
import { Avatar } from "@/components/ui/Avatar"
import Svg, { Path, Circle, Rect, Line, Polyline } from "react-native-svg"

// ── Ícones de menu — SVG (substituem emoji da versão anterior) ─────────────────
function MenuIcon({ name, color }: { name: string; color: string }) {
  const p = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const }
  switch (name) {
    case "plus":    return <Svg {...p}><Line x1="12" y1="5" x2="12" y2="19"/><Line x1="5" y1="12" x2="19" y2="12"/></Svg>
    case "package": return <Svg {...p}><Line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><Path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><Polyline points="3.27 6.96 12 12.01 20.73 6.96"/><Line x1="12" y1="22.08" x2="12" y2="12"/></Svg>
    case "heart":   return <Svg {...p}><Path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></Svg>
    case "idcard":  return <Svg {...p}><Rect x="2" y="5" width="20" height="14" rx="2"/><Line x1="2" y1="10" x2="22" y2="10"/><Line x1="7" y1="15" x2="10" y2="15"/></Svg>
    case "logout":  return <Svg {...p}><Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><Polyline points="16 17 21 12 16 7"/><Line x1="21" y1="12" x2="9" y2="12"/></Svg>
    default:        return null
  }
}

interface MenuItem {
  label:   string
  icon:    string
  onPress: () => void
  danger?: boolean
}

export default function PerfilScreen() {
  const { tokens } = useTheme()
  const { user, logout } = useAuth()

  async function handleLogout() {
    Alert.alert("Sair", "Deseja sair da sua conta?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
        style: "destructive",
        onPress: async () => { await logout(); router.replace("/(auth)/login") },
      },
    ])
  }

  // ── Não logado ─────────────────────────────────────────────────────────────
  if (!user) {
    return (
      <View style={[s.center, { backgroundColor: tokens.bg }]}>
        <Avatar name="?" imageUrl={null} size="xl" />
        <Text style={[s.gateTitle, { color: tokens.navy }]}>
          Faça login para acessar seu perfil
        </Text>
        <TouchableOpacity
          style={s.loginBtn}
          onPress={() => router.push("/(auth)/login")}
          activeOpacity={0.85}
          accessibilityRole="button"
        >
          <Text style={s.loginBtnText}>Entrar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.createLink}
          onPress={() => router.push("/(auth)/register")}
          accessibilityRole="link"
        >
          <Text style={[s.createLinkText, { color: tokens.muted }]}>Criar conta</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const menuItems: MenuItem[] = [
    { label: "Anunciar item",            icon: "plus",    onPress: () => router.push("/itens/novo") },
    { label: "Meus anúncios",            icon: "package", onPress: () => router.push("/meus-anuncios") },
    { label: "Favoritos",                icon: "heart",   onPress: () => router.push("/favoritos") },
    { label: "Verificação de identidade", icon: "idcard",  onPress: () => router.push("/kyc") },
    { label: "Sair",                     icon: "logout",  onPress: handleLogout, danger: true },
  ]

  return (
    <ScrollView style={[s.scroll, { backgroundColor: tokens.bg }]} showsVerticalScrollIndicator={false}>

      {/* ── Avatar + Nome + Email ── */}
      <View style={[s.profileCard, { backgroundColor: tokens.surface, borderBottomColor: tokens.border }]}>
        <Avatar name={user.name} imageUrl={null} size="lg" />
        <Text style={[s.name, { color: tokens.navy }]}>{user.name}</Text>
        <Text style={[s.email, { color: tokens.muted }]}>{user.email}</Text>
        {user.isVerified && (
          <View style={s.verifiedBadge}>
            <Text style={s.verifiedText}>Verificado</Text>
          </View>
        )}
      </View>

      {/* ── Menu de ações ── */}
      <View style={[s.menuCard, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
        {menuItems.map((item, i) => (
          <TouchableOpacity
            key={item.label}
            onPress={item.onPress}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            style={[
              s.menuItem,
              i < menuItems.length - 1
                ? { borderBottomWidth: 1, borderBottomColor: tokens.border }
                : undefined,
            ]}
          >
            <MenuIcon name={item.icon} color={item.danger ? "#C0392B" : tokens.muted} />
            <Text style={[s.menuLabel, { color: item.danger ? "#C0392B" : tokens.text }]}>
              {item.label}
            </Text>
            {!item.danger && <Text style={[s.menuChevron, { color: tokens.muted }]}>›</Text>}
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[s.footer, { color: tokens.muted }]}>
        ShareO · Use Mais. Possua Menos.
      </Text>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  scroll: { flex: 1 },
  center: {
    flex:              1,
    alignItems:        "center",
    justifyContent:    "center",
    paddingHorizontal: 32,
    gap:               16,
  },
  gateTitle: {
    fontSize:  16,
    fontWeight: "600",
    textAlign:  "center",
  },
  loginBtn: {
    backgroundColor:   "#007B3C",
    borderRadius:      10,
    minHeight:         48,
    paddingHorizontal: 32,
    alignItems:        "center",
    justifyContent:    "center",
    width:             "100%",
  },
  loginBtnText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  createLink:   { paddingVertical: 8 },
  createLinkText: { fontSize: 13 },
  profileCard: {
    alignItems:        "center",
    paddingVertical:   32,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    gap:               6,
  },
  name: {
    fontSize:   20,
    fontFamily: "Montserrat_700Bold",
    marginTop:   8,
  },
  email: { fontSize: 13 },
  verifiedBadge: {
    marginTop:         8,
    backgroundColor:   "rgba(0,123,60,0.10)",
    borderRadius:      20,
    paddingHorizontal: 12,
    paddingVertical:   4,
  },
  verifiedText: {
    fontSize:   12,
    fontWeight: "600",
    color:      "#007B3C",
  },
  menuCard: {
    marginHorizontal: 16,
    marginTop:        16,
    borderRadius:     16,
    borderWidth:      1,
    overflow:         "hidden",
  },
  menuItem: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               12,
    paddingHorizontal: 16,
    paddingVertical:   16,
    minHeight:         56,
  },
  menuLabel:   { flex: 1, fontSize: 14, fontWeight: "500" },
  menuChevron: { fontSize: 18 },
  footer: {
    textAlign:    "center",
    fontSize:     11,
    marginTop:    24,
    marginBottom: 32,
  },
})
