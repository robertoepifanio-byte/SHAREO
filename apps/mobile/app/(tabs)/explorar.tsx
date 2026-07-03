// Fonte: app/itens/page.tsx + components/ui/CategoryIcon.tsx + components/ui/ItemCard.tsx
// Tela Explorar — busca + chips de categoria com ícones + grid 2 colunas + skeleton + empty state.
// Transcrição literal da versão mobile 375px do site.

import { useState, useCallback } from "react"
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Platform,
  Alert,
} from "react-native"
import { router, useLocalSearchParams } from "expo-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Image } from "expo-image"
import Svg, {
  Path, Circle, Line, Rect, Polyline, Polygon
} from "react-native-svg"
import { apiFetch } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useTheme } from "@/lib/theme"
import { CategoryChip } from "@/components/ui/CategoryChip"

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface Item {
  id:           string
  title:        string
  pricePerDay:  number
  city:         string
  state:        string
  neighborhood: string | null
  condition:    string
  images:       { url: string }[]
  category:     { name: string; slug: string }
  owner:        { name: string; isVerified: boolean }
  _count:       { reviews: number; favorites: number }
}

interface Category {
  id:   string
  name: string
  slug: string
}

interface ApiResponse { data: Item[]; meta: { total: number } }
interface CatResponse  { data: Category[] }

const fmt = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100)

// ── Paleta de ícones de categoria — transcrita de CategoryIcon.tsx do site ────
// components/ui/CategoryIcon.tsx (Lote 1 transcreve isso em CategoryChip)
const CAT_COLORS: Record<string, { bg: string; stroke: string }> = {
  ferramentas: { bg: "#DBEAFE", stroke: "#1D4ED8" },
  eletronicos: { bg: "#EDE9FE", stroke: "#7C3AED" },
  "casa-jardim": { bg: "#DCFCE7", stroke: "#16A34A" },
  construcao:  { bg: "#FEF9C3", stroke: "#CA8A04" },
  esporte:     { bg: "#FEE2E2", stroke: "#DC2626" },
  moda:        { bg: "#FDF4FF", stroke: "#9333EA" },
  festas:      { bg: "#FFF7ED", stroke: "#EA580C" },
}

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
    case "moda":
      return <Svg {...p}><Path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.57a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.57a2 2 0 0 0-1.34-2.23z"/></Svg>
    case "festas":
      return <Svg {...p}><Path d="m5.8 11.3-2 5.8a2 2 0 0 0 2.5 2.5l5.8-2 5.8-2a2 2 0 0 0 0-3.8l-5.8-2-5.8-2a2 2 0 0 0-2.5 2.5l2 5.8"/><Circle cx="12" cy="12" r="2"/></Svg>
    default:
      return <Svg {...p}><Rect x="2" y="3" width="20" height="14" rx="2"/></Svg>
  }
}

// CategoryChip local removido — duplicava (com bugs) o componente compartilhado
// components/ui/CategoryChip.tsx (PNG real + pill horizontal), agora importado acima.

// ── SkeletonBox — animação de carregamento ────────────────────────────────────
function SkeletonBox({ width, height, style }: { width?: number | string; height: number; style?: object }) {
  return (
    <View style={[{ width, height, backgroundColor: "#E2E8F0", borderRadius: 8 }, style]} />
  )
}

function ItemCardSkeleton() {
  return (
    <View style={s.cardSkeleton}>
      <SkeletonBox height={140} style={{ borderRadius: 12, marginBottom: 8 }} />
      <SkeletonBox width="60%" height={10} style={{ marginBottom: 6 }} />
      <SkeletonBox width="90%" height={14} style={{ marginBottom: 6 }} />
      <SkeletonBox width="40%" height={18} />
    </View>
  )
}

// ── ItemCard — 2 colunas — transcrito de ItemCard do site ────────────────────
// Coração de favoritar — transcrito do componente components/items/FavoriteButton.tsx
// do site: autocontido, toggle otimista via POST /api/items/[id]/favorite (mesmo
// endpoint já usado em itens/[id].tsx). O site não pré-busca o estado inicial na
// listagem geral (isFavorited default=false em ItemCard.tsx) — replicado aqui.
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
    // Fonte: itens/[id].tsx handleToggleFavorite — mesmo guard de login antes
    // de chamar o endpoint (que responde 401 sem isso).
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

