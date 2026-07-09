// Fonte: components/items/ItemCard.tsx (site) — card de item em grid 2 colunas.
// Extraído de app/(tabs)/explorar.tsx pra reuso em favoritos.tsx (regra DRY do
// projeto — a mesma peça visual não pode ter uma segunda implementação divergente,
// já aconteceu antes com CategoryChip.tsx).
import { useState } from "react"
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native"
import { router } from "expo-router"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Image } from "expo-image"
import Svg, { Path, Circle, Line, Rect, Polyline } from "react-native-svg"
import { apiFetch } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useTheme } from "@/lib/theme"

export interface ItemCardItem {
  id:           string
  title:        string
  pricePerDay:  number
  city:         string
  state:        string
  neighborhood: string | null
  images:       { url: string }[]
  category:     { name: string; slug: string }
  owner:        { name: string; isVerified: boolean }
}

const fmt = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100)

// ── Paleta de ícones de categoria — transcrita de CategoryIcon.tsx do site ────
// Tints light = pastels originais; dark = equivalentes escurecidos (sem token direto — ternário).
const CAT_COLORS_LIGHT: Record<string, { bg: string; stroke: string }> = {
  ferramentas:   { bg: "#DBEAFE", stroke: "#1D4ED8" },
  eletronicos:   { bg: "#EDE9FE", stroke: "#7C3AED" },
  "casa-jardim": { bg: "#DCFCE7", stroke: "#16A34A" },
  construcao:    { bg: "#FEF9C3", stroke: "#CA8A04" },
  esporte:       { bg: "#FEE2E2", stroke: "#DC2626" },
  festas:        { bg: "#FFF7ED", stroke: "#EA580C" },
}

const CAT_COLORS_DARK: Record<string, { bg: string; stroke: string }> = {
  ferramentas:   { bg: "#1E3A5F", stroke: "#60A5FA" },
  eletronicos:   { bg: "#2D1B69", stroke: "#A78BFA" },
  "casa-jardim": { bg: "#064E3B", stroke: "#4ADE80" },
  construcao:    { bg: "#422006", stroke: "#FBBF24" },
  esporte:       { bg: "#450A0A", stroke: "#F87171" },
  festas:        { bg: "#431407", stroke: "#FB923C" },
}

const CAT_COLORS_FALLBACK_LIGHT = { bg: "#F1F5F9", stroke: "#64748B" }
const CAT_COLORS_FALLBACK_DARK  = { bg: "#1E293B", stroke: "#94A3B8" }

// ── SVG por slug de categoria — transcrito de CategoryIcon.tsx do site ────────
function CategorySvg({ slug, stroke }: { slug: string; stroke: string }) {
  const p = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke, strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const }
  switch (slug) {
    case "ferramentas":
      return <Svg {...p}><Path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></Svg>
    case "eletronicos":
      return <Svg {...p}><Rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><Line x1="8" y1="21" x2="16" y2="21"/><Line x1="12" y1="17" x2="12" y2="21"/></Svg>
    case "casa-jardim":
      return <Svg {...p}><Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><Polyline points="9 22 9 12 15 12 15 22"/></Svg>
    case "construcao":
      return <Svg {...p}><Rect x="2" y="6" width="20" height="8" rx="1"/><Path d="M17 14v7"/><Path d="M7 14v7"/><Path d="M17 3v3"/><Path d="M7 3v3"/><Path d="M10 14 2.3 6.3"/><Path d="m14 6 7.7 7.7"/><Path d="m8 6 8 8"/></Svg>
    case "esporte":
      return <Svg {...p}><Circle cx="12" cy="12" r="10"/><Path d="m4.9 4.9 14.2 14.2"/></Svg>
    case "festas":
      return <Svg {...p}><Path d="m5.8 11.3-2 5.8a2 2 0 0 0 2.5 2.5l5.8-2 5.8-2a2 2 0 0 0 0-3.8l-5.8-2-5.8-2a2 2 0 0 0-2.5 2.5l2 5.8"/><Circle cx="12" cy="12" r="2"/></Svg>
    default:
      return <Svg {...p}><Rect x="2" y="3" width="20" height="14" rx="2"/></Svg>
  }
}

// Coração de favoritar — transcrito do componente components/items/FavoriteButton.tsx
// do site: autocontido, toggle otimista via POST /api/items/[id]/favorite.
function FavoriteHeart({ itemId }: { itemId: string }) {
  const qc = useQueryClient()
  const user = useAuth((s) => s.user)
  const [favorited, setFavorited] = useState<boolean | null>(null)
  const toggle = useMutation({
    mutationFn: () => apiFetch<{ data: { favorited: boolean } }>(`/api/items/${itemId}/favorite`, { method: "POST" }),
    onMutate: () => setFavorited((prev) => (prev === null ? true : !prev)),
    onSuccess: (res) => {
      setFavorited(res.data.favorited)
      qc.invalidateQueries({ queryKey: ["favorites"] })
    },
    onError: () => setFavorited((prev) => (prev === null ? null : !prev)),
  })
  function handlePress(e: { stopPropagation?: () => void }) {
    e.stopPropagation?.()
    if (!user) {
      Alert.alert("Login necessário", "Faça login para salvar favoritos.", [
        { text: "Cancelar", style: "cancel" },
        { text: "Entrar", onPress: () => router.push("/(auth)/login") },
      ])
      return
    }
    toggle.mutate()
  }
  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={toggle.isPending}
      style={s.favBtn}
      accessibilityRole="button"
      accessibilityLabel={favorited ? "Remover dos favoritos" : "Adicionar aos favoritos"}
    >
      <Text style={{ fontSize: 14 }}>{favorited ? "❤️" : "🤍"}</Text>
    </TouchableOpacity>
  )
}

