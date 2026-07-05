// Fonte: app/sobre/page.tsx

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
import { Image } from "expo-image"
import Svg, { Path, Circle, Rect } from "react-native-svg"
import { useTheme } from "@/lib/theme"

// ── Dados verbatim de app/sobre/page.tsx ─────────────────────────────────────

const STATS = [
  { value: "2.400+", label: "itens cadastrados" },
  { value: "R$2.000", label: "renda média/mês por proprietário" },
  { value: "2026", label: "ano de fundação" },
] as const

const VALORES = [
  {
    id:          "sustentabilidade",
    title:       "Sustentabilidade",
    description: "Reduzir consumo excessivo e prolongar a vida útil dos itens.",
  },
  {
    id:          "comunidade",
    title:       "Comunidade",
    description: "Fortalecer laços locais e incentivar a colaboração entre vizinhos.",
  },
  {
    id:          "seguranca",
    title:       "Segurança",
    description: "Garantir transações protegidas e usuários verificados.",
  },
  {
    id:          "acessibilidade",
    title:       "Acessibilidade",
    description: "Tornar o aluguel de itens simples e vantajoso para todos.",
  },
] as const

const EQUIPE = [
  {
    title:       "Fundadores",
    description: "Um grupo de empreendedores apaixonados por tecnologia e impacto social, que acreditam no poder da colaboração comunitária.",
  },
  {
    title:       "Equipe de Produto",
    description: "Responsável por garantir uma experiência fluida e segura, com funcionalidades como chat integrado, verificação de usuários e pagamentos protegidos.",
  },
  {
    title:       "Suporte 7 dias por semana",
    description: "Profissionais dedicados a ajudar usuários em todas as etapas, reforçando a confiança na plataforma.",
  },
  {
    title:       "Rede de Proprietários Fundadores",
    description: "Os primeiros cadastrados, que recebem benefícios exclusivos e ajudam a moldar o futuro do ShareO.",
  },
] as const

// ── Ícones SVG verbatim de app/sobre/page.tsx ─────────────────────────────────
// <svg> → <Svg>, <path> → <Path>, <circle> → <Circle>, <rect> → <Rect>.
// stroke="currentColor" substituído por cor explícita via prop `color`.

function SustentabilidadeIcon({ color }: { color: string }) {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8}>
      <Path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z" />
      <Path d="M12 6v6l4 2" />
    </Svg>
  )
}

function ComunidadeIcon({ color }: { color: string }) {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8}>
      <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <Circle cx={9} cy={7} r={4} />
      <Path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <Path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </Svg>
  )
}

function SegurancaIcon({ color }: { color: string }) {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8}>
      <Rect x={3} y={11} width={18} height={11} rx={2} ry={2} />
      <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </Svg>
  )
}

function AcessibilidadeIcon({ color }: { color: string }) {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8}>
      <Circle cx={12} cy={12} r={10} />
      <Path d="M12 8v4l3 3" />
    </Svg>
  )
}

const VALOR_ICONS: Record<string, React.ComponentType<{ color: string }>> = {
  sustentabilidade: SustentabilidadeIcon,
  comunidade:       ComunidadeIcon,
  seguranca:        SegurancaIcon,
  acessibilidade:   AcessibilidadeIcon,
}

