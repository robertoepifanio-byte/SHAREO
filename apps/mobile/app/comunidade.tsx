// Fonte: app/comunidade/page.tsx

import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native"
import { router } from "expo-router"
import { useTheme } from "@/lib/theme"
import { ScreenHeader } from "@/components/layout/ScreenHeader"

// ── Dados verbatim de app/comunidade/page.tsx ─────────────────────────────────

const SECTIONS = [
  {
    icon:  "🤝",
    title: "Conexão Local",
    items: [
      "O ShareO fortalece laços entre vizinhos e promove uma rede colaborativa.",
      "Incentivamos o compartilhamento de experiências e dicas de uso dos itens.",
    ],
  },
  {
    icon:  "🎁",
    title: "Benefícios",
    items: [
      "Proprietários fundadores recebem vantagens exclusivas.",
      "Locatários têm acesso a uma variedade crescente de itens sem precisar comprar.",
    ],
  },
  {
    icon:  "🗣️",
    title: "Participação",
    items: [
      "Fóruns e grupos de discussão para trocar ideias.",
      "Eventos e campanhas de consumo consciente e sustentabilidade.",
      "Espaço para feedback e sugestões de melhorias na plataforma.",
    ],
  },
] as const

export default function ComunidadeScreen() {
  const { tokens } = useTheme()

  return (
    <View style={[s.root, { backgroundColor: tokens.bg }]}>

      <ScreenHeader title="Comunidade" />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Título da página — verbatim de page.tsx linhas 58-62 ── */}
        <View style={[s.heroSection, { backgroundColor: tokens.bg }]}>
          <Text
            style={[s.pageTitle, { color: tokens.navy }]}
            accessibilityRole="header"
          >
            🤝 Comunidade ShareO
          </Text>
          <Text style={[s.pageSubtitle, { color: tokens.muted }]}>
            Mais do que uma plataforma — uma rede de pessoas que acreditam no poder do compartilhamento.
          </Text>
        </View>

        {/* ── Seções — verbatim de page.tsx linhas 64-81 ── */}
        <View style={s.sectionsContainer}>
          {SECTIONS.map((section) => (
            <View
              key={section.title}
              style={[
                s.sectionCard,
                {
                  backgroundColor: tokens.surface,
                  borderColor:     tokens.border,
                },
              ]}
            >
              <View style={s.sectionCardHeader}>
                <Text
                  style={s.sectionIcon}
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                >
                  {section.icon}
                </Text>
                <Text
                  style={[s.sectionTitle, { color: tokens.navy }]}
                  accessibilityRole="header"
                >
                  {section.title}
                </Text>
              </View>

              <View style={s.itemsList}>
                {section.items.map((item, i) => (
                  <View key={i} style={s.itemRow}>
                    {/* bullet — bg-brand dot do site */}
                    <View
                      style={[s.bullet, { backgroundColor: tokens.green }]}
                      accessibilityElementsHidden
                      importantForAccessibility="no"
                    />
                    <Text style={[s.itemText, { color: tokens.muted }]}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>

        {/* ── CTA — verbatim de page.tsx linhas 83-101 ── */}
        {/* /cadastro  → router.push("/register")          (tela nativa: (auth)/register.tsx, PR #208) */}
        {/* /itens     → router.push("/(tabs)/explorar")   (padrão de sobre.tsx)   */}
        <View style={s.ctaSection}>
          <View style={[s.ctaCard, { backgroundColor: tokens.navy }]}>
            <Text style={s.ctaTitle} accessibilityRole="header">
              Faça parte da comunidade
            </Text>
            <Text style={s.ctaSubtitle}>
              Cadastre-se e junte-se a milhares de pessoas que já compartilham e alugam itens no ShareO.
            </Text>
            <View style={s.ctaButtons}>
              <TouchableOpacity
                style={[s.ctaBtnPrimary, { backgroundColor: tokens.green }]}
                onPress={() => router.push("/register" as never)}
                accessibilityRole="button"
                accessibilityLabel="Criar conta grátis"
              >
                <Text style={s.ctaBtnPrimaryText}>Criar conta grátis</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.ctaBtnOutline}
                onPress={() => router.push("/(tabs)/explorar" as never)}
                accessibilityRole="button"
                accessibilityLabel="Explorar itens"
              >
                <Text style={s.ctaBtnOutlineText}>Explorar itens</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  root:    { flex: 1 },
  scroll:  { flex: 1 },
  content: { paddingBottom: 40 },

  // ── Hero / Título ─────────────────────────────────────────────────────────────
  heroSection: {
    paddingHorizontal: 16,
    paddingTop:        24,
    paddingBottom:     8,
    gap:               8,
  },
  pageTitle: {
    fontSize:   24,
    fontWeight: "700",
    lineHeight: 32,
  },
  pageSubtitle: {
    fontSize:   14,
    lineHeight: 22,
  },

  // ── Seções ───────────────────────────────────────────────────────────────────
  sectionsContainer: {
    paddingHorizontal: 16,
    paddingTop:        16,
    gap:               16,
  },
  sectionCard: {
    borderRadius: 12,
    borderWidth:  1,
    padding:      16,
    gap:          12,
    ...Platform.select({
      ios:     { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
      android: { elevation: 1 },
    }),
  },
  sectionCardHeader: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           8,
  },
  sectionIcon:  { fontSize: 20 },
  sectionTitle: { fontSize: 18, fontWeight: "700", flex: 1 },

  itemsList: { gap: 10 },
  itemRow: {
    flexDirection: "row",
    alignItems:    "flex-start",
    gap:           10,
  },
  bullet: {
    width:        6,
    height:       6,
    borderRadius: 3,
    marginTop:    7,
    flexShrink:   0,
  },
  itemText: {
    flex:       1,
    fontSize:   13,
    lineHeight: 20,
  },

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
    fontSize:   14,
    color:      "rgba(255,255,255,0.8)",
    textAlign:  "center",
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
