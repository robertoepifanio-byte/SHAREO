// Fonte: app/anunciar/dicas/page.tsx
/**
 * DicasScreen — apps/mobile/app/anunciar/dicas.tsx
 *
 * Tela nativa "Dicas para Anfitriões".
 * Transcrição literal de app/anunciar/dicas/page.tsx (174 linhas).
 *
 * Página estática — sem autenticação, sem chamadas de API.
 * Todos os textos, emojis, ordem e estrutura são verbatim da fonte.
 *
 * Padrão de estilo: StyleSheet + useTheme() tokens, consistente com
 * perfil/dados.tsx e demais telas do projeto.
 */
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native"
import { router } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTheme } from "@/lib/theme"

// ── Dados das dicas — verbatim de app/anunciar/dicas/page.tsx (linhas 10-83) ──
const DICAS = [
  {
    numero: "01",
    icon:   "📸",
    titulo: "Fotos fazem toda a diferença",
    corpo: [
      "Use luz natural — abra as janelas e fotografe durante o dia.",
      "Mostre o item limpo, organizado e de vários ângulos.",
      "Inclua foto com escala (segure o item ou coloque ao lado de algo conhecido).",
      "Mínimo 3 fotos; itens com 5+ fotos têm 40% mais reservas.",
    ],
    destaque: "Itens com boas fotos recebem 3× mais visualizações.",
  },
  {
    numero: "02",
    icon:   "✍️",
    titulo: "Descrição clara e honesta",
    corpo: [
      "Diga o que o item faz, para quem serve e qual o estado de conservação.",
      "Mencione o que está incluso (acessórios, manual, case).",
      "Seja transparente sobre desgastes — isso evita disputas.",
      "Use palavras que o locatário buscaria: marca, modelo, capacidade.",
    ],
    destaque: "Descrições detalhadas reduzem perguntas e aceleram a reserva.",
  },
  {
    numero: "03",
    icon:   "💰",
    titulo: "Precifique de forma competitiva",
    corpo: [
      "Busque itens similares na sua cidade e veja o preço praticado.",
      "Comece um pouco abaixo para acumular avaliações rapidamente.",
      "Após as primeiras reservas e boas avaliações, ajuste o preço para cima.",
      "Ofereça desconto para semana e mês — aumenta o ticket médio.",
    ],
    destaque: "A regra geral: diária ≈ 5% do valor do produto.",
  },
  {
    numero: "04",
    icon:   "⚡",
    titulo: "Responda rápido",
    corpo: [
      "Locatários escolhem quem responde primeiro — mire em menos de 2h.",
      "Ative notificações do ShareO no celular.",
      "Se não puder alugar em certa data, marque como indisponível antes.",
      "Uma resposta rápida aumenta sua posição nos resultados de busca.",
    ],
    destaque: "Anfitriões que respondem em até 1h têm 2× mais reservas confirmadas.",
  },
  {
    numero: "05",
    icon:   "🤝",
    titulo: "Cuide da experiência do locatário",
    corpo: [
      "Entregue o item limpo e funcionando — sempre.",
      "Explique o uso se necessário (vídeo rápido no WhatsApp resolve muito).",
      "Seja pontual na entrega e retirada.",
      "Após a devolução, avalie o locatário — isso incentiva avaliações de volta.",
    ],
    destaque: "Anfitriões com nota ≥ 4,5 aparecem primeiro na busca.",
  },
  {
    numero: "06",
    icon:   "🔒",
    titulo: "Proteja seu item",
    corpo: [
      "Fotografe o item antes de cada entrega e envie ao locatário.",
      "Combine e documente o estado do item na retirada (chat do ShareO).",
      "Para itens de alto valor, solicite documento e selfie antes de confirmar.",
      "Em caso de dano, abra uma disputa dentro do prazo — a plataforma medeia.",
    ],
    destaque: "Tudo combinado dentro do ShareO tem registro e proteção.",
  },
] as const