export default function SobreScreen() {
  const { tokens } = useTheme()
  const insets     = useSafeAreaInsets()

  return (
    <View style={[s.root, { backgroundColor: tokens.bg }]}>

      {/* ── Header — padrão de dados.tsx / kyc.tsx ── */}
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
        <Text style={[s.headerTitle, { color: tokens.navy }]}>Sobre o ShareO</Text>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Hero — verbatim de page.tsx linhas 93-108 ── */}
        <View style={[s.hero, { backgroundColor: tokens.navy }]}>
          <Text
            style={[s.heroLabel, { color: tokens.green }]}
            accessibilityRole="header"
          >
            Sobre o ShareO
          </Text>
          <Text style={s.heroTitle}>Use Mais. Possua Menos.</Text>
          <Text style={s.heroSubtitle}>
            O ShareO conecta pessoas que querem gerar renda alugando seus bens
            para quem precisa usar sem comprar. Uma forma inteligente de transformar
            patrimônio parado em renda, reduzir desperdícios e facilitar o acesso a
            tudo o que você precisa.
          </Text>
        </View>

        {/* ── Stats — verbatim de page.tsx linhas 111-122 ── */}
        <View
          style={[
            s.statsSection,
            {
              backgroundColor:  tokens.surface,
              borderBottomColor: tokens.border,
            },
          ]}
        >
          <View style={s.statsRow}>
            {STATS.map((stat) => (
              <View key={stat.label} style={s.statItem}>
                <Text style={[s.statValue, { color: tokens.green }]}>{stat.value}</Text>
                <Text style={[s.statLabel, { color: tokens.muted }]}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Missão — verbatim de page.tsx linhas 124-155 ── */}
        <View style={[s.section, { backgroundColor: tokens.bg }]}>
          <View style={s.sectionHeader}>
            <Text
              style={s.sectionEmoji}
              accessibilityElementsHidden
              importantForAccessibility="no"
            >
              🌱
            </Text>
            <Text style={[s.sectionTitle, { color: tokens.navy }]}>Missão</Text>
          </View>
          <Text style={[s.sectionQuote, { color: tokens.text }]}>
            "Transformar o que está parado em oportunidade de renda."
          </Text>
          <Text style={[s.paragraph, { color: tokens.muted }]}>
            O ShareO nasceu para ajudar pessoas a monetizar bens que já possuem, criando uma
            nova fonte de renda de forma simples, acessível e segura.
          </Text>
          <Text style={[s.paragraph, { color: tokens.muted }]}>
            Nossa missão é conectar quem tem itens sem uso com quem precisa utilizá-los por um
            período, tornando o aluguel uma alternativa inteligente ao consumo tradicional.
          </Text>
          <Text style={[s.paragraph, { color: tokens.muted }]}>
            Mais do que uma plataforma de locação, queremos criar um ecossistema onde qualquer
            pessoa possa gerar renda extra com seu próprio patrimônio, enquanto outras economizam
            ao acessar o que precisam sem precisar comprar.
          </Text>
          <Text style={[s.paragraph, { color: tokens.muted }]}>
            Ao incentivar o uso compartilhado de bens, fortalecemos comunidades locais, reduzimos
            desperdícios e promovemos um modelo de consumo mais eficiente, sustentável e
            colaborativo.
          </Text>
        </View>

        {/* ── História — verbatim de page.tsx linhas 157-188 ── */}
        <View style={[s.section, { backgroundColor: tokens.surface }]}>
          <View style={s.sectionHeader}>
            <Text
              style={s.sectionEmoji}
              accessibilityElementsHidden
              importantForAccessibility="no"
            >
              📖
            </Text>
            <Text style={[s.sectionTitle, { color: tokens.navy }]}>História</Text>
          </View>
          <Text style={[s.paragraph, { color: tokens.muted }]}>
            O ShareO surgiu em 2026 a partir de uma constatação simples: milhões de pessoas
            possuem itens de valor parados em casa — ferramentas, equipamentos, eletrônicos,
            artigos para festas, esportes e muito mais — sem perceber que esses bens podem
            gerar renda.
          </Text>
          <Text style={[s.paragraph, { color: tokens.muted }]}>
            Percebemos também que muitas pessoas precisam desses mesmos itens por poucas horas
            ou poucos dias, mas acabam gastando alto para comprar algo que usarão raramente.
          </Text>
          <Text style={[s.paragraph, { color: tokens.muted }]}>
            Foi dessa oportunidade que nasceu o ShareO: uma plataforma criada para conectar
            proprietários e locatários de forma prática, segura e transparente, permitindo que
            bens parados se transformem em renda e necessidade em economia.
          </Text>
          <Text style={[s.paragraph, { color: tokens.muted }]}>
            Porque acreditamos que, no futuro, gerar renda com o que você já tem será tão
            comum quanto vender ou comprar online.
          </Text>
        </View>

        {/* ── Valores — verbatim de page.tsx linhas 190-216 ── */}
        <View style={[s.section, { backgroundColor: tokens.bg }]}>
          <View style={[s.sectionHeader, s.sectionHeaderCenter]}>
            <Text
              style={s.sectionEmoji}
              accessibilityElementsHidden
              importantForAccessibility="no"
            >
              ✨
            </Text>
            <Text style={[s.sectionTitle, { color: tokens.navy }]}>Valores</Text>
          </View>
          {VALORES.map((v) => {
            const Icon = VALOR_ICONS[v.id]
            return (
              <View
                key={v.title}
                style={[
                  s.valorCard,
                  {
                    backgroundColor: tokens.surface,
                    borderColor:     tokens.border,
                  },
                ]}
              >
                {/* `tokens.green + "1A"` = verde com 10% opacidade (bg-brand/10 do site) */}
                <View style={[s.valorIconWrap, { backgroundColor: tokens.green + "1A" }]}>
                  <Icon color={tokens.green} />
                </View>
                <View style={s.valorTexts}>
                  <Text style={[s.valorTitle, { color: tokens.text }]}>{v.title}</Text>
                  <Text style={[s.valorDesc,  { color: tokens.muted }]}>{v.description}</Text>
                </View>
              </View>
            )
          })}
        </View>

        {/* ── Equipe — verbatim de page.tsx linhas 218-238 ── */}
        <View style={[s.section, { backgroundColor: tokens.surface }]}>
          <View style={[s.sectionHeader, s.sectionHeaderCenter]}>
            <Text
              style={s.sectionEmoji}
              accessibilityElementsHidden
              importantForAccessibility="no"
            >
              👥
            </Text>
            <Text style={[s.sectionTitle, { color: tokens.navy }]}>Equipe</Text>
          </View>
          {EQUIPE.map((e) => (
            <View
              key={e.title}
              style={[
                s.equipeCard,
                {
                  backgroundColor: tokens.bg,
                  borderColor:     tokens.border,
                },
              ]}
            >
              <Text style={[s.equipeCardTitle, { color: tokens.text }]}>{e.title}</Text>
              <Text style={[s.equipeCardDesc,  { color: tokens.muted }]}>{e.description}</Text>
            </View>
          ))}
        </View>

        {/* ── Desenvolvimento — verbatim de page.tsx linhas 240-268 ── */}
        {/* Adaptação: next/image (/logos/pratika-ia-sobre.png) → expo-image com URI
            remota (staging). A imagem não está bundlada no app mobile. */}
        <View style={[s.section, { backgroundColor: tokens.bg }]}>
          <View style={[s.sectionHeader, s.sectionHeaderCenter]}>
            <Text
              style={s.sectionEmoji}
              accessibilityElementsHidden
              importantForAccessibility="no"
            >
              💻
            </Text>
            <Text style={[s.sectionTitle, { color: tokens.navy }]}>Desenvolvimento</Text>
          </View>
          <Text style={[s.devSubtitle, { color: tokens.muted }]}>
            O ShareO foi concebido e desenvolvido com parceria técnica especializada.
          </Text>
          <View
            style={[
              s.devCard,
              {
                backgroundColor: tokens.surface,
                borderColor:     tokens.border,
              },
            ]}
          >
            <Image
              source={{ uri: "https://staging.shareo.com.br/logos/pratika-ia-sobre.png" }}
              style={s.devLogo}
              contentFit="contain"
              accessibilityLabel="Pratika-IA"
            />
            <Text style={[s.devCardDesc, { color: tokens.muted }]}>
              Responsável pelo desenvolvimento completo da plataforma ShareO — da arquitetura
              ao produto final, com foco em experiência do usuário, segurança e escalabilidade.
            </Text>
          </View>
        </View>

        {/* ── CTA — verbatim de page.tsx linhas 270-294 ── */}
        {/* Adaptação: Link href="/itens/novo" → router.push("/itens/novo") (rota nativa existe) */}
        {/*            Link href="/itens"     → router.push("/(tabs)/explorar") (equivalente nativo) */}
        <View style={s.ctaSection}>
          <View style={[s.ctaCard, { backgroundColor: tokens.navy }]}>
            <Text style={s.ctaTitle}>Faça parte da comunidade ShareO</Text>
            <Text style={s.ctaSubtitle}>
              Cadastre seu item hoje e comece a transformar o que está parado em renda.
            </Text>
            <View style={s.ctaButtons}>
              <TouchableOpacity
                style={[s.ctaBtnPrimary, { backgroundColor: tokens.green }]}
                onPress={() => router.push("/itens/novo" as never)}
                accessibilityRole="button"
                accessibilityLabel="Cadastrar meu item"
              >
                <Text style={s.ctaBtnPrimaryText}>Cadastrar meu item</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.ctaBtnOutline}
                onPress={() => router.push("/(tabs)/explorar" as never)}
                accessibilityRole="button"
                accessibilityLabel="Explorar anúncios"
              >
                <Text style={s.ctaBtnOutlineText}>Explorar anúncios</Text>
              </TouchableOpacity>
            </View>
          </View>
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

  // ── Hero ─────────────────────────────────────────────────────────────────────
  hero: {
    paddingHorizontal: 24,
    paddingVertical:   40,
    gap:               12,
  },
  heroLabel: {
    fontSize:      12,
    fontWeight:    "600",
    textTransform: "uppercase",
    letterSpacing: 2,
    textAlign:     "center",
  },
  heroTitle: {
    fontSize:   28,
    fontWeight: "700",
    color:      "#FFFFFF",
    textAlign:  "center",
    lineHeight: 36,
  },
  heroSubtitle: {
    fontSize:  15,
    color:     "rgba(255,255,255,0.8)",
    textAlign: "center",
    lineHeight: 22,
  },

  // ── Stats ────────────────────────────────────────────────────────────────────
  statsSection: {
    borderBottomWidth: 1,
    paddingVertical:   20,
    paddingHorizontal: 16,
  },
  statsRow: {
    flexDirection:  "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems:        "center",
    flex:              1,
    paddingHorizontal: 4,
  },
  statValue: {
    fontSize:   22,
    fontWeight: "700",
    textAlign:  "center",
  },
  statLabel: {
    fontSize:  11,
    textAlign: "center",
    marginTop: 2,
    lineHeight: 14,
  },

  // ── Seções genéricas ─────────────────────────────────────────────────────────
  section: {
    paddingHorizontal: 16,
    paddingVertical:   24,
    gap:               12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           8,
  },
  sectionHeaderCenter: {
    justifyContent: "center",
  },
  sectionEmoji: { fontSize: 22 },
  sectionTitle: { fontSize: 20, fontWeight: "700" },
  sectionQuote: { fontSize: 16, fontWeight: "600", lineHeight: 24 },
  paragraph:    { fontSize: 14, lineHeight: 22 },

  // ── Valores ──────────────────────────────────────────────────────────────────
  valorCard: {
    borderRadius:  12,
    borderWidth:   1,
    padding:       16,
    flexDirection: "row",
    alignItems:    "flex-start",
    gap:           14,
    ...Platform.select({
      ios:     { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
      android: { elevation: 1 },
    }),
  },
  valorIconWrap: {
    width:          48,
    height:         48,
    borderRadius:   10,
    alignItems:     "center",
    justifyContent: "center",
    flexShrink:     0,
  },
  valorTexts: { flex: 1 },
  valorTitle: { fontSize: 15, fontWeight: "600" },
  valorDesc:  { fontSize: 13, lineHeight: 18, marginTop: 2 },

  // ── Equipe ───────────────────────────────────────────────────────────────────
  equipeCard: {
    borderRadius: 12,
    borderWidth:  1,
    padding:      16,
    gap:          6,
    ...Platform.select({
      ios:     { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
      android: { elevation: 1 },
    }),
  },
  equipeCardTitle: { fontSize: 15, fontWeight: "600" },
  equipeCardDesc:  { fontSize: 13, lineHeight: 18 },

  // ── Desenvolvimento ──────────────────────────────────────────────────────────
  devSubtitle: { fontSize: 13, textAlign: "center" },
  devCard: {
    borderRadius: 16,
    borderWidth:  1,
    padding:      20,
    alignItems:   "center",
    gap:          12,
    ...Platform.select({
      ios:     { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
      android: { elevation: 1 },
    }),
  },
  devLogo:     { width: 240, height: 72, alignSelf: "center" },
  devCardDesc: { fontSize: 13, lineHeight: 18, textAlign: "center" },

  // ── CTA ──────────────────────────────────────────────────────────────────────
  ctaSection: {
    paddingHorizontal: 16,
    paddingVertical:   24,
  },
  ctaCard: {
    borderRadius:      16,
    paddingHorizontal: 20,
    paddingVertical:   40,
    alignItems:        "center",
    gap:               12,
  },
  ctaTitle: {
    fontSize:   20,
    fontWeight: "700",
    color:      "#FFFFFF",
    textAlign:  "center",
  },
  ctaSubtitle: {
    fontSize:  14,
    color:     "rgba(255,255,255,0.8)",
    textAlign: "center",
    lineHeight: 20,
  },
  ctaButtons: {
    marginTop: 8,
    width:     "100%",
    gap:       10,
  },
  ctaBtnPrimary: {
    borderRadius:      10,
    minHeight:         44,
    paddingHorizontal: 24,
    alignItems:        "center",
    justifyContent:    "center",
  },
  ctaBtnPrimaryText: {
    fontSize:   14,
    fontWeight: "700",
    color:      "#FFFFFF",
  },
  ctaBtnOutline: {
    borderRadius:      10,
    minHeight:         44,
    paddingHorizontal: 24,
    alignItems:        "center",
    justifyContent:    "center",
    borderWidth:       1,
    borderColor:       "rgba(255,255,255,0.3)",
  },
  ctaBtnOutlineText: {
    fontSize:   14,
    fontWeight: "600",
    color:      "#FFFFFF",
  },
})