function ItemCard({ item, onPress }: { item: Item; onPress: () => void }) {
  const thumb = item.images[0]?.url
  const catColors = CAT_COLORS[item.category.slug] ?? { bg: "#F1F5F9", stroke: "#64748B" }
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${fmt(item.pricePerDay)} por dia`}
      style={s.card}
    >
      {/* Imagem 4:3 */}
      <View style={s.cardImg}>
        {thumb ? (
          <Image source={{ uri: thumb }} style={{ flex: 1 }} contentFit="cover" />
        ) : (
          <View style={[s.cardImgFallback, { backgroundColor: catColors.bg }]}>
            <CategorySvg slug={item.category.slug} stroke={catColors.stroke} />
          </View>
        )}
        {/* Favoritar — fonte: ItemCard.tsx linhas 93-96 (FavoriteButton, showActions=false) */}
        <FavoriteHeart itemId={item.id} />
        {/* Verificado — fonte: ItemCard.tsx linhas 98-110 (bg-success/90, canto inferior direito) */}
        {item.owner.isVerified && (
          <View style={s.verifiedBadge} accessibilityRole="image" accessibilityLabel="Anunciante verificado">
            <Text style={{ color: "#FFFFFF", fontSize: 9, fontWeight: "700" }}>✓</Text>
          </View>
        )}
      </View>

      {/* Corpo */}
      <View style={s.cardBody}>
        {/* Categoria — "text-[10px] font-semibold uppercase tracking-widest text-brand" */}
        <Text style={s.cardCat} numberOfLines={1}>{item.category.name}</Text>
        {/* Título — "text-sm font-bold text-primary" */}
        <Text style={s.cardTitle} numberOfLines={2}>{item.title}</Text>
        {/* TODO(revisão): estrelas de avaliação (ItemCard.tsx linhas 120-125,
            RatingStars com avgRating/_count.reviews) e distanceKm (linhas 137-141)
            não vêm de /api/items hoje — só app/itens/page.tsx (SSR) calcula isso
            numa query Prisma separada com reviews:{select:{rating}}. Extender
            /api/items exigiria decisão de escopo (mesmo padrão de /api/stats);
            não implementado nesta rodada pra não inventar contrato de API. */}
        {/* Preço + localização */}
        <View style={s.cardFooter}>
          <View>
            <Text style={s.cardPrice}>{fmt(item.pricePerDay)}</Text>
            <Text style={s.cardUnit}>/dia</Text>
          </View>
          <Text style={s.cardLoc} numberOfLines={1}>
            {item.neighborhood ?? item.city}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

// ── Tela ──────────────────────────────────────────────────────────────────────
export default function ExplorarScreen() {
  const { tokens } = useTheme()
  const params = useLocalSearchParams<Record<string, string>>()
  const [query,      setQuery]      = useState(params.q ?? "")
  const [search,     setSearch]     = useState(params.q ?? "")
  const [activeSlug, setActiveSlug] = useState<string | null>(null)

  // Busca de categorias
  const { data: catData } = useQuery<CatResponse>({
    queryKey: ["categories"],
    queryFn:  () => apiFetch<CatResponse>("/api/categories"),
    staleTime: 5 * 60_000,
  })
  const categories = catData?.data ?? []

  // Categoria ativa → precisa do id (a API filtra por categoryId, não slug)
  const activeCategoryId = categories.find((c) => c.slug === activeSlug)?.id ?? null

  // Busca de itens com busca + categoria
  // Fonte: lib/validations/items.ts (ListItemsQuerySchema) — params aceitos
  // são "search" (não "q") e "categoryId" (id real, não slug).
  const { data, isLoading, isRefetching, refetch } = useQuery<ApiResponse>({
    queryKey: ["items", search, activeCategoryId],
    queryFn:  () => {
      const params = new URLSearchParams({ limit: "20" })
      if (search)          params.set("search",     search)
      if (activeCategoryId) params.set("categoryId", activeCategoryId)
      return apiFetch<ApiResponse>(`/api/items?${params}`)
    },
  })

  const items = data?.data ?? []

  const handleSearch = useCallback(() => {
    setSearch(query.trim())
  }, [query])

  const handleCatPress = useCallback((slug: string) => {
    setActiveSlug((prev) => (prev === slug ? null : slug))
  }, [])

  return (
    <View style={[s.screen, { backgroundColor: tokens.bg }]}>

      {/* ── Busca ── */}
      <View style={[s.searchWrap, { backgroundColor: tokens.surface, borderBottomColor: tokens.border }]}>
        <View style={[s.searchBar, { backgroundColor: tokens.bg, borderColor: tokens.border }]}>
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth={2} strokeLinecap="round">
            <Circle cx="11" cy="11" r="8"/>
            <Path d="m21 21-4.35-4.35"/>
          </Svg>
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            placeholder="Buscar itens para alugar..."
            placeholderTextColor="#94A3B8"
            returnKeyType="search"
            style={[s.searchInput, { color: tokens.text }]}
            accessibilityLabel="Buscar itens"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(""); setSearch("") }} accessibilityLabel="Limpar busca">
              <Text style={{ color: "#94A3B8", fontSize: 16, paddingHorizontal: 4 }}>×</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          onPress={handleSearch}
          style={s.searchBtn}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Buscar"
        >
          <Text style={s.searchBtnText}>Buscar</Text>
        </TouchableOpacity>
      </View>

      {/* ── Chips de categoria (scroll horizontal) ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.chipsRow}
        style={[s.chipsScroll, { backgroundColor: tokens.surface }]}
        accessibilityLabel="Filtrar por categoria"
        accessibilityRole="menu"
      >
        {categories.length === 0
          ? [0, 1, 2, 3].map((i) => (
              <View key={i} style={[s.chipSkeleton, { backgroundColor: "#E2E8F0" }]} />
            ))
          : categories.map((cat) => (
              <CategoryChip
                key={cat.id}
                slug={cat.slug}
                label={cat.name}
                active={activeSlug === cat.slug}
                onPress={() => handleCatPress(cat.slug)}
              />
            ))
        }
      </ScrollView>

      {/* ── Contagem + ordenação ── */}
      {!isLoading && data?.meta.total != null && (
        <View style={[s.countRow, { backgroundColor: tokens.bg }]}>
          <Text style={[s.countText, { color: tokens.muted }]}>
            {data.meta.total.toLocaleString("pt-BR")} {data.meta.total === 1 ? "item" : "itens"} disponíveis
          </Text>
        </View>
      )}

      {/* ── Grid 2 colunas ── */}
      {isLoading ? (
        <View style={s.skeletonGrid}>
          {[0, 1, 2, 3].map((i) => <ItemCardSkeleton key={i} />)}
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          numColumns={2}
          columnWrapperStyle={s.row}
          contentContainerStyle={s.gridContent}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#007B3C" />
          }
          renderItem={({ item }) => (
            <ItemCard
              item={item}
              onPress={() => router.push(`/itens/${item.id}`)}
            />
          )}
          ListEmptyComponent={
            // Empty state — texto exato da spec
            <View style={s.empty}>
              <Text style={s.emptyIcon}>🔍</Text>
              <Text style={[s.emptyTitle, { color: tokens.navy }]}>Nenhum item encontrado</Text>
              <Text style={[s.emptyDesc, { color: tokens.muted }]}>Tente outra busca ou categoria</Text>
            </View>
          }
        />
      )}
    </View>
  )
}

// ── Estilos ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: {
    flex: 1,
  },
  searchWrap: {
    flexDirection:    "row",
    alignItems:       "center",
    gap:              8,
    paddingHorizontal: 16,
    paddingVertical:   10,
    borderBottomWidth: 1,
  },
  searchBar: {
    flex:             1,
    flexDirection:    "row",
    alignItems:       "center",
    gap:              8,
    borderRadius:     10,
    borderWidth:      1,
    paddingHorizontal: 12,
    minHeight:        44,
  },
  searchInput: {
    flex:     1,
    fontSize: 14,
    padding:  0,
  },
  searchBtn: {
    backgroundColor:  "#007B3C",
    borderRadius:     8,
    minHeight:        44,
    paddingHorizontal: 14,
    alignItems:       "center",
    justifyContent:   "center",
  },
  searchBtnText: {
    fontSize:   13,
    fontWeight: "600",
    color:      "#FFFFFF",
  },
  chipsScroll: {
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  chipsRow: {
    flexDirection:    "row",
    gap:              8,
    paddingHorizontal: 16,
    paddingVertical:   10,
  },
  chip: {
    alignItems:       "center",
    borderWidth:      1.5,
    borderRadius:     10,
    paddingHorizontal: 10,
    paddingVertical:   8,
    minWidth:         64,
    minHeight:        68,
    justifyContent:   "center",
    gap:              4,
  },
  chipIcon: {
    width:          36,
    height:         36,
    borderRadius:   8,
    alignItems:     "center",
    justifyContent: "center",
  },
  chipLabel: {
    fontSize:   10,
    fontWeight: "600",
  },
  chipSkeleton: {
    width:        64,
    height:       68,
    borderRadius: 10,
  },
  countRow: {
    paddingHorizontal: 16,
    paddingVertical:    6,
  },
  countText: {
    fontSize: 11,
  },
  skeletonGrid: {
    flexDirection:  "row",
    flexWrap:       "wrap",
    padding:        12,
    gap:            12,
  },
  gridContent: {
    padding:        12,
    paddingBottom:  24,
  },
  row: {
    gap:             12,
    marginBottom:    12,
  },
  card: {
    flex:           1,
    backgroundColor: "#FFFFFF",
    borderRadius:   16,
    borderWidth:    1,
    borderColor:    "#E2E8F0",
    overflow:       "hidden",
  },
  cardSkeleton: {
    flex:            1,
    backgroundColor: "#FFFFFF",
    borderRadius:    16,
    borderWidth:     1,
    borderColor:     "#E2E8F0",
    overflow:        "hidden",
    padding:         8,
    maxWidth:        "48%",
  },
  cardImg: {
    height:          140,
    backgroundColor: "#F1F5F9",
    position:        "relative",
  },
  cardImgFallback: {
    flex:           1,
    alignItems:     "center",
    justifyContent: "center",
  },
  // Favoritar — fonte: ItemCard.tsx (FavoriteButton posicionado no canto da imagem)
  favBtn: {
    position:        "absolute",
    top:             6,
    right:           6,
    width:           28,
    height:          28,
    borderRadius:    14,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems:      "center",
    justifyContent:  "center",
  },
  // Verificado — fonte: ItemCard.tsx linhas 98-110 ("bg-success/90", canto inferior direito)
  verifiedBadge: {
    position:        "absolute",
    bottom:          6,
    right:           6,
    width:           18,
    height:          18,
    borderRadius:    9,
    backgroundColor: "rgba(0,123,60,0.9)",
    alignItems:      "center",
    justifyContent:  "center",
  },
  cardBody: {
    padding: 10,
  },
  cardCat: {
    fontSize:      10,
    fontWeight:    "600",
    color:         "#007B3C",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom:  2,
  },
  cardTitle: {
    fontSize:    13,
    fontWeight:  "700",
    color:       "#003366",
    marginBottom: 6,
    lineHeight:  18,
  },
  cardFooter: {
    flexDirection:  "row",
    alignItems:     "flex-end",
    justifyContent: "space-between",
  },
  cardPrice: {
    fontSize:   17,
    fontFamily: "Montserrat_700Bold",
    color:      "#0F172A",
    lineHeight: 20,
  },
  cardUnit: {
    fontSize: 10,
    color:    "#64748B",
  },
  cardLoc: {
    fontSize: 10,
    color:    "#64748B",
    maxWidth: "48%",
    textAlign: "right",
  },
  empty: {
    alignItems:    "center",
    paddingVertical: 64,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    fontSize:    48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize:    16,
    fontWeight:  "600",
    marginBottom: 6,
    textAlign:   "center",
  },
  emptyDesc: {
    fontSize:  13,
    textAlign: "center",
  },
})