export function ItemCard({ item, onPress }: { item: ItemCardItem; onPress: () => void }) {
  const { tokens, mode } = useTheme()
  const thumb = item.images[0]?.url
  const catMap = mode === "dark" ? CAT_COLORS_DARK : CAT_COLORS_LIGHT
  const catColors = catMap[item.category.slug] ?? (mode === "dark" ? CAT_COLORS_FALLBACK_DARK : CAT_COLORS_FALLBACK_LIGHT)

  // cardImg placeholder bg: #F1F5F9 no site (slate-100); dark: tokens.disabledBg preserva proporção
  const cardImgBg = mode === "dark" ? tokens.disabledBg : "#F1F5F9"

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${fmt(item.pricePerDay)} por dia`}
      style={[s.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]}
    >
      {/* Imagem 4:3 */}
      <View style={[s.cardImg, { backgroundColor: cardImgBg }]}>
        {thumb ? (
          <Image source={{ uri: thumb }} style={{ flex: 1 }} contentFit="cover" />
        ) : (
          <View style={[s.cardImgFallback, { backgroundColor: catColors.bg }]}>
            <CategorySvg slug={item.category.slug} stroke={catColors.stroke} />
          </View>
        )}
        <FavoriteHeart itemId={item.id} />
        {item.owner.isVerified && (
          <View style={s.verifiedBadge} accessibilityRole="image" accessibilityLabel="Anunciante verificado">
            <Text style={{ color: "#FFFFFF", fontSize: 9, fontWeight: "700" }}>✓</Text>
          </View>
        )}
      </View>

      {/* Corpo */}
      <View style={s.cardBody}>
        <Text style={[s.cardCat, { color: tokens.green }]} numberOfLines={1}>{item.category.name}</Text>
        {/* dark: navy (#003366) seria invisível sobre fundo escuro — usa tokens.text */}
        <Text style={[s.cardTitle, { color: mode === "dark" ? tokens.text : "#003366" }]} numberOfLines={2}>{item.title}</Text>
        {/* TODO(revisão): estrelas de avaliação e distanceKm não vêm das APIs
            de listagem hoje (/api/items, /api/favorites) — ver TODO original
            em app/(tabs)/explorar.tsx. */}
        <View style={s.cardFooter}>
          <View>
            <Text style={[s.cardPrice, { color: tokens.text }]}>{fmt(item.pricePerDay)}</Text>
            <Text style={[s.cardUnit, { color: tokens.muted }]}>/dia</Text>
          </View>
          <Text style={[s.cardLoc, { color: tokens.muted }]} numberOfLines={1}>
            {item.neighborhood ?? item.city}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

export function ItemCardSkeleton() {
  const { tokens } = useTheme()
  return (
    <View style={[s.cardSkeleton, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
      <View style={{ height: 140, borderRadius: 12, marginBottom: 8, backgroundColor: tokens.border }} />
      <View style={{ width: "60%", height: 10, marginBottom: 6, backgroundColor: tokens.border, borderRadius: 8 }} />
      <View style={{ width: "90%", height: 14, marginBottom: 6, backgroundColor: tokens.border, borderRadius: 8 }} />
      <View style={{ width: "40%", height: 18, backgroundColor: tokens.border, borderRadius: 8 }} />
    </View>
  )
}

const s = StyleSheet.create({
  card: {
    flex:         1,
    // backgroundColor e borderColor removidos — agora inline via tokens
    borderRadius: 16,
    borderWidth:  1,
    overflow:     "hidden",
  },
  cardSkeleton: {
    flex:         1,
    // backgroundColor e borderColor removidos — agora inline via tokens
    borderRadius: 16,
    borderWidth:  1,
    overflow:     "hidden",
    padding:      8,
    maxWidth:     "48%",
  },
  cardImg: {
    height:   140,
    // backgroundColor removido — agora inline (mode-aware)
    position: "relative",
  },
  cardImgFallback: {
    flex:           1,
    alignItems:     "center",
    justifyContent: "center",
  },
  favBtn: {
    position:        "absolute",
    top:             6,
    right:           6,
    width:           28,
    height:          28,
    borderRadius:    14,
    backgroundColor: "rgba(255,255,255,0.9)",  // overlay sobre foto — independente do tema
    alignItems:      "center",
    justifyContent:  "center",
  },
  verifiedBadge: {
    position:        "absolute",
    bottom:          6,
    right:           6,
    width:           18,
    height:          18,
    borderRadius:    9,
    backgroundColor: "rgba(0,123,60,0.9)",  // fill verde sobre foto — independente do tema
    alignItems:      "center",
    justifyContent:  "center",
  },
  cardBody: {
    padding: 10,
  },
  cardCat: {
    // color removido — agora inline via tokens.green
    fontSize:      10,
    fontWeight:    "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom:  2,
  },
  cardTitle: {
    // color removido — agora inline (mode-aware: navy no light, tokens.text no dark)
    fontSize:    13,
    fontWeight:  "700",
    marginBottom: 6,
    lineHeight:  18,
  },
  cardFooter: {
    flexDirection:  "row",
    alignItems:     "flex-end",
    justifyContent: "space-between",
  },
  cardPrice: {
    // color removido — agora inline via tokens.text
    fontSize:   17,
    fontFamily: "Montserrat_700Bold",
    lineHeight: 20,
  },
  cardUnit: {
    // color removido — agora inline via tokens.muted
    fontSize: 10,
  },
  cardLoc: {
    // color removido — agora inline via tokens.muted
    fontSize: 10,
    maxWidth: "48%",
    textAlign: "right",
  },
})
