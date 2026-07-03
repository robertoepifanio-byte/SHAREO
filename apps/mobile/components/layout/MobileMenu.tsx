// Fonte: components/layout/MobileMenu.tsx + components/layout/ThemeToggle.tsx
// Transcrição LITERAL do MobileMenu do site para React Native.
// Ordem, rótulos, links, seções e ThemeToggle transcritos verbatim do arquivo-fonte.

import React, { useState } from "react"
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Modal,
  SafeAreaView,
  Linking,
} from "react-native"
import { router } from "expo-router"
import Svg, { Path, Line, Circle, Rect, Polyline, Polygon } from "react-native-svg"
import { ThemeToggle } from "@/components/ui/ThemeToggle"
import { useTheme } from "@/lib/theme"
import type { ThemePreference } from "@/lib/theme"
import { API_URL } from "@/lib/api"

// Rotas que existem no site mas ainda não têm tela nativa — abrem no navegador
// em vez de dar "Unmatched Route". Remover daqui quando a tela nativa existir.
// Achado 2026-07-03 testando ao vivo no device: quase todo submenu do drawer
// (Minha Conta, Ajuda, parte de Anunciar/Atividade) apontava pra rota
// inexistente — mesmo tratamento já validado em app/(tabs)/perfil.tsx (Frente B).
// Prefixos (não precisa listar cada variante de query/hash) + exatas.
const EXTERNAL_ONLY_PREFIXES = ["/perfil/", "/ajuda"]
const EXTERNAL_ONLY_ROUTES = new Set([
  "/sobre", "/meus-anuncios", "/dashboard",
  "/anunciar/estimativa", "/anunciar/dicas",
])
function isExternalOnly(href: string): boolean {
  return EXTERNAL_ONLY_ROUTES.has(href) || EXTERNAL_ONLY_PREFIXES.some((p) => href.startsWith(p))
}

// ── Constantes — transcritas VERBATIM de MobileMenu.tsx do site ──────────────

// EXPLORAR_LINKS: no site aponta pra /itens?<filtro>; no app o equivalente
// nativo é /explorar. TODO(revisão): explorar.tsx só suporta ?q= hoje — os
// filtros view=map/sort=views/minRating=4 não estão wireados nativamente
// ainda, então por ora todos abrem a tela sem o filtro pré-aplicado (melhor
// que Unmatched Route; não inventamos suporte a filtro que não existe).
const EXPLORAR_LINKS = [
  { href: "/explorar", icon: "cart",     label: "Quero alugar algo" },
  { href: "/explorar", icon: "list",     label: "Ver todos os itens" },
  { href: "/explorar", icon: "map",      label: "Buscar no mapa" },
  { href: "/explorar", icon: "trending", label: "Mais alugados" },
  { href: "/explorar", icon: "star",     label: "Mais bem avaliados" },
]

const ANUNCIAR_LINKS = [
  { href: "/itens/novo",          icon: "package", label: "Cadastre seu item" },
  { href: "/anunciar/estimativa", icon: "dollar",  label: "Estimativa de ganhos" },
  { href: "/anunciar/dicas",      icon: "bulb",    label: "Dicas para anfitriões" },
]

// ATIVIDADE: 4 links na ordem exata (handoff §0, correção "MobileMenu — logado")
const ATIVIDADE_LINKS = [
  { href: "/meus-anuncios", label: "Meus Anúncios", icon: "package" },
  { href: "/reservas",      label: "Reservas",       icon: "calendar" },
  { href: "/mensagens",     label: "Mensagens",      icon: "message" },
  { href: "/dashboard",     label: "Dashboard",      icon: "grid" },
]

const ACCOUNT_LINKS = [
  { href: "/perfil",              label: "Ver Perfil",               icon: "user" },
  { href: "/perfil/editar",       label: "Editar dados",             icon: "edit" },
  { href: "/perfil/endereco",     label: "Endereço",                 icon: "pin" },
  { href: "/perfil/seguranca",    label: "Segurança",                icon: "lock" },
  { href: "/perfil/documentos",   label: "Documentos",               icon: "idcard" },
  { href: "/perfil/recebimentos", label: "Recebimentos",             icon: "dollar" },
  { href: "/perfil/repasses",     label: "Repasses",                 icon: "receipt" },
  { href: "/perfil/indicacoes",   label: "Indicações e Embaixador",  icon: "gift" },
  { href: "/perfil/dados",        label: "Privacidade e dados",      icon: "folder" },
]

