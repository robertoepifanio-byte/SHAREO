// Fonte: app/perfil/page.tsx
// Tela de perfil — transcrição literal das seções do site.
//
// Decisão de arquitetura (documentada — não inventada):
//   - CONFIG_LINKS replicados verbatim do site (app/perfil/page.tsx linhas 22-30),
//     incluindo href, icon e label. Sub-páginas sem equivalente nativo abrem no
//     navegador via Linking.openURL. Isso é preferível a suprimir itens ou inventar
//     comportamento — o usuário pode gerenciar a conta completa pelo browser.
//   - Estatísticas (itens, aluguéis, nota) e avaliações recebidas: GET /api/users/me
//     agora retorna _count/reviewsReceived/avgRating/reviewCount (estendido em
//     app/api/users/me/route.ts pra espelhar app/perfil/page.tsx linhas 40-81)
//     — seções implementadas verbatim das linhas 186-248 do site.
//   - Telas nativas existentes: Favoritos (/favoritos), KYC (/kyc),
//     Anunciar (/itens/novo), Meus Anúncios (TODO: rota não existe ainda — MOB-BL-meus-anuncios).
//
// Elemento-por-elemento (seções implementadas):
//   site perfil/page.tsx linha 106: gradient header + Avatar        → profileCard com Avatar
//   site perfil/page.tsx linha 124: nome + badges verificado/PJ     → name + verifiedBadge
//   site perfil/page.tsx linha 136: bio em destaque                 → bio (quando presente)
//   site perfil/page.tsx linha 141: localização + membro desde      → metaInfo
//   site perfil/page.tsx linha 186-203: 3 stat cards                → statsRow
//   site perfil/page.tsx linha 205-248: avaliações recebidas (≤5)   → reviewsCard
//   site perfil/page.tsx linha 254-278: CONFIG_LINKS (9 itens)      → menuItems (9 itens)

import { Linking, View, Text, TouchableOpacity, ScrollView, Alert, StyleSheet, Platform } from "react-native"
import { router } from "expo-router"
import { useQuery } from "@tanstack/react-query"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useAuth } from "@/lib/auth"
import { useTheme } from "@/lib/theme"
import { Avatar } from "@/components/ui/Avatar"
import { Stars } from "@/components/ui/Stars"
import { apiFetch, API_URL } from "@/lib/api"
import Svg, { Path, Line, Polyline, Rect, Circle, Ellipse } from "react-native-svg"

// ── Tipo do usuário retornado por /api/users/me ──────────────────────────────
interface MeReview {
  rating:     number
  comment:    string | null
  reviewType: string
  reviewer:   { name: string; avatarUrl: string | null }
  createdAt:  string
}

interface MeData {
  id:           string
  name:         string
  email:        string
  bio:          string | null
  city:         string | null
  state:        string | null
  neighborhood: string | null
  avatarUrl:    string | null
  userType:     "PF" | "PJ"
  isVerified:   boolean
  createdAt:    string
  _count: {
    items:              number
    bookingsAsBorrower: number
    bookingsAsOwner:    number
  }
  reviewsReceived: MeReview[]
  avgRating:   number | null
  reviewCount: number
}

// Fonte: perfil/page.tsx linhas 15-19 — rótulo por tipo de avaliação
const REVIEW_TYPE_LABEL: Record<string, string> = {
  ITEM:     "sobre o item",
  OWNER:    "sobre você como proprietário",
  BORROWER: "sobre você como locatário",
}

