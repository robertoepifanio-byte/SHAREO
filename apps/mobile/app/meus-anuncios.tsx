// Fonte: app/meus-anuncios/page.tsx + components/items/MyItemsGrid.tsx
//
// Transcrição literal da tela "Meus Anúncios" do site ShareO para React Native.
//
// Decisões de transcrição documentadas:
//   1. Barra de abas: rótulos e ordem verbatim ("Anúncios", "Desempenho",
//      "Importar" só PJ, "Integrações"). Aba "Anúncios" = nativa (esta tela).
//      Demais → Linking.openURL(API_URL + path), padrão já usado em perfil.tsx.
//   2. Botão "Editar" → router.push(`/itens/${id}/editar`) — rota nativa existe
//      em apps/mobile/app/itens/[id]/editar.tsx.
//   3. Botão "Pausar/Ativar" → PATCH /api/items/:id via apiFetch. Sem confirm()
//      (não existe no RN nativo); usa Alert.alert() para deletar, mas não para
//      pausar (ação reversível de baixo risco — igual ao padrão da suíte mobile).
//   4. Botão "Remover" → Alert.alert() com texto verbatim do site
//      ("Remover este anúncio? Esta ação não pode ser desfeita."), depois DELETE.
//   5. Banners de status: textos verbatim de MyItemsGrid.tsx (DRAFT: "Rascunho"
//      / "Adicione pelo menos 1 foto para publicar"; PAUSED: "Pausado" /
//      "Anúncio oculto das listagens públicas"; AVAILABLE: "Disponível").
//   6. Empty state: título e descrição verbatim de MyItemsGrid.tsx
//      ("Nenhum anúncio ainda" / "Comece a ganhar dinheiro alugando o que você tem.").
//   7. Contador de anúncios: "{n} anúncio" / "{n} anúncios" — verbatim de
//      meus-anuncios/page.tsx linhas 50-51.
//   8. Grade de itens: 1 coluna em mobile (site usa grid-cols-1 para 375px).
//      Thumbnail 4:3, nome da categoria (uppercase), título, preço/dia, cidade.
//   9. userType (para aba "Importar") vem de GET /api/users/me — mesma queryKey
//      ["me-profile"] já usada em perfil.tsx, portanto usa cache quando disponível.

import React, { useState } from "react"
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Platform,
  Alert,
  Linking,
} from "react-native"
import { Image } from "expo-image"
import Svg, { Line, Path, Polyline, Rect, Circle } from "react-native-svg"
import { router } from "expo-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { apiFetch, API_URL } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useTheme } from "@/lib/theme"

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface OwnedItem {
  id:           string
  title:        string
  pricePerDay:  number
  condition:    string
  city:         string
  state:        string
  neighborhood: string | null
  status:       string
  images:       { url: string }[]
  category:     { name: string; slug: string }
  owner:        { name: string; isVerified: boolean }
  _count:       { reviews: number; favorites: number }
}

interface ItemsResponse {
  data:  OwnedItem[]
  total: number
}

interface MeData {
  id:       string
  userType: "PF" | "PJ"
}

// ── Formatação de moeda — verbatim de ItemCard.tsx do mobile ─────────────────
const fmt = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100)

// ── Ícone SVG de "plus" — verbatim de meus-anuncios/page.tsx linhas 57-59 ───
function PlusIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5}>
      <Line x1="12" y1="5" x2="12" y2="19" />
      <Line x1="5" y1="12" x2="19" y2="12" />
    </Svg>
  )
}

// ── Ícones de ação nos cards ──────────────────────────────────────────────────
function EditIcon({ color }: { color: string }) {
  const p = { width: 14, height: 14, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const }
  return <Svg {...p}><Path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><Path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></Svg>
}

function PauseIcon({ color }: { color: string }) {
  const p = { width: 14, height: 14, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 2, strokeLinecap: "round" as const }
  return <Svg {...p}><Rect x="6" y="4" width="4" height="16"/><Rect x="14" y="4" width="4" height="16"/></Svg>
}

