// Fonte: app/perfil/embaixador/page.tsx + app/perfil/embaixador/_AmbassadorSection.tsx
// Tela nativa do Programa Embaixadores — transcrição literal da interface web.
//
// Fontes das seções (rastreabilidade frame→fonte):
//   Header (tiers + banner pré-lançamento) → _AmbassadorSection.tsx linhas 93-127
//   Modal de consentimento LGPD            → _AmbassadorSection.tsx linhas 129-148
//   Métricas (3 cards)                     → _AmbassadorSection.tsx linhas 152-162
//   Barra de progresso de tier             → _AmbassadorSection.tsx linhas 163-191
//   Link de indicação                      → _AmbassadorSection.tsx linhas 193-234
//   Histórico de comissões                 → _AmbassadorSection.tsx linhas 236-261
//   Estado vazio                           → _AmbassadorSection.tsx linhas 263-273
//
// StyleSheet + tokens (useTheme) — padrão das telas desta sessão.
// Clipboard nativo: Share.share() do React Native (equivalente mobile do copyToClipboard).
// WhatsApp: Linking.openURL — verbatim da lógica shareWhatsApp() do site.

import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  StyleSheet, Share, Linking, Platform,
} from "react-native"
import { useState } from "react"
import { router } from "expo-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import type { Tokens } from "@/lib/theme"
import { apiFetch } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useTheme } from "@/lib/theme"

// ── Tipos — espelham AmbassadorStats de lib/ambassador.ts ─────────────────────

type AmbassadorTier = "BRONZE" | "SILVER" | "GOLD"
type CommissionStatus = "PENDING" | "APPROVED" | "PAID" | "CANCELLED"

interface CommissionSummary {
  id:           string
  amountCents:  number
  tierSnapshot: AmbassadorTier
  status:       CommissionStatus
  createdAt:    string
  referralId:   string
}

interface AmbassadorStats {
  referralCode:      string | null
  totalReferrals:    number
  activeReferrals:   number
  pendingReferrals:  number
  commissions:       CommissionSummary[]
  totalPendingCents: number
  totalPaidCents:    number
  payoutEnabled:     boolean
  hasBeenReferred:   boolean
}

interface AmbassadorData {
  stats:        AmbassadorStats
  hasConsented: boolean
}

// ── Funções puras — verbatim de lib/ambassador.ts (funções exportadas) ─────────
// Replicadas aqui para evitar import de lib do site no bundle mobile.

// TIER_RATES verbatim de _AmbassadorSection.tsx linha 24
const TIER_RATES: Record<AmbassadorTier, number> = { BRONZE: 2, SILVER: 3, GOLD: 5 }
const TIER_ORDER: AmbassadorTier[] = ["BRONZE", "SILVER", "GOLD"]

// getTierLabel — verbatim de lib/ambassador.ts linha 34
function getTierLabel(tier: AmbassadorTier | null): string {
  if (tier === "GOLD")   return "Ouro"
  if (tier === "SILVER") return "Prata"
  if (tier === "BRONZE") return "Bronze"
  return "Sem tier"
}

// getAmbassadorTier — verbatim de lib/ambassador.ts linha 16
function getAmbassadorTier(activeReferrals: number): AmbassadorTier | null {
  if (activeReferrals >= 51) return "GOLD"
  if (activeReferrals >= 11) return "SILVER"
  if (activeReferrals >= 1)  return "BRONZE"
  return null
}

// tierProgress — verbatim de lib/ambassador.ts linha 43
function tierProgress(activeCount: number): { nextTier: AmbassadorTier | null; needed: number } {
  if (activeCount < 1)  return { nextTier: "BRONZE", needed: 1  - activeCount }
  if (activeCount < 11) return { nextTier: "SILVER", needed: 11 - activeCount }
  if (activeCount < 51) return { nextTier: "GOLD",   needed: 51 - activeCount }
  return { nextTier: null, needed: 0 }
}

// fmt — verbatim de _AmbassadorSection.tsx linha 9
const fmt = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100)

// ── Cores dos tiers — definidas dentro do componente (ver tierBorderColors / tierTextColors /
// tierBgColors) pois dependem do mode (dark/light) resolvido em runtime via useTheme().
// Migradas de constantes de módulo para ternário light/dark — dark-mode-activation.

