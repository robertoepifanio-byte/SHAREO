// Fonte: app/itens/page.tsx + components/ui/CategoryIcon.tsx + components/items/ItemCard.tsx
// Tela Explorar — busca + chips de categoria com ícones + grid 2 colunas + skeleton + empty state.
// Transcrição literal da versão mobile 375px do site.
//
// Adições desta PR (feat/mobile-explorar-todos):
//   1. Botão "Filtros" + FilterBottomSheet (4 seções verbatim do site)
//   2. Ordenação ("Mais próximos" ▾) — 5 opções verbatim de _SortSelect.tsx
//   3. "Ver no mapa" — abre /itens?view=map no site via Linking (mapa nativo adiado)

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
  Linking,
} from "react-native"
import { router, useLocalSearchParams } from "expo-router"
import { useQuery } from "@tanstack/react-query"
import Svg, { Path, Circle, Polygon } from "react-native-svg"
import { apiFetch, API_URL } from "@/lib/api"
import { useTheme } from "@/lib/theme"
import { CategoryChip } from "@/components/ui/CategoryChip"
import { ItemCard, ItemCardSkeleton, type ItemCardItem } from "@/components/items/ItemCard"
import {
  FilterBottomSheet,
  FilterTriggerButton,
  type FilterValues,
} from "@/components/items/FilterBottomSheet"

// ── Tipos ─────────────────────────────────────────────────────────────────────

// Estende ItemCardItem com coordenadas (retornadas pela API, usadas no filtro de distância)
type Item = ItemCardItem & {
  latitude?:  number | null
  longitude?: number | null
}

interface Category {
  id:   string
  name: string
  slug: string
}

interface ApiResponse { data: Item[]; meta: { total: number } }
interface CatResponse  { data: Category[] }

// ── Ordenação — transcrita verbatim de _SortSelect.tsx linhas 5-11 ───────────
const SORT_OPTIONS = [
  { value: "recent",     label: "Mais próximos" },
  { value: "price_asc",  label: "Menor preço"   },
  { value: "price_desc", label: "Maior preço"   },
  { value: "views",      label: "Mais vistos"   },
  { value: "rented",     label: "Mais alugados" },
]

// ── Haversine — para filtro de distância client-side (ARQ-ALTO-09 do site) ────
// Fonte: lib/haversine.ts do site — transcrito inline (não importável direto do monorepo)
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R    = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a    = Math.sin(dLat / 2) ** 2 +
               Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
               Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ── Tela ──────────────────────────────────────────────────────────────────────