function PlayIcon({ color }: { color: string }) {
  const p = { width: 14, height: 14, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const }
  return <Svg {...p}><Polyline points="5 3 19 12 5 21 5 3"/></Svg>
}

function TrashIcon({ color }: { color: string }) {
  const p = { width: 14, height: 14, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const }
  return <Svg {...p}><Polyline points="3 6 5 6 21 6"/><Path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></Svg>
}

// ── Ícone placeholder de categoria ───────────────────────────────────────────
// Verbatim do padrão de CategorySvg em ItemCard.tsx (mobile)
function CategoryFallbackIcon({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round">
      <Rect x="2" y="3" width="20" height="14" rx="2" />
    </Svg>
  )
}

// ── Card de item próprio — com banners de status e ações de gestão ────────────
// Transcrito de MyItemsGrid.tsx: banner + ItemCard + botões de ação.
interface MyItemCardProps {
  item:         OwnedItem
  isDeleting:   boolean
  isToggling:   boolean
  onEdit:       (item: OwnedItem) => void
  onToggle:     (item: OwnedItem) => void
  onDelete:     (item: OwnedItem) => void
}

function MyItemCard({ item, isDeleting, isToggling, onEdit, onToggle, onDelete }: MyItemCardProps) {
  const { tokens } = useTheme()
  const thumb = item.images[0]?.url

  return (
    <View
      style={[
        s.cardWrapper,
        (isDeleting || isToggling) && s.cardDimmed,
      ]}
    >
      {/* ── Status banner — verbatim MyItemsGrid.tsx linhas 118-144 ── */}
      {item.status === "DRAFT" && (
        <View
          style={[s.statusBanner, s.statusBannerDraft]}
          accessibilityLiveRegion="polite"
        >
          <View style={s.statusDraftBadge}>
            <Text style={s.statusDraftBadgeText}>Rascunho</Text>
          </View>
          <Text style={[s.statusBannerDesc, { color: tokens.muted }]}>
            Adicione pelo menos 1 foto para publicar
          </Text>
        </View>
      )}
      {item.status === "PAUSED" && (
        <View
          style={[s.statusBanner, { borderColor: tokens.border, backgroundColor: tokens.bg }]}
          accessibilityLiveRegion="polite"
        >
          <View style={[s.statusPausedBadge, { borderColor: tokens.border, backgroundColor: tokens.bg }]}>
            <Text style={[s.statusPausedBadgeText, { color: tokens.muted }]}>Pausado</Text>
          </View>
          <Text style={[s.statusBannerDesc, { color: tokens.muted }]}>
            Anúncio oculto das listagens públicas
          </Text>
        </View>
      )}
      {item.status === "AVAILABLE" && (
        <View
          style={[s.statusBanner, s.statusBannerAvailable]}
          accessibilityLiveRegion="polite"
        >
          <View style={s.statusAvailableBadge}>
            <Text style={s.statusAvailableBadgeText}>Disponível</Text>
          </View>
        </View>
      )}

      {/* ── Card principal ── */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => router.push(`/itens/${item.id}` as never)}
        accessibilityRole="button"
        accessibilityLabel={`${item.title}, ${fmt(item.pricePerDay)} por dia`}
        style={[s.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]}
      >
        {/* Thumbnail 4:3 */}
        <View style={[s.cardThumb, { backgroundColor: tokens.disabledBg }]}>
          {thumb ? (
            <Image source={{ uri: thumb }} style={{ flex: 1 }} contentFit="cover" />
          ) : (
            <View style={[s.cardThumbFallback, { backgroundColor: tokens.bg }]}>
              <CategoryFallbackIcon color={tokens.muted} />
            </View>
          )}
        </View>

        {/* Corpo do card — campos verbatim de MyItemsGrid / ItemCard */}
        <View style={s.cardBody}>
          {/* Categoria — uppercase, verbatim do site */}
          <Text style={[s.cardCat, { color: tokens.green }]} numberOfLines={1}>
            {item.category.name}
          </Text>
          {/* Título */}
          <Text style={[s.cardTitle, { color: tokens.navy }]} numberOfLines={2}>
            {item.title}
          </Text>

          <View style={s.cardMeta}>
            {/* Preço / dia */}
            <View>
              <Text style={[s.cardPrice, { color: tokens.text }]}>
                {fmt(item.pricePerDay)}
              </Text>
              <Text style={[s.cardUnit, { color: tokens.muted }]}>/dia</Text>
            </View>
            {/* Localização: bairro ou cidade — verbatim do ItemCard mobile */}
            <Text style={[s.cardLoc, { color: tokens.muted }]} numberOfLines={1}>
              {item.neighborhood ?? item.city}
            </Text>
          </View>

          {/* Contadores — _count de reviews e favoritos */}
          <View style={s.cardCounters}>
            <Text style={[s.cardCounterText, { color: tokens.muted }]}>
              ★ {item._count.reviews} avaliações · ❤ {item._count.favorites} favoritos
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* ── Ações de gestão do anúncio ── */}
      <View style={[s.actionsRow, { borderTopColor: tokens.border }]}>
        {/* Editar — rota nativa /itens/[id]/editar existe */}
        <TouchableOpacity
          style={[s.actionBtn, { borderColor: tokens.border }]}
          onPress={() => onEdit(item)}
          accessibilityRole="button"
          accessibilityLabel="Editar anúncio"
        >
          <EditIcon color={tokens.text} />
          <Text style={[s.actionBtnText, { color: tokens.text }]}>Editar</Text>
        </TouchableOpacity>

        {/* Pausar / Ativar — toggle verbatim de MyItemsGrid.tsx linhas 63 */}
        <TouchableOpacity
          style={[s.actionBtn, { borderColor: tokens.border }]}
          onPress={() => onToggle(item)}
          disabled={isToggling}
          accessibilityRole="button"
          accessibilityLabel={item.status === "AVAILABLE" ? "Pausar anúncio" : "Ativar anúncio"}
        >
          {item.status === "AVAILABLE"
            ? <PauseIcon color={tokens.muted} />
            : <PlayIcon  color={tokens.green} />
          }
          <Text style={[s.actionBtnText, { color: item.status === "AVAILABLE" ? tokens.muted : tokens.green }]}>
            {item.status === "AVAILABLE" ? "Pausar" : "Ativar"}
          </Text>
        </TouchableOpacity>

        {/* Remover — confirmação Alert verbatim de MyItemsGrid.tsx linha 35 */}
        <TouchableOpacity
          style={[s.actionBtn, { borderColor: tokens.border }]}
          onPress={() => onDelete(item)}
          disabled={isDeleting}
          accessibilityRole="button"
          accessibilityLabel="Remover anúncio"
        >
          <TrashIcon color={tokens.error} />
          <Text style={[s.actionBtnText, { color: tokens.error }]}>Remover</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

// ── Tela principal ─────────────────────────────────────────────────────────────
export default function MeusAnunciosScreen() {
  const insets      = useSafeAreaInsets()
  const { tokens }  = useTheme()
  const user        = useAuth((s) => s.user)
  const qc          = useQueryClient()

  // Estado local de operações em andamento
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  // ── Query de itens do usuário ─────────────────────────────────────────────
  const {
    data,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["meus-anuncios", user?.id],
    queryFn:  () => apiFetch<ItemsResponse>(`/api/items?ownerId=${user!.id}&limit=100`),
    enabled:  !!user,
    select:   (r) => r.data,
  })

  // ── Query de userType — para exibir aba "Importar" somente para PJ ────────
  // Reusa queryKey ["me-profile"] (cache compartilhado com perfil.tsx)
  const { data: meData } = useQuery({
    queryKey: ["me-profile"],
    queryFn:  () => apiFetch<{ data: MeData }>("/api/users/me"),
    enabled:  !!user,
    select:   (r) => r.data,
  })

  const items  = data ?? []
  const isPJ   = meData?.userType === "PJ"

  // ── Mutation: toggle pause/active ────────────────────────────────────────
  const toggleMutation = useMutation({
    mutationFn: ({ id, newStatus }: { id: string; newStatus: string }) =>
      apiFetch(`/api/items/${id}`, {
        method:  "PUT",
        body:    JSON.stringify({ status: newStatus }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meus-anuncios", user?.id] })
    },
  })

  // ── Mutation: delete ──────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/items/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meus-anuncios", user?.id] })
    },
  })

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleEdit(item: OwnedItem) {
    // Rota nativa: apps/mobile/app/itens/[id]/editar.tsx existe
    router.push(`/itens/${item.id}/editar` as never)
  }

  async function handleToggle(item: OwnedItem) {
    const newStatus = item.status === "AVAILABLE" ? "PAUSED" : "AVAILABLE"
    setTogglingId(item.id)
    try {
      await toggleMutation.mutateAsync({ id: item.id, newStatus })
    } finally {
      setTogglingId(null)
    }
  }

  function handleDelete(item: OwnedItem) {
    // Texto de confirmação verbatim de MyItemsGrid.tsx linha 35
    Alert.alert(
      "Remover anúncio",
      "Remover este anúncio? Esta ação não pode ser desfeita.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text:    "Remover",
          style:   "destructive",
          onPress: async () => {
            setDeletingId(item.id)
            try {
              await deleteMutation.mutateAsync(item.id)
            } finally {
              setDeletingId(null)
            }
          },
        },
      ],
    )
  }

  // ── Guard: não autenticado ────────────────────────────────────────────────
  if (!user) {
    return (
      <View
        style={[
          s.center,
          { backgroundColor: tokens.bg, paddingTop: insets.top, paddingHorizontal: 24 },
        ]}
      >
        <Text style={[s.guardTitle, { color: tokens.navy }]}>
          Faça login para ver seus anúncios
        </Text>
        <TouchableOpacity
          style={[s.ctaBtn, { backgroundColor: tokens.green }]}
          onPress={() => router.push("/(auth)/login")}
          accessibilityRole="button"
          accessibilityLabel="Entrar"
        >
          <Text style={s.ctaBtnText}>Entrar</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={[s.root, { backgroundColor: tokens.bg }]}>

      {/* ── Header ── */}
      <View
        style={[
          s.header,
          {
            paddingTop:        insets.top + 8,
            backgroundColor:   tokens.surface,
            borderBottomColor: tokens.border,
          },
        ]}
      >
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
        >
          <Text style={[s.backBtnText, { color: tokens.muted }]}>‹</Text>
        </TouchableOpacity>

        <View style={s.headerTitleCol}>
          {/* Título verbatim: "Meus Anúncios" — site linha 48 */}
          <Text style={[s.headerTitle, { color: tokens.navy }]}>Meus Anúncios</Text>
          {/* Contador verbatim: "{n} anúncio" / "{n} anúncios" — site linhas 50-51 */}
          {!isLoading && (
            <Text style={[s.headerSubtitle, { color: tokens.muted }]}>
              {items.length} {items.length === 1 ? "anúncio" : "anúncios"}
            </Text>
          )}
        </View>

        {/* Botão "Novo anúncio" — verbatim de meus-anuncios/page.tsx linhas 53-62 */}
        <TouchableOpacity
          style={[s.newBtn, { backgroundColor: tokens.green }]}
          onPress={() => router.push("/itens/novo")}
          accessibilityRole="button"
          accessibilityLabel="Novo anúncio"
        >
          <PlusIcon color="#FFFFFF" />
          <Text style={s.newBtnText}>Novo anúncio</Text>
        </TouchableOpacity>
      </View>

      {/* ── Barra de abas — verbatim de meus-anuncios/page.tsx linhas 65-101 ── */}
      {/* Rótulos e ordem: "Anúncios" / "Desempenho" / "Importar" (só PJ) / "Integrações" */}
      <View
        style={[s.tabBar, { backgroundColor: tokens.surface, borderBottomColor: tokens.border }]}
        accessibilityRole="tablist"
      >
        {/* "Anúncios" — aba ativa (tela nativa) */}
        <View
          style={[s.tabActive, { backgroundColor: tokens.green }]}
          accessibilityRole="tab"
          accessibilityState={{ selected: true }}
          accessibilityLabel="Anúncios"
        >
          <Text style={s.tabActiveText}>Anúncios</Text>
        </View>

        {/* "Desempenho" → abre no browser */}
        <TouchableOpacity
          style={s.tabInactive}
          onPress={() => Linking.openURL(`${API_URL}/meus-anuncios/desempenho`)}
          accessibilityRole="tab"
          accessibilityState={{ selected: false }}
          accessibilityLabel="Desempenho"
        >
          <Text style={[s.tabInactiveText, { color: tokens.muted }]}>Desempenho</Text>
        </TouchableOpacity>

        {/* "Importar" — somente PJ, verbatim de meus-anuncios/page.tsx linhas 83-92 */}
        {isPJ && (
          <TouchableOpacity
            style={s.tabInactive}
            onPress={() => Linking.openURL(`${API_URL}/meus-anuncios/importar`)}
            accessibilityRole="tab"
            accessibilityState={{ selected: false }}
            accessibilityLabel="Importar"
          >
            <Text style={[s.tabInactiveText, { color: tokens.muted }]}>Importar</Text>
          </TouchableOpacity>
        )}

        {/* "Integrações" → tela nativa (antes abria no navegador) */}
        <TouchableOpacity
          style={s.tabInactive}
          onPress={() => router.push("/meus-anuncios/integracoes")}
          accessibilityRole="tab"
          accessibilityState={{ selected: false }}
          accessibilityLabel="Integrações"
        >
          <Text style={[s.tabInactiveText, { color: tokens.muted }]}>Integrações</Text>
        </TouchableOpacity>
      </View>

      {/* ── Lista de itens ── */}
      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={tokens.green} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={tokens.green}
            />
          }
          ListEmptyComponent={
            // Empty state verbatim de MyItemsGrid.tsx linhas 91-106
            <View style={s.emptyState}>
              <Text style={[s.emptyTitle, { color: tokens.navy }]}>
                Nenhum anúncio ainda
              </Text>
              <Text style={[s.emptyDesc, { color: tokens.muted }]}>
                Comece a ganhar dinheiro alugando o que você tem.
              </Text>
              <TouchableOpacity
                style={[s.ctaBtn, { backgroundColor: tokens.green, marginTop: 20 }]}
                onPress={() => router.push("/itens/novo")}
                accessibilityRole="button"
                accessibilityLabel="Criar primeiro anúncio"
              >
                <Text style={s.ctaBtnText}>Criar primeiro anúncio</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <MyItemCard
              item={item}
              isDeleting={deletingId === item.id}
              isToggling={togglingId === item.id}
              onEdit={handleEdit}
              onToggle={handleToggle}
              onDelete={handleDelete}
            />
          )}
        />
      )}
    </View>
  )
}

