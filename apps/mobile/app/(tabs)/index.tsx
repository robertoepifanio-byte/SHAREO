// Fonte: app/page.tsx (Home completa) + components/home/HeroSearch.tsx
//   + components/home/ListaVIP.tsx + components/home/FounderCaptureForm.tsx
//   + components/layout/AppFooter.tsx
// Transcrição literal de TODAS as seções da Home do site, na mesma ordem:
// Hero (imagem + placeholder rotativo) → Simulador de Renda → Categorias →
// Como Funciona → Casos de Renda → Itens Procurados → Segurança →
// Lista VIP (1ª ocorrência, completa) → FounderCaptureForm colapsado (2ª ocorrência) →
// AppFooter.

import { useState, useCallback, useEffect, useRef } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
} from "react-native"
import { router } from "expo-router"
import { useQuery } from "@tanstack/react-query"
import Svg, { Circle, Path, Line } from "react-native-svg"
import { apiFetch } from "@/lib/api"
import { useTheme } from "@/lib/theme"
import { SimuladorRenda } from "@/components/home/SimuladorRenda"
import { CategoriasSection } from "@/components/home/CategoriasSection"
import { CasosRenda } from "@/components/home/CasosRenda"
import { ItensProcurados } from "@/components/home/ItensProcurados"
import { Seguranca } from "@/components/home/Seguranca"
import { ListaVIP } from "@/components/home/ListaVIP"
import { FounderCaptureForm } from "@/components/home/FounderCaptureForm"
import { AppFooter } from "@/components/layout/AppFooter"

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface PlatformStats {
  itemCount:  number
  ownerCount: number
  categories: number
  feeRate:    number
  checkoutMaxCents: number
}
interface Category { id: string; name: string; slug: string }

// ── "Como funciona" — fonte: app/page.tsx linhas 22-88 (array `steps`) ───────
const STEPS = [
  { num: "1", title: "Busque o que precisa", desc: "Pesquise por categoria, localização ou nome. Veja itens disponíveis perto de você no mapa.",
    icon: <Circle cx="11" cy="11" r="8" stroke="#007B3C" strokeWidth={2} fill="none" /> },
  { num: "2", title: "Combine com o proprietário", desc: "Envie mensagem pelo chat do ShareO, combine as datas e a retirada do item com segurança." },
  { num: "3", title: "Use e devolva", desc: "Retire, use pelo período combinado e devolva. Avalie a experiência e construa sua reputação." },
]

// ── Placeholders do campo de busca — transcritos de HeroSearch.tsx do site ───
// Alternância a cada 3s; para ao focar o campo. (components/home/HeroSearch.tsx)
const PLACEHOLDERS = [
  "O que você precisa alugar?",
  "O que você tem para alugar?",
]

// ── Ícones do hero — transcritos de HeroSearch.tsx / page.tsx do site ────────
function SearchIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth={2} strokeLinecap="round">
      <Circle cx="11" cy="11" r="8"/>
      <Path d="m21 21-4.35-4.35"/>
    </Svg>
  )
}
function MoneyIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="12" r="10"/>
      <Path d="M12 6v2m0 8v2M9.5 9.5a2.5 2.5 0 0 1 5 0c0 1.5-2.5 3-2.5 3"/>
    </Svg>
  )
}
function RentIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round">
      <Circle cx="11" cy="11" r="8"/>
      <Path d="m21 21-4.35-4.35"/>
    </Svg>
  )
}
// Ícones dos steps 1 e 3 (Search/ArrowRight) já cobertos acima; step 2 (Calendar) — page.tsx linhas 48-65
// decorativo — #144D81 = azul médio no claro; #5B9BD5 = azul claro sobre surface dark
function CalendarIcon({ color }: { color: string }) {
  return (
    <Svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 4h18v18H3z" opacity={0} />
      <Path d="M3 10h18M8 2v4M16 2v4" />
      <Path d="M3 4h18v16a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4z" />
    </Svg>
  )
}
function ArrowRightIcon() {
  return (
    <Svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="#007B3C" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 12h14" />
      <Path d="m12 5 7 7-7 7" />
    </Svg>
  )
}

