// Fonte: components/home/ListaVIP.tsx + components/home/FounderCaptureForm.tsx (uso)
// Transcrição literal da seção Lista VIP para React Native.
// Badge, título, subtítulo, 4 cards e social proof transcritos verbatim do componente do site.
// Contador dinâmico via GET /api/founders/stats (rota pública, sem auth).

import { useQuery } from "@tanstack/react-query"
import { View, Text, StyleSheet } from "react-native"
import Svg, { Path, Circle, Polyline } from "react-native-svg"
import { apiFetch } from "@/lib/api"
import { FounderCaptureForm } from "./FounderCaptureForm"

interface FounderStats {
  total:    number
  thisWeek: number
  converted: number
}

// ── Ícones — transcritos verbatim de ListaVIP.tsx do site ────────────────────

// Badge: Clock — "circle cx=12 cy=12 r=10 + polyline 12 6 12 12 16 14"
function ClockIcon() {
  return (
    <Svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#FDE68A"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Circle cx="12" cy="12" r="10" />
      <Polyline points="12 6 12 12 16 14" />
    </Svg>
  )
}

// Card 1: Dollar/coin — Condições especiais
function DollarIcon() {
  return (
    <Svg
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#59C686"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Circle cx="12" cy="12" r="10" />
      <Path d="M12 6v2m0 8v2M9.5 9.5a2.5 2.5 0 0 1 5 0c0 1.5-2.5 3-2.5 3" />
    </Svg>
  )
}

// Card 2: Check — Verificação de perfil gratuita
function CheckIcon() {
  return (
    <Svg
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#59C686"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Polyline points="20 6 9 17 4 12" />
    </Svg>
  )
}

// Card 3: Activity — Acesso antecipado
function ActivityIcon() {
  return (
    <Svg
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#59C686"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </Svg>
  )
}

// Card 4: Star — Primeiro a descobrir
function StarIcon() {
  return (
    <Svg
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#59C686"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </Svg>
  )
}

// ── Cards de benefícios — transcritos verbatim de ListaVIP.tsx do site ────────
const BENEFIT_CARDS = [
  {
    key:   "condicoes",
    icon:  <DollarIcon />,
    title: "Condições especiais",
    desc:  "Os primeiros anunciantes terão reconhecimento exclusivo — detalhes no lançamento",
  },
  {
    key:   "verificacao",
    icon:  <CheckIcon />,
    title: "Verificação de perfil gratuita",
    desc:  "Credibilidade desde o primeiro dia — sem custos adicionais",
  },
  {
    key:   "acesso",
    icon:  <ActivityIcon />,
    title: "Acesso antecipado",
    desc:  "Você é avisado dois dias antes de os cadastros abrirem na sua cidade",
  },
  {
    key:   "primeiro",
    icon:  <StarIcon />,
    title: "Primeiro a descobrir",
    desc:  "Novas funcionalidades chegam primeiro para quem está na lista",
  },
]

// ── ListaVIP ──────────────────────────────────────────────────────────────────
export function ListaVIP() {
  // GET /api/founders/stats — rota pública, revalidate 300s no servidor
  const { data } = useQuery<{ data: FounderStats }>({
    queryKey: ["founder-stats"],
    queryFn: () => apiFetch<{ data: FounderStats }>("/api/founders/stats"),
    staleTime: 5 * 60_000,
  })

  const total    = data?.data?.total    ?? 0
  const thisWeek = data?.data?.thisWeek ?? 0
  const showCount = total >= 10

  return (
    <View
      style={s.section}
      accessibilityLabel="Lista VIP do Shareo"
    >
      {/* Orbe decorativo — aria-hidden no site */}
      <View style={s.orb} importantForAccessibility="no-hide-descendants" />

      <View style={s.content}>
        {/* Badge "Pré-lançamento · Primeiros no Brasil" — role="note" no site */}
        <View style={s.badge}>
          <ClockIcon />
          <Text style={s.badgeText}>Pré-lançamento · Primeiros no Brasil</Text>
        </View>

        {/* Título — "O Shareo está chegando. / Entre na lista." */}
        <Text style={s.title} accessibilityRole="header">
          {"O Shareo está chegando.\n"}
          <Text style={s.titleAccent}>Entre na lista.</Text>
        </Text>

        {/* Subtítulo */}
        <Text style={s.subtitle}>
          A abertura é feita por cidade, e as regiões com mais interessados entram primeiro. Você é avisado dois dias antes de os cadastros abrirem na sua cidade, com as condições especiais que planejamos oferecer aos primeiros anunciantes.
        </Text>

        {/* 4 Cards de benefícios — role="list" no site */}
        <View style={s.cardsGrid} accessibilityLabel="Por que entrar na lista">
          {BENEFIT_CARDS.map((card) => (
            <View key={card.key} style={s.card}>
              <View style={s.cardIcon}>{card.icon}</View>
              <View style={s.cardBody}>
                <Text style={s.cardTitle}>{card.title}</Text>
                <Text style={s.cardDesc}>{card.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Formulário de captação */}
        <FounderCaptureForm />

        {/* Social proof dinâmico — só exibe com dados reais (total >= 10) */}
        {showCount ? (
          <Text style={s.socialProof}>
            <Text style={s.socialProofBold}>
              {thisWeek > 0
                ? `${thisWeek} pessoas entraram esta semana`
                : `${total} pessoas já estão na lista`}
            </Text>
            {" no Brasil"}
          </Text>
        ) : (
          <Text style={s.socialProof}>
            Seja um dos primeiros fundadores do Shareo no Brasil
          </Text>
        )}
      </View>
    </View>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────
// Cores e dimensões transcritas das classes CSS de ListaVIP.tsx do site.
// bg-gradient-to-br from-primary to-navy-deep → bgcolor #003366 (fundo navy plano no mobile).
const s = StyleSheet.create({
  section: {
    backgroundColor: "#003366",
    paddingHorizontal: 24,
    paddingVertical: 64,
    overflow: "hidden",
  },
  orb: {
    position: "absolute",
    right:    -80,
    top:      -80,
    width:    400,
    height:   400,
    borderRadius: 200,
    backgroundColor: "rgba(0,123,60,0.12)",
  },
  content: { alignItems: "center", zIndex: 1 },

  // Badge
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.50)",
    backgroundColor: "rgba(251,191,36,0.20)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 20,
    alignSelf: "center",
  },
  badgeText: {
    fontSize: 12, fontWeight: "600", color: "#FDE68A",
  },

  // Título e subtítulo
  title: {
    fontSize: 24, fontWeight: "800", lineHeight: 30,
    color: "#FFFFFF", textAlign: "center", marginBottom: 12,
  },
  titleAccent: { color: "#59C686" },
  subtitle: {
    fontSize: 15, lineHeight: 22,
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    marginBottom: 36,
  },

  // Cards
  cardsGrid: { width: "100%", gap: 16, marginBottom: 36 },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.07)",
    padding: 16,
  },
  cardIcon: {
    width: 40, height: 40, borderRadius: 8,
    backgroundColor: "rgba(0,123,60,0.30)",
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  cardBody: { flex: 1 },
  cardTitle: {
    fontSize: 14, fontWeight: "700", color: "#FFFFFF", marginBottom: 4,
  },
  cardDesc: {
    fontSize: 12, lineHeight: 17, color: "rgba(255,255,255,0.60)",
  },

  // Social proof
  socialProof: {
    marginTop: 16, fontSize: 13,
    color: "rgba(255,255,255,0.55)",
    textAlign: "center",
  },
  socialProofBold: {
    fontWeight: "700", color: "rgba(255,255,255,0.85)",
  },
})
