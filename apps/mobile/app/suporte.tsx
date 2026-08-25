// Fonte: app/suporte/page.tsx

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

// ── Dados verbatim de app/suporte/page.tsx ────────────────────────────────────

const SECTIONS = [
  {
    icon:  "❓",
    title: "Central de Ajuda",
    items: [
      { label: "FAQ",       description: "Respostas rápidas para dúvidas comuns." },
      { label: "Tutoriais", description: "Passo a passo para cadastrar, alugar e gerenciar itens." },
    ],
  },
  {
    icon:  "💬",
    title: "Atendimento",
    items: [
      { label: "Chat integrado",  description: "Suporte direto dentro da plataforma." },
      { label: "E-mail",          description: "Contato para questões específicas." },
      { label: "Disponibilidade", description: "Equipe ativa 7 dias por semana para resolver problemas." },
    ],
  },
  {
    icon:  "🛡️",
    title: "Segurança",
    items: [
      { label: "Reputação", description: "Sistema de avaliação e reputação para aumentar a confiança entre usuários." },
      { label: "Disputas",  description: "Canal exclusivo para reportar incidentes ou disputas." },
    ],
  },
] as const

// ── Tela ─────────────────────────────────────────────────────────────────────

export default function SuporteScreen() {
  const { tokens } = useTheme()

  return (
    <View style={[s.root, { backgroundColor: tokens.bg }]}>

      <ScreenHeader title="Suporte" />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Título da página — verbatim de page.tsx linhas 58-61 ── */}
        <View style={[s.heroSection, { backgroundColor: tokens.bg }]}>
          <Text
            style={[s.pageTitle, { color: tokens.navy }]}
            accessibilityRole="header"
          >
            🛠️ Suporte ShareO
          </Text>
          <Text style={[s.pageSubtitle, { color: tokens.muted }]}>
            Estamos aqui para ajudar. Encontre respostas, tutoriais e canais de atendimento.
          </Text>
        </View>

        {/* ── Seções — verbatim de page.tsx linhas 64-83 ── */}
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
                {section.items.map((item) => (
                  <View key={item.label} style={s.itemRow}>
                    {/* bullet — bg-brand dot do site */}
                    <View
                      style={[s.bullet, { backgroundColor: tokens.green }]}
                      accessibilityElementsHidden
                      importantForAccessibility="no"
                    />
                    {/* Texto: label em negrito + description — verbatim de page.tsx linha 76-78.
                        Texto multilinha em <Text> vira UM nó RNTL — usar frase completa no getByText. */}
                    <Text style={[s.itemText, { color: tokens.muted }]}>
                      <Text style={[s.itemLabel, { color: tokens.text }]}>{item.label}:</Text>
                      {" "}{item.description}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>

        {/* ── Botões CTA — verbatim de page.tsx linhas 86-99 ── */}
        {/* /ajuda      → router.push("/ajuda")      (tela nativa: app/ajuda.tsx)      */}
        {/* /mensagens  → router.push("/mensagens")  (tela nativa: app/mensagens/)     */}
        <View style={s.ctaSection}>
          <TouchableOpacity
            style={[
              s.ctaBtnOutline,
              {
                borderColor:     tokens.border,
                backgroundColor: tokens.surface,
              },
            ]}
            onPress={() => router.push("/ajuda" as never)}
            accessibilityRole="button"
            accessibilityLabel="Acessar Central de Ajuda →"
          >
            <Text style={[s.ctaBtnOutlineText, { color: tokens.text }]}>
              Acessar Central de Ajuda →
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.ctaBtnPrimary, { backgroundColor: tokens.green }]}
            onPress={() => router.push("/mensagens" as never)}
            accessibilityRole="button"
            accessibilityLabel="Abrir Chat de Suporte →"
          >
            <Text style={s.ctaBtnPrimaryText}>Abrir Chat de Suporte →</Text>
          </TouchableOpacity>
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
  itemText:  { flex: 1, fontSize: 13, lineHeight: 20 },
  itemLabel: { fontWeight: "600" },

  // ── Botões CTA ────────────────────────────────────────────────────────────────
  ctaSection: {
    paddingHorizontal: 16,
    paddingTop:        24,
    gap:               12,
  },
  ctaBtnOutline: {
    borderRadius:      12,
    borderWidth:       1,
    minHeight:         44,
    paddingHorizontal: 20,
    paddingVertical:   16,
    alignItems:        "center",
    justifyContent:    "center",
  },
  ctaBtnOutlineText: {
    fontSize:   13,
    fontWeight: "600",
  },
  ctaBtnPrimary: {
    borderRadius:      12,
    minHeight:         44,
    paddingHorizontal: 20,
    paddingVertical:   16,
    alignItems:        "center",
    justifyContent:    "center",
  },
  ctaBtnPrimaryText: {
    fontSize:   13,
    fontWeight: "700",
    color:      "#FFFFFF",
  },
})