// ── Tela Home ──────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const { tokens, mode } = useTheme()
  const [searchQuery, setSearchQuery] = useState("")

  // ── Alternância de placeholder — fonte: components/home/HeroSearch.tsx ───────
  // setInterval a cada 3s, limpo ao focar o campo (mesma lógica do site).
  // Hooks no topo do componente, sem condicionais — Rules of Hooks respeitadas.
  const [placeholderIdx, setPlaceholderIdx] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setPlaceholderIdx((prev) => (prev + 1) % PLACEHOLDERS.length)
    }, 3000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  function handleSearchFocus() {
    if (intervalRef.current) clearInterval(intervalRef.current)
  }

  const { data: statsData } = useQuery<{ data: PlatformStats }>({
    queryKey: ["platform-stats"],
    queryFn:  () => apiFetch<{ data: PlatformStats }>("/api/stats"),
    staleTime: 5 * 60_000,
  })
  const stats = statsData?.data

  const { data: catData } = useQuery<{ data: Category[] }>({
    queryKey: ["categories"],
    queryFn:  () => apiFetch<{ data: Category[] }>("/api/categories"),
    staleTime: 5 * 60_000,
  })
  const categories = catData?.data ?? []

  function handleSearch() {
    const q = searchQuery.trim()
    router.push((q ? `/explorar?q=${encodeURIComponent(q)}` : "/explorar") as never)
  }

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: tokens.bg }]}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* ── HERO — fonte: app/page.tsx linhas 138-252 ── */}
      <View style={styles.hero}>
        <View style={styles.orb} />
        <Text style={styles.h1}>
          {"Ganhe dinheiro com o que\n"}
          <Text style={styles.h1Accent}>está parado na sua casa.</Text>
        </Text>

        {/* Hero image — fonte: app/page.tsx linha ~159
            <Image src="/logos/hero-carro-moto.webp" width={1346} height={820}
                   className="h-auto w-[230px]" priority />
            Dimensões mobile: w=230px, h≈140px (proporção 1346/820 ≈ 1.641) */}
        <Image
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          source={require("../../assets/hero-carro-moto.webp")}
          style={styles.heroImage}
          resizeMode="contain"
          accessibilityLabel="Itens disponíveis para alugar no ShareO: carro, moto, furadeira, câmera, caixa de som, projetor, bicicleta e escada."
        />

        <Text style={styles.subtitle}>Tudo perto de você.</Text>

        <View style={styles.ctaGroup} accessibilityRole="none" accessibilityLabel="Ações principais">
          <TouchableOpacity onPress={() => router.push("/itens/novo")} style={styles.ctaPrimary} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="Quero ganhar dinheiro anunciando meus itens">
            <MoneyIcon />
            <Text style={styles.ctaText}>QUERO GANHAR DINHEIRO</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/explorar")} style={styles.ctaSecondary} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="Quero alugar um item">
            <RentIcon />
            <Text style={styles.ctaSecondaryText}>QUERO ALUGAR</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchBar} accessibilityRole="search">
          <SearchIcon />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            onFocus={handleSearchFocus}
            placeholder={PLACEHOLDERS[placeholderIdx]}
            placeholderTextColor="#94A3B8"
            returnKeyType="search"
            style={styles.searchInput}
            accessibilityLabel="Buscar item para alugar ou anunciar"
          />
          <TouchableOpacity onPress={handleSearch} style={styles.searchButton} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="Buscar">
            <Text style={styles.searchButtonText}>BUSCAR</Text>
          </TouchableOpacity>
        </View>

        {stats && (
          <View style={styles.statsRow} accessibilityRole="list" accessibilityLabel="Números da plataforma">
            <StatItem num={stats.itemCount.toLocaleString("pt-BR")}  label="Itens disponíveis" />
            <StatItem num={stats.ownerCount.toLocaleString("pt-BR")} label="Proprietários ativos" />
            <StatItem num="0%" label="Custo para anunciar" />
            <StatItem num={String(stats.categories)} label="Categorias" />
          </View>
        )}
      </View>

      {/* ── SIMULADOR DE RENDA ── */}
      <SimuladorRenda />

      {/* ── CATEGORIAS ── */}
      <CategoriasSection categories={categories} />

      {/* ── COMO FUNCIONA — fonte: app/page.tsx linhas 290-321 ── */}
      <View style={[styles.stepsSection, { backgroundColor: tokens.bg }]}>
        <Text style={[styles.stepsTitle, { color: tokens.navy }]}>Como funciona</Text>
        {STEPS.map((step) => (
          <View key={step.num} style={[styles.stepCard, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
            {step.icon ?? (step.num === "2"
              ? <CalendarIcon color={mode === "dark" ? "#5B9BD5" : "#144D81"} />
              : <ArrowRightIcon />
            )}
            <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>{step.num}</Text></View>
            <Text style={[styles.stepTitle, { color: tokens.navy }]}>{step.title}</Text>
            <Text style={[styles.stepDesc, { color: tokens.muted }]}>{step.desc}</Text>
          </View>
        ))}
      </View>

      {/* ── QUEM JÁ ESTÁ GANHANDO ── */}
      <CasosRenda />

      {/* ── ITENS MAIS PROCURADOS ── */}
      <ItensProcurados />

      {/* ── SEGURANÇA ── */}
      <Seguranca feeRate={stats?.feeRate ?? null} checkoutMaxCents={stats?.checkoutMaxCents ?? null} />

      {/* ── LISTA VIP — 1ª ocorrência (seção completa) ──
          Fonte: components/home/ListaVIP.tsx + FounderCaptureForm.tsx
          Badge "Pré-lançamento", 4 cards de benefícios, formulário, contador dinâmico. */}
      <ListaVIP />

      {/* ── LISTA VIP — 2ª ocorrência (FounderCaptureForm colapsado perto do rodapé) ──
          O mesmo FounderCaptureForm colapsado reaparece perto do rodapé no site.
          Fonte: components/home/ListaVIP.tsx do site (nota do plano de validação 2026-07-03). */}
      <View style={styles.founderCtaSection}>
        <Text style={styles.founderCtaTitle}>Quer ser avisado no lançamento?</Text>
        <FounderCaptureForm />
      </View>

      {/* ── RODAPÉ GLOBAL ──
          Fonte: components/layout/AppFooter.tsx
          Logo, tagline, 3 colunas de links, copyright, 3 selos de confiança. */}
      <AppFooter />
    </ScrollView>
  )
}

