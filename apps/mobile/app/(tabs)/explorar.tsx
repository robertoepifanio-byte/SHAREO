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
} from "react-native"
import { router, useLocalSearchParams } from "expo-router"
import { useQuery } from "@tanstack/react-query"
import Svg, { Path, Circle } from "react-native-svg"
import { apiFetch } from "@/lib/api"
import { useTheme } from "@/lib/theme"
import { CategoryChip } from "@/components/ui/CategoryChip"
import { ItemCard, ItemCardSkeleton, type ItemCardItem } from "@/components/items/ItemCard"

// ── Tipos ─────────────────────────────────────────────────────────────────────
type Item = ItemCardItem

interface Category {
  id:   string
  name: string
  slug: string
}

interface ApiResponse { data: Item[]; meta: { total: number } }
interface CatResponse  { data: Category[] }

// CategoryChip local removido — duplicava (com bugs) o componente compartilhado
// components/ui/CategoryChip.tsx (PNG real + pill horizontal), agora importado acima.
// ItemCard/ItemCardSkeleton removidos daqui — extraídos para
// components/items/ItemCard.tsx (reuso em favoritos.tsx, regra DRY do projeto).

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
  // card/cardSkeleton/cardImg/favBtn/verifiedBadge/cardBody/cardCat/cardTitle/
  // cardFooter/cardPrice/cardUnit/cardLoc removidos — vivem agora em
  // components/items/ItemCard.tsx (ver import no topo do arquivo).
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
