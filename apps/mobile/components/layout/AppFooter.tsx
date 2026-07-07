// Fonte: components/layout/AppFooter.tsx
// Transcrição literal do rodapé global do ShareO para React Native.
// Logo, tagline, 3 colunas de links, barra inferior e 3 selos de confiança
// transcritos verbatim do componente do site. Links abrem nativamente quando
// a rota existe no app; demais links abrem no navegador via Linking.openURL.

import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Linking,
  StyleSheet,
} from "react-native"
import { router } from "expo-router"
import Svg, { Rect, Path, Polyline } from "react-native-svg"
import { API_URL } from "@/lib/api"

// Versão do app mobile — transcrita de package.json (apps/mobile/package.json "version").
// Atualizar junto com o bump de versão do app.
const APP_VERSION = "1.0.0"

// Rotas nativas do app — para essas usa router.push(); demais abrem no browser.
// Revisão s41: incluídas /perfil, /sobre (tinham tela nativa mas abriam o
// navegador) e o alias /cadastro→/register (cadastro nativo).
const NATIVE_ROUTES = new Set([
  "/explorar", "/itens/novo", "/reservas", "/mensagens",
  "/login", "/perfil", "/sobre", "/register",
])
// Aliases: href do site → rota nativa equivalente (nome diverge).
const ROUTE_ALIASES: Record<string, string> = {
  "/itens":    "/explorar", // Explorar itens
  "/cadastro": "/register", // Criar conta → tela nativa (auth)/register
}

function openLink(href: string) {
  const native = ROUTE_ALIASES[href] ?? href
  if (NATIVE_ROUTES.has(native)) {
    router.push(native as Parameters<typeof router.push>[0])
  } else {
    Linking.openURL(`${API_URL}${href}`)
  }
}

// ── Ícones dos selos de confiança — transcritos verbatim de AppFooter.tsx do site ──

function LockIcon() {
  return (
    <Svg
      width={12}
      height={12}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#FFFFFF"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Rect x="3" y="11" width="18" height="11" rx="2" />
      <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </Svg>
  )
}

function CheckIcon() {
  return (
    <Svg
      width={12}
      height={12}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#FFFFFF"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Polyline points="20 6 9 17 4 12" />
    </Svg>
  )
}

function ShieldIcon() {
  return (
    <Svg
      width={12}
      height={12}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#FFFFFF"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M12 22c-4-2-8-6-8-11V5l8-3 8 3v6c0 5-4 9-8 11z" />
    </Svg>
  )
}

// ── Colunas de links — transcritas verbatim de AppFooter.tsx do site ──────────

const PLATAFORMA = [
  { href: "/itens",      label: "Explorar itens"  },
  { href: "/itens/novo", label: "Anunciar item"   },
  { href: "/reservas",   label: "Minhas reservas" },
  { href: "/mensagens",  label: "Mensagens"       },
]

const CONTA = [
  { href: "/login",    label: "Entrar"      },
  { href: "/cadastro", label: "Criar conta" },
  { href: "/perfil",   label: "Meu perfil"  },
]

const SUPORTE = [
  { href: "/sobre",       label: "Sobre o Shareo"  },
  { href: "/comunidade",  label: "Comunidade"       },
  { href: "/ajuda",       label: "Central de ajuda" },
  { href: "/ganhar",      label: "Como ganhar"      },
  { href: "/termos",      label: "Termos de uso"    },
  { href: "/privacidade", label: "Privacidade"      },
  { href: "/seguranca",   label: "Segurança"        },
]