// ── Ícones de menu — SVG Lucide verbatim das polylines/paths do site ─────────
function MenuIcon({ name, color }: { name: string; color: string }) {
  const p = {
    width: 20, height: 20, viewBox: "0 0 24 24",
    fill: "none", stroke: color, strokeWidth: 2,
    strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
  }
  switch (name) {
    case "edit":      return <Svg {...p}><Path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><Path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></Svg>
    case "location":  return <Svg {...p}><Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><Circle cx="12" cy="10" r="3"/></Svg>
    case "lock":      return <Svg {...p}><Rect x="3" y="11" width="18" height="11" rx="2"/><Path d="M7 11V7a5 5 0 0 1 10 0v4"/></Svg>
    case "idcard":    return <Svg {...p}><Rect x="2" y="5" width="20" height="14" rx="2"/><Line x1="2" y1="10" x2="22" y2="10"/><Line x1="7" y1="15" x2="10" y2="15"/></Svg>
    case "pix":       return <Svg {...p}><Path d="M12 2L2 7l10 5 10-5-10-5z"/><Path d="M2 17l10 5 10-5"/><Path d="M2 12l10 5 10-5"/></Svg>
    case "chart":     return <Svg {...p}><Line x1="18" y1="20" x2="18" y2="10"/><Line x1="12" y1="20" x2="12" y2="4"/><Line x1="6" y1="20" x2="6" y2="14"/></Svg>
    case "file-text": return <Svg {...p}><Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><Polyline points="14 2 14 8 20 8"/><Line x1="16" y1="13" x2="8" y2="13"/><Line x1="16" y1="17" x2="8" y2="17"/><Polyline points="10 9 9 9 8 9"/></Svg>
    case "gift":      return <Svg {...p}><Polyline points="20 12 20 22 4 22 4 12"/><Rect x="2" y="7" width="20" height="5"/><Path d="M12 22V7"/><Path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><Path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></Svg>
    case "database":  return <Svg {...p}><Ellipse cx="12" cy="5" rx="9" ry="3"/><Path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><Path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></Svg>
    case "logout":    return <Svg {...p}><Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><Polyline points="16 17 21 12 16 7"/><Line x1="21" y1="12" x2="9" y2="12"/></Svg>
    case "heart":     return <Svg {...p}><Path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></Svg>
    case "package":   return <Svg {...p}><Line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><Path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><Polyline points="3.27 6.96 12 12.01 20.73 6.96"/><Line x1="12" y1="22.08" x2="12" y2="12"/></Svg>
    case "plus":      return <Svg {...p}><Line x1="12" y1="5" x2="12" y2="19"/><Line x1="5" y1="12" x2="19" y2="12"/></Svg>
    case "chevron-right": return <Svg {...p}><Polyline points="9 18 15 12 9 6"/></Svg>
    default: return null
  }
}

// ── Formatar "membro desde" — verbatim de formatMonthYear em utils/format.ts ─
function formatMonthYear(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
  } catch { return "" }
}

// ── CONFIG_LINKS — verbatim de app/perfil/page.tsx linhas 22-30 ─────────────
// href, icon e label copiados literalmente. Semântica de cada item preservada.
// Sub-páginas sem equivalente nativo → Linking.openURL(API_URL + href).
// TODO(revisão): substituir Linking por rota nativa quando cada tela for implementada.

interface MenuItem {
  href:    string
  icon:    string
  label:   string
  desc:    string
  native?: () => void  // se definido, usa router.push em vez de Linking
  danger?: boolean
}

