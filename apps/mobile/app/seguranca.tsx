// Fonte: app/seguranca/page.tsx
// Página PÚBLICA de Segurança/confiança — NÃO confundir com apps/mobile/app/perfil/seguranca.tsx
// (troca de senha do usuário autenticado).

import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Platform,
} from "react-native"
import { router } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTheme } from "@/lib/theme"
import { API_URL } from "@/lib/api"

// ── Dados verbatim de app/seguranca/page.tsx ─────────────────────────────────

const SECTIONS = [
  {
    id:      "conexao",
    heading: "Conexão sempre criptografada",
    body:    "Toda comunicação entre o seu dispositivo e o ShareO utiliza HTTPS — o protocolo de transferência com criptografia padrão da web. Isso significa que seus dados de login, mensagens e informações pessoais trafegam de forma segura, sem que terceiros possam interceptar ou alterar o conteúdo. Adicionalmente, configuramos HSTS (HTTP Strict Transport Security) para garantir que o navegador nunca abra o ShareO sem criptografia, mesmo se você digitar o endereço sem o \"https://\".",
  },
  {
    id:      "senhas",
    heading: "Senhas nunca ficam visíveis",
    body:    "Sua senha nunca é armazenada em texto puro em nossos servidores. Utilizamos um algoritmo de hash robusto para transformar a senha em um código irreversível antes de salvá-la. Isso significa que nem mesmo a equipe do ShareO consegue ver sua senha — apenas verificar se a que você digitou no login está correta.",
  },
  {
    id:      "ataques",
    heading: "Proteção contra ataques na web",
    body:    "Implementamos cabeçalhos de segurança HTTP para proteger contra os ataques mais comuns da web. Entre eles está o CSP (Content Security Policy), que impede que scripts maliciosos sejam executados nas páginas do ShareO — uma proteção efetiva contra ataques do tipo XSS (Cross-Site Scripting). Também limitamos a quantidade de tentativas de login por endereço IP, dificultando tentativas de acesso por força bruta.",
  },
  {
    id:      "documentos",
    heading: "Documentos de identidade em área privada",
    body:    "Documentos de identidade enviados para verificação de conta (como fotos do documento com CPF/CNPJ) são armazenados em compartimento privado — diferente das fotos de itens, que são públicas. O acesso a esses documentos é restrito e controlado, e eles nunca são exibidos publicamente.",
  },
] as const

// ── Contatos de reporte — verbatim de page.tsx linhas 87-103 ─────────────────

const REPORT_CONTACTS = [
  {
    id:      "email",
    label:   "E-mail:",
    display: "seguranca@shareo.com.br",
    href:    "mailto:seguranca@shareo.com.br",
    isExternal: false,
  },
  {
    id:      "securitytxt",
    label:   "Arquivo de contato (RFC 9116):",
    display: "/.well-known/security.txt",
    href:    "/.well-known/security.txt",
    isExternal: true,
  },
] as const

// ── Links do rodapé — verbatim de page.tsx linhas 113-115 ────────────────────

const FOOTER_LINKS = [
  { id: "privacidade", label: "Privacidade",       href: "/privacidade" },
  { id: "termos",      label: "Termos de uso",     href: "/termos"      },
  { id: "ajuda",       label: "Central de ajuda",  href: "/ajuda"       },
] as const

// Rotas do site com tela nativa equivalente — navegam via router.push.
// (2026-07-09: 6 páginas do rodapé transcritas para telas nativas.)
const NATIVE_ROUTES = new Set(["/privacidade", "/termos", "/ajuda", "/comunidade", "/ganhar", "/sobre"])