// ── AppFooter ─────────────────────────────────────────────────────────────────
export function AppFooter() {
  const year = new Date().getFullYear()

  return (
    <View style={s.footer} accessibilityLabel="Rodapé ShareO">
      <View style={s.container}>
        {/* Marca + tagline — fonte: AppFooter.tsx do site */}
        <View style={s.brand}>
          <View style={s.logoWrap}>
            <Image
              // eslint-disable-next-line @typescript-eslint/no-require-imports
              source={require("../../assets/shareo-logo.png")}
              style={s.logo}
              resizeMode="contain"
              accessibilityLabel="ShareO"
            />
          </View>
          <Text style={s.tagline}>Por que comprar se você pode alugar?</Text>
          <Text style={s.desc}>
            <Text style={s.descBold}>Marketplace de geração de renda.</Text>
            {" Anuncie o que você tem e alugue o que você precisa."}
          </Text>
          <Text style={s.desenvolvido}>
            {"Desenvolvido por "}
            <Text style={s.desenvolvidoBold}>Pratika IA</Text>
          </Text>
        </View>

        {/* Links — 3 colunas — fonte: nav[aria-label="Links do rodapé"] de AppFooter.tsx */}
        <View style={s.linksGrid} accessibilityLabel="Links do rodapé">
          {/* Plataforma */}
          <View style={s.linkCol}>
            <Text style={s.colHeader}>Plataforma</Text>
            {PLATAFORMA.map(({ href, label }) => (
              <TouchableOpacity
                key={label}
                onPress={() => openLink(href)}
                accessibilityRole="link"
                accessibilityLabel={label}
              >
                <Text style={s.linkText}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Conta */}
          <View style={s.linkCol}>
            <Text style={s.colHeader}>Conta</Text>
            {CONTA.map(({ href, label }) => (
              <TouchableOpacity
                key={label}
                onPress={() => openLink(href)}
                accessibilityRole="link"
                accessibilityLabel={label}
              >
                <Text style={s.linkText}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Suporte */}
          <View style={s.linkCol}>
            <Text style={s.colHeader}>Suporte</Text>
            {SUPORTE.map(({ href, label }) => (
              <TouchableOpacity
                key={label}
                onPress={() => openLink(href)}
                accessibilityRole="link"
                accessibilityLabel={label}
              >
                <Text style={s.linkText}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Barra inferior — border-t border-white/20 — fonte: AppFooter.tsx do site */}
      <View style={s.bottomBar}>
        <Text style={s.copyright}>
          {`© ${year} ShareO · Todos os direitos reservados. · v${APP_VERSION}`}
        </Text>

        {/* Selos de confiança — transcritos verbatim */}
        <View style={s.badgesRow}>
          {/* Pagamento seguro → /seguranca */}
          <TouchableOpacity
            onPress={() => openLink("/seguranca")}
            style={s.badge}
            accessibilityRole="link"
            accessibilityLabel="Pagamento seguro"
          >
            <LockIcon />
            <Text style={s.badgeText}>Pagamento seguro</Text>
          </TouchableOpacity>

          {/* Usuários verificados → /seguranca */}
          <TouchableOpacity
            onPress={() => openLink("/seguranca")}
            style={s.badge}
            accessibilityRole="link"
            accessibilityLabel="Usuários verificados"
          >
            <CheckIcon />
            <Text style={s.badgeText}>Usuários verificados</Text>
          </TouchableOpacity>

          {/* Economia circular — <span> (sem link) no site */}
          <View style={s.badge} accessibilityLabel="Economia circular">
            <ShieldIcon />
            <Text style={s.badgeText}>Economia circular</Text>
          </View>
        </View>
      </View>
    </View>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────
// Cores e dimensões transcritas das classes CSS de AppFooter.tsx do site.
// bg-brand = #007B3C; text-white/90 = rgba(255,255,255,0.90).
const s = StyleSheet.create({
  footer: { backgroundColor: "#007B3C" },

  container: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 32,
    gap: 32,
  },

  // Brand
  brand: { gap: 10 },
  logoWrap: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: "flex-start",
  },
  logo: { width: 110, height: 28 },
  tagline: { fontSize: 14, color: "#FFFFFF" },
  desc: { fontSize: 12, color: "rgba(255,255,255,0.90)", lineHeight: 18 },
  descBold: { fontWeight: "700", color: "#FFFFFF" },
  desenvolvido: {
    fontSize: 11, color: "rgba(255,255,255,0.90)", marginTop: 8,
  },
  desenvolvidoBold: { fontWeight: "600", color: "#FFFFFF" },

  // Links
  linksGrid: { flexDirection: "row", gap: 24, flexWrap: "wrap" },
  linkCol: { gap: 8, minWidth: 90 },
  colHeader: {
    fontSize: 11, fontWeight: "700",
    color: "rgba(255,255,255,0.90)",
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 4,
  },
  linkText: { fontSize: 14, color: "rgba(255,255,255,0.90)" },

  // Bottom bar
  bottomBar: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.20)",
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
    gap: 12,
  },
  copyright: { fontSize: 12, color: "rgba(255,255,255,0.90)" },
  badgesRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.20)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    minHeight: 28,
  },
  badgeText: { fontSize: 12, fontWeight: "600", color: "#FFFFFF" },
})
