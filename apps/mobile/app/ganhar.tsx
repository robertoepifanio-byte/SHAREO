// Fonte: app/ganhar/page.tsx + app/ganhar/_EarningsCalc.tsx

import React, { useState, useEffect } from "react"
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  Platform,
} from "react-native"
import Svg, { Polyline } from "react-native-svg"
import { router } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTheme } from "@/lib/theme"
import { API_URL } from "@/lib/api"

// ── Dados verbatim de _EarningsCalc.tsx ──────────────────────────────────────

const CATEGORY_DATA: Record<string, { name: string; avgRetailPrice: number; dailyRate: number }> = {
  ferramentas:   { name: "Ferramentas",      avgRetailPrice: 700,   dailyRate: 35  },
  eletronicos:   { name: "Eletrônicos",       avgRetailPrice: 2000,  dailyRate: 100 },
  "casa-jardim": { name: "Eletrodomésticos",  avgRetailPrice: 600,   dailyRate: 30  },
  construcao:    { name: "Construção",        avgRetailPrice: 900,   dailyRate: 45  },
  esporte:       { name: "Esporte & Lazer",   avgRetailPrice: 1200,  dailyRate: 60  },
  moda:          { name: "Moda & Acessórios", avgRetailPrice: 1000,  dailyRate: 50  },
  festas:        { name: "Festas & Eventos",  avgRetailPrice: 1600,  dailyRate: 80  },
  veiculos:      { name: "Veículos & Motos",  avgRetailPrice: 8000,  dailyRate: 150 },
  bebes:         { name: "Bebês & Crianças",  avgRetailPrice: 800,   dailyRate: 40  },
}

const DAYS_OPTIONS = [
  { label: "1 dia/sem",  value: 1 },
  { label: "2 dias/sem", value: 2 },
  { label: "3 dias/sem", value: 3 },
  { label: "5 dias/sem", value: 5 },
  { label: "7 dias/sem", value: 7 },
] as const

function fmt(cents: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100)
}

// ─────────────────────────────────────────────────────────────────────────────