const HELP_LINKS = [
  { href: "/ajuda#primeiros-passos", label: "Primeiros passos",      icon: "rocket" },
  { href: "/ajuda#locatario",        label: "Quero alugar",          icon: "cart" },
  { href: "/ajuda#locador",          label: "Quero anunciar",        icon: "package" },
  { href: "/ajuda#dicas-anfitrioes", label: "Dicas para anfitriões", icon: "bulb" },
  { href: "/ajuda#taxas-secao",      label: "Taxas",                 icon: "receipt" },
  { href: "/ajuda#disputas",         label: "Disputas",              icon: "shield" },
  { href: "/ajuda#suporte",          label: "Suporte",               icon: "headphones" },
  { href: "/ajuda#pagamento",        label: "Pagamento",             icon: "lock" },
  { href: "/ajuda#legal",            label: "Legal e Fiscal",        icon: "file" },
  { href: "/ajuda#conta",            label: "Conta e Perfil",        icon: "user" },
]

// ── MenuIcon — transcrito de MobileMenu.tsx do site (função MenuIcon) ────────
function MenuIcon({ name }: { name: string }) {
  const p = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "rgba(255,255,255,0.75)", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const }
  switch (name) {
    case "cart":       return <Svg {...p}><Circle cx="9" cy="21" r="1"/><Circle cx="20" cy="21" r="1"/><Path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></Svg>
    case "list":       return <Svg {...p}><Line x1="8" y1="6" x2="21" y2="6"/><Line x1="8" y1="12" x2="21" y2="12"/><Line x1="8" y1="18" x2="21" y2="18"/><Line x1="3" y1="6" x2="3.01" y2="6"/><Line x1="3" y1="12" x2="3.01" y2="12"/><Line x1="3" y1="18" x2="3.01" y2="18"/></Svg>
    case "map":        return <Svg {...p}><Polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><Line x1="8" y1="2" x2="8" y2="18"/><Line x1="16" y1="6" x2="16" y2="22"/></Svg>
    case "trending":   return <Svg {...p}><Polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><Polyline points="17 6 23 6 23 12"/></Svg>
    case "star":       return <Svg {...p}><Polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></Svg>
    case "package":    return <Svg {...p}><Line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><Path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><Polyline points="3.27 6.96 12 12.01 20.73 6.96"/><Line x1="12" y1="22.08" x2="12" y2="12"/></Svg>
    case "dollar":     return <Svg {...p}><Line x1="12" y1="1" x2="12" y2="23"/><Path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></Svg>
    case "bulb":       return <Svg {...p}><Line x1="9" y1="18" x2="15" y2="18"/><Line x1="10" y1="22" x2="14" y2="22"/><Path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></Svg>
    case "calendar":   return <Svg {...p}><Rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><Line x1="16" y1="2" x2="16" y2="6"/><Line x1="8" y1="2" x2="8" y2="6"/><Line x1="3" y1="10" x2="21" y2="10"/></Svg>
    case "message":    return <Svg {...p}><Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></Svg>
    case "grid":       return <Svg {...p}><Rect x="3" y="3" width="7" height="7"/><Rect x="14" y="3" width="7" height="7"/><Rect x="14" y="14" width="7" height="7"/><Rect x="3" y="14" width="7" height="7"/></Svg>
    case "user":       return <Svg {...p}><Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><Circle cx="12" cy="7" r="4"/></Svg>
    case "edit":       return <Svg {...p}><Path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><Path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></Svg>
    case "pin":        return <Svg {...p}><Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><Circle cx="12" cy="10" r="3"/></Svg>
    case "lock":       return <Svg {...p}><Rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><Path d="M7 11V7a5 5 0 0 1 10 0v4"/></Svg>
    case "idcard":     return <Svg {...p}><Rect x="2" y="5" width="20" height="14" rx="2"/><Line x1="2" y1="10" x2="22" y2="10"/><Line x1="7" y1="15" x2="10" y2="15"/></Svg>
    case "receipt":    return <Svg {...p}><Path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1Z"/><Path d="M14 8H8"/><Path d="M16 12H8"/><Path d="M13 16H8"/></Svg>
    case "gift":       return <Svg {...p}><Polyline points="20 12 20 22 4 22 4 12"/><Rect x="2" y="7" width="20" height="5"/><Line x1="12" y1="22" x2="12" y2="7"/><Path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><Path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></Svg>
    case "folder":     return <Svg {...p}><Path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></Svg>
    case "shield":     return <Svg {...p}><Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></Svg>
    case "rocket":     return <Svg {...p}><Path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><Path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><Path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><Path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></Svg>
    case "headphones": return <Svg {...p}><Path d="M3 18v-6a9 9 0 0 1 18 0v6"/><Path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></Svg>
    case "file":       return <Svg {...p}><Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><Polyline points="14 2 14 8 20 8"/><Line x1="16" y1="13" x2="8" y2="13"/><Line x1="16" y1="17" x2="8" y2="17"/></Svg>
    default:           return null
  }
}