// ── Estilos ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:   { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  // Header
  header: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               8,
    paddingBottom:     12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    ...Platform.select({
      ios:     { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  backBtn:        { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  backBtnText:    { fontSize: 28, fontWeight: "700", lineHeight: 32 },
  headerTitleCol: { flex: 1 },
  headerTitle:    { fontSize: 17, fontWeight: "700" },
  headerSubtitle: { fontSize: 12, marginTop: 1 },

  // Botão "Novo anúncio" — verbatim inline-flex h-11 do site
  newBtn: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               6,
    paddingHorizontal: 14,
    paddingVertical:   8,
    borderRadius:      8,
    minHeight:         44,
  },
  newBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },

  // Barra de abas
  tabBar: {
    flexDirection:     "row",
    paddingHorizontal: 12,
    paddingVertical:   8,
    borderBottomWidth: 1,
    gap:               4,
  },
  tabActive: {
    paddingHorizontal: 14,
    paddingVertical:   7,
    borderRadius:      8,
    minHeight:         36,
    justifyContent:    "center",
  },
  tabActiveText:   { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  tabInactive: {
    paddingHorizontal: 14,
    paddingVertical:   7,
    borderRadius:      8,
    minHeight:         36,
    justifyContent:    "center",
  },
  tabInactiveText: { fontSize: 13, fontWeight: "600" },

  // Lista
  listContent: { padding: 16, gap: 16 },

  // Card wrapper
  cardWrapper: {
    borderRadius: 16,
    overflow:     "hidden",
  },
  cardDimmed: { opacity: 0.5 },

  // Status banners — verbatim de MyItemsGrid.tsx
  statusBanner: {
    flexDirection:  "row",
    alignItems:     "center",
    gap:            8,
    paddingHorizontal: 12,
    paddingVertical:   10,
    minHeight:      44,
  },
  statusBannerDraft: {
    borderWidth:     1,
    borderColor:     "#D97706",
    backgroundColor: "#FFFBEB",
    borderTopLeftRadius:  16,
    borderTopRightRadius: 16,
  },
  statusBannerAvailable: {
    borderWidth:     1,
    borderColor:     "#BBF7D0",
    backgroundColor: "#F0FDF4",
    borderTopLeftRadius:  16,
    borderTopRightRadius: 16,
  },
  statusBannerDesc: { fontSize: 12 },

  // Status badges
  statusDraftBadge: {
    borderRadius:      20,
    paddingHorizontal: 8,
    paddingVertical:   2,
    backgroundColor:   "#FEF3C7",
    borderWidth:       1,
    borderColor:       "#D97706",
  },
  statusDraftBadgeText:     { fontSize: 11, fontWeight: "700", color: "#92400E" },
  statusPausedBadge: {
    borderRadius:      20,
    paddingHorizontal: 8,
    paddingVertical:   2,
    borderWidth:       1,
  },
  statusPausedBadgeText:    { fontSize: 11, fontWeight: "700" },
  statusAvailableBadge: {
    borderRadius:      20,
    paddingHorizontal: 8,
    paddingVertical:   2,
    backgroundColor:   "#DCFCE7",
    borderWidth:       1,
    borderColor:       "#BBF7D0",
  },
  statusAvailableBadgeText: { fontSize: 11, fontWeight: "700", color: "#15803D" },

  // Card principal
  card: {
    borderWidth:  1,
    flexDirection: "row",
  },
  cardThumb: {
    width:  120,
    height: 100,
  },
  cardThumbFallback: {
    flex:           1,
    alignItems:     "center",
    justifyContent: "center",
  },
  cardBody: {
    flex:    1,
    padding: 10,
    gap:     3,
  },
  cardCat: {
    fontSize:      10,
    fontWeight:    "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  cardTitle: {
    fontSize:   13,
    fontWeight: "700",
    lineHeight: 18,
  },
  cardMeta: {
    flexDirection:  "row",
    alignItems:     "flex-end",
    justifyContent: "space-between",
    marginTop:      2,
  },
  cardPrice: {
    fontSize:   16,
    fontWeight: "800",
    lineHeight: 20,
  },
  cardUnit: { fontSize: 10 },
  cardLoc:  { fontSize: 10, maxWidth: "55%", textAlign: "right" },
  cardCounters: { marginTop: 4 },
  cardCounterText: { fontSize: 10 },

  // Linha de ações (editar / pausar / remover)
  actionsRow: {
    flexDirection:  "row",
    borderTopWidth: 1,
  },
  actionBtn: {
    flex:           1,
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "center",
    gap:            4,
    paddingVertical: 10,
    minHeight:      44,
    borderRightWidth: 0, // separadores só internamente via borderTop
  },
  actionBtnText: { fontSize: 12, fontWeight: "600" },

  // Guard / empty state
  guardTitle: { fontSize: 16, fontWeight: "600", marginBottom: 20, textAlign: "center" },
  emptyState: { alignItems: "center", paddingVertical: 60, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 18, fontWeight: "700", textAlign: "center" },
  emptyDesc:  { fontSize: 13, marginTop: 8, textAlign: "center", lineHeight: 20 },

  ctaBtn: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               6,
    borderRadius:      8,
    paddingHorizontal: 24,
    paddingVertical:   10,
    minHeight:         44,
  },
  ctaBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
})