export default function GanharScreen() {
  const { tokens } = useTheme()
  const insets     = useSafeAreaInsets()

  // ── Calculator state ──────────────────────────────────────────────────────
  const [categorySlug, setCategorySlug] = useState("ferramentas")
  const [daysPerWeek,  setDaysPerWeek]  = useState(2)
  const [customPrice,  setCustomPrice]  = useState("")
  const [pickerOpen,   setPickerOpen]   = useState(false)

  // ── FAQ accordion state ───────────────────────────────────────────────────
  const [faqOpen, setFaqOpen] = useState<Record<number, boolean>>({})

  // ── Platform fee rate — verbatim de page.tsx (getPlatformFeeRate server) ──
  // No app mobile, busca GET /api/platform-config/public (endpoint público).
  // Fallback "15%" exibido até a resposta chegar.
  const [feeLabel, setFeeLabel] = useState("15%")
  useEffect(() => {
    fetch(`${API_URL}/api/platform-config/public`)
      .then((r) => r.json())
      .then((json: { data?: { feeRateBps?: number } }) => {
        if (json?.data?.feeRateBps) {
          setFeeLabel(`${json.data.feeRateBps / 100}%`)
        }
      })
      .catch(() => {/* mantém fallback "15%" */})
  }, [])

  // ── Derived values — verbatim de _EarningsCalc.tsx ────────────────────────
  const cat        = CATEGORY_DATA[categorySlug]
  const dailyCents = customPrice
    ? Math.round(parseFloat(customPrice.replace(",", ".")) * 100)
    : cat.dailyRate * 100

  const weekly  = dailyCents * daysPerWeek
  const monthly = weekly * 4
  const yearly  = monthly * 12

  const returnVsRetail = cat.avgRetailPrice > 0
    ? Math.round((monthly / 100 / cat.avgRetailPrice) * 100)
    : 0

  // ── FAQ items — verbatim de page.tsx (depende de feeLabel dinâmico) ───────
  const FAQ_ITEMS = [
    {
      q: "O ShareO cobra alguma taxa?",
      a: `Sim, uma taxa de serviço de ${feeLabel} sobre o valor da locação, cobrada do locatário. Você recebe o valor líquido diretamente via PIX, sem nenhuma mensalidade ou custo para anunciar.`,
    },
    {
      q: "Preciso estar disponível para entregas?",
      a: "Você define a logística: entrega, retirada ou ponto de encontro. Você tem controle total sobre quem aluga e quando.",
    },
    {
      q: "E se o item for danificado?",
      a: "O locatário passa por verificação de identidade antes de alugar. Caso haja dano, você abre uma disputa na plataforma com as fotos de check-in e check-out como evidência. A equipe ShareO medeia o caso em até 3 dias úteis.",
    },
  ]

  const toggleFaq = (idx: number) =>
    setFaqOpen((prev) => ({ ...prev, [idx]: !prev[idx] }))

  return (
    <View style={[s.root, { backgroundColor: tokens.bg }]}>

      {/* ── Header — padrão de sobre.tsx ─────────────────────────────────── */}
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
        <Text style={[s.headerTitle, { color: tokens.navy }]}>Quanto posso ganhar?</Text>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── Hero — verbatim de page.tsx linhas 22–34 ─────────────────────── */}
        <View style={s.heroSection}>
          <View style={[s.heroBadge, { backgroundColor: tokens.green + "1A" }]}>
            <Text style={[s.heroBadgeText, { color: tokens.green }]}>
              Calculadora de ganhos
            </Text>
          </View>
          <Text
            style={[s.heroTitle, { color: tokens.navy }]}
            accessibilityRole="header"
          >
            Quanto posso ganhar?
          </Text>
          <Text style={[s.heroSubtitle, { color: tokens.muted }]}>
            Seus itens parados podem gerar renda extra. Simule quanto você pode faturar
            alugando no ShareO — sem abrir mão do item.
          </Text>
        </View>

        {/* ── Calculadora: inputs — verbatim de _EarningsCalc.tsx linhas 52–117 */}
        <View style={[s.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
          <Text style={[s.calcTitle, { color: tokens.navy }]}>Personalize a simulação</Text>

          {/* Categoria do item */}
          <View style={s.fieldGroup}>
            <Text style={[s.fieldLabel, { color: tokens.text }]}>Categoria do item</Text>
            <TouchableOpacity
              onPress={() => setPickerOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={`Categoria: ${cat.name}. Toque para alterar`}
              style={[s.pickerBtn, { borderColor: tokens.border, backgroundColor: tokens.bg }]}
            >
              <Text style={[s.pickerBtnText, { color: tokens.text }]}>{cat.name}</Text>
              <View>
                <Svg
                  width={16}
                  height={16}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={tokens.muted}
                  strokeWidth={2}
                >
                  <Polyline points="6 9 12 15 18 9" />
                </Svg>
              </View>
            </TouchableOpacity>
            <Text style={[s.fieldHint, { color: tokens.muted }]}>
              Valor de mercado estimado: ~R$ {cat.avgRetailPrice.toLocaleString("pt-BR")} · Diária sugerida: R$ {cat.dailyRate.toFixed(2).replace(".", ",")}
            </Text>
          </View>

          {/* Diária que você quer cobrar */}
          <View style={s.fieldGroup}>
            <View style={s.fieldLabelRow}>
              <Text style={[s.fieldLabel, { color: tokens.text }]}>
                Diária que você quer cobrar
              </Text>
              <Text style={[s.fieldLabelOpt, { color: tokens.muted }]}>(opcional)</Text>
            </View>
            <View style={[s.priceInputWrap, { borderColor: tokens.border, backgroundColor: tokens.bg }]}>
              <Text style={[s.pricePrefix, { color: tokens.muted }]}>R$</Text>
              <TextInput
                value={customPrice}
                onChangeText={(t) => setCustomPrice(t.replace(/[^0-9,]/g, ""))}
                placeholder={cat.dailyRate.toFixed(2).replace(".", ",")}
                placeholderTextColor={tokens.muted}
                keyboardType="decimal-pad"
                style={[s.priceInput, { color: tokens.text }]}
                accessibilityLabel="Diária personalizada em reais"
              />
            </View>
          </View>

          {/* Disponibilidade estimada */}
          <View style={s.fieldGroup}>
            <Text style={[s.fieldLabel, { color: tokens.text }]}>Disponibilidade estimada</Text>
            <View style={s.chipsRow}>
              {DAYS_OPTIONS.map((opt) => {
                const active = daysPerWeek === opt.value
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => setDaysPerWeek(opt.value)}
                    accessibilityRole="button"
                    accessibilityLabel={opt.label}
                    style={[
                      s.chip,
                      active
                        ? { borderColor: tokens.green, backgroundColor: tokens.green }
                        : { borderColor: tokens.border, backgroundColor: "transparent" },
                    ]}
                  >
                    <Text style={[s.chipText, { color: active ? "#FFFFFF" : tokens.muted }]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        </View>

        {/* ── Calculadora: resultado — verbatim de _EarningsCalc.tsx linhas 119–153 */}
        <View
          style={[
            s.resultCard,
            { borderColor: tokens.green + "4D", backgroundColor: tokens.green + "0D" },
          ]}
        >
          <Text style={[s.resultLabel, { color: tokens.green }]}>
            Sua estimativa de ganhos
          </Text>

          <View style={s.resultRow}>
            {/* Semanal */}
            <View style={s.resultCol}>
              <Text style={[s.resultValue, { color: tokens.text }]}>{fmt(weekly)}</Text>
              <Text style={[s.resultPeriod, { color: tokens.muted }]}>por semana</Text>
            </View>
            {/* Mensal — destacado */}
            <View
              style={[
                s.resultColHighlight,
                { borderColor: tokens.green + "33", backgroundColor: tokens.green + "1A" },
              ]}
            >
              <Text style={[s.resultValueHighlight, { color: tokens.green }]}>{fmt(monthly)}</Text>
              <Text style={[s.resultPeriodHighlight, { color: tokens.green }]}>por mês</Text>
            </View>
            {/* Anual */}
            <View style={s.resultCol}>
              <Text style={[s.resultValue, { color: tokens.text }]}>{fmt(yearly)}</Text>
              <Text style={[s.resultPeriod, { color: tokens.muted }]}>por ano</Text>
            </View>
          </View>

          {returnVsRetail > 0 && (
            <View
              style={[
                s.recoveryBanner,
                { borderColor: tokens.success + "40", backgroundColor: tokens.success + "1A" },
              ]}
            >
              <Text style={[s.recoveryTitle, { color: tokens.success }]}>
                🎯 Em {Math.ceil(100 / returnVsRetail)} meses você recupera o valor do item!
              </Text>
              <Text style={[s.recoverySubtitle, { color: tokens.muted }]}>
                Retorno de ~{returnVsRetail}% do valor de compra por mês
              </Text>
            </View>
          )}

          <Text style={[s.resultFootnote, { color: tokens.muted }]}>
            * Estimativa baseada em {daysPerWeek} dia{daysPerWeek > 1 ? "s" : ""}/semana a {fmt(dailyCents)}/dia.
            Ganhos reais variam conforme demanda e disponibilidade.
          </Text>
        </View>

        {/* ── CTA buttons — verbatim de _EarningsCalc.tsx linhas 155–169 ──── */}
        {/* Adaptação: Link href="/itens/novo" → router.push("/itens/novo")        */}
        {/*            Link href="/itens"      → router.push("/(tabs)/explorar")   */}
        <View style={s.ctaRow}>
          <TouchableOpacity
            style={[s.ctaBtnPrimary, { backgroundColor: tokens.green }]}
            onPress={() => router.push("/itens/novo" as never)}
            accessibilityRole="button"
            accessibilityLabel="Anunciar meu item"
          >
            <Text style={s.ctaBtnPrimaryText}>Anunciar meu item</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.ctaBtnOutline, { borderColor: tokens.border }]}
            onPress={() => router.push("/(tabs)/explorar" as never)}
            accessibilityRole="button"
            accessibilityLabel="Ver itens disponíveis"
          >
            <Text style={[s.ctaBtnOutlineText, { color: tokens.text }]}>
              Ver itens disponíveis
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Comparativo — verbatim de _EarningsCalc.tsx linhas 171–186 ──── */}
        <View style={[s.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
          <Text style={[s.compTitle, { color: tokens.text }]}>
            Compare: seu item parado vs. no ShareO
          </Text>
          <View style={s.compRow}>
            <View style={[s.compCol, { borderColor: tokens.border, backgroundColor: tokens.bg }]}>
              <Text style={s.compEmoji}>😴</Text>
              <Text style={[s.compColTitle, { color: tokens.muted }]}>Parado em casa</Text>
              <Text style={[s.compColValue, { color: tokens.muted }]}>R$ 0,00/mês</Text>
            </View>
            <View
              style={[
                s.compColHighlight,
                { borderColor: tokens.green + "4D", backgroundColor: tokens.green + "0D" },
              ]}
            >
              <Text style={s.compEmoji}>🚀</Text>
              <Text style={[s.compColTitleHighlight, { color: tokens.green }]}>No ShareO</Text>
              <Text style={[s.compColValueHighlight, { color: tokens.green }]}>
                {fmt(monthly)}/mês
              </Text>
            </View>
          </View>
        </View>

        {/* ── Depoimento — verbatim de page.tsx linhas 39–54 ─────────────── */}
        <View
          style={[
            s.testimonialCard,
            { borderColor: tokens.border, backgroundColor: tokens.surface },
          ]}
        >
          <View style={s.testimonialInner}>
            <View style={[s.testimonialAvatar, { backgroundColor: tokens.navy }]}>
              <Text style={s.testimonialAvatarText}>M</Text>
            </View>
            <View style={s.testimonialTexts}>
              <Text style={[s.testimonialQuote, { color: tokens.text }]}>
                {"“"}Anunciei minha furadeira e câmera fotográfica. Em 2 meses já paguei metade do valor que gastei nelas.{"”"}
              </Text>
              <Text style={[s.testimonialAttrib, { color: tokens.muted }]}>
                — Marcelo S., Porto Alegre/RS
              </Text>
            </View>
          </View>
        </View>

        {/* ── FAQ — verbatim de page.tsx linhas 56–88 ─────────────────────── */}
        {/* Adaptação: <details>/<summary> HTML → TouchableOpacity + useState  */}
        <View style={s.faqSection}>
          {FAQ_ITEMS.map((item, idx) => {
            const open = !!faqOpen[idx]
            return (
              <View
                key={item.q}
                style={[
                  s.faqItem,
                  { borderColor: tokens.border, backgroundColor: tokens.surface },
                ]}
              >
                <TouchableOpacity
                  onPress={() => toggleFaq(idx)}
                  accessibilityRole="button"
                  accessibilityLabel={item.q}
                  style={s.faqSummary}
                >
                  <Text style={[s.faqQuestion, { color: tokens.text }]}>{item.q}</Text>
                  {/* Chevron — verbatim SVG do site; rotaciona 180° quando aberto */}
                  <View style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }}>
                    <Svg
                      width={16}
                      height={16}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={tokens.muted}
                      strokeWidth={2}
                    >
                      <Polyline points="6 9 12 15 18 9" />
                    </Svg>
                  </View>
                </TouchableOpacity>
                {open && (
                  <View style={[s.faqAnswer, { borderTopColor: tokens.border }]}>
                    <Text style={[s.faqAnswerText, { color: tokens.muted }]}>{item.a}</Text>
                  </View>
                )}
              </View>
            )
          })}
        </View>

      </ScrollView>

      {/* ── Modal: seletor de categoria ──────────────────────────────────────── */}
      {/* Adaptação: <select> HTML → Modal nativo com lista de opções           */}
      <Modal
        visible={pickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerOpen(false)}
      >
        <TouchableOpacity
          style={s.modalOverlay}
          onPress={() => setPickerOpen(false)}
          activeOpacity={1}
          accessibilityLabel="Fechar"
          accessibilityRole="button"
        >
          <View style={[s.modalSheet, { backgroundColor: tokens.surface }]}>
            <Text style={[s.modalTitle, { color: tokens.navy }]}>Categoria do item</Text>
            {Object.entries(CATEGORY_DATA).map(([slug, { name }]) => {
              const selected = slug === categorySlug
              return (
                <TouchableOpacity
                  key={slug}
                  onPress={() => {
                    setCategorySlug(slug)
                    setCustomPrice("")
                    setPickerOpen(false)
                  }}
                  style={[
                    s.modalOption,
                    selected && { backgroundColor: tokens.green + "15" },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={name}
                >
                  <Text
                    style={[
                      s.modalOptionText,
                      { color: selected ? tokens.green : tokens.text },
                    ]}
                  >
                    {name}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </TouchableOpacity>
      </Modal>

    </View>
  )
}

const s = StyleSheet.create({
  root:    { flex: 1 },
  scroll:  { flex: 1 },
  content: { paddingBottom: 48 },

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
  heroSection: {
    paddingHorizontal: 20,
    paddingVertical:   32,
    alignItems:        "center",
    gap:               12,
  },
  heroBadge: {
    borderRadius:      20,
    paddingHorizontal: 16,
    paddingVertical:   6,
  },
  heroBadgeText: {
    fontSize:      11,
    fontWeight:    "700",
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  heroTitle: {
    fontSize:   28,
    fontWeight: "800",
    textAlign:  "center",
    lineHeight: 36,
  },
  heroSubtitle: {
    fontSize:  14,
    textAlign: "center",
    lineHeight: 22,
  },

  // ── Card genérico (inputs e comparativo) ─────────────────────────────────────
  card: {
    marginHorizontal: 16,
    marginBottom:     16,
    borderRadius:     12,
    borderWidth:      1,
    padding:          20,
    gap:              16,
    ...Platform.select({
      ios:     { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3 },
      android: { elevation: 1 },
    }),
  },
  calcTitle: { fontSize: 15, fontWeight: "600" },

  // ── Campos do formulário ─────────────────────────────────────────────────────
  fieldGroup:     { gap: 6 },
  fieldLabelRow:  { flexDirection: "row", alignItems: "center", gap: 6 },
  fieldLabel:     { fontSize: 14, fontWeight: "500" },
  fieldLabelOpt:  { fontSize: 12 },
  fieldHint:      { fontSize: 12, lineHeight: 16 },

  pickerBtn: {
    height:            44,
    borderRadius:      8,
    borderWidth:       1,
    paddingHorizontal: 12,
    flexDirection:     "row",
    alignItems:        "center",
    justifyContent:    "space-between",
  },
  pickerBtnText: { fontSize: 14 },

  priceInputWrap: {
    height:        44,
    borderRadius:  8,
    borderWidth:   1,
    flexDirection: "row",
    alignItems:    "center",
    paddingLeft:   12,
  },
  pricePrefix: { fontSize: 14, marginRight: 4 },
  priceInput:  { flex: 1, fontSize: 14, paddingVertical: 0 },

  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderRadius:      20,
    borderWidth:       1,
    paddingHorizontal: 12,
    paddingVertical:   7,
    minHeight:         34,
    alignItems:        "center",
    justifyContent:    "center",
  },
  chipText: { fontSize: 12, fontWeight: "600" },

  // ── Resultado ────────────────────────────────────────────────────────────────
  resultCard: {
    marginHorizontal: 16,
    marginBottom:     16,
    borderRadius:     12,
    borderWidth:      1,
    padding:          20,
    gap:              16,
  },
  resultLabel: {
    fontSize:      11,
    fontWeight:    "700",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    textAlign:     "center",
  },
  resultRow: {
    flexDirection: "row",
    gap:           8,
    alignItems:    "center",
  },
  resultCol: {
    flex:       1,
    alignItems: "center",
  },
  resultValue: {
    fontSize:   20,
    fontWeight: "800",
    textAlign:  "center",
  },
  resultPeriod: {
    fontSize:  11,
    textAlign: "center",
    marginTop: 2,
  },
  resultColHighlight: {
    flex:            1,
    alignItems:      "center",
    borderRadius:    12,
    borderWidth:     1,
    paddingVertical: 8,
  },
  resultValueHighlight: {
    fontSize:   20,
    fontWeight: "800",
    textAlign:  "center",
  },
  resultPeriodHighlight: {
    fontSize:   11,
    fontWeight: "600",
    textAlign:  "center",
    marginTop:  2,
  },
  recoveryBanner: {
    borderRadius:      10,
    borderWidth:       1,
    paddingHorizontal: 16,
    paddingVertical:   12,
    alignItems:        "center",
    gap:               4,
  },
  recoveryTitle:    { fontSize: 14, fontWeight: "600", textAlign: "center" },
  recoverySubtitle: { fontSize: 12, textAlign: "center" },
  resultFootnote:   { fontSize: 11, textAlign: "center", lineHeight: 16 },

  // ── CTA ──────────────────────────────────────────────────────────────────────
  ctaRow: {
    marginHorizontal: 16,
    marginBottom:     16,
    gap:              10,
  },
  ctaBtnPrimary: {
    borderRadius:   12,
    minHeight:      48,
    alignItems:     "center",
    justifyContent: "center",
  },
  ctaBtnPrimaryText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  ctaBtnOutline: {
    borderRadius:   12,
    minHeight:      48,
    alignItems:     "center",
    justifyContent: "center",
    borderWidth:    1,
  },
  ctaBtnOutlineText: { fontSize: 14, fontWeight: "600" },

  // ── Comparativo ──────────────────────────────────────────────────────────────
  compTitle:  { fontSize: 13, fontWeight: "600" },
  compRow:    { flexDirection: "row", gap: 12 },
  compCol: {
    flex:          1,
    borderRadius:  10,
    borderWidth:   1,
    padding:       12,
    alignItems:    "center",
    gap:           4,
  },
  compColHighlight: {
    flex:          1,
    borderRadius:  10,
    borderWidth:   1,
    padding:       12,
    alignItems:    "center",
    gap:           4,
  },
  compEmoji:             { fontSize: 24 },
  compColTitle:          { fontSize: 13, fontWeight: "600", textAlign: "center" },
  compColValue:          { fontSize: 11, textAlign: "center" },
  compColTitleHighlight: { fontSize: 13, fontWeight: "700", textAlign: "center" },
  compColValueHighlight: { fontSize: 11, fontWeight: "600", textAlign: "center" },

  // ── Depoimento ───────────────────────────────────────────────────────────────
  testimonialCard: {
    marginHorizontal: 16,
    marginBottom:     16,
    borderRadius:     12,
    borderWidth:      1,
    padding:          20,
    ...Platform.select({
      ios:     { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3 },
      android: { elevation: 1 },
    }),
  },
  testimonialInner: { flexDirection: "row", gap: 12 },
  testimonialAvatar: {
    width:          40,
    height:         40,
    borderRadius:   20,
    alignItems:     "center",
    justifyContent: "center",
    flexShrink:     0,
  },
  testimonialAvatarText: { color: "#FFFFFF", fontWeight: "700", fontSize: 16 },
  testimonialTexts:      { flex: 1 },
  testimonialQuote:      { fontSize: 14, lineHeight: 20 },
  testimonialAttrib:     { fontSize: 12, marginTop: 4 },

  // ── FAQ ──────────────────────────────────────────────────────────────────────
  faqSection: {
    marginHorizontal: 16,
    marginBottom:     16,
    gap:              12,
  },
  faqItem: {
    borderRadius: 10,
    borderWidth:  1,
    overflow:     "hidden",
  },
  faqSummary: {
    flexDirection:     "row",
    alignItems:        "center",
    justifyContent:    "space-between",
    gap:               8,
    paddingHorizontal: 16,
    paddingVertical:   12,
    minHeight:         44,
  },
  faqQuestion:    { flex: 1, fontSize: 14, fontWeight: "500" },
  faqAnswer: {
    borderTopWidth:    1,
    paddingHorizontal: 16,
    paddingVertical:   12,
  },
  faqAnswerText: { fontSize: 14, lineHeight: 20 },

  // ── Modal: seletor de categoria ───────────────────────────────────────────────
  modalOverlay: {
    flex:            1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent:  "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius:  20,
    borderTopRightRadius: 20,
    paddingTop:           20,
    paddingBottom:        40,
    paddingHorizontal:    16,
    gap:                  4,
  },
  modalTitle: {
    fontSize:     16,
    fontWeight:   "700",
    marginBottom: 12,
    textAlign:    "center",
  },
  modalOption: {
    paddingHorizontal: 16,
    paddingVertical:   14,
    borderRadius:      8,
    minHeight:         44,
    justifyContent:    "center",
  },
  modalOptionText: { fontSize: 15 },
})