// ── Chevron — transcrito de MobileMenu.tsx do site ────────────────────────────
function Chevron({ open }: { open: boolean }) {
  return (
    <Svg
      width={16} height={16} viewBox="0 0 24 24"
      fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth={2.5}
      style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }}
    >
      <Polyline points="6 9 12 15 18 9"/>
    </Svg>
  )
}

// ── Ícone Sair — transcrito de MobileMenu.tsx do site ────────────────────────
function SignOutIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#FCA5A5" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <Polyline points="16 17 21 12 16 7"/>
      <Line x1="21" y1="12" x2="9" y2="12"/>
    </Svg>
  )
}

// ── MobileMenu ────────────────────────────────────────────────────────────────
interface MobileMenuProps {
  visible:    boolean
  onClose:    () => void
  isLoggedIn: boolean
  role?:      string | null
  onLogout?:  () => void
}

export function MobileMenu({ visible, onClose, isLoggedIn, role, onLogout }: MobileMenuProps) {
  const { preference, setPreference } = useTheme()
  const [explorarOpen, setExplorarOpen] = useState(false)
  const [anunciarOpen, setAnunciarOpen] = useState(false)
  const [accountOpen,  setAccountOpen]  = useState(false)
  const [helpOpen,     setHelpOpen]     = useState(false)

  const isAdmin = role != null && role !== "USER"

  function navigate(href: string) {
    onClose()
    if (isExternalOnly(href)) {
      Linking.openURL(`${API_URL}${href}`)
      return
    }
    // Converte href do site para rota do expo-router
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.push(href as Parameters<typeof router.push>[0])
  }

  // ── Classes de estilo reutilizáveis (equivalentes CSS do site) ─────────────
  // topItem: "flex h-12 items-center rounded-lg px-4 text-base font-medium text-white/75"
  // subItem: "flex h-11 items-center gap-3 rounded-lg pl-8 pr-4 text-sm font-medium text-white/75"
  // sectionBtn: "flex h-12 w-full items-center justify-between rounded-lg px-4 text-base font-semibold text-white/75"

  const Divider = () => <View style={s.divider} />

  const TopLink = ({ href, label }: { href: string; label: string }) => (
    <Pressable onPress={() => navigate(href)} style={s.topItem} accessibilityRole="link">
      <Text style={s.topItemText}>{label}</Text>
    </Pressable>
  )

  const SectionBtn = ({ label, open, onToggle }: { label: string; open: boolean; onToggle: () => void }) => (
    <Pressable onPress={onToggle} style={s.sectionBtn} accessibilityRole="button" accessibilityState={{ expanded: open }}>
      <Text style={s.sectionBtnText}>{label}</Text>
      <Chevron open={open} />
    </Pressable>
  )

  const SubLink = ({ href, icon, label }: { href: string; icon: string; label: string }) => (
    <Pressable onPress={() => navigate(href)} style={s.subItem} accessibilityRole="link">
      <MenuIcon name={icon} />
      <Text style={s.subItemText}>{label}</Text>
    </Pressable>
  )

  const SectionLabel = ({ text }: { text: string }) => (
    <Text style={s.sectionLabel}>{text}</Text>
  )

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      {/* Overlay */}
      <Pressable style={s.overlay} onPress={onClose} accessibilityLabel="Fechar menu" />

      {/* Drawer navy */}
      <SafeAreaView style={s.drawer} accessibilityRole="menu" accessibilityLabel="Navegação mobile">
        <ScrollView
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Início ── */}
          <TopLink href="/" label="Início" />

          {/* ── Sobre ── */}
          <TopLink href="/sobre" label="Sobre" />

          {/* ── TEMA no topo — handoff §0 (correção "MobileMenu — logado") ── */}
          <SectionLabel text="TEMA" />
          <ThemeToggle
            value={preference}
            onChange={(pref: ThemePreference) => setPreference(pref)}
          />

          <Divider />

          {/* ── Explorar expansível ── */}
          <SectionBtn label="Explorar" open={explorarOpen} onToggle={() => setExplorarOpen(v => !v)} />
          {explorarOpen && EXPLORAR_LINKS.map(link => (
            <SubLink key={link.href} href={link.href} icon={link.icon} label={link.label} />
          ))}

          {/* ── Anunciar — pill verde (não-admins) ── */}
          {!isAdmin && (
            <>
              <Pressable
                onPress={() => setAnunciarOpen(v => !v)}
                style={s.anunciarBtn}
                accessibilityRole="button"
                accessibilityState={{ expanded: anunciarOpen }}
              >
                <Text style={s.anunciarText}>Anunciar</Text>
                <Chevron open={anunciarOpen} />
              </Pressable>
              {anunciarOpen && ANUNCIAR_LINKS.map(link => (
                <SubLink key={link.href} href={link.href} icon={link.icon} label={link.label} />
              ))}
            </>
          )}

          {/* ── Logado ── */}
          {isLoggedIn && (
            <>
              <Divider />

              {/* ATIVIDADE — rótulo verbatim + 4 links na ordem exata (handoff §0) */}
              <SectionLabel text={isAdmin ? "ADMIN" : "ATIVIDADE"} />
              {ATIVIDADE_LINKS.map(link => (
                <Pressable key={link.href} onPress={() => navigate(link.href)} style={[s.subItem, { paddingLeft: 16 }]} accessibilityRole="link">
                  <MenuIcon name={link.icon} />
                  <Text style={s.subItemText}>{link.label}</Text>
                </Pressable>
              ))}

              <Divider />

              {/* Minha Conta expansível */}
              <SectionBtn label="Minha Conta" open={accountOpen} onToggle={() => setAccountOpen(v => !v)} />
              {accountOpen && ACCOUNT_LINKS.map(link => (
                <SubLink key={link.href} href={link.href} icon={link.icon} label={link.label} />
              ))}

              <Divider />

              {/* Sair */}
              <Pressable
                onPress={() => { onClose(); onLogout?.() }}
                style={s.signOutBtn}
                accessibilityRole="button"
              >
                <SignOutIcon />
                <Text style={s.signOutText}>Sair</Text>
              </Pressable>

              <Divider />

              {/* Central de Ajuda */}
              <SectionBtn label="Central de Ajuda" open={helpOpen} onToggle={() => setHelpOpen(v => !v)} />
              {helpOpen && (
                <>
                  {HELP_LINKS.map(link => (
                    <SubLink key={link.href} href={link.href} icon={link.icon} label={link.label} />
                  ))}
                  <Pressable onPress={() => navigate("/ajuda")} style={s.subItem} accessibilityRole="link">
                    <Text style={[s.subItemText, { color: "#5BD08B" }]}>Ver tudo →</Text>
                  </Pressable>
                </>
              )}
            </>
          )}

          {/* ── Não logado ── */}
          {!isLoggedIn && (
            <>
              <Divider />
              <TopLink href="/login" label="Entrar" />
              <Divider />
              <SectionBtn label="Central de Ajuda" open={helpOpen} onToggle={() => setHelpOpen(v => !v)} />
              {helpOpen && (
                <>
                  {HELP_LINKS.map(link => (
                    <SubLink key={link.href} href={link.href} icon={link.icon} label={link.label} />
                  ))}
                  <Pressable onPress={() => navigate("/ajuda")} style={s.subItem} accessibilityRole="link">
                    <Text style={[s.subItemText, { color: "#5BD08B" }]}>Ver tudo →</Text>
                  </Pressable>
                </>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
// Cores e dimensões transcritas das classes CSS de MobileMenu.tsx do site
const s = StyleSheet.create({
  overlay: {
    flex:            1,
    backgroundColor: "rgba(0,0,0,0.50)",  // "bg-black/50"
  },
  drawer: {
    // "bg-primary border-t border-white/10" — MobileMenu.tsx do site
    position:        "absolute",
    top:             0,
    left:            0,
    right:           0,
    bottom:          0,
    backgroundColor: "#003366",
    borderTopWidth:  1,
    borderTopColor:  "rgba(255,255,255,0.10)",
  },
  scrollContent: {
    paddingVertical:   12,
    paddingHorizontal: 16,
    gap:               4,
    paddingBottom:     40,
  },
  divider: {
    height:          1,
    backgroundColor: "rgba(255,255,255,0.10)",
    marginVertical:  4,
  },
  sectionLabel: {
    // "text-xs font-semibold text-white/80 uppercase tracking-wider" — MobileMenu.tsx
    fontSize:      11,
    fontWeight:    "600",
    color:         "rgba(255,255,255,0.80)",
    letterSpacing: 1,
    paddingHorizontal: 4,
    paddingTop:    8,
    paddingBottom: 4,
  },
  topItem: {
    // "flex h-12 items-center rounded-lg px-4 text-base font-medium text-white/75"
    minHeight:     48,
    justifyContent: "center",
    borderRadius:  8,
    paddingHorizontal: 4,
  },
  topItemText: {
    fontSize:   15,
    fontWeight: "500",
    color:      "rgba(255,255,255,0.75)",
  },
  sectionBtn: {
    // "flex h-12 w-full items-center justify-between rounded-lg px-4 text-base font-semibold text-white/75"
    minHeight:     48,
    flexDirection: "row",
    alignItems:    "center",
    justifyContent: "space-between",
    borderRadius:  8,
    paddingHorizontal: 4,
  },
  sectionBtnText: {
    fontSize:   15,
    fontWeight: "600",
    color:      "rgba(255,255,255,0.75)",
  },
  subItem: {
    // "flex h-11 items-center gap-3 rounded-lg pl-8 pr-4 text-sm font-medium text-white/75"
    minHeight:     44,
    flexDirection: "row",
    alignItems:    "center",
    gap:           12,
    borderRadius:  8,
    paddingLeft:   32,
    paddingRight:  16,
  },
  subItemText: {
    fontSize:   13,
    fontWeight: "500",
    color:      "rgba(255,255,255,0.75)",
    flex:       1,
  },
  anunciarBtn: {
    // "bg-accent text-accent-foreground hover:brightness-105" — accent=#59C686 foreground=#003366
    minHeight:     48,
    flexDirection: "row",
    alignItems:    "center",
    justifyContent: "space-between",
    borderRadius:  8,
    paddingHorizontal: 4,
    backgroundColor: "#59C686",
  },
  anunciarText: {
    fontSize:   15,
    fontWeight: "700",
    color:      "#003366",   // --accent-foreground
  },
  signOutBtn: {
    minHeight:     48,
    flexDirection: "row",
    alignItems:    "center",
    gap:           8,
    borderRadius:  8,
    paddingHorizontal: 4,
  },
  signOutText: {
    // "text-red-300 hover:text-red-200" — MobileMenu.tsx do site
    fontSize:   15,
    fontWeight: "500",
    color:      "#FCA5A5",
  },
})