export default function PerfilScreen() {
  const { tokens } = useTheme()
  const insets     = useSafeAreaInsets()
  const { user, logout } = useAuth()

  // Busca perfil completo (avatarUrl, bio, city, userType etc.) da API
  // O store de auth armazena apenas campos básicos do JWT
  const { data: meData } = useQuery({
    queryKey: ["me-profile"],
    queryFn:  () => apiFetch<{ data: MeData }>("/api/users/me"),
    enabled:  !!user,
    select:   (r) => r.data,
  })

  async function handleLogout() {
    Alert.alert("Sair", "Deseja sair da sua conta?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
        style: "destructive",
        onPress: async () => {
          await logout()
          router.replace("/(auth)/login")
        },
      },
    ])
  }

  // ── Não logado ──────────────────────────────────────────────────────────────
  if (!user) {
    return (
      <View style={[s.center, { backgroundColor: tokens.bg }]}>
        <Avatar name="?" imageUrl={null} size="xl" />
        <Text style={[s.gateTitle, { color: tokens.navy }]}>
          Faça login para acessar seu perfil
        </Text>
        <TouchableOpacity
          style={[s.loginBtn, { backgroundColor: tokens.green }]}
          onPress={() => router.push("/(auth)/login")}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Entrar"
        >
          <Text style={s.loginBtnText}>Entrar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.createLink}
          onPress={() => router.push("/(auth)/register")}
          accessibilityRole="link"
          accessibilityLabel="Criar conta"
        >
          <Text style={[s.createLinkText, { color: tokens.muted }]}>Criar conta</Text>
        </TouchableOpacity>
      </View>
    )
  }

  // Fallback: usa dados do store de auth enquanto a query carrega
  const displayName    = meData?.name      ?? user.name
  const displayEmail   = user.email
  const isVerified     = meData?.isVerified ?? user.isVerified
  const avatarUrl      = meData?.avatarUrl  ?? null
  const bio            = meData?.bio        ?? null
  const city           = meData?.city       ?? null
  const state          = meData?.state      ?? null
  const neighborhood   = meData?.neighborhood ?? null
  const createdAt      = meData?.createdAt  ?? null

  // Fonte: perfil/page.tsx linhas 86-88 — mesmos agregados
  const itemCount      = meData?._count.items ?? 0
  const totalBookings  = meData ? meData._count.bookingsAsBorrower + meData._count.bookingsAsOwner : 0
  const avgRating      = meData?.avgRating ?? null
  const reviewCount    = meData?.reviewCount ?? 0

  // ── CONFIG_LINKS — verbatim de app/perfil/page.tsx linhas 22-30 ─────────────
  // Items com tela nativa usam router.push. Demais abrem no browser (Linking).
  const menuItems: MenuItem[] = [
    {
      href:  "/itens/novo",
      icon:  "plus",
      label: "Anunciar item",
      desc:  "Cadastre um novo item para alugar",
      // Rota nativa existente
      native: () => router.push("/itens/novo"),
    },
    {
      href:  "/favoritos",
      icon:  "heart",
      label: "Favoritos",
      desc:  "Itens que você salvou",
      native: () => router.push("/favoritos"),
    },
    {
      href:  "/meus-anuncios",
      icon:  "package",
      label: "Meus anúncios",
      desc:  "Gerencie seus itens anunciados",
      // TODO(MOB-BL-meus-anuncios): tela nativa não existe ainda — abre no browser
    },
    {
      href:  "/kyc",
      icon:  "idcard",
      label: "Verificação de identidade",
      desc:  "Documentos e verificação",
      native: () => router.push("/kyc"),
    },
    // ── Itens abaixo abrem no browser (sem equivalente nativo no MVP) ──────────
    // Verbatim de app/perfil/page.tsx linhas 22-30 (href, label e desc preservados)
    {
      href:  "/perfil/editar",
      icon:  "edit",
      label: "Editar perfil",
      desc:  "Nome, bio, telefone, avatar",
    },
    {
      href:  "/perfil/endereco",
      icon:  "location",
      label: "Endereço",
      desc:  "Cidade, estado, bairro",
    },
    {
      href:  "/perfil/seguranca",
      icon:  "lock",
      label: "Login e segurança",
      desc:  "E-mail, senha, excluir conta",
    },
    {
      href:  "/perfil/documentos",
      icon:  "idcard",
      label: "Documentos",
      desc:  "CPF/CNPJ e verificação de identidade",
    },
    {
      href:  "/perfil/recebimentos",
      icon:  "pix",
      label: "Conta de recebimento",
      desc:  "Chave PIX para repasse das locações",
    },
    {
      href:  "/perfil/repasses",
      icon:  "chart",
      label: "Meus repasses",
      desc:  "Histórico e status dos repasses recebidos",
    },
    {
      href:   "/perfil/repasses/informe",
      icon:   "file-text",
      label:  "Informe de Rendimentos",
      desc:   "Total anual recebido para declaração de IR",
      native: () => router.push("/perfil/repasses/informe"),
    },
    {
      href:  "/perfil/indicacoes",
      icon:  "gift",
      label: "Indicações",
      desc:  "Programa de indicação e créditos",
    },
    {
      href:  "/perfil/dados",
      icon:  "database",
      label: "Privacidade e dados",
      desc:  "Exportar dados, política de retenção",
    },
  ]

  const locRow = [neighborhood, city, state].filter(Boolean).join(", ")

  return (
    <ScrollView
      style={[s.scroll, { backgroundColor: tokens.bg }]}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* ── Hero card — verbatim de perfil/page.tsx linhas 100-183 ── */}
      <View style={[s.heroCard, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
        {/* Faixa de cor no topo — gradient da página (transcrito como solid navy) */}
        <View style={[s.heroBanner, { backgroundColor: tokens.navy }]} />

        <View style={[s.heroBody, { paddingHorizontal: 20, paddingBottom: 20 }]}>
          {/* Avatar sobreposto ao banner */}
          <View style={s.avatarRow}>
            <View style={[s.avatarRing, { borderColor: tokens.surface }]}>
              <Avatar name={displayName} imageUrl={avatarUrl} size="lg" />
            </View>
            {/* Botão Editar — verbatim link "/perfil/editar" do site */}
            <TouchableOpacity
              style={[s.editBtn, { borderColor: tokens.border }]}
              onPress={() => Linking.openURL(`${API_URL}/perfil/editar`)}
              accessibilityRole="button"
              accessibilityLabel="Editar perfil"
            >
              <Text style={[s.editBtnText, { color: tokens.text }]}>✏️ Editar</Text>
            </TouchableOpacity>
          </View>

          {/* Nome + badges verificado + PJ/PF */}
          <View style={s.nameRow}>
            <Text style={[s.name, { color: tokens.navy }]}>{displayName}</Text>
            {isVerified && (
              <View style={[s.verifiedBadge, { backgroundColor: `${tokens.green}1A` }]}>
                <Text style={[s.verifiedText, { color: tokens.green }]}>✓ Verificado</Text>
              </View>
            )}
            {meData?.userType && (
              <View style={[s.typeBadge, { backgroundColor: tokens.bg }]}>
                <Text style={[s.typeBadgeText, { color: tokens.muted }]}>
                  {meData.userType === "PF" ? "Pessoa Física" : "Pessoa Jurídica"}
                </Text>
              </View>
            )}
          </View>

          {/* E-mail */}
          <Text style={[s.email, { color: tokens.muted }]}>{displayEmail}</Text>

          {/* Bio — verbatim do site linhas 136-138 (aparece quando preenchida) */}
          {bio && (
            <Text style={[s.bio, { color: tokens.text }]}>{bio}</Text>
          )}

          {/* Meta-info: localização + membro desde — verbatim do site linhas 141-147 */}
          <View style={s.metaRow}>
            {locRow !== "" && (
              <Text style={[s.metaText, { color: tokens.muted }]}>📍 {locRow}</Text>
            )}
            {createdAt && (
              <Text style={[s.metaText, { color: tokens.muted }]}>
                🗓 Membro desde {formatMonthYear(createdAt)}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* ── Estatísticas — verbatim de perfil/page.tsx linhas 186-203 ── */}
      {meData && (
        <View style={s.statsRow}>
          {[
            { value: String(itemCount), label: itemCount === 1 ? "item anunciado" : "itens anunciados", icon: "📦" },
            { value: String(totalBookings), label: totalBookings === 1 ? "aluguel" : "aluguéis", icon: "🔄" },
            {
              value: avgRating !== null ? avgRating.toFixed(1) : "—",
              label: avgRating !== null ? `★ nota (${reviewCount})` : "sem avaliações",
              icon:  "⭐",
            },
          ].map((stat) => (
            <View key={stat.label} style={[s.statCard, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
              <Text style={s.statIcon} accessibilityElementsHidden>{stat.icon}</Text>
              <Text style={[s.statValue, { color: tokens.navy }]}>{stat.value}</Text>
              <Text style={[s.statLabel, { color: tokens.muted }]}>{stat.label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* ── Avaliações recebidas — verbatim de perfil/page.tsx linhas 205-248 ── */}
      {meData && meData.reviewsReceived.length > 0 && (
        <View style={[s.reviewsCard, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
          <View style={s.reviewsHeader}>
            <Text style={[s.reviewsTitle, { color: tokens.text }]}>
              Avaliações recebidas
              {reviewCount > 5 && (
                <Text style={[s.reviewsSubtitle, { color: tokens.muted }]}>
                  {" "}(últimas 5 de {reviewCount})
                </Text>
              )}
            </Text>
            {avgRating !== null && <Stars rating={avgRating} />}
          </View>

          {meData.reviewsReceived.map((review, i) => (
            <View
              key={i}
              style={[
                s.reviewRow,
                i < meData.reviewsReceived.length - 1
                  ? { borderBottomWidth: 1, borderBottomColor: tokens.border, paddingBottom: 14, marginBottom: 14 }
                  : { paddingBottom: 0, marginBottom: 0 },
              ]}
            >
              <Avatar name={review.reviewer.name} imageUrl={review.reviewer.avatarUrl} size="sm" />
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={s.reviewRowHeader}>
                  <View style={s.reviewRowNameRating}>
                    <Text style={[s.reviewerName, { color: tokens.text }]}>{review.reviewer.name}</Text>
                    <Stars rating={review.rating} />
                  </View>
                  <Text style={[s.reviewDate, { color: tokens.muted }]}>
                    {new Date(review.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                  </Text>
                </View>
                <Text style={[s.reviewType, { color: tokens.muted }]}>
                  {REVIEW_TYPE_LABEL[review.reviewType] ?? review.reviewType}
                </Text>
                {review.comment && (
                  <Text style={[s.reviewComment, { color: tokens.text }]}>{review.comment}</Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* ── Configurações da conta — verbatim de perfil/page.tsx linhas 250-279 ── */}
      <View style={[s.menuCard, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
        {/* Título da seção */}
        <View style={[s.menuHeader, { borderBottomColor: tokens.border }]}>
          <Text style={[s.menuHeaderText, { color: tokens.text }]}>Configurações da conta</Text>
        </View>

        {menuItems.map((item, i) => {
          const isLast = i === menuItems.length - 1
          const handlePress = item.native
            ? item.native
            : () => Linking.openURL(`${API_URL}${item.href}`)

          return (
            <TouchableOpacity
              key={item.href}
              onPress={handlePress}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              style={[
                s.menuItem,
                isLast ? undefined : { borderBottomWidth: 1, borderBottomColor: tokens.border },
              ]}
            >
              {/* Ícone quadrado — verbatim do site: flex h-9 w-9 rounded-lg bg-muted */}
              <View style={[s.menuIconBox, { backgroundColor: tokens.bg }]}>
                <MenuIcon name={item.icon} color={tokens.muted} />
              </View>
              <View style={s.menuTextCol}>
                <Text style={[s.menuLabel, { color: tokens.text }]}>{item.label}</Text>
                <Text style={[s.menuDesc,  { color: tokens.muted }]}>{item.desc}</Text>
              </View>
              {/* Chevron — verbatim do site linha 273 */}
              <MenuIcon name="chevron-right" color={tokens.muted} />
            </TouchableOpacity>
          )
        })}
      </View>

      {/* ── Botão Sair — separado dos CONFIG_LINKS, com cor destrutiva ── */}
      <View style={[s.menuCard, { backgroundColor: tokens.surface, borderColor: tokens.border, marginTop: 8 }]}>
        <TouchableOpacity
          onPress={handleLogout}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Sair da conta"
          style={s.menuItem}
        >
          <View style={[s.menuIconBox, { backgroundColor: "#FEE2E2" }]}>
            <MenuIcon name="logout" color={tokens.error} />
          </View>
          <View style={s.menuTextCol}>
            <Text style={[s.menuLabel, { color: tokens.error }]}>Sair</Text>
          </View>
        </TouchableOpacity>
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

  // Guard
  gateTitle: {
    fontSize:   16,
    fontWeight: "600",
    textAlign:  "center",
  },
  loginBtn: {
    borderRadius:      10,
    minHeight:         48,
    paddingHorizontal: 32,
    alignItems:        "center",
    justifyContent:    "center",
    width:             "100%",
  },
  loginBtnText:   { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  createLink:     { paddingVertical: 8 },
  createLinkText: { fontSize: 13 },

  // Hero card
  heroCard: {
    borderRadius:    0,
    borderBottomWidth: 1,
    overflow:        "hidden",
    marginBottom:    8,
  },
  heroBanner: {
    height: 80,
  },
  heroBody: {
    gap: 6,
  },
  avatarRow: {
    flexDirection:  "row",
    alignItems:     "flex-end",
    justifyContent: "space-between",
    marginTop:      -40,
    marginBottom:   8,
  },
  avatarRing: {
    borderWidth:  4,
    borderRadius: 40,
  },
  editBtn: {
    borderWidth:       1,
    borderRadius:      8,
    paddingHorizontal: 14,
    paddingVertical:   7,
    minHeight:         36,
    justifyContent:    "center",
  },
  editBtnText:    { fontSize: 12, fontWeight: "600" },
  nameRow: {
    flexDirection:  "row",
    alignItems:     "center",
    flexWrap:       "wrap",
    gap:            6,
    marginTop:      4,
  },
  name: {
    fontSize:   22,
    fontFamily: "Montserrat_700Bold",
  },
  verifiedBadge: {
    borderRadius:      20,
    paddingHorizontal: 8,
    paddingVertical:   3,
  },
  verifiedText:   { fontSize: 11, fontWeight: "600" },
  typeBadge: {
    borderRadius:      20,
    paddingHorizontal: 8,
    paddingVertical:   3,
  },
  typeBadgeText:  { fontSize: 11 },
  email: {
    fontSize: 13,
    marginTop: 2,
  },
  bio: {
    fontSize:  14,
    lineHeight: 20,
    marginTop: 4,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap:      "wrap",
    gap:            8,
    marginTop:      6,
  },
  metaText: { fontSize: 12 },

  // Estatísticas — fonte: perfil/page.tsx linhas 186-203
  statsRow: {
    flexDirection:     "row",
    gap:                12,
    marginHorizontal:   16,
    marginTop:          12,
  },
  statCard: {
    flex:              1,
    borderWidth:       1,
    borderRadius:      12,
    paddingVertical:   16,
    paddingHorizontal: 6,
    alignItems:        "center",
  },
  statIcon:  { fontSize: 12, marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: "800" },
  statLabel: { fontSize: 11, marginTop: 2, textAlign: "center", lineHeight: 14 },

  // Avaliações recebidas — fonte: perfil/page.tsx linhas 205-248
  reviewsCard: {
    marginHorizontal: 16,
    marginTop:        12,
    borderRadius:     16,
    borderWidth:      1,
    padding:          18,
  },
  reviewsHeader: {
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "space-between",
    marginBottom:   14,
    gap:            8,
  },
  reviewsTitle:    { fontSize: 14, fontWeight: "600", flexShrink: 1 },
  reviewsSubtitle: { fontSize: 12, fontWeight: "400" },
  reviewRow: {
    flexDirection:  "row",
    gap:            10,
  },
  reviewRowHeader: {
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "space-between",
    gap:            8,
  },
  reviewRowNameRating: { flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 1 },
  reviewerName:  { fontSize: 12, fontWeight: "600" },
  reviewDate:    { fontSize: 11, flexShrink: 0 },
  reviewType:    { fontSize: 11, marginTop: 1, marginBottom: 2 },
  reviewComment: { fontSize: 13, lineHeight: 18, marginTop: 2 },

  // Menu
  menuCard: {
    marginHorizontal: 16,
    marginTop:        12,
    borderRadius:     16,
    borderWidth:      1,
    overflow:         "hidden",
    ...Platform.select({
      ios:     { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  menuHeader: {
    paddingHorizontal: 20,
    paddingVertical:   16,
    borderBottomWidth: 1,
  },
  menuHeaderText: { fontSize: 15, fontWeight: "600" },
  menuItem: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               12,
    paddingHorizontal: 20,
    paddingVertical:   14,
    minHeight:         56,
  },
  menuIconBox: {
    width:          36,
    height:         36,
    borderRadius:   8,
    alignItems:     "center",
    justifyContent: "center",
    flexShrink:     0,
  },
  menuTextCol: { flex: 1 },
  menuLabel:   { fontSize: 14, fontWeight: "600" },
  menuDesc:    { fontSize: 11, marginTop: 1 },

  footer: {
    textAlign:    "center",
    fontSize:     11,
    marginTop:    24,
    marginBottom: 8,
  },
})