export default function DicasScreen() {
  const { tokens } = useTheme()
  const insets     = useSafeAreaInsets()

  return (
    <View style={[s.root, { backgroundColor: tokens.bg }]}>

      {/* ── Header — padrão dados.tsx / kyc.tsx ── */}
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
          accessibilityLabel="Voltar para Anunciar"
          accessibilityRole="button"
          style={s.backBtn}
        >
          <Text style={[s.backArrow, { color: tokens.muted }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: tokens.navy }]}>Dicas para Anfitriões</Text>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Hero — verbatim de dicas/page.tsx linhas 101-111 ── */}
        <View style={s.hero}>
          {/* Badge "Guia do Anfitrião" */}
          <View style={[s.badge, { backgroundColor: tokens.green + "1A", borderColor: tokens.green + "33" }]}>
            <Text style={[s.badgeText, { color: tokens.green }]}>GUIA DO ANFITRIÃO</Text>
          </View>

          <Text
            testID="page-title"
            style={[s.heroTitle, { color: tokens.text }]}
          >
            Dicas para alugar mais e melhor
          </Text>

          <Text style={[s.heroSubtitle, { color: tokens.muted }]}>
            Pequenas ações que fazem grande diferença nos seus ganhos mensais.
          </Text>
        </View>

        {/* ── Cards de dicas — verbatim de dicas/page.tsx linhas 114-153 ── */}
        {DICAS.map((dica) => (
          <View
            key={dica.numero}
            style={[s.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]}
          >
            {/* Cabeçalho do card */}
            <View style={[s.cardHeader, { borderColor: tokens.border, backgroundColor: tokens.muted + "0D" }]}>
              <Text
                style={s.cardIcon}
                accessibilityElementsHidden
                importantForAccessibility="no"
              >
                {dica.icon}
              </Text>
              <View style={s.cardHeaderText}>
                <Text style={[s.dicaLabel, { color: tokens.muted }]}>
                  Dica {dica.numero}
                </Text>
                <Text style={[s.dicaTitulo, { color: tokens.text }]}>
                  {dica.titulo}
                </Text>
              </View>
            </View>

            {/* Corpo: bullets + destaque */}
            <View style={s.cardBody}>
              {dica.corpo.map((item, i) => (
                <View key={i} style={s.bulletRow}>
                  <View style={[s.bullet, { backgroundColor: tokens.green }]} accessibilityElementsHidden importantForAccessibility="no" />
                  <Text style={[s.bulletText, { color: tokens.text }]}>{item}</Text>
                </View>
              ))}

              {/* Destaque — verbatim de dicas/page.tsx linhas 145-149 */}
              <View style={[s.destaque, { backgroundColor: tokens.green + "0D", borderColor: tokens.green + "33" }]}>
                <Text style={[s.destaqueText, { color: tokens.green }]}>
                  {"💡 " + dica.destaque}
                </Text>
              </View>
            </View>
          </View>
        ))}

        {/* ── CTAs finais — verbatim de dicas/page.tsx linhas 156-169 ── */}
        <View style={s.ctaRow}>
          <TouchableOpacity
            testID="cta-cadastrar"
            style={[s.ctaPrimary, { backgroundColor: tokens.green }]}
            onPress={() => router.push("/itens/novo" as never)}
            accessibilityRole="button"
            accessibilityLabel="Cadastrar meu item"
          >
            <Text style={s.ctaPrimaryText}>{"📦 Cadastrar meu item"}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            testID="cta-simular"
            style={[s.ctaOutline, { borderColor: tokens.green }]}
            onPress={() => router.push("/anunciar/estimativa" as never)}
            accessibilityRole="button"
            accessibilityLabel="Simular meus ganhos"
          >
            <Text style={[s.ctaOutlineText, { color: tokens.green }]}>{"💰 Simular meus ganhos"}</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  root:   { flex: 1 },

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

  // ── Scroll ───────────────────────────────────────────────────────────────────
  scroll:  { flex: 1 },
  content: { padding: 16, gap: 12 },

  // ── Hero ─────────────────────────────────────────────────────────────────────
  hero: {
    alignItems: "center",
    paddingVertical: 20,
    gap: 8,
  },
  badge: {
    borderWidth:       1,
    borderRadius:      20,
    paddingHorizontal: 12,
    paddingVertical:   4,
  },
  badgeText: {
    fontSize:      10,
    fontWeight:    "700",
    letterSpacing: 1,
  },
  heroTitle: {
    fontSize:   24,
    fontWeight: "700",
    textAlign:  "center",
    lineHeight: 30,
  },
  heroSubtitle: {
    fontSize:  14,
    textAlign: "center",
    lineHeight: 20,
    maxWidth:   280,
  },

  // ── Cards ────────────────────────────────────────────────────────────────────
  card: {
    borderRadius: 16,
    borderWidth:  1,
    overflow:     "hidden",
    ...Platform.select({
      ios:     { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
      android: { elevation: 1 },
    }),
  },
  cardHeader: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               12,
    paddingHorizontal: 16,
    paddingVertical:   12,
    borderBottomWidth: 1,
  },
  cardIcon:       { fontSize: 22, lineHeight: 28 },
  cardHeaderText: { flex: 1 },
  dicaLabel: {
    fontSize:      10,
    fontWeight:    "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  dicaTitulo: {
    fontSize:   15,
    fontWeight: "600",
    lineHeight: 20,
    marginTop:  1,
  },

  cardBody: {
    paddingHorizontal: 16,
    paddingTop:        12,
    paddingBottom:     14,
    gap:               8,
  },

  // ── Bullets ──────────────────────────────────────────────────────────────────
  bulletRow: {
    flexDirection: "row",
    alignItems:    "flex-start",
    gap:           8,
  },
  bullet: {
    width:        6,
    height:       6,
    borderRadius: 3,
    marginTop:    7,
    flexShrink:   0,
  },
  bulletText: {
    flex:       1,
    fontSize:   13,
    lineHeight: 19,
  },

  // ── Destaque ─────────────────────────────────────────────────────────────────
  destaque: {
    borderWidth:       1,
    borderRadius:      10,
    paddingHorizontal: 12,
    paddingVertical:   8,
    marginTop:         4,
  },
  destaqueText: {
    fontSize:   12,
    fontWeight: "600",
    lineHeight: 17,
  },

  // ── CTAs ─────────────────────────────────────────────────────────────────────
  ctaRow: {
    gap:       8,
    marginTop: 8,
  },
  ctaPrimary: {
    height:             48,
    borderRadius:       12,
    alignItems:         "center",
    justifyContent:     "center",
  },
  ctaPrimaryText: {
    fontSize:   14,
    fontWeight: "700",
    color:      "#FFFFFF",
  },
  ctaOutline: {
    height:             48,
    borderRadius:       12,
    borderWidth:        2,
    alignItems:         "center",
    justifyContent:     "center",
  },
  ctaOutlineText: {
    fontSize:   14,
    fontWeight: "700",
  },
})