export default function ExplorarScreen() {
  const { tokens } = useTheme()
  const params = useLocalSearchParams<Record<string, string>>()

  // ── Estado de busca por texto (pré-existente) ─────────────────────────────
  const [query,      setQuery]      = useState(params.q ?? "")
  const [search,     setSearch]     = useState(params.q ?? "")
  const [activeSlug, setActiveSlug] = useState<string | null>(null)

  // ── Estado de filtros — novos ─────────────────────────────────────────────
  const [filterOpen, setFilterOpen] = useState(false)
  const [filterVals, setFilterVals] = useState<FilterValues>({
    categoryId: null,
    priceMax:   500,   // R$ — 500 = sem filtro (mesmo default do site)
    dist:       "",
    userLat:    "",
    userLng:    "",
    minRating:  "",
  })

  // ── Estado de ordenação — novo ────────────────────────────────────────────
  const [sortValue, setSortValue] = useState("recent")
  const [sortOpen,  setSortOpen]  = useState(false)

  // ── Busca de categorias (pré-existente) ──────────────────────────────────
  const { data: catData } = useQuery<CatResponse>({
    queryKey: ["categories"],
    queryFn:  () => apiFetch<CatResponse>("/api/categories"),
    staleTime: 5 * 60_000,
  })
  const categories = catData?.data ?? []

  // Categoria ativa → precisa do id (a API filtra por categoryId, não slug)
  const chipCategoryId    = categories.find((c) => c.slug === activeSlug)?.id ?? null
  const activeCategoryId  = filterVals.categoryId ?? chipCategoryId

  // ── Flags de filtro JS ────────────────────────────────────────────────────
  // Filtro de distância client-side — só ativo quando GPS disponível
  const useDistFilter = !!(filterVals.dist && filterVals.userLat && filterVals.userLng)
  // Quando filtro JS ativo, busca mais itens (espelha ARQ-ALTO-09 do site)
  const apiLimit      = useDistFilter ? 100 : 20

  // Badge "Ativos" no botão Filtros
  const hasFilters = !!(
    activeSlug ||
    filterVals.categoryId ||
    filterVals.priceMax < 500 ||
    filterVals.dist ||
    filterVals.minRating
  )

  // ── Busca de itens — inclui sort e maxPrice (novos parâmetros) ────────────
  // Fonte: lib/validations/items.ts (ListItemsQuerySchema) — params aceitos após esta PR:
  // search, categoryId, maxPrice (cents), sort; limit máximo elevado para 100.
  const { data, isLoading, isRefetching, refetch } = useQuery<ApiResponse>({
    queryKey: ["items", search, activeCategoryId, sortValue, filterVals.priceMax, filterVals.dist, filterVals.userLat, filterVals.userLng],
    queryFn:  () => {
      const p = new URLSearchParams({ limit: String(apiLimit) })
      if (search)           p.set("search",     search)
      if (activeCategoryId) p.set("categoryId", activeCategoryId)
      // sort "recent" é o default (orderBy createdAt desc) — não precisa enviar
      if (sortValue && sortValue !== "recent") p.set("sort", sortValue)
      // priceMax: apenas quando < 500 (R$ → cents para a API)
      if (filterVals.priceMax < 500) p.set("maxPrice", String(filterVals.priceMax * 100))
      return apiFetch<ApiResponse>(`/api/items?${p}`)
    },
  })

  // ── Filtro de distância client-side ──────────────────────────────────────
  const rawItems = data?.data ?? []
  const items    = useDistFilter
    ? rawItems.filter((item) => {
        if (!item.latitude || !item.longitude) return false
        return haversineKm(
          Number(filterVals.userLat),
          Number(filterVals.userLng),
          item.latitude,
          item.longitude,
        ) <= Number(filterVals.dist)
      })
    : rawItems

  const filteredTotal = useDistFilter ? items.length : (data?.meta.total ?? 0)

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSearch = useCallback(() => {
    setSearch(query.trim())
  }, [query])

  const handleCatPress = useCallback((slug: string) => {
    setActiveSlug((prev) => (prev === slug ? null : slug))
    // Quando troca pelo chip, reseta a categoria do filtro (não duplicar)
    setFilterVals((v) => ({ ...v, categoryId: null }))
  }, [])

  function handleFilterApply(vals: FilterValues) {
    setFilterVals(vals)
    // Quando filtro aplica uma categoria, limpa a seleção dos chips (evita conflito)
    if (vals.categoryId !== null) {
      setActiveSlug(null)
    }
  }

  // ── Render helpers ────────────────────────────────────────────────────────
  const sortLabel = SORT_OPTIONS.find((o) => o.value === sortValue)?.label ?? "Mais próximos"

  return (
    <View style={[s.screen, { backgroundColor: tokens.bg }]}>

      {/* ── Busca (pré-existente) ── */}
      <View style={[s.searchWrap, { backgroundColor: tokens.surface, borderBottomColor: tokens.border }]}>
        <View style={[s.searchBar, { backgroundColor: tokens.bg, borderColor: tokens.border }]}>
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={tokens.muted} strokeWidth={2} strokeLinecap="round">
            <Circle cx="11" cy="11" r="8"/>
            <Path d="m21 21-4.35-4.35"/>
          </Svg>
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            placeholder="Buscar itens para alugar..."
            placeholderTextColor={tokens.muted}
            returnKeyType="search"
            style={[s.searchInput, { color: tokens.text }]}
            accessibilityLabel="Buscar itens"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(""); setSearch("") }} accessibilityLabel="Limpar busca">
              <Text style={{ color: tokens.muted, fontSize: 16, paddingHorizontal: 4 }}>×</Text>
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

      {/* ── Chips de categoria (pré-existente) ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.chipsRow}
        style={[s.chipsScroll, { backgroundColor: tokens.surface, borderBottomColor: tokens.border }]}
        accessibilityLabel="Filtrar por categoria"
        accessibilityRole="menu"
      >
        {categories.length === 0
          ? [0, 1, 2, 3].map((i) => (
              <View key={i} style={[s.chipSkeleton, { backgroundColor: tokens.border }]} />
            ))
          : (
            <>
              <CategoryChip
                slug="todas"
                label="Todas Categorias"
                active={activeSlug === null && !filterVals.categoryId}
                onPress={() => {
                  setActiveSlug(null)
                  setFilterVals((v) => ({ ...v, categoryId: null }))
                }}
              />
              {categories.map((cat) => (
                <CategoryChip
                  key={cat.id}
                  slug={cat.slug}
                  label={cat.name}
                  active={activeSlug === cat.slug || filterVals.categoryId === cat.id}
                  onPress={() => handleCatPress(cat.slug)}
                />
              ))}
            </>
          )
        }
      </ScrollView>

      {/* ── Conteúdo com scroll ── */}
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        numColumns={2}
        columnWrapperStyle={s.row}
        contentContainerStyle={s.gridContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#007B3C" />
        }
        ListHeaderComponent={
          <>
            {/* ── Botão "Filtros" ── _FilterTrigger.tsx, posição: após chips, antes do grid */}
            <FilterTriggerButton
              hasFilters={hasFilters}
              onPress={() => setFilterOpen(true)}
            />

            {/* ── Contagem + Ordenação ── page.tsx linhas 397-411 ── */}
            {!isLoading && data && (
              <View style={[s.countSortRow, { backgroundColor: tokens.bg }]}>
                {/* Contagem — "X anúncio(s) encontrado(s)" verbatim do site */}
                <Text style={[s.countText, { color: tokens.muted }]} accessibilityLiveRegion="polite">
                  {filteredTotal === 0
                    ? "Nenhum anúncio encontrado"
                    : `${filteredTotal} anúncio${filteredTotal !== 1 ? "s" : ""} encontrado${filteredTotal !== 1 ? "s" : ""}`
                  }
                </Text>

                {/* ── Dropdown de ordenação ── _SortSelect.tsx verbatim ── */}
                <View style={s.sortWrap}>
                  <TouchableOpacity
                    onPress={() => setSortOpen((v) => !v)}
                    style={[s.sortBtn, { borderColor: tokens.border, backgroundColor: tokens.surface }]}
                    accessibilityRole="button"
                    accessibilityLabel={`Ordenar: ${sortLabel}`}
                    accessibilityHint="Abre opções de ordenação"
                  >
                    <Text style={[s.sortBtnText, { color: tokens.text }]} numberOfLines={1}>
                      {sortLabel}
                    </Text>
                    {/* Chevron ▾ */}
                    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={tokens.muted} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                      <Path d="m6 9 6 6 6-6"/>
                    </Svg>
                  </TouchableOpacity>
                  {sortOpen && (
                    <View style={[s.sortMenu, { backgroundColor: tokens.surface, borderColor: tokens.border, shadowColor: "#000" }]}>
                      {SORT_OPTIONS.map((opt) => (
                        <TouchableOpacity
                          key={opt.value}
                          onPress={() => { setSortValue(opt.value); setSortOpen(false) }}
                          style={[
                            s.sortMenuItem,
                            opt.value === sortValue && { backgroundColor: tokens.green + "12" },
                          ]}
                          accessibilityRole="menuitem"
                          accessibilityState={{ selected: opt.value === sortValue }}
                        >
                          <Text style={[
                            s.sortMenuItemText,
                            { color: opt.value === sortValue ? tokens.green : tokens.text },
                          ]}>
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* ── "Ver no mapa" ── _MapToggle.tsx (lista → mapa) ── */}
            {/* Mapa nativo adiado; abre /itens?view=map no site via Linking.
                Mesmo padrão do MobileMenu.tsx para funcionalidades não portadas.
                Decisão documentada: não implementar Mapbox nativo (fora de escopo desta PR). */}
            {items.length > 0 && (
              <View style={s.mapToggleRow}>
                <TouchableOpacity
                  onPress={() => Linking.openURL(`${API_URL}/itens?view=map`)}
                  style={[s.mapToggleBtn, { borderColor: tokens.border, backgroundColor: tokens.surface }]}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Ver itens no mapa"
                  accessibilityHint="Abre a visualização de mapa no navegador"
                >
                  {/* Ícone do mapa — _MapToggle.tsx linha 47 (polygon/navigation) */}
                  <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={tokens.text} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <Polygon points="3 11 22 2 13 21 11 13 3 11"/>
                  </Svg>
                  <Text style={[s.mapToggleBtnText, { color: tokens.text }]}>Ver no mapa</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Loading skeleton (pré-existente) */}
            {isLoading && (
              <View style={s.skeletonGrid}>
                {[0, 1, 2, 3].map((i) => <ItemCardSkeleton key={i} />)}
              </View>
            )}
          </>
        }
        renderItem={({ item }) => (
          <ItemCard
            item={item}
            onPress={() => router.push(`/itens/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          isLoading ? null : (
            <View style={s.empty}>
              <Text style={s.emptyIcon}>🔍</Text>
              <Text style={[s.emptyTitle, { color: tokens.navy }]}>Nenhum item encontrado</Text>
              <Text style={[s.emptyDesc, { color: tokens.muted }]}>Tente outra busca ou categoria</Text>
            </View>
          )
        }
      />

      {/* ── FilterBottomSheet ── */}
      <FilterBottomSheet
        isOpen={filterOpen}
        onClose={() => setFilterOpen(false)}
        categories={categories}
        values={filterVals}
        onApply={handleFilterApply}
      />

      {/* Fecha o sort dropdown ao tocar fora */}
      {sortOpen && (
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={() => setSortOpen(false)}
          activeOpacity={0}
          accessibilityLabel="Fechar ordenação"
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
    // Altura explícita: a ScrollView horizontal não cresce sozinha com o conteúdo
    // do chip (ícone 80 + rótulo 2 linhas) → sem isso o rótulo era cortado no Android.
    height:            150,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  chipsRow: {
    flexDirection:    "row",
    gap:              8,
    paddingHorizontal: 16,
    paddingVertical:   10,
  },
  // Casa com o card vertical do CategoryChip (ícone 64 + rótulo 2 linhas)
  // pra não saltar de tamanho quando o loading termina.
  chipSkeleton: {
    width:        96,
    height:       116,
    borderRadius: 10,
  },
  // Linha count + sort — "mb-4 flex items-center justify-between gap-3" (page.tsx:398)
  countSortRow: {
    flexDirection:     "row",
    alignItems:        "center",
    justifyContent:    "space-between",
    paddingHorizontal: 12,
    paddingVertical:    8,
    zIndex:            10,
  },
  countText: {
    fontSize: 12,
    flex:     1,
    flexShrink: 1,
  },
  // Dropdown de ordenação
  sortWrap: {
    position: "relative",
    zIndex:    20,
  },
  // "h-10 cursor-pointer rounded-lg border border-input bg-surface px-3 text-sm" (_SortSelect.tsx)
  sortBtn: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               4,
    borderRadius:      8,
    borderWidth:       1,
    paddingHorizontal: 10,
    paddingVertical:    6,
    minHeight:         40,
  },
  sortBtnText: {
    fontSize:  13,
    maxWidth:  100,
  },
  sortMenu: {
    position:      "absolute",
    top:            44,
    right:          0,
    minWidth:       160,
    borderRadius:   10,
    borderWidth:    1,
    zIndex:         100,
    shadowOffset:   { width: 0, height: 4 },
    shadowOpacity:  0.10,
    shadowRadius:   8,
    elevation:      8,
    overflow:       "hidden",
  },
  sortMenuItem: {
    paddingHorizontal: 14,
    paddingVertical:   10,
    minHeight:         40,
  },
  sortMenuItemText: {
    fontSize:   13,
  },
  // "Ver no mapa" — "mb-4 flex justify-end" (_MapToggle.tsx linhas 30-54)
  mapToggleRow: {
    paddingHorizontal: 12,
    paddingBottom:     8,
    alignItems:        "flex-end",
  },
  // "inline-flex h-11 min-w-[44px] items-center gap-2 rounded-lg border border-border bg-surface px-4"
  mapToggleBtn: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               6,
    borderRadius:      8,
    borderWidth:       1,
    paddingHorizontal: 14,
    minHeight:         44,
  },
  mapToggleBtnText: {
    fontSize:   13,
    fontWeight: "600",
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