export default function SegurancaScreen() {
  const { tokens } = useTheme()
  const insets     = useSafeAreaInsets()

  function openExternal(href: string) {
    // 2026-07-09: rotas com tela nativa (ex: /privacidade, /termos, /ajuda)
    // navegam nativo; /.well-known/security.txt e mailto seguem no navegador.
    if (NATIVE_ROUTES.has(href)) {
      router.push(href as never)
      return
    }
    const url = href.startsWith("mailto:") ? href : `${API_URL}${href}`
    Linking.openURL(url)
  }

  return (
    <View style={[s.root, { backgroundColor: tokens.bg }]}>

      {/* ── Header — padrão de sobre.tsx / dados.tsx ── */}
      <View
        style={[
          s.header,
          {
            paddingTop:      insets.top + 8,
            backgroundColor: tokens.surface,
            borderColor:     tokens.border,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityLabel="Voltar"
          accessibilityRole="button"
          style={s.backBtn}
        >
          <Text style={[s.backArrow, { color: tokens.muted }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: tokens.navy }]}>Segurança</Text>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Título e subtítulo — verbatim de page.tsx linhas 16-17 ── */}
        <View style={[s.hero, { backgroundColor: tokens.bg }]}>
          <Text
            style={[s.heroTitle, { color: tokens.navy }]}
            accessibilityRole="header"
          >
            Segurança
          </Text>
          <Text style={[s.heroSubtitle, { color: tokens.muted }]}>
            Como protegemos você e seus dados na plataforma
          </Text>
        </View>

        {/* ── Seções de texto — verbatim de page.tsx linhas 21-62 ── */}
        <View style={s.sectionsWrap}>
          {SECTIONS.map((sec) => (
            <View key={sec.id} style={s.section}>
              <Text style={[s.sectionHeading, { color: tokens.navy }]}>
                {sec.heading}
              </Text>
              <Text style={[s.paragraph, { color: tokens.muted }]}>
                {sec.body}
              </Text>
            </View>
          ))}

          {/* ── Seção LGPD — verbatim de page.tsx linhas 64-76 ──
              Link inline /privacidade → abre no navegador (rota não existe nativamente). */}
          <View style={s.section}>
            <Text style={[s.sectionHeading, { color: tokens.navy }]}>
              Conformidade com a LGPD
            </Text>
            <Text style={[s.paragraph, { color: tokens.muted }]}>
              {"O ShareO trata seus dados pessoais em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018). Você tem direito de acessar, corrigir ou solicitar a exclusão dos seus dados a qualquer momento. Para mais detalhes sobre quais dados coletamos e como os utilizamos, consulte nossa "}
              <Text
                style={[s.link, { color: tokens.green }]}
                onPress={() => openExternal("/privacidade")}
                accessibilityRole="link"
              >
                Política de Privacidade
              </Text>
              {"."}</Text>
          </View>

          {/* ── Seção de reporte de vulnerabilidade — verbatim de page.tsx linhas 78-108 ── */}
          <View style={s.section}>
            <Text style={[s.sectionHeading, { color: tokens.navy }]}>
              Como reportar uma vulnerabilidade
            </Text>
            <Text style={[s.paragraph, { color: tokens.muted }]}>
              Se você encontrou um problema de segurança no ShareO, pedimos que entre em contato de forma responsável antes de tornar o problema público. Agradecemos e levamos a sério todo relatório enviado.
            </Text>

            {/* Bullet list — verbatim de page.tsx linhas 85-103 */}
            <View style={s.bulletList}>
              {REPORT_CONTACTS.map((contact) => (
                <View key={contact.id} style={s.bulletItem}>
                  <Text style={[s.bulletDot, { color: tokens.muted }]}>•</Text>
                  <Text style={[s.bulletText, { color: tokens.muted }]}>
                    {contact.label}{" "}
                    <Text
                      style={[s.link, { color: tokens.green }]}
                      onPress={() => openExternal(contact.href)}
                      accessibilityRole="link"
                    >
                      {contact.display}
                    </Text>
                  </Text>
                </View>
              ))}
            </View>

            <Text style={[s.paragraph, { color: tokens.muted }]}>
              Responderemos em até 5 dias úteis. Não publique detalhes da vulnerabilidade antes de recebermos sua mensagem e combinarmos uma data para divulgação coordenada.
            </Text>
          </View>
        </View>

        {/* ── Links de rodapé — verbatim de page.tsx linhas 112-116 ──
            /privacidade, /termos e /ajuda não existem como rotas nativas →
            abrir via Linking no site. */}
        <View style={[s.footer, { borderColor: tokens.border }]}>
          {FOOTER_LINKS.map((link, idx) => (
            <TouchableOpacity
              key={link.id}
              onPress={() => openExternal(link.href)}
              accessibilityRole="link"
              accessibilityLabel={link.label}
              style={[s.footerLinkBtn, idx < FOOTER_LINKS.length - 1 && s.footerLinkBtnGap]}
            >
              <Text style={[s.footerLink, { color: tokens.green }]}>
                {link.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  root:   { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingBottom: 40 },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               12,
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

  // ── Hero / página-título ─────────────────────────────────────────────────────
  // Equivalente ao <h1> + subtítulo do site (page.tsx linhas 16-17).
  hero: {
    paddingHorizontal: 16,
    paddingTop:        24,
    paddingBottom:     8,
    gap:               4,
  },
  heroTitle: {
    fontSize:   26,
    fontWeight: "800",
    lineHeight: 32,
  },
  heroSubtitle: {
    fontSize:  13,
    lineHeight: 18,
  },

  // ── Seções de conteúdo ───────────────────────────────────────────────────────
  sectionsWrap: {
    paddingHorizontal: 16,
    gap:               20,
    marginTop:         16,
  },
  section: {
    gap: 8,
  },
  sectionHeading: {
    fontSize:   16,
    fontWeight: "700",
    lineHeight: 22,
  },
  paragraph: {
    fontSize:   14,
    lineHeight: 22,
  },
  link: {
    textDecorationLine: "underline",
  },

  // ── Bullet list (seção de reporte) ───────────────────────────────────────────
  bulletList: {
    gap: 6,
    paddingLeft: 4,
  },
  bulletItem: {
    flexDirection: "row",
    alignItems:    "flex-start",
    gap:           6,
  },
  bulletDot: {
    fontSize:   14,
    lineHeight: 22,
    marginTop:  0,
  },
  bulletText: {
    flex:       1,
    fontSize:   14,
    lineHeight: 22,
  },

  // ── Rodapé de links ──────────────────────────────────────────────────────────
  footer: {
    flexDirection:   "row",
    flexWrap:        "wrap",
    gap:             4,
    marginTop:       32,
    marginHorizontal: 16,
    paddingTop:      20,
    borderTopWidth:  1,
    paddingBottom:   8,
    ...Platform.select({
      android: {},
    }),
  },
  footerLinkBtn: {
    minHeight: 44,
    justifyContent: "center",
  },
  footerLinkBtnGap: {
    marginRight: 12,
  },
  footerLink: {
    fontSize:           13,
    textDecorationLine: "underline",
  },
})
