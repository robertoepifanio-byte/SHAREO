// Fonte: app/anunciar/estimativa/page.tsx + app/anunciar/estimativa/_Calculadora.tsx

import { useState, useEffect } from "react"
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native"
import { router } from "expo-router"
import { useTheme } from "@/lib/theme"
import { usePlatformConfig } from "@/lib/platformConfig"
import { apiFetch } from "@/lib/api"

// ── Dados de categoria — verbatim de _Calculadora.tsx linhas 6-14 ──────────────
const CATEGORIAS = [
  { slug: "ferramentas", label: "Ferramentas",      icon: "🔧", diaria: 35,  exemplos: "furadeira, serra, esmeril" },
  { slug: "eletronicos", label: "Eletrônicos",      icon: "📷", diaria: 100, exemplos: "câmera, projetor, drone" },
  { slug: "esporte",     label: "Esporte/Lazer",    icon: "🚴", diaria: 60,  exemplos: "bicicleta, barraca, SUP" },
  { slug: "festas",      label: "Festas",           icon: "🎉", diaria: 80,  exemplos: "som, tendas, mesas" },
  { slug: "construcao",  label: "Construção",       icon: "🏗️", diaria: 45,  exemplos: "escada, betoneira, andaime" },
  { slug: "casa-jardim", label: "Eletrodomésticos", icon: "🔌", diaria: 30,  exemplos: "geladeira, micro-ondas, lavadora" },
]

// ── Opções de dias por mês — verbatim de _Calculadora.tsx linha 16 ────────────
const DIAS_MES = [2, 4, 6, 8, 10, 15, 20]

// ── Formatador de moeda — mesmo locale/opções de _Calculadora.tsx linha 18-20 ─
function fmt(val: number): string {
  return val.toLocaleString("pt-BR", {
    style:                "currency",
    currency:             "BRL",
    maximumFractionDigits: 0,
  })
}

