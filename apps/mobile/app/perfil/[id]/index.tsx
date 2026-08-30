// Fonte: app/perfil/[id]/page.tsx
//
// Tela de perfil público — transcrição literal do site em 375px.
// Seções transcritas (número de linha do site → componente native):
//   L136-174: cabeçalho (avatar, nome, badges, bio, localização) → HeaderCard
//   L177-203: 3 stat cards (itens, aluguéis, nota)              → StatsRow
//   L206-247: conquistas + progress bar (P3-70/71/72/74)        → ConquistasCard
//   L250-261: grade de itens anunciados                          → ItensSection
//   L264-298: avaliações recebidas                               → AvaliacoesCard
//
// Dados via GET /api/users/[id]/public — endpoint criado nesta mesma PR.
// Badges (responseBadge, borrowerBadge, nextBadge, activeReviewer) computados
// no servidor; a tela apenas os exibe — sem lógica de badge aqui.

import React from "react"
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native"
import { router, useLocalSearchParams } from "expo-router"
import { useQuery }                     from "@tanstack/react-query"
import { SafeAreaView }                 from "react-native-safe-area-context"
import Svg, { Path, Polyline }          from "react-native-svg"
import { apiFetch }                     from "@/lib/api"
import { useTheme }                     from "@/lib/theme"
import { Avatar }                       from "@/components/ui/Avatar"
import { Stars }                        from "@/components/ui/Stars"
import { ItemCard, type ItemCardItem }  from "@/components/items/ItemCard"

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface ReviewReceived {
  rating:          number
  comment:         string | null
  reviewType:      string
  sentiment:       string | null
  itemAsDescribed: boolean | null
  punctuality:     boolean | null
  communication:   boolean | null
  conservation:    boolean | null
  photoUrl:        string | null
  createdAt:       string
  reviewer:        { name: string }
}

interface Badge {
  key:   string
  label: string
  emoji: string
  color: string
}

interface NextBadgeInfo {
  badge:    Badge & { minBookings: number }
  progress: number
}

interface PublicProfile {
  id:               string
  name:             string
  bio:              string | null
  city:             string | null
  state:            string | null
  neighborhood:     string | null
  avatarUrl:        string | null
  userType:         "PF" | "PJ"
  isVerified:       boolean
  createdAt:        string
  reputationPoints: number
  itemCount:        number
  totalDeals:       number
  avgRating:        number | null
  reviewCount:      number
  responseBadge:    { label: string; avgHours: number } | null
  borrowerBadge:    Badge | null
  nextBadge:        NextBadgeInfo | null
  activeReviewer:   boolean
  activeReviewerBadge: Badge | null
  items:            ItemCardItem[]
  reviewsReceived:  ReviewReceived[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Formata a data exatamente como o site (pt-BR, mês longo + ano)
// Fonte: site linha 113-115 — Intl.DateTimeFormat("pt-BR", { month:"long", year:"numeric" })
function fmtMemberSince(iso: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      month: "long",
      year:  "numeric",
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

// Formata data curta para o cabeçalho das avaliações
// Fonte: site linhas 284-286 — Intl.DateTimeFormat("pt-BR", { day:"2-digit", month:"short" })
function fmtReviewDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day:   "2-digit",
      month: "short",
    }).format(new Date(iso))
  } catch {
    return ""
  }
}

// Ícone de seta para voltar — Lucide ChevronLeft, paths verbatim do site
function BackIcon({ color }: { color: string }) {
  return (
    <Svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Polyline points="15 18 9 12 15 6" />
    </Svg>
  )
}

// ── Componente principal ───────────────────────────────────────────────────────