// TIER_ICONS — verbatim de _AmbassadorSection.tsx linha 18
const TIER_ICONS: Record<AmbassadorTier, string> = {
  BRONZE: "🥉",
  SILVER: "🥈",
  GOLD:   "🥇",
}

// ── Tela ──────────────────────────────────────────────────────────────────────

export default function EmbaixadorScreen() {
  const { tokens, mode } = useTheme()
  const insets           = useSafeAreaInsets()
  const { user }   = useAuth()
  const qc         = useQueryClient()

  // consentedLocally: true quando o usuário acabou de clicar "Entendi e aceito"
  // nesta sessão (evita piscar o bloco de consentimento antes do refetch completar).
  const [consentedLocally, setConsentedLocally] = useState(false)
  const [consentError,     setConsentError]     = useState("")
  const [shared,           setShared]           = useState(false)

  // ── Fetch: GET /api/user/ambassador ─────────────────────────────────────────
  // TanStack Query v5: onSuccess foi removido do useQuery — usa-se data diretamente.
  const { data, isLoading, isError } = useQuery({
    queryKey: ["ambassador"],
    queryFn:  () => apiFetch<{ data: AmbassadorData }>("/api/user/ambassador"),
    enabled:  !!user,
    select:   (r) => r.data,
  })

  // Consent mutation: POST /api/ambassador/consent
  const consentMut = useMutation({
    mutationFn: () => apiFetch("/api/ambassador/consent", { method: "POST" }),
    onSuccess: () => {
      setConsentedLocally(true)
      setConsentError("")
      qc.invalidateQueries({ queryKey: ["ambassador"] })
    },
    onError: () => setConsentError("Não foi possível registrar seu consentimento. Tente novamente."),
  })

  // Generate code mutation: POST /api/referral
  const generateMut = useMutation({
    mutationFn: () => apiFetch("/api/referral", { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ambassador"] }),
  })

  const stats        = data?.stats
  // hasConsented: true se o servidor indicou (data) OU se o usuário acabou de consentir nesta sessão
  const hasConsented = consentedLocally || (data?.hasConsented ?? false)
  const showConsent  = !hasConsented
  const currentTier  = stats ? getAmbassadorTier(stats.activeReferrals) : null
  const progress     = stats ? tierProgress(stats.activeReferrals) : null
  const shareLink    = stats?.referralCode
    ? `https://shareo.com.br/cadastro?ref=${stats.referralCode}`
    : null

  // ── Compartilhar link — adaptação mobile de copyLink() + shareWhatsApp() ────
  // Site: copyToClipboard() + window.open(whatsapp). Mobile: Share.share() nativo.
  async function handleShare() {
    if (!shareLink) return
    try {
      await Share.share({ message: shareLink, url: shareLink })
      setShared(true)
      setTimeout(() => setShared(false), 2000)
    } catch {
      // usuário cancelou o share sheet — silencioso
    }
  }

  // shareWhatsApp — verbatim de _AmbassadorSection.tsx linha 84
  function handleWhatsApp() {
    if (!shareLink) return
    const text = encodeURIComponent(`${shareLink} clique nesse link e faça o seu cadastro.`)
    Linking.openURL(`https://wa.me/?text=${text}`)
  }

  const s = makeStyles(tokens)

  // Tier colors — ternário dark/light (dark-mode-activation)
  // SILVER usa tokens semânticos pois é cinza neutro idêntico em ambos os temas.
  // BRONZE e GOLD usam âmbar: tom escuro sobre fundo claro → invertido no dark.
  const tierBorderColors: Record<AmbassadorTier, string> = {
    BRONZE: mode === "dark" ? "#78550A" : "#92400E",
    SILVER: tokens.muted,
    GOLD:   mode === "dark" ? "#78550A" : "#92400E",
  }
  const tierTextColors: Record<AmbassadorTier, string> = {
    BRONZE: mode === "dark" ? "#FCD34D" : "#92400E",
    SILVER: tokens.muted,
    GOLD:   mode === "dark" ? "#FCD34D" : "#B45309",
  }
  const tierBgColors: Record<AmbassadorTier, string> = {
    BRONZE: mode === "dark" ? "#2A1F0A" : "#FFFBEB",
    SILVER: tokens.bg,
    GOLD:   mode === "dark" ? "#1F1A0A" : "#FEFCE8",
  }

  // ── Guard: não logado ────────────────────────────────────────────────────────
  if (!user) {
    return (
      <View style={[s.centered, { paddingTop: insets.top }]}>
        <Text style={[s.guardTitle, { color: tokens.navy }]}>
          Faça login para acessar seu perfil
        </Text>
        <TouchableOpacity
          style={[s.loginBtn, { backgroundColor: tokens.green }]}
          onPress={() => router.replace("/(auth)/login")}
          accessibilityRole="button"
          accessibilityLabel="Entrar"
        >
          <Text style={s.loginBtnText}>Entrar</Text>
        </TouchableOpacity>
      </View>
    )
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={[s.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator color={tokens.green} size="large" />
        <Text style={[s.loadingText, { color: tokens.muted }]}>Carregando...</Text>
      </View>
    )
  }

  // ── Erro ────────────────────────────────────────────────────────────────────
  if (isError || !stats) {
    return (
      <View style={[s.centered, { paddingTop: insets.top }]}>
        <Text style={[s.guardTitle, { color: tokens.error }]}>
          Erro ao carregar o Programa Embaixadores.
        </Text>
        <TouchableOpacity
          style={[s.loginBtn, { backgroundColor: tokens.green }]}
          onPress={() => qc.invalidateQueries({ queryKey: ["ambassador"] })}
          accessibilityRole="button"
        >
          <Text style={s.loginBtnText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={[s.root, { backgroundColor: tokens.bg }]}>
      {/* ── Barra de voltar — verbatim do link "← Meu Perfil" do site ── */}
      <View style={[s.backBar, { backgroundColor: tokens.surface, borderBottomColor: tokens.border, paddingTop: insets.top }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={s.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Voltar para Meu Perfil"
        >
          <Text style={[s.backText, { color: tokens.muted }]}>← Meu Perfil</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      >
        {/* ── Cabeçalho da tela — verbatim do <h1> do site ── */}
        <View style={s.pageHeader}>
          <Text style={[s.pageTitle, { color: tokens.navy }]}>Programa Embaixadores</Text>
          <Text style={[s.pageSubtitle, { color: tokens.muted }]}>
            Bronze · Prata · Ouro — comissões sobre a taxa ShareO por cada locação dos seus indicados.
          </Text>
        </View>

        {/* ── Cabeçalho tier — verbatim de _AmbassadorSection.tsx linhas 93-127 ── */}
        <View style={[s.card, { borderColor: tokens.border, backgroundColor: tokens.surface }]}>
          <View>
            <Text style={[s.cardTitle, { color: tokens.navy }]}>Programa Embaixadores</Text>
            <Text style={[s.cardSubtitle, { color: tokens.muted }]}>
              Ganhe uma parte da nossa taxa por cada locação dos seus indicados.
            </Text>
          </View>

          {/* Tier badges — verbatim de _AmbassadorSection.tsx linhas 102-120 */}
          <View style={s.tiersRow}>
            {TIER_ORDER.map((t) => {
              const active = t === currentTier
              return (
                <View
                  key={t}
                  style={[
                    s.tierBadge,
                    active
                      ? { backgroundColor: tierBgColors[t], borderColor: tierBorderColors[t] }
                      : { backgroundColor: tokens.bg, borderColor: tokens.border },
                  ]}
                  accessibilityLabel={active ? `${getTierLabel(t)} — seu nível atual` : getTierLabel(t)}
                >
                  <Text style={s.tierIcon}>{TIER_ICONS[t]}</Text>
                  <Text
                    style={[
                      s.tierLabel,
                      { color: active ? tierTextColors[t] : tokens.muted },
                    ]}
                  >
                    {getTierLabel(t)}
                  </Text>
                  <Text
                    style={[
                      s.tierRate,
                      { color: active ? tierTextColors[t] : tokens.muted, opacity: 0.7 },
                    ]}
                  >
                    · {TIER_RATES[t]}%
                  </Text>
                </View>
              )
            })}
          </View>

          {/* Banner pré-lançamento — verbatim de _AmbassadorSection.tsx linhas 122-127 */}
          {/* tint âmbar: claro → ternário para dark (dark-mode-activation) */}
          <View style={[s.prelaunchBanner, {
            borderColor:     mode === "dark" ? "#78550A" : "#FDE68A",
            backgroundColor: mode === "dark" ? "#1F1A0A" : "#FFFBEB",
          }]}>
            <Text style={[s.prelaunchText, { color: mode === "dark" ? "#FCD34D" : "#92400E" }]}>
              <Text style={s.prelaunchBold}>Programa em pré-lançamento.</Text>
              {" "}Você já pode indicar amigos e acompanhar suas indicações.
            </Text>
          </View>
        </View>

        {/* ── Consentimento LGPD — verbatim de _AmbassadorSection.tsx linhas 129-148 ── */}
        {/* tint verde: claro → ternário para dark (dark-mode-activation) */}
        {showConsent && (
          <View style={[s.consentCard, {
            borderColor:     `${tokens.green}4D`,
            backgroundColor: mode === "dark" ? "#0D1F17" : "#F0FDF4",
          }]}>
            <Text style={[s.consentTitle, { color: tokens.text }]}>Antes de começar</Text>
            <Text style={[s.consentBody, { color: tokens.muted }]}>
              Ao compartilhar seu link de indicação, você aceita que o ShareO registre a origem do
              cadastro de quem usar seu convite, conforme nossa{" "}
              <Text
                style={{ textDecorationLine: "underline", color: tokens.green }}
                onPress={() => Linking.openURL("https://shareo.com.br/politicas")}
                accessibilityRole="link"
              >
                Política de Privacidade
              </Text>
              .{"\n"}A participação é voluntária e pode ser revogada a qualquer momento em
              Configurações de Conta.
            </Text>
            {consentError !== "" && (
              <Text style={[s.errorText, { color: tokens.error }]}>{consentError}</Text>
            )}
            <TouchableOpacity
              style={[s.consentBtn, { backgroundColor: tokens.green }]}
              onPress={() => consentMut.mutate()}
              disabled={consentMut.isPending}
              accessibilityRole="button"
              accessibilityLabel="Entendi e aceito"
            >
              <Text style={s.consentBtnText}>
                {consentMut.isPending ? "Registrando…" : "Entendi e aceito"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Seções pós-consentimento ── */}
        {hasConsented && (
          <>
            {/* Métricas — verbatim de _AmbassadorSection.tsx linhas 152-162 */}
            <View style={s.metricsRow}>
              <MetricCard
                label="Indicados"
                value={stats.totalReferrals}
                tokens={tokens}
              />
              <MetricCard
                label="Ativos"
                value={stats.activeReferrals}
                note="12 meses"
                tokens={tokens}
              />
              <MetricCard
                label="Comissão acumulada"
                value={fmt(stats.totalPendingCents)}
                mono
                tokens={tokens}
              />
            </View>

            {/* Barra de progresso — verbatim de _AmbassadorSection.tsx linhas 163-191 */}
            {progress?.nextTier && (
              <View style={[s.card, { borderColor: tokens.border, backgroundColor: tokens.surface }]}>
                <View style={s.progressHeader}>
                  <Text style={[s.progressCurrent, { color: tokens.text }]}>
                    Nível atual:{" "}
                    <Text style={{ fontWeight: "700" }}>
                      {currentTier ? getTierLabel(currentTier) : "Sem nível"}
                    </Text>
                  </Text>
                  <Text style={[s.progressNext, { color: tokens.muted }]}>
                    Próximo: {getTierLabel(progress.nextTier)} ({TIER_RATES[progress.nextTier]}%)
                  </Text>
                </View>
                {/* Track da barra */}
                <View style={[s.progressTrack, { backgroundColor: tokens.border }]}>
                  <View
                    style={[
                      s.progressFill,
                      {
                        backgroundColor: tokens.green,
                        width: `${Math.min(100, Math.round(
                          (stats.activeReferrals / (stats.activeReferrals + progress.needed)) * 100
                        ))}%` as `${number}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={[s.progressCaption, { color: tokens.muted }]}>
                  {progress.needed === 1 ? "Falta" : "Faltam"}{" "}
                  <Text style={{ fontWeight: "700" }}>{progress.needed}</Text>{" "}
                  {progress.needed === 1 ? "indicado ativo" : "indicados ativos"} para o nível{" "}
                  {getTierLabel(progress.nextTier)}.
                </Text>
              </View>
            )}

            {/* Link de indicação — verbatim de _AmbassadorSection.tsx linhas 193-234 */}
            <View style={[s.card, { borderColor: tokens.border, backgroundColor: tokens.surface }]}>
              <Text style={[s.sectionLabel, { color: tokens.text }]}>Meu link de indicação</Text>

              {stats.referralCode ? (
                <>
                  {/* Link box */}
                  <View style={[s.linkBox, { borderColor: tokens.border, backgroundColor: tokens.bg }]}>
                    <Text style={[s.linkText, { color: tokens.muted }]} numberOfLines={1} ellipsizeMode="tail">
                      {shareLink}
                    </Text>
                  </View>

                  {/* Botões: Compartilhar (= Copiar do web) + WhatsApp */}
                  <View style={s.linkBtns}>
                    {/* Compartilhar — equivalente mobile de "Copiar" do site */}
                    <TouchableOpacity
                      style={[s.btnPrimary, { backgroundColor: tokens.green }]}
                      onPress={handleShare}
                      accessibilityRole="button"
                      accessibilityLabel="Compartilhar link de indicação"
                    >
                      <Text style={s.btnPrimaryText}>{shared ? "✅ Compartilhado!" : "Compartilhar"}</Text>
                    </TouchableOpacity>
                  </View>

                  {/* WhatsApp — verbatim shareWhatsApp() de _AmbassadorSection.tsx linha 84 */}
                  <TouchableOpacity
                    style={[s.btnWhatsApp, { borderColor: "#22C55E" }]}
                    onPress={handleWhatsApp}
                    accessibilityRole="button"
                    accessibilityLabel="Compartilhar no WhatsApp"
                  >
                    <Text style={[s.btnWhatsAppText, { color: "#15803D" }]}>WhatsApp</Text>
                  </TouchableOpacity>
                </>
              ) : (
                /* Gerar código — verbatim de _AmbassadorSection.tsx linha 226-232 */
                <TouchableOpacity
                  style={[s.btnPrimary, { backgroundColor: tokens.green }]}
                  onPress={() => generateMut.mutate()}
                  disabled={generateMut.isPending}
                  accessibilityRole="button"
                  accessibilityLabel="Gerar meu link de indicação"
                >
                  <Text style={s.btnPrimaryText}>
                    {generateMut.isPending ? "Gerando…" : "Gerar meu link de indicação"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Histórico de comissões — verbatim de _AmbassadorSection.tsx linhas 236-261 */}
            {stats.commissions.length > 0 && (
              <View style={[s.card, { borderColor: tokens.border, backgroundColor: tokens.surface }]}>
                <Text style={[s.sectionLabel, { color: tokens.text }]}>Histórico de comissões</Text>
                {stats.commissions.slice(0, 20).map((c, i) => (
                  <View
                    key={c.id}
                    style={[
                      s.commissionRow,
                      i < stats.commissions.slice(0, 20).length - 1
                        ? { borderBottomWidth: 1, borderBottomColor: tokens.border }
                        : undefined,
                    ]}
                  >
                    <View>
                      <Text style={[s.commissionDate, { color: tokens.muted }]}>
                        {new Date(c.createdAt).toLocaleDateString("pt-BR")}
                      </Text>
                      <Text style={[s.commissionTier, { color: tokens.muted }]}>
                        Nível {getTierLabel(c.tierSnapshot)}
                      </Text>
                    </View>
                    <Text
                      style={[
                        s.commissionAmount,
                        {
                          color:             c.status === "CANCELLED" ? tokens.muted : tokens.green,
                          textDecorationLine: c.status === "CANCELLED" ? "line-through" : "none",
                        },
                      ]}
                    >
                      +{fmt(c.amountCents)}
                      {c.status === "PENDING" && (
                        <Text style={[s.commissionPending, { color: tokens.warning }]}> · pendente</Text>
                      )}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Estado vazio — verbatim de _AmbassadorSection.tsx linhas 263-273 */}
            {stats.totalReferrals === 0 && (
              <View style={[s.card, s.emptyCard, { borderColor: tokens.border, backgroundColor: tokens.surface }]}>
                <Text style={s.emptyEmoji}>🏅</Text>
                <Text style={[s.emptyTitle, { color: tokens.text }]}>
                  Você ainda não tem indicados
                </Text>
                <Text style={[s.emptyBody, { color: tokens.muted }]}>
                  Compartilhe seu link e comece a ganhar comissões por cada locação dos seus indicados.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  )
}

// ── MetricCard — verbatim de MetricCard em _AmbassadorSection.tsx linhas 279-298 ─

interface MetricCardProps {
  label:  string
  value:  string | number
  note?:  string
  mono?:  boolean
  tokens: Tokens
}

function MetricCard({ label, value, note, mono, tokens }: MetricCardProps) {
  const s = makeStyles(tokens)
  return (
    <View style={[s.metricCard, { borderColor: tokens.border, backgroundColor: tokens.surface }]}>
      <Text style={[s.metricValue, mono ? s.metricValueMono : null, { color: tokens.text }]}>
        {value}
      </Text>
      <Text style={[s.metricLabel, { color: tokens.muted }]}>
        {label}
        {note && <Text style={s.metricNote}>{"\n"}{note}</Text>}
      </Text>
    </View>
  )
}

// ── StyleSheet ────────────────────────────────────────────────────────────────

function makeStyles(tokens: Tokens) {
  return StyleSheet.create({
    root: {
      flex: 1,
    },
    centered: {
      flex:              1,
      alignItems:        "center",
      justifyContent:    "center",
      paddingHorizontal: 24,
      gap:               16,
    },
    guardTitle: {
      fontSize:  16,
      fontWeight: "600",
      textAlign: "center",
    },
    loginBtn: {
      borderRadius:      10,
      minHeight:         48,
      paddingHorizontal: 32,
      alignItems:        "center",
      justifyContent:    "center",
      width:             "100%",
    },
    loginBtnText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
    loadingText:  { fontSize: 13, marginTop: 8 },
    errorText:    { fontSize: 12, marginTop: 4 },

    // Barra de voltar — verbatim link "← Meu Perfil" do site
    backBar: {
      borderBottomWidth:  1,
      paddingHorizontal:  16,
      paddingBottom:      12,
      paddingTop:         12,
    },
    backBtn:  { flexDirection: "row", alignItems: "center", minHeight: 44 },
    backText: { fontSize: 14 },

    // Cabeçalho da tela — verbatim do <h1> + <p> do site
    pageHeader: {
      marginBottom: 12,
    },
    pageTitle: {
      fontSize:   20,
      fontFamily: "Montserrat_700Bold",
    },
    pageSubtitle: {
      fontSize:  13,
      marginTop: 4,
      lineHeight: 18,
    },

    // Card base — verbatim de rounded-xl border border-border bg-surface p-5
    card: {
      borderRadius:  16,
      borderWidth:   1,
      padding:       20,
      marginBottom:  12,
      gap:           12,
      ...Platform.select({
        ios:     { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
        android: { elevation: 1 },
      }),
    },

    // Tier header card
    cardTitle: {
      fontSize:   18,
      fontFamily: "Montserrat_700Bold",
    },
    cardSubtitle: {
      fontSize:  13,
      lineHeight: 18,
      marginTop: 2,
    },
    tiersRow: {
      flexDirection: "row",
      flexWrap:      "wrap",
      gap:           8,
      marginTop:     4,
    },
    tierBadge: {
      flexDirection:     "row",
      alignItems:        "center",
      borderWidth:       1,
      borderRadius:      20,
      paddingHorizontal: 12,
      paddingVertical:   4,
      gap:               4,
    },
    tierIcon:  { fontSize: 14 },
    tierLabel: { fontSize: 13, fontWeight: "600" },
    tierRate:  { fontSize: 13 },

    // Banner pré-lançamento — verbatim de _AmbassadorSection.tsx linhas 122-127
    // borderColor / backgroundColor / color aplicados via inline style no JSX (dark-mode-activation)
    prelaunchBanner: {
      borderRadius:      8,
      borderWidth:       1,
      paddingHorizontal: 16,
      paddingVertical:   12,
      marginTop:         4,
    },
    prelaunchText: {
      fontSize:  13,
      lineHeight: 18,
    },
    prelaunchBold: { fontWeight: "700" },

    // Consentimento LGPD — verbatim de _AmbassadorSection.tsx linhas 129-148
    // backgroundColor aplicado via inline style no JSX (dark-mode-activation)
    consentCard: {
      borderRadius:  16,
      borderWidth:   1,
      padding:       20,
      marginBottom:  12,
      gap:           12,
    },
    consentTitle: {
      fontSize:   15,
      fontWeight: "600",
    },
    consentBody: {
      fontSize:  13,
      lineHeight: 20,
    },
    consentBtn: {
      borderRadius:      8,
      paddingHorizontal: 20,
      paddingVertical:   10,
      minHeight:         44,
      alignItems:        "center",
      justifyContent:    "center",
    },
    consentBtnText: {
      fontSize:   13,
      fontWeight: "600",
      color:      "#FFFFFF",
    },

    // Métricas — verbatim de _AmbassadorSection.tsx linhas 152-162
    metricsRow: {
      flexDirection: "row",
      gap:           10,
      marginBottom:  12,
    },
    metricCard: {
      flex:              1,
      borderWidth:       1,
      borderRadius:      16,
      paddingVertical:   14,
      paddingHorizontal: 8,
      alignItems:        "center",
    },
    metricValue: {
      fontSize:   18,
      fontWeight: "800",
    },
    metricValueMono: {
      fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
      fontSize:   14,
    },
    metricLabel: {
      fontSize:  11,
      marginTop: 2,
      textAlign: "center",
      lineHeight: 14,
    },
    metricNote: {
      fontSize:  10,
      opacity:   0.7,
    },

    // Barra de progresso — verbatim de _AmbassadorSection.tsx linhas 163-191
    progressHeader: {
      flexDirection:  "row",
      justifyContent: "space-between",
      alignItems:     "center",
      flexWrap:       "wrap",
      gap:            4,
    },
    progressCurrent: { fontSize: 13 },
    progressNext:    { fontSize: 12 },
    progressTrack: {
      height:       8,
      borderRadius: 4,
      overflow:     "hidden",
      marginTop:    4,
    },
    progressFill: {
      height:       8,
      borderRadius: 4,
    },
    progressCaption: {
      fontSize: 12,
      marginTop: 4,
    },

    // Link de indicação
    sectionLabel: {
      fontSize:   13,
      fontWeight: "600",
    },
    linkBox: {
      borderWidth:       1,
      borderRadius:      8,
      paddingHorizontal: 12,
      paddingVertical:   8,
      marginTop:         4,
    },
    linkText: { fontSize: 13 },
    linkBtns: {
      flexDirection: "row",
      gap:           8,
      marginTop:     4,
    },
    btnPrimary: {
      flex:              1,
      borderRadius:      8,
      paddingHorizontal: 16,
      paddingVertical:   8,
      minHeight:         44,
      alignItems:        "center",
      justifyContent:    "center",
    },
    btnPrimaryText: {
      fontSize:   13,
      fontWeight: "600",
      color:      "#FFFFFF",
    },
    btnWhatsApp: {
      borderWidth:       1,
      borderRadius:      8,
      paddingHorizontal: 16,
      paddingVertical:   8,
      minHeight:         44,
      alignItems:        "center",
      justifyContent:    "center",
      marginTop:         4,
    },
    btnWhatsAppText: {
      fontSize:   13,
      fontWeight: "600",
    },

    // Comissões — verbatim de _AmbassadorSection.tsx linhas 236-261
    commissionRow: {
      flexDirection:  "row",
      justifyContent: "space-between",
      alignItems:     "center",
      paddingVertical: 10,
    },
    commissionDate:    { fontSize: 13 },
    commissionTier:    { fontSize: 11, marginTop: 1 },
    commissionAmount:  { fontSize: 14, fontWeight: "600" },
    commissionPending: { fontSize: 12, fontWeight: "400" },

    // Estado vazio — verbatim de _AmbassadorSection.tsx linhas 263-273
    emptyCard: {
      alignItems: "center",
      paddingVertical: 32,
    },
    emptyEmoji: { fontSize: 36, marginBottom: 8 },
    emptyTitle: {
      fontSize:   15,
      fontWeight: "600",
      textAlign:  "center",
    },
    emptyBody: {
      fontSize:  13,
      lineHeight: 18,
      textAlign: "center",
      marginTop: 4,
    },
  })
}