export default function EstimativaScreen() {
  const { tokens, mode } = useTheme()

  // REGRA: nunca hardcode a taxa. O hook já embute o default e compartilha
  // cache com as demais telas.
  const feeRateBps = usePlatformConfig().feeRateBps

  // ── Estado da calculadora — mesmos defaults de _Calculadora.tsx linhas 23-25 ─
  const [catSlug, setCatSlug] = useState("ferramentas")
  const [diasMes, setDiasMes] = useState(6)
  const [preco,   setPreco]   = useState("")

  const cat = CATEGORIAS.find((c) => c.slug === catSlug)!

  // feeRatePct: basis points → percentagem (1500 bps → 15%)
  // Espelha page.tsx linha 14: const feeRatePct = feeRateBps / 100
  const feeRatePct = feeRateBps / 100

  // Preço da diária: usa valor informado ou sugestão da categoria
  // Verbatim de _Calculadora.tsx linha 30
  const precoNum = preco !== "" ? parseInt(preco, 10) : 0
  const diaria   = precoNum > 0 ? precoNum : cat.diaria

  // ── Fórmula de cálculo — verbatim de _Calculadora.tsx linhas 32-35 ───────────
  const ganhoMes     = diaria * diasMes
  const ganhoAno     = ganhoMes * 12
  const taxaPlat     = ganhoMes * (feeRatePct / 100)
  const ganhoLiquido = ganhoMes - taxaPlat

  return (
    <ScrollView
      style={[s.root, { backgroundColor: tokens.bg }]}
      contentContainerStyle={s.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* ── Barra de volta — verbatim de page.tsx linhas 21-25 ── */}
      <TouchableOpacity
        style={s.backBar}
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Voltar para Anunciar"
      >
        <Text style={[s.backText, { color: tokens.muted }]}>← Anunciar</Text>
      </TouchableOpacity>

      {/* ── Hero — verbatim de page.tsx linhas 31-42 ── */}
      <View style={s.hero}>
        <View style={s.badge}>
          <Text style={[s.badgeText, { color: tokens.green }]}>Para anfitriões</Text>
        </View>
        <Text style={[s.heroTitle, { color: tokens.text }]}>
          Quanto você pode ganhar?
        </Text>
        <Text style={[s.heroSub, { color: tokens.muted }]}>
          Simule seus ganhos alugando itens que ficam parados em casa.{"\n"}
          Renda extra sem burocracia.
        </Text>
      </View>

      {/* ── STEP 1: Categoria — verbatim de _Calculadora.tsx linhas 41-64 ── */}
      <View style={s.section}>
        <Text style={[s.stepTitle, { color: tokens.text }]}>
          1. Qual é a categoria do seu item?
        </Text>
        <View style={s.catGrid}>
          {CATEGORIAS.map((c) => {
            const selected = catSlug === c.slug
            return (
              <TouchableOpacity
                key={c.slug}
                onPress={() => { setCatSlug(c.slug); setPreco("") }}
                style={[
                  s.catBtn,
                  {
                    borderColor:     selected ? tokens.green : tokens.border,
                    backgroundColor: selected
                      ? (mode === "dark" ? "#0A2E1A" : "#F0FFF6")
                      : tokens.surface,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={c.label}
                accessibilityState={{ selected }}
              >
                <Text style={s.catIcon}>{c.icon}</Text>
                <Text style={[s.catLabel, { color: selected ? tokens.green : tokens.text }]}>
                  {c.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
        {/* "Ex: {cat.exemplos}" — verbatim de _Calculadora.tsx linha 62 */}
        <Text style={[s.catExemplos, { color: tokens.muted }]}>
          Ex: {cat.exemplos}
        </Text>
      </View>

      {/* ── STEP 2: Preço por diária — verbatim de _Calculadora.tsx linhas 67-88 ── */}
      <View style={s.section}>
        <Text style={[s.stepTitle, { color: tokens.text }]}>
          2. Qual será o preço por diária?
        </Text>
        <Text style={[s.stepSubtitle, { color: tokens.muted }]}>
          {"Sugestão para "}
          <Text style={{ fontWeight: "600", color: tokens.text }}>{cat.label}</Text>
          {": "}
          <Text style={{ fontWeight: "700", color: tokens.text }}>{fmt(cat.diaria)}/dia</Text>
          {"  "}
          <Text style={{ color: tokens.muted }}>
            (3–5% do valor do bem · semana = 3× diária · mês = 15× diária)
          </Text>
        </Text>
        <View style={s.precoRow}>
          <Text style={[s.precoPrefix, { color: tokens.muted }]}>R$</Text>
          <TextInput
            style={[s.precoInput, {
              borderColor:     tokens.border,
              backgroundColor: tokens.surface,
              color:           tokens.text,
            }]}
            value={preco}
            onChangeText={(v) => setPreco(v.replace(/[^0-9]/g, ""))}
            placeholder={String(cat.diaria)}
            placeholderTextColor={tokens.muted}
            keyboardType="number-pad"
            returnKeyType="done"
            maxLength={4}
            accessibilityLabel="Preço por diária"
          />
          <Text style={[s.precoSuffix, { color: tokens.muted }]}>/dia</Text>
        </View>
      </View>

      {/* ── STEP 3: Dias por mês — verbatim de _Calculadora.tsx linhas 91-110 ── */}
      <View style={s.section}>
        <Text style={[s.stepTitle, { color: tokens.text }]}>
          3. Quantos dias por mês pretende alugar?
        </Text>
        <View style={s.chipsRow}>
          {DIAS_MES.map((d) => {
            const active = diasMes === d
            return (
              <TouchableOpacity
                key={d}
                onPress={() => setDiasMes(d)}
                style={[
                  s.chip,
                  {
                    borderColor:     active ? tokens.green : tokens.border,
                    backgroundColor: active ? tokens.green : tokens.surface,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${d} dias`}
                accessibilityState={{ selected: active }}
              >
                <Text style={[s.chipText, { color: active ? "#FFFFFF" : tokens.text }]}>
                  {d} dias
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </View>

      {/* ── Resultado — verbatim de _Calculadora.tsx linhas 112-171 ── */}
      <View style={[s.resultBox, { borderColor: mode === "dark" ? "#1A5C34" : "#A7E4BF" }]}>
        {/* Cabeçalho — verbatim linha 114 */}
        <Text style={[s.resultLabel, { color: tokens.muted }]}>
          Sua estimativa de ganhos
        </Text>

        {/* Cards de resumo — verbatim linhas 119-138 */}
        <View style={s.cardsRow}>
          {/* Por mês */}
          <View style={[s.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
            <Text style={[s.cardCaption, { color: tokens.muted }]}>Por mês</Text>
            <Text style={[s.cardValue, { color: tokens.green }]} testID="result-mes">
              {fmt(ganhoMes)}
            </Text>
            <Text style={[s.cardNote, { color: tokens.muted }]}>
              {diasMes} dias × {fmt(diaria)}
            </Text>
          </View>

          {/* Você recebe (card verde — verbatim linha 127) */}
          <View style={[s.card, s.cardGreen]}>
            <Text style={s.cardCaptionWhite}>Você recebe</Text>
            <Text style={s.cardValueWhite} testID="result-liquido">
              {fmt(ganhoLiquido)}
            </Text>
            {/* "após taxa de {feeRatePct}%" — verbatim linha 130 */}
            <Text style={s.cardNoteWhite}>
              {`após taxa de ${feeRatePct}%`}
            </Text>
          </View>

          {/* Projeção anual */}
          <View style={[s.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
            <Text style={[s.cardCaption, { color: tokens.muted }]}>Projeção anual</Text>
            <Text style={[s.cardValue, { color: tokens.text }]} testID="result-ano">
              {fmt(ganhoAno)}
            </Text>
            <Text style={[s.cardNote, { color: tokens.muted }]}>se mantiver o ritmo</Text>
          </View>
        </View>

        {/* Detalhamento — verbatim linhas 142-163 */}
        <View style={[s.breakdown, { borderColor: tokens.border, backgroundColor: tokens.surface }]}>
          <View style={[s.breakdownRow, { borderBottomColor: tokens.border }]}>
            <Text style={[s.breakdownKey, { color: tokens.muted }]}>Diária</Text>
            <Text style={[s.breakdownVal, { color: tokens.text }]}>{fmt(diaria)}</Text>
          </View>
          <View style={[s.breakdownRow, { borderBottomColor: tokens.border }]}>
            <Text style={[s.breakdownKey, { color: tokens.muted }]}>Dias alugados/mês</Text>
            <Text style={[s.breakdownVal, { color: tokens.text }]}>{diasMes}</Text>
          </View>
          <View style={[s.breakdownRow, { borderBottomColor: tokens.border }]}>
            <Text style={[s.breakdownKey, { color: tokens.muted }]}>Receita bruta</Text>
            <Text style={[s.breakdownVal, { color: tokens.text }]}>{fmt(ganhoMes)}</Text>
          </View>
          <View style={[s.breakdownRow, { borderBottomColor: tokens.border }]}>
            <Text style={[s.breakdownKey, { color: tokens.muted }]}>
              {`Taxa da plataforma (${feeRatePct}%)`}
            </Text>
            <Text style={[s.breakdownVal, { color: tokens.error }]}>
              − {fmt(taxaPlat)}
            </Text>
          </View>
          {/* Linha "Você recebe" em negrito — verbatim linhas 159-162 */}
          <View style={s.breakdownRow}>
            <Text style={[s.breakdownKeyBold, { color: tokens.text }]}>Você recebe</Text>
            <Text style={[s.breakdownValBold, { color: tokens.green }]}>{fmt(ganhoLiquido)}</Text>
          </View>
        </View>

        {/* CTA — verbatim linhas 165-170 */}
        <TouchableOpacity
          style={s.ctaBtn}
          onPress={() => router.push("/itens/novo")}
          accessibilityRole="button"
          accessibilityLabel="Cadastrar meu item agora"
        >
          <Text style={s.ctaBtnText}>📦 Cadastrar meu item agora</Text>
        </TouchableOpacity>
      </View>

      {/* ── Banner de dicas — verbatim de page.tsx linhas 48-58 ── */}
      <View style={[s.tipsBanner, { borderColor: tokens.border, backgroundColor: tokens.surface }]}>
        <View style={s.tipsText}>
          <Text style={[s.tipsTitle, { color: tokens.text }]}>Quer maximizar seus ganhos?</Text>
          <Text style={[s.tipsSub, { color: tokens.muted }]}>
            Veja as dicas de quem já aluga com sucesso no ShareO.
          </Text>
        </View>
        <TouchableOpacity
          style={[s.tipsBtn, { borderColor: tokens.green }]}
          onPress={() => router.push("/anunciar/dicas")}
          accessibilityRole="button"
          accessibilityLabel="Ver dicas"
        >
          <Text style={[s.tipsBtnText, { color: tokens.green }]}>Ver dicas →</Text>
        </TouchableOpacity>
      </View>

      {/* ── Disclaimer — verbatim de _Calculadora.tsx linhas 174-177 ── */}
      <Text style={[s.disclaimer, { color: tokens.muted }]}>
        Estimativa baseada em dados médios do mercado de aluguel colaborativo no Brasil (2026).
        Os ganhos reais dependem da demanda, localização e qualidade do anúncio.
      </Text>
    </ScrollView>
  )
}

// ── Estilos ────────────────────────────────────────────────────────────────────
// Estilos que não dependem de tokens ficam num StyleSheet estático.
// Estilos dependentes de tokens são aplicados inline na JSX (padrão de login.tsx).
const s = StyleSheet.create({
    root:    { flex: 1 },
    content: { paddingHorizontal: 20, paddingBottom: 40 },

    // Back bar
    backBar: {
      paddingVertical:  14,
      paddingHorizontal: 0,
      minHeight:         44,
      justifyContent:   "center",
    },
    backText: { fontSize: 14 },

    // Hero
    hero: { alignItems: "center", marginBottom: 28, marginTop: 4 },
    badge: {
      borderRadius:    20,
      backgroundColor: "rgba(0,123,60,0.10)",
      paddingHorizontal: 14,
      paddingVertical:   6,
      marginBottom:      12,
    },
    badgeText: {
      fontSize:      11,
      fontWeight:    "700",
      letterSpacing: 1,
      textTransform: "uppercase",
    },
    heroTitle: {
      fontFamily:   "Montserrat_700Bold",
      fontSize:     26,
      fontWeight:   "700",
      textAlign:    "center",
      marginBottom: 8,
    },
    heroSub: {
      fontSize:   14,
      textAlign:  "center",
      lineHeight: 21,
    },

    // Steps
    section:      { marginBottom: 28 },
    stepTitle:    { fontSize: 15, fontWeight: "600", marginBottom: 12 },
    stepSubtitle: { fontSize: 12, lineHeight: 18, marginBottom: 12 },

    // Category grid — 2 colunas (mobile vs 2-3-4 no site)
    catGrid: {
      flexDirection: "row",
      flexWrap:      "wrap",
      gap:           8,
    },
    catBtn: {
      width:          "48%",
      borderWidth:    2,
      borderRadius:   12,
      padding:        12,
      alignItems:     "center",
      gap:            6,
      minHeight:      64,
      justifyContent: "center",
    },
    catIcon:  { fontSize: 22 },
    catLabel: { fontSize: 13, fontWeight: "500", textAlign: "center" },
    catExemplos: { fontSize: 12, marginTop: 8 },

    // Preço input
    precoRow: {
      flexDirection: "row",
      alignItems:    "center",
      gap:           8,
      maxWidth:      220,
    },
    precoPrefix: { fontSize: 14, fontWeight: "500" },
    precoInput: {
      flex:              1,
      borderWidth:       1,
      borderRadius:      10,
      paddingHorizontal: 14,
      minHeight:         48,
      fontSize:          16,
    },
    precoSuffix: { fontSize: 14 },

    // Dias chips
    chipsRow: {
      flexDirection: "row",
      flexWrap:      "wrap",
      gap:           8,
    },
    chip: {
      borderWidth:       2,
      borderRadius:      20,
      paddingHorizontal: 16,
      paddingVertical:   8,
      minHeight:         44,
      justifyContent:    "center",
    },
    chipText: { fontSize: 13, fontWeight: "500" },

    // Resultado
    resultBox: {
      borderWidth:   2,
      borderRadius:  16,
      padding:       16,
      marginBottom:  20,
      backgroundColor: "rgba(0,123,60,0.04)",
    },
    resultLabel: {
      fontSize:      11,
      fontWeight:    "700",
      textTransform: "uppercase",
      letterSpacing: 1,
      marginBottom:  16,
    },

    // Cards
    cardsRow: { flexDirection: "column", gap: 10, marginBottom: 16 },
    card: {
      borderWidth:  1,
      borderRadius: 12,
      padding:      14,
      alignItems:   "center",
    },
    cardGreen: {
      backgroundColor: "#007B3C",
      borderColor:     "#007B3C",
      borderWidth:     1,
      borderRadius:    12,
      padding:         14,
      alignItems:      "center",
    },
    cardCaption:      { fontSize: 12, marginBottom: 4 },
    cardCaptionWhite: { fontSize: 12, color: "rgba(255,255,255,0.80)", marginBottom: 4 },
    cardValue:        { fontSize: 24, fontWeight: "700", marginBottom: 4 },
    cardValueWhite:   { fontSize: 24, fontWeight: "700", color: "#FFFFFF", marginBottom: 4 },
    cardNote:         { fontSize: 11 },
    cardNoteWhite:    { fontSize: 11, color: "rgba(255,255,255,0.70)" },

    // Breakdown
    breakdown: {
      borderWidth:   1,
      borderRadius:  10,
      marginBottom:  16,
      overflow:      "hidden",
    },
    breakdownRow: {
      flexDirection:  "row",
      justifyContent: "space-between",
      alignItems:     "center",
      paddingHorizontal: 14,
      paddingVertical:   11,
      borderBottomWidth: 1,
    },
    breakdownKey:     { fontSize: 13 },
    breakdownVal:     { fontSize: 13, fontWeight: "500" },
    breakdownKeyBold: { fontSize: 13, fontWeight: "700" },
    breakdownValBold: { fontSize: 13, fontWeight: "700" },

    // CTA
    ctaBtn: {
      backgroundColor: "#007B3C",
      borderRadius:    10,
      minHeight:       52,
      alignItems:      "center",
      justifyContent:  "center",
    },
    ctaBtnText: {
      color:      "#FFFFFF",
      fontSize:   15,
      fontWeight: "700",
    },

    // Tips banner
    tipsBanner: {
      flexDirection:  "row",
      justifyContent: "space-between",
      alignItems:     "center",
      borderWidth:    1,
      borderRadius:   12,
      padding:        16,
      marginBottom:   20,
      gap:            12,
    },
    tipsText:    { flex: 1 },
    tipsTitle:   { fontSize: 13, fontWeight: "600", marginBottom: 3 },
    tipsSub:     { fontSize: 11 },
    tipsBtn: {
      borderWidth:       1,
      borderRadius:      8,
      paddingHorizontal: 14,
      paddingVertical:   9,
      minHeight:         44,
      justifyContent:    "center",
    },
    tipsBtnText: { fontSize: 13, fontWeight: "500" },

    // Disclaimer
    disclaimer: {
      fontSize:   11,
      textAlign:  "center",
      lineHeight: 17,
    },
})