export default function PerfilPublicoScreen() {
  const { id }                   = useLocalSearchParams<{ id: string }>()
  const { tokens }               = useTheme()
  const s                        = makeStyles(tokens)

  const { data, isLoading, isError } = useQuery<{ data: PublicProfile }>({
    queryKey: ["publicProfile", id],
    queryFn:  () => apiFetch<{ data: PublicProfile }>(`/api/users/${id}/public`),
    enabled:  !!id,
  })

  const profile = data?.data

  // ── Estado: carregando ────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <SafeAreaView style={[s.safeArea, { backgroundColor: tokens.bg }]}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Voltar para anúncios"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <BackIcon color={tokens.muted} />
          <Text style={s.backText}>Voltar para anúncios</Text>
        </TouchableOpacity>
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color={tokens.navy} />
        </View>
      </SafeAreaView>
    )
  }

  // ── Estado: erro ou não encontrado ────────────────────────────────────────
  if (isError || !profile) {
    return (
      <SafeAreaView style={[s.safeArea, { backgroundColor: tokens.bg }]}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Voltar para anúncios"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <BackIcon color={tokens.muted} />
          <Text style={s.backText}>Voltar para anúncios</Text>
        </TouchableOpacity>
        <View style={s.loadingContainer}>
          <Text style={[s.errorText, { color: tokens.error }]}>
            Perfil não encontrado.
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  // ── Localização composta (source: site linha 165) ─────────────────────────
  const locationParts = [profile.neighborhood, profile.city, profile.state].filter(Boolean)
  const locationStr   = locationParts.length > 0 ? locationParts.join(", ") : null

  return (
    <SafeAreaView style={[s.safeArea, { backgroundColor: tokens.bg }]}>
      {/* Botão voltar — fonte: site linhas 122-130 */}
      <View style={[s.breadcrumbBar, { borderBottomColor: tokens.border, backgroundColor: tokens.surface }]}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Voltar para anúncios"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <BackIcon color={tokens.muted} />
          <Text style={[s.backText, { color: tokens.muted }]}>Voltar para anúncios</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Cabeçalho — fonte: site linhas 135-174 ───────────────────────── */}
        <View style={[s.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
          <View style={s.headerRow}>
            {/* Avatar — size xl (88px) para perfil, igual ao site (size=80 via prop) */}
            <Avatar
              name={profile.name}
              imageUrl={profile.avatarUrl}
              size="xl"
            />

            <View style={s.headerInfo}>
              {/* Nome + badges — fonte: site linhas 143-153 */}
              <View style={s.nameRow}>
                <Text
                  style={[s.userName, { color: tokens.navy }]}
                  numberOfLines={2}
                  accessibilityRole="header"
                >
                  {profile.name}
                </Text>
                {profile.isVerified && (
                  <View style={[s.badge, { backgroundColor: tokens.success + "1A" }]}>
                    <Text style={[s.badgeText, { color: tokens.success }]}>
                      {"✓"} Verificado
                    </Text>
                  </View>
                )}
                <View style={[s.badge, { backgroundColor: tokens.border }]}>
                  <Text style={[s.badgeText, { color: tokens.muted }]}>
                    {profile.userType === "PF" ? "Pessoa Física" : "Pessoa Jurídica"}
                  </Text>
                </View>
              </View>

              {/* Membro desde — fonte: site linha 155 */}
              <Text style={[s.metaText, { color: tokens.muted }]}>
                Membro desde {fmtMemberSince(profile.createdAt)}
              </Text>

              {/* Badge de resposta — fonte: site linhas 157-160 */}
              {profile.responseBadge && (
                <Text style={[s.responseBadge, { color: tokens.green }]}>
                  {"⚡"} {profile.responseBadge.label}
                </Text>
              )}

              {/* Localização — fonte: site linhas 163-167 */}
              {locationStr && (
                <Text style={[s.metaText, { color: tokens.muted }]}>
                  {"📍"} {locationStr}
                </Text>
              )}

              {/* Bio — fonte: site linhas 169-171 */}
              {profile.bio && (
                <Text style={[s.bio, { color: tokens.text }]}>
                  {profile.bio}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* ── Estatísticas — fonte: site linhas 177-203 ────────────────────── */}
        <View style={s.statsRow}>
          {/* Itens anunciados */}
          <View style={[s.statCard, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
            <Text style={[s.statNumber, { color: tokens.navy }]}>
              {profile.itemCount}
            </Text>
            <Text style={[s.statLabel, { color: tokens.muted }]}>
              {profile.itemCount === 1 ? "item anunciado" : "itens anunciados"}
            </Text>
          </View>

          {/* Total de aluguéis */}
          <View style={[s.statCard, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
            <Text style={[s.statNumber, { color: tokens.navy }]}>
              {profile.totalDeals}
            </Text>
            <Text style={[s.statLabel, { color: tokens.muted }]}>
              {profile.totalDeals === 1 ? "aluguel" : "aluguéis"}
            </Text>
          </View>

          {/* Nota média */}
          <View style={[s.statCard, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
            {profile.avgRating !== null ? (
              <>
                <Text style={[s.statNumber, { color: tokens.navy }]}>
                  {profile.avgRating.toFixed(1)}
                </Text>
                <Text style={[s.statLabel, { color: tokens.muted }]}>
                  {"★"} nota média
                </Text>
              </>
            ) : (
              <>
                <Text style={[s.statNumber, { color: tokens.muted }]}>{"—"}</Text>
                <Text style={[s.statLabel, { color: tokens.muted }]}>sem avaliações</Text>
              </>
            )}
          </View>
        </View>

        {/* ── Conquistas — fonte: site linhas 206-247 (P3-70/71/72/74) ──────── */}
        {(profile.borrowerBadge || profile.activeReviewer || profile.nextBadge || profile.reputationPoints > 0) && (
          <View style={[s.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
            <Text style={[s.sectionTitle, { color: tokens.text }]}>Conquistas</Text>

            {/* Pontos de reputação — fonte: site linhas 211-213 */}
            {profile.reputationPoints > 0 && (
              <Text style={[s.reputationText, { color: tokens.muted }]}>
                {"⭐"}{" "}
                <Text style={{ color: tokens.text, fontWeight: "600" }}>
                  {profile.reputationPoints}
                </Text>
                {" "}pontos de reputação
              </Text>
            )}

            {/* Badges ativos — fonte: site linhas 218-229 */}
            {(profile.borrowerBadge || profile.activeReviewer) && (
              <View style={s.badgesRow}>
                {profile.borrowerBadge && (
                  <View style={[s.conquBadge, { backgroundColor: tokens.border }]}>
                    <Text style={[s.conquBadgeText, { color: tokens.text }]}>
                      {profile.borrowerBadge.emoji} Locatário {profile.borrowerBadge.label}
                    </Text>
                  </View>
                )}
                {profile.activeReviewerBadge && (
                  <View style={[s.conquBadge, { backgroundColor: tokens.border }]}>
                    <Text style={[s.conquBadgeText, { color: tokens.text }]}>
                      {profile.activeReviewerBadge.emoji} {profile.activeReviewerBadge.label}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Progress bar para próximo badge — fonte: site linhas 232-245 (P3-74) */}
            {profile.nextBadge && (
              <View style={s.progressContainer}>
                <View style={s.progressHeader}>
                  <Text style={[s.progressLabel, { color: tokens.muted }]}>
                    Próximo: {profile.nextBadge.badge.emoji} {profile.nextBadge.badge.label} ({profile.nextBadge.badge.minBookings} aluguéis)
                  </Text>
                  <Text style={[s.progressLabel, { color: tokens.muted }]}>
                    {profile.nextBadge.progress}%
                  </Text>
                </View>
                <View
                  style={[s.progressTrack, { backgroundColor: tokens.border }]}
                  accessibilityRole="progressbar"
                  accessibilityValue={{ min: 0, max: 100, now: profile.nextBadge.progress }}
                >
                  <View
                    style={[
                      s.progressFill,
                      { backgroundColor: tokens.green, width: `${profile.nextBadge.progress}%` },
                    ]}
                  />
                </View>
              </View>
            )}
          </View>
        )}

        {/* ── Anúncios ativos — fonte: site linhas 250-261 ─────────────────── */}
        {profile.items.length > 0 && (
          <View style={s.itensSection}>
            <Text style={[s.sectionTitle, { color: tokens.text }]}>
              Anúncios de {profile.name.split(" ")[0]}
            </Text>
            {profile.items.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                onPress={() => router.push(`/itens/${item.id}`)}
              />
            ))}
          </View>
        )}

        {/* ── Avaliações recebidas — fonte: site linhas 264-298 ────────────── */}
        {profile.reviewsReceived.length > 0 && (
          <View style={[s.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
            <Text style={[s.sectionTitle, { color: tokens.text }]}>
              Avaliações recebidas
              {profile.reviewCount > 5
                ? ` (últimas 5 de ${profile.reviewCount})`
                : null}
            </Text>

            {profile.reviewsReceived.map((review, i) => (
              <View
                key={i}
                style={[
                  s.reviewItem,
                  i < profile.reviewsReceived.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: tokens.border,
                  },
                ]}
              >
                {/* Estrelas + data — fonte: site linhas 279-288 */}
                <View style={s.reviewHeader}>
                  <Stars rating={review.rating} />
                  <Text style={[s.reviewDate, { color: tokens.muted }]}>
                    {fmtReviewDate(review.createdAt)}
                  </Text>
                </View>

                {/* Comentário — fonte: site linhas 289-291 */}
                {review.comment && (
                  <Text style={[s.reviewComment, { color: tokens.text }]}>
                    {review.comment}
                  </Text>
                )}

                {/* Avaliador — fonte: site linha 293 */}
                <Text style={[s.reviewAuthor, { color: tokens.muted }]}>
                  — {review.reviewer.name}
                </Text>
              </View>
            ))}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  )
}

// ── Estilos ───────────────────────────────────────────────────────────────────
// Tokens dinâmicos (light/dark) via parâmetro para evitar re-criar o objeto
// a cada render; chamada de makeStyles é barata pois StyleSheet.create é memoizado.

function makeStyles(tokens: ReturnType<typeof import("@/lib/theme").useTheme>["tokens"]) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
    },
    breadcrumbBar: {
      borderBottomWidth: 1,
      paddingHorizontal: 16,
      paddingVertical:   8,
    },
    backBtn: {
      flexDirection:  "row",
      alignItems:     "center",
      gap:            4,
      minHeight:      44,   // tap target WCAG 2.5.5
      paddingVertical: 10,
    },
    backText: {
      fontSize:   14,
      marginLeft: 4,
    },
    loadingContainer: {
      flex:           1,
      alignItems:     "center",
      justifyContent: "center",
    },
    errorText: {
      fontSize:   16,
      textAlign:  "center",
    },
    scrollContent: {
      padding: 16,
      gap:     16,
    },
    // ── Card genérico ──────────────────────────────────────────────────────────
    card: {
      borderRadius:  12,
      borderWidth:   1,
      padding:       16,
      gap:            8,
    },
    // ── Cabeçalho ─────────────────────────────────────────────────────────────
    headerRow: {
      flexDirection: "row",
      gap:           12,
      alignItems:    "flex-start",
    },
    headerInfo: {
      flex:  1,
      gap:    4,
      minWidth: 0,
    },
    nameRow: {
      flexDirection:  "row",
      flexWrap:       "wrap",
      alignItems:     "center",
      gap:             6,
    },
    userName: {
      fontSize:   18,
      fontWeight: "700",
      flexShrink: 1,
    },
    badge: {
      borderRadius:    20,
      paddingHorizontal: 8,
      paddingVertical:   2,
    },
    badgeText: {
      fontSize:   11,
      fontWeight: "600",
    },
    metaText: {
      fontSize: 13,
    },
    responseBadge: {
      fontSize:   12,
      fontWeight: "600",
    },
    bio: {
      fontSize:   13,
      marginTop:  4,
      lineHeight: 18,
    },
    // ── Estatísticas ──────────────────────────────────────────────────────────
    statsRow: {
      flexDirection: "row",
      gap:            8,
    },
    statCard: {
      flex:           1,
      borderRadius:   12,
      borderWidth:    1,
      padding:        12,
      alignItems:     "center",
      gap:             2,
    },
    statNumber: {
      fontSize:   22,
      fontWeight: "700",
    },
    statLabel: {
      fontSize:  11,
      textAlign: "center",
    },
    // ── Conquistas ────────────────────────────────────────────────────────────
    sectionTitle: {
      fontSize:   15,
      fontWeight: "600",
      marginBottom: 4,
    },
    reputationText: {
      fontSize: 13,
    },
    badgesRow: {
      flexDirection: "row",
      flexWrap:      "wrap",
      gap:           8,
    },
    conquBadge: {
      borderRadius:      20,
      paddingHorizontal: 10,
      paddingVertical:    4,
    },
    conquBadgeText: {
      fontSize:   12,
      fontWeight: "600",
    },
    progressContainer: {
      gap: 4,
    },
    progressHeader: {
      flexDirection:  "row",
      justifyContent: "space-between",
    },
    progressLabel: {
      fontSize: 11,
    },
    progressTrack: {
      height:       8,
      borderRadius: 4,
      overflow:     "hidden",
    },
    progressFill: {
      height:       8,
      borderRadius: 4,
    },
    // ── Itens ─────────────────────────────────────────────────────────────────
    itensSection: {
      gap: 12,
    },
    // ── Avaliações ────────────────────────────────────────────────────────────
    reviewItem: {
      paddingVertical: 12,
      gap:              4,
    },
    reviewHeader: {
      flexDirection:  "row",
      justifyContent: "space-between",
      alignItems:     "center",
    },
    reviewDate: {
      fontSize: 11,
    },
    reviewComment: {
      fontSize:   13,
      lineHeight: 18,
    },
    reviewAuthor: {
      fontSize: 11,
    },
  })
}