function StatItem({ num, label }: { num: string; label: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statNum}>{num}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  hero: {
    backgroundColor: "#003366",
    paddingHorizontal: 20, paddingTop: 24, paddingBottom: 32,
    overflow: "hidden", position: "relative",
  },
  orb: { position: "absolute", right: -60, top: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: "rgba(0,123,60,0.15)" },
  h1: { fontSize: 24, fontFamily: "Montserrat_800ExtraBold", lineHeight: 28, color: "#FFFFFF", textAlign: "center", marginBottom: 4 },
  h1Accent: { color: "#59C686" },
  subtitle: { fontSize: 16, fontWeight: "500", color: "rgba(255,255,255,0.80)", textAlign: "center", marginBottom: 24, marginTop: 12 },
  ctaGroup: { gap: 12, marginBottom: 20 },
  ctaPrimary: { backgroundColor: "#007B3C", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 8, minHeight: 48, paddingHorizontal: 24 },
  ctaText: { fontSize: 13, fontWeight: "600", color: "#FFFFFF", letterSpacing: 0.4 },
  ctaSecondary: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 8, borderWidth: 2, borderColor: "rgba(255,255,255,0.60)", minHeight: 48, paddingHorizontal: 24 },
  ctaSecondaryText: { fontSize: 13, fontWeight: "600", color: "#FFFFFF", letterSpacing: 0.4 },
  searchBar: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 6, gap: 8, marginBottom: 28,
    shadowColor: "#000000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.20, shadowRadius: 10, elevation: 8,
  },
  searchInput: { flex: 1, fontSize: 15, color: "#0F172A", minHeight: 44, padding: 0 },
  searchButton: { backgroundColor: "#007B3C", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, minHeight: 36, alignItems: "center", justifyContent: "center" },
  searchButtonText: { fontSize: 12, fontWeight: "700", color: "#FFFFFF", letterSpacing: 0.4 },
  statsRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 16 },
  statItem: { alignItems: "center", minWidth: 72 },
  statNum: { fontSize: 22, fontFamily: "Montserrat_800ExtraBold", lineHeight: 24, color: "#59C686" },
  statLabel: { fontSize: 12, color: "rgba(255,255,255,0.60)", marginTop: 2, textAlign: "center" },

  // Hero image — fonte: app/page.tsx linha ~159 (className="h-auto w-[230px]")
  // Dimensões: 230px × 147px (proporção 1100/702 ≈ 1.567)
  heroImage: {
    width: 230,
    height: 140,
    alignSelf: "center",
    marginTop: 16,
    marginBottom: 4,
  },

  // FounderCaptureForm colapsado (2ª ocorrência) perto do rodapé
  founderCtaSection: {
    backgroundColor: "#003366",
    paddingHorizontal: 24,
    paddingVertical: 32,
    gap: 12,
    alignItems: "center",
  },
  founderCtaTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 4,
  },

  stepsSection: { backgroundColor: "#F8FAFC", padding: 20 },
  stepsTitle: { fontSize: 20, fontFamily: "Montserrat_700Bold", color: "#003366", marginBottom: 16 },
  stepCard: { alignItems: "center", gap: 10, borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#FFFFFF", borderRadius: 12, padding: 20, marginBottom: 14 },
  stepBadge: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#007B3C", alignItems: "center", justifyContent: "center" },
  stepBadgeText: { fontSize: 18, fontWeight: "800", color: "#FFFFFF" },
  stepTitle: { fontSize: 15, fontFamily: "Montserrat_700Bold", color: "#003366", textAlign: "center" },
  stepDesc: { fontSize: 13, lineHeight: 19, color: "#64748B", textAlign: "center" },
})
