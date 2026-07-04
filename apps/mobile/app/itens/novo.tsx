// Fonte: components/items/ItemForm.tsx (1150 linhas — form completo do site)
// Transcrição literal campo a campo conforme protocolo meta-app-android-retranscricao-s41.md.
// Divergências do app anterior documentadas na tabela do PR.
/**
 * AnunciarScreen — apps/mobile/app/itens/novo.tsx
 *
 * Tela de criação de anúncio (modo "create" do ItemForm.tsx do site).
 * Campos reconciliados: título, descrição, categoria, condição, voltagem (condicional),
 * estimatedRetailPrice + sugestão de faixa, preço diário/semanal/mensal com botão
 * Aplicar/Recalcular, localização (read-only do perfil), fotos (limite 3 — câmera +
 * galeria separados), texto de limite de formato/tamanho, dicas colapsáveis, seção
 * de requisitos para reserva (requireIdVerification + requirePhone).
 *
 * Diferenças intencionais vs. site (documentadas):
 * - `<details>` colapsável de dicas de fotos → Pressable expansível nativo (sem HTML)
 * - Status de geocoding em tempo real → omitido; backend faz geocoding fire-and-forget
 *   via after() (igual a lat=0/lng=0); status não pode ser mostrado no mobile sem
 *   polling — decisão registrada no PR (TODO revisão se WebSocket for adicionado)
 * - ListingQualityIndicator (sidebar desktop) → omitido; componente React DOM não
 *   portável; versão mobile seria nova feature, fora do escopo de transcrição (decisão no PR)
 * - ItemCardPreview (sidebar desktop) → omitido pelo mesmo motivo
 * - Sugestão de preço da região (P2-52, regionSuggestion via /api/items/price-suggestion)
 *   → omitida; requer endpoint e estado adicional; a faixa por valor do bem (priceSuggestion)
 *   já está presente — a regional é P2-52 (pós-MVP mobile, registrado no PR)
 */

import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Image,
} from "react-native"
import { useState, useCallback, useRef } from "react"
import { router } from "expo-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import * as ImagePicker from "expo-image-picker"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import Svg, { Path, Circle, Line, Rect, Polyline } from "react-native-svg"
import { apiFetch, API_URL, getTokens } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useTheme, type Tokens } from "@/lib/theme"

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Category {
  id:   string
  name: string
  slug: string
}

interface UserProfile {
  city:         string | null
  state:        string | null
  neighborhood: string | null
  street:       string | null
}

interface CreateItemResponse {
  data: { id: string; title: string; status: string }
}

type Condition = "NEW" | "EXCELLENT" | "GOOD" | "FAIR"

// ─── Constantes (transcritas de ItemForm.tsx linhas 93-98) ───────────────────

const CONDITION_LABELS: Record<Condition, string> = {
  NEW:       "Novo",
  EXCELLENT: "Excelente",
  GOOD:      "Bom",
  FAIR:      "Regular",
}

const CONDITIONS: Condition[] = ["NEW", "EXCELLENT", "GOOD", "FAIR"]

// Categorias onde voltagem faz sentido — fonte: ItemForm.tsx linhas 81-83
const ELECTRICAL_CATEGORIES = new Set([
  "ferramentas", "eletronicos", "construcao", "casa-jardim", "festas",
])

// ─── Lógica de sugestão de preço por faixa de valor ─────────────────────────
// Fonte: ItemForm.tsx linhas 69-78

interface PriceBand { minRate: number; maxRate: number }

function getPriceBand(retailCents: number): PriceBand {
  if (retailCents <= 20_000)  return { minRate: 0.05, maxRate: 0.08 }
  if (retailCents <= 100_000) return { minRate: 0.03, maxRate: 0.05 }
  if (retailCents <= 500_000) return { minRate: 0.02, maxRate: 0.04 }
  return                             { minRate: 0.01, maxRate: 0.03 }
}

function fmtPct(r: number) { return `${(r * 100).toFixed(0)}%` }

// ─── Helpers de preço ─────────────────────────────────────────────────────────
// Fonte: ItemForm.tsx linhas 100-108 (toCents / toDisplay)

function parseBRL(v: string): number {
  const cleaned = v.replace(/[^\d,]/g, "").replace(",", ".")
  const n = parseFloat(cleaned)
  return isNaN(n) ? 0 : Math.round(n * 100)
}

function fmtBRL(cents: number): string {
  if (cents === 0) return ""
  return (cents / 100).toFixed(2).replace(".", ",")
}

function centsToDisplay(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",")
}

// ─── Ícones SVG (replicam os do ItemForm.tsx) ─────────────────────────────────

function CameraIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}>
      <Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <Circle cx="12" cy="13" r="4"/>
    </Svg>
  )
}

function GalleryIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}>
      <Rect x="3" y="3" width="18" height="18" rx="2"/>
      <Circle cx="8.5" cy="8.5" r="1.5"/>
      <Polyline points="21 15 16 10 5 21"/>
    </Svg>
  )
}

function RemoveIcon({ color }: { color: string }) {
  return (
    <Svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={3}>
      <Line x1="18" y1="6" x2="6" y2="18"/>
      <Line x1="6" y1="6" x2="18" y2="18"/>
    </Svg>
  )
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function AnunciarScreen() {
  const insets = useSafeAreaInsets()
  const user   = useAuth((s) => s.user)
  const qc     = useQueryClient()
  const { tokens, mode } = useTheme()

  // ── Campos do formulário (espelham ItemForm.tsx linhas 161-184) ──────────
  const [title,         setTitle]         = useState("")
  const [description,   setDescription]   = useState("")
  const [categoryId,    setCategoryId]    = useState("")
  const [condition,     setCondition]     = useState<Condition>("GOOD")
  const [pricePerDay,   setPricePerDay]   = useState("")
  const [pricePerWeek,  setPricePerWeek]  = useState("")
  const [pricePerMonth, setPricePerMonth] = useState("")
  // weekTouched/monthTouched: se o anunciante editou manualmente, não sobrescrevemos
  // Fonte: ItemForm.tsx linhas 172-173
  const [weekTouched,   setWeekTouched]   = useState(false)
  const [monthTouched,  setMonthTouched]  = useState(false)
  const [estimatedRetailPrice, setEstimatedRetailPrice] = useState("")
  const [voltage,              setVoltage]              = useState<"" | "110V" | "220V" | "Bivolt">("")
  const [requireIdVerification, setRequireIdVerification] = useState(false)
  const [requirePhone,          setRequirePhone]          = useState(false)
  const [photos, setPhotos] = useState<ImagePicker.ImagePickerAsset[]>([])
  const [error,  setError]  = useState<string | null>(null)

  // Sugestão de preço por faixa de valor do bem — fonte: ItemForm.tsx linhas 224-227
  const [priceSuggestion, setPriceSuggestion] = useState<PriceBand | null>(null)

  // Seção de dicas de fotos colapsável — fonte: ItemForm.tsx linha 1036 (<details>)
  const [tipsExpanded, setTipsExpanded] = useState(false)

  // Multiplicadores (o site pega da API mas usa defaults de 3/15 — CLAUDE.md)
  const weeklyMultiplier  = 3
  const monthlyMultiplier = 15

  // ── Busca categorias ─────────────────────────────────────────────────────
  // Fonte: ItemForm.tsx linhas 280-285
  const { data: catData } = useQuery({
    queryKey: ["categories"],
    queryFn:  () => apiFetch<{ data: Category[] }>("/api/categories"),
    staleTime: 5 * 60_000,
  })
  const categories = catData?.data ?? []

  // ── Busca perfil (endereço read-only) ────────────────────────────────────
  // Fonte: ItemForm.tsx linhas 291-313
  const { data: profileData } = useQuery({
    queryKey: ["me"],
    queryFn:  () => apiFetch<{ data: UserProfile }>("/api/users/me"),
    enabled:  !!user,
  })
  const profile = profileData?.data

  // ── isElectrical — fonte: ItemForm.tsx linhas 230-231 ───────────────────
  const selectedCat  = categories.find((c) => c.id === categoryId)
  const isElectrical = selectedCat ? ELECTRICAL_CATEGORIES.has(selectedCat.slug) : false

  // ── Lógica de preço — fonte: ItemForm.tsx linhas 253-277 ────────────────
  function handleDayChange(v: string) {
    setPricePerDay(v)
    setError(null)
    const cents = parseBRL(v)
    if (cents > 0) {
      if (!weekTouched)  setPricePerWeek(centsToDisplay(cents * weeklyMultiplier))
      if (!monthTouched) setPricePerMonth(centsToDisplay(cents * monthlyMultiplier))
    }
  }

  function applyRetailSuggestion(retailDisplay: string) {
    const retailCents = parseBRL(retailDisplay)
    if (retailCents <= 0) { setPriceSuggestion(null); return }
    const band = getPriceBand(retailCents)
    setPriceSuggestion(band)
    // Só auto-preenche a diária se ainda estiver vazia — fonte: ItemForm.tsx linhas 238-247
    if (!parseBRL(pricePerDay)) {
      const suggestedDay = Math.round(retailCents * band.minRate)
      const dayStr = centsToDisplay(suggestedDay)
      setPricePerDay(dayStr)
      if (!parseBRL(pricePerWeek))  setPricePerWeek(centsToDisplay(suggestedDay * weeklyMultiplier))
      if (!parseBRL(pricePerMonth)) setPricePerMonth(centsToDisplay(suggestedDay * monthlyMultiplier))
    }
  }

  function autoWeekly() {
    const cents = parseBRL(pricePerDay)
    if (!cents) return
    setPricePerWeek(centsToDisplay(cents * weeklyMultiplier))
    setWeekTouched(false)
  }

  function autoMonthly() {
    const cents = parseBRL(pricePerDay)
    if (!cents) return
    setPricePerMonth(centsToDisplay(cents * monthlyMultiplier))
    setMonthTouched(false)
  }

  // ── Seleção de fotos — câmera e galeria separados ────────────────────────
  // Fonte: ItemForm.tsx linhas 979-1009 (dois botões: Câmera + Galeria)
  // Limite 3 fotos — fonte: ItemForm.tsx linhas 370-371 (remaining = 3 - visible.length)

  const handleCamera = useCallback(async () => {
    if (photos.length >= 3) {
      Alert.alert("Limite atingido", "Você pode adicionar até 3 fotos.")
      return
    }
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== "granted") {
      Alert.alert("Permissão negada", "Precisamos de acesso à câmera para tirar fotos.")
      return
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    })
    if (!result.canceled && result.assets[0]) {
      setPhotos((prev) => [...prev, result.assets[0]].slice(0, 3))
    }
  }, [photos.length])

  const handleGallery = useCallback(async () => {
    if (photos.length >= 3) {
      Alert.alert("Limite atingido", "Você pode adicionar até 3 fotos.")
      return
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== "granted") {
      Alert.alert("Permissão negada", "Precisamos de acesso à galeria para adicionar fotos.")
      return
    }
    const remaining = 3 - photos.length
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
    })
    if (!result.canceled) {
      setPhotos((prev) => [...prev, ...result.assets].slice(0, 3))
    }
  }, [photos.length])

  const handleRemovePhoto = (idx: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx))
  }

  // ── Upload de uma foto ───────────────────────────────────────────────────
  async function uploadPhoto(itemId: string, asset: ImagePicker.ImagePickerAsset): Promise<void> {
    const tokens_auth = await getTokens()
    const formData = new FormData()
    formData.append("file", {
      uri:  asset.uri,
      name: `photo-${Date.now()}.jpg`,
      type: asset.mimeType ?? "image/jpeg",
    } as unknown as Blob)

    const res = await fetch(`${API_URL}/api/items/${itemId}/images`, {
      method:  "POST",
      headers: {
        ...(tokens_auth ? { Authorization: `Bearer ${tokens_auth.accessToken}` } : {}),
      },
      body: formData,
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body?.error?.message ?? `Upload falhou (${res.status})`)
    }
  }

  // ── Mutação de criação ───────────────────────────────────────────────────
  // Payload espelha CreateItemSchema (lib/validations/items.ts) — nomes confirmados
  const submittingRef = useRef(false)

  const createItem = useMutation({
    mutationFn: async () => {
      if (submittingRef.current) return
      submittingRef.current = true

      const priceDay   = parseBRL(pricePerDay)
      const priceWeek  = parseBRL(pricePerWeek)
      const priceMonth = parseBRL(pricePerMonth)
      const retail     = parseBRL(estimatedRetailPrice)

      if (!title.trim() || title.trim().length < 5)
        throw new Error("Título deve ter pelo menos 5 caracteres.")
      if (!description.trim() || description.trim().length < 20)
        throw new Error("Descrição deve ter pelo menos 20 caracteres.")
      if (!categoryId)
        throw new Error("Selecione uma categoria.")
      if (priceDay < 100)
        throw new Error("Preço mínimo por dia: R$ 1,00.")
      if (!profile?.city || !profile?.state)
        throw new Error("Complete seu endereço no perfil antes de anunciar.")

      // Payload — nomes de campo conforme CreateItemSchema (lib/validations/items.ts)
      const body = {
        title:         title.trim(),
        description:   description.trim(),
        categoryId,
        condition,
        pricePerDay:   priceDay,
        pricePerWeek:  priceWeek  > 0 ? priceWeek  : null,
        pricePerMonth: priceMonth > 0 ? priceMonth : null,
        estimatedRetailPrice: retail > 0 ? retail : null,
        city:          profile.city,
        state:         profile.state,
        neighborhood:  profile.neighborhood ?? undefined,
        address:       profile.street       ?? undefined,
        // lat/lng 0 → geocoding fire-and-forget via after() no backend
        latitude:  0,
        longitude: 0,
        // voltage: só enviado se categoria elétrica E valor selecionado
        voltage: isElectrical && voltage ? voltage : null,
        requireIdVerification,
        requirePhone,
      }

      const res = await apiFetch<CreateItemResponse>("/api/items", {
        method: "POST",
        body:   JSON.stringify(body),
      })
      const itemId = res.data.id

      // Upload sequencial — fonte: ItemForm.tsx linhas 500-516
      for (const photo of photos) {
        await uploadPhoto(itemId, photo)
      }

      return itemId
    },
    onSuccess: (itemId) => {
      submittingRef.current = false
      qc.invalidateQueries({ queryKey: ["items"] })
      Alert.alert(
        "Anúncio publicado!",
        photos.length === 0
          ? "Item criado em rascunho. Adicione fotos para publicar."
          : "Seu anúncio está no ar.",
        [{ text: "Ver anúncio", onPress: () => router.replace(`/itens/${itemId}`) }],
      )
    },
    onError: (e) => {
      submittingRef.current = false
      setError(e instanceof Error ? e.message : "Erro ao criar anúncio.")
    },
  })

  const s = makeStyles(tokens)

  // ── Guard de autenticação — fonte: ItemForm.tsx (contexto de página /itens/novo/page.tsx)
  if (!user) {
    return (
      <View style={[s.center, { paddingTop: insets.top }]}>
        <Text style={s.lockIcon}>🔒</Text>
        <Text style={s.lockTitle}>Faça login para anunciar</Text>
        <TouchableOpacity
          style={s.loginBtn}
          onPress={() => router.push("/(auth)/login")}
          accessibilityRole="button"
          accessibilityLabel="Entrar"
        >
          <Text style={s.loginBtnText}>Entrar</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const isSubmitting = createItem.isPending

  // Sugestão semanal/mensal derivada da diária — fonte: ItemForm.tsx linhas 737-808
  const dayCents = parseBRL(pricePerDay)
  const weekSuggestCents  = dayCents > 0 ? dayCents * weeklyMultiplier  : 0
  const monthSuggestCents = dayCents > 0 ? dayCents * monthlyMultiplier : 0
  const weekSuggestStr  = weekSuggestCents  > 0 ? centsToDisplay(weekSuggestCents)  : ""
  const monthSuggestStr = monthSuggestCents > 0 ? centsToDisplay(monthSuggestCents) : ""
  const weekMatches  = weekSuggestCents  > 0 && parseBRL(pricePerWeek)  === weekSuggestCents
  const monthMatches = monthSuggestCents > 0 && parseBRL(pricePerMonth) === monthSuggestCents

  return (
    <View style={[s.root, { backgroundColor: tokens.bg }]}>

      {/* ── Header ── */}
      <View style={[s.header, { paddingTop: insets.top + 8, backgroundColor: tokens.surface, borderBottomColor: tokens.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityLabel="Voltar"
          accessibilityRole="button"
          style={s.backBtn}
        >
          <Text style={[s.backArrow, { color: tokens.muted }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: tokens.navy }]}>Anunciar item</Text>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={[s.content, { paddingBottom: 120 }]}>

        {/* ── Erro de formulário ── */}
        {error && (
          <View style={[s.errorBanner, { borderColor: tokens.error, backgroundColor: `${tokens.error}15` }]}>
            <Text style={[s.errorText, { color: tokens.error }]}>{error}</Text>
          </View>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            SEÇÃO: Informações básicas
            Fonte: ItemForm.tsx linhas 573-663
        ══════════════════════════════════════════════════════════════════ */}
        <View style={[s.section, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
          <Text style={[s.sectionTitle, { color: tokens.navy }]}>Informações básicas</Text>

          {/* Título — fonte: ItemForm.tsx linhas 577-594 */}
          <View style={s.field}>
            <Text style={[s.label, { color: tokens.text }]}>
              Título do anúncio <Text style={{ color: tokens.error }}>*</Text>
            </Text>
            <TextInput
              value={title}
              onChangeText={(v) => { setTitle(v); setError(null) }}
              placeholder="Ex: Furadeira Bosch 650W — ideal para reformas"
              placeholderTextColor={tokens.muted}
              maxLength={120}
              accessibilityLabel="Título do anúncio"
              style={[s.input, { borderColor: tokens.border, backgroundColor: tokens.bg, color: tokens.text }]}
            />
            <Text style={[s.helper, { color: tokens.muted }]}>
              Seja específico: marca, modelo e destaque principal
            </Text>
            <Text style={[s.counter, { color: tokens.muted }]}>{title.length}/120</Text>
          </View>

          {/* Descrição — fonte: ItemForm.tsx linhas 596-613 */}
          <View style={s.field}>
            <Text style={[s.label, { color: tokens.text }]}>
              Descrição <Text style={{ color: tokens.error }}>*</Text>
            </Text>
            <TextInput
              value={description}
              onChangeText={(v) => { setDescription(v); setError(null) }}
              placeholder="Descreva o item: características, inclui acessórios, instruções de uso, restrições..."
              placeholderTextColor={tokens.muted}
              multiline
              numberOfLines={5}
              maxLength={2000}
              accessibilityLabel="Descrição do anúncio"
              style={[s.textarea, { borderColor: tokens.border, backgroundColor: tokens.bg, color: tokens.text }]}
              textAlignVertical="top"
            />
            <Text style={[s.counter, { color: tokens.muted }]}>{description.length}/2000</Text>
          </View>

          {/* Categoria — fonte: ItemForm.tsx linhas 615-629 */}
          <View style={s.field}>
            <Text style={[s.label, { color: tokens.text }]}>
              Categoria <Text style={{ color: tokens.error }}>*</Text>
            </Text>
            {categories.length === 0 ? (
              <View style={[s.loadingRow, { borderColor: tokens.border, backgroundColor: tokens.surface }]}>
                <ActivityIndicator size="small" color={tokens.green} />
              </View>
            ) : (
              <View style={s.chipWrap}>
                {categories.map((cat) => {
                  const active = categoryId === cat.id
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => { setCategoryId(cat.id); setError(null) }}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={cat.name}
                      style={[
                        s.chip,
                        active
                          ? { borderColor: tokens.green, backgroundColor: `${tokens.green}12` }
                          : { borderColor: tokens.border, backgroundColor: tokens.surface },
                      ]}
                    >
                      <Text style={[s.chipText, { color: active ? tokens.green : tokens.text }]}>
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            )}
          </View>

          {/* Estado de conservação — fonte: ItemForm.tsx linhas 630-641 */}
          <View style={s.field}>
            <Text style={[s.label, { color: tokens.text }]}>
              Estado de conservação <Text style={{ color: tokens.error }}>*</Text>
            </Text>
            <View style={s.conditionRow}>
              {CONDITIONS.map((c) => {
                const active = condition === c
                return (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setCondition(c)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={CONDITION_LABELS[c]}
                    style={[
                      s.conditionChip,
                      active
                        ? { borderColor: tokens.green, backgroundColor: `${tokens.green}12` }
                        : { borderColor: tokens.border, backgroundColor: tokens.surface },
                    ]}
                  >
                    <Text style={[s.conditionText, { color: active ? tokens.green : tokens.muted }]}>
                      {CONDITION_LABELS[c]}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>

          {/* Voltagem — condicional para categorias elétricas */}
          {/* Fonte: ItemForm.tsx linhas 643-662 (ELECTRICAL_CATEGORIES) */}
          {isElectrical && (
            <View style={s.field}>
              <Text style={[s.label, { color: tokens.text }]}>Voltagem</Text>
              <View style={s.voltageRow}>
                {(["", "110V", "220V", "Bivolt"] as const).map((v) => {
                  const label = v === "" ? "Não informado" : v === "Bivolt" ? "Bivolt (110V/220V)" : v
                  const active = voltage === v
                  return (
                    <TouchableOpacity
                      key={v}
                      onPress={() => setVoltage(v)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={label}
                      style={[
                        s.voltageChip,
                        active
                          ? { borderColor: tokens.green, backgroundColor: `${tokens.green}12` }
                          : { borderColor: tokens.border, backgroundColor: tokens.surface },
                      ]}
                    >
                      <Text style={[s.voltageText, { color: active ? tokens.green : tokens.muted }]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>
          )}
        </View>

        {/* ══════════════════════════════════════════════════════════════════
            SEÇÃO: Preços
            Fonte: ItemForm.tsx linhas 665-812
        ══════════════════════════════════════════════════════════════════ */}
        <View style={[s.section, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
          <Text style={[s.sectionTitle, { color: tokens.navy }]}>Preços</Text>

          {/* Valor de compra estimado — fonte: ItemForm.tsx linhas 670-685 */}
          <View style={s.field}>
            <Text style={[s.label, { color: tokens.text }]}>Valor de compra estimado</Text>
            <View style={[s.priceRow, { borderColor: tokens.border, backgroundColor: tokens.bg }]}>
              <Text style={[s.currencyPrefix, { color: tokens.muted }]}>R$</Text>
              <TextInput
                value={estimatedRetailPrice}
                onChangeText={(v) => {
                  const raw = v.replace(/[^0-9,]/g, "")
                  setEstimatedRetailPrice(raw)
                }}
                onEndEditing={() => applyRetailSuggestion(estimatedRetailPrice)}
                placeholder="0,00"
                placeholderTextColor={tokens.muted}
                keyboardType="decimal-pad"
                accessibilityLabel="Valor de compra estimado"
                style={[s.priceInput, { color: tokens.text }]}
              />
            </View>
            {/* Fonte: ItemForm.tsx linha 678 */}
            <Text style={[s.helper, { color: tokens.muted }]}>
              Preencha para calcular automaticamente a diária sugerida
            </Text>
            {priceSuggestion && (
              <Text style={[s.helper, { color: tokens.green }]}>
                💡 Sugestão: diária de{" "}
                <Text style={{ fontWeight: "700" }}>{fmtPct(priceSuggestion.minRate)} a {fmtPct(priceSuggestion.maxRate)}</Text>
                {" "}do valor do bem
              </Text>
            )}
          </View>

          {/* Preço por dia — fonte: ItemForm.tsx linhas 688-728 */}
          <View style={s.field}>
            <Text style={[s.label, { color: tokens.text }]}>
              Preço por dia <Text style={{ color: tokens.error }}>*</Text>
            </Text>
            <View style={[s.priceRow, { borderColor: tokens.border, backgroundColor: tokens.bg }]}>
              <Text style={[s.currencyPrefix, { color: tokens.muted }]}>R$</Text>
              <TextInput
                value={pricePerDay}
                onChangeText={handleDayChange}
                placeholder="0,00"
                placeholderTextColor={tokens.muted}
                keyboardType="decimal-pad"
                accessibilityLabel="Preço por dia"
                style={[s.priceInput, { color: tokens.text }]}
              />
            </View>
            {priceSuggestion && parseBRL(estimatedRetailPrice) > 0 && (
              <Text style={[s.helper, { color: tokens.muted }]}>
                {"Faixa sugerida: "}
                <Text style={{ color: tokens.text, fontWeight: "600" }}>
                  R$ {(parseBRL(estimatedRetailPrice) * priceSuggestion.minRate / 100).toFixed(2).replace(".", ",")}
                  {" – "}
                  R$ {(parseBRL(estimatedRetailPrice) * priceSuggestion.maxRate / 100).toFixed(2).replace(".", ",")}
                </Text>
                {" "}({fmtPct(priceSuggestion.minRate)}–{fmtPct(priceSuggestion.maxRate)} do valor)
              </Text>
            )}
          </View>

          {/* Preço por semana — fonte: ItemForm.tsx linhas 730-768 */}
          <View style={s.field}>
            <Text style={[s.label, { color: tokens.text }]}>Preço por semana</Text>
            <View style={[s.priceRow, { borderColor: tokens.border, backgroundColor: tokens.bg }]}>
              <Text style={[s.currencyPrefix, { color: tokens.muted }]}>R$</Text>
              <TextInput
                value={pricePerWeek}
                onChangeText={(v) => { setPricePerWeek(v); setWeekTouched(true) }}
                placeholder="Opcional"
                placeholderTextColor={tokens.muted}
                keyboardType="decimal-pad"
                accessibilityLabel="Preço por semana (opcional)"
                style={[s.priceInput, { color: tokens.text }]}
              />
            </View>
            {weekSuggestStr.length > 0 && (
              <View style={s.suggestRow}>
                <Text style={[s.suggestText, { color: tokens.muted }]}>
                  Sugerido: R$ {weekSuggestStr}
                  <Text style={s.suggestNote}> ({weeklyMultiplier}× diária) — Desconto para locações ≥ 7 dias</Text>
                </Text>
                {!weekMatches && (
                  <TouchableOpacity
                    onPress={autoWeekly}
                    accessibilityRole="button"
                    accessibilityLabel={`${parseBRL(pricePerWeek) > 0 ? "Recalcular" : "Aplicar"} preço semanal`}
                  >
                    <Text style={[s.applyBtn, { color: tokens.green }]}>
                      {parseBRL(pricePerWeek) > 0 ? "Recalcular" : "Aplicar"} ({weeklyMultiplier}× diária = R$ {weekSuggestStr})
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* Preço por mês — fonte: ItemForm.tsx linhas 771-808 */}
          <View style={s.field}>
            <Text style={[s.label, { color: tokens.text }]}>Preço por mês</Text>
            <View style={[s.priceRow, { borderColor: tokens.border, backgroundColor: tokens.bg }]}>
              <Text style={[s.currencyPrefix, { color: tokens.muted }]}>R$</Text>
              <TextInput
                value={pricePerMonth}
                onChangeText={(v) => { setPricePerMonth(v); setMonthTouched(true) }}
                placeholder="Opcional"
                placeholderTextColor={tokens.muted}
                keyboardType="decimal-pad"
                accessibilityLabel="Preço por mês (opcional)"
                style={[s.priceInput, { color: tokens.text }]}
              />
            </View>
            {monthSuggestStr.length > 0 && (
              <View style={s.suggestRow}>
                <Text style={[s.suggestText, { color: tokens.muted }]}>
                  Sugerido: R$ {monthSuggestStr}
                  <Text style={s.suggestNote}> ({monthlyMultiplier}× diária) — Desconto para locações ≥ 30 dias</Text>
                </Text>
                {!monthMatches && (
                  <TouchableOpacity
                    onPress={autoMonthly}
                    accessibilityRole="button"
                    accessibilityLabel={`${parseBRL(pricePerMonth) > 0 ? "Recalcular" : "Aplicar"} preço mensal`}
                  >
                    <Text style={[s.applyBtn, { color: tokens.green }]}>
                      {parseBRL(pricePerMonth) > 0 ? "Recalcular" : "Aplicar"} ({monthlyMultiplier}× diária = R$ {monthSuggestStr})
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>

        {/* ══════════════════════════════════════════════════════════════════
            SEÇÃO: Localização (read-only do perfil)
            Fonte: ItemForm.tsx linhas 814-942
        ══════════════════════════════════════════════════════════════════ */}
        <View style={[s.section, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
          <Text style={[s.sectionTitle, { color: tokens.navy }]}>Localização</Text>

          {/* Banner endereço do perfil — fonte: ItemForm.tsx linhas 819-831 */}
          {profile?.city ? (
            <View style={[s.infoBanner, { borderColor: `${tokens.green}33`, backgroundColor: `${tokens.green}08` }]}>
              <Text style={[s.infoBannerText, { color: tokens.green }]}>
                Endereço do seu perfil. Para alterar,{" "}
                <Text
                  onPress={() => router.push("/(tabs)/perfil" as never)}
                  style={[s.infoBannerLink, { color: tokens.green }]}
                >
                  edite seu endereço no perfil
                </Text>.
              </Text>
            </View>
          ) : (
            <View style={[s.warnBanner, { borderColor: mode === "dark" ? "#92400E66" : "#F59E0B33", backgroundColor: mode === "dark" ? "#2A1A00" : "#FFFBEB" }]}>
              <Text style={[s.warnBannerText, { color: mode === "dark" ? "#FBBF77" : "#92400E" }]}>
                Você ainda não tem um endereço cadastrado.{" "}
                <Text
                  onPress={() => router.push("/(tabs)/perfil" as never)}
                  style={[s.warnBannerLink, { color: mode === "dark" ? "#FBBF77" : "#92400E" }]}
                >
                  Cadastre seu endereço no perfil
                </Text>
                {" "}para que ele apareça automaticamente em todos os seus anúncios.
              </Text>
            </View>
          )}

          {/* Campo de localização — read-only */}
          <View
            style={[s.locationField, { borderColor: tokens.border, backgroundColor: `${tokens.muted}14` }]}
            accessible
            accessibilityLabel="Localização do anúncio"
          >
            {profile?.city ? (
              <Text style={[s.locationText, { color: tokens.text }]}>
                {[profile.neighborhood, profile.city, profile.state].filter(Boolean).join(", ")}
              </Text>
            ) : (
              <Text style={[s.locationPlaceholder, { color: tokens.muted }]}>
                Complete seu endereço no Perfil para poder anunciar
              </Text>
            )}
          </View>

          {/* TODO(revisão): status de geocoding em tempo real omitido.
              O backend faz geocoding via after() (fire-and-forget) quando lat=0/lng=0.
              Para mostrar status, precisaríamos de polling ou WebSocket — fora do escopo atual.
              Ver ItemForm.tsx linhas 854-878 para referência do site. */}
        </View>

        {/* ══════════════════════════════════════════════════════════════════
            SEÇÃO: Fotos
            Fonte: ItemForm.tsx linhas 944-1048
        ══════════════════════════════════════════════════════════════════ */}
        <View style={[s.section, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
          {/* Cabeçalho com contador — fonte: ItemForm.tsx linhas 946-949 */}
          <View style={s.photoHeader}>
            <Text style={[s.sectionTitle, { color: tokens.navy }]}>Fotos</Text>
            <Text style={[s.photoCount, { color: tokens.muted }]}>{photos.length}/3</Text>
          </View>

          {/* Grid de fotos + botão de adicionar — fonte: ItemForm.tsx linhas 951-1010 */}
          <View style={s.photoGrid}>
            {photos.map((p, i) => (
              <View key={i} style={s.photoThumb}>
                <Image source={{ uri: p.uri }} style={s.photoImg} resizeMode="cover" />
                {i === 0 && (
                  <View style={s.coverBadge}>
                    <Text style={s.coverBadgeText}>Capa</Text>
                  </View>
                )}
                <TouchableOpacity
                  onPress={() => handleRemovePhoto(i)}
                  accessibilityLabel={`Remover foto ${i + 1}`}
                  accessibilityRole="button"
                  style={s.photoRemoveBtn}
                >
                  <RemoveIcon color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ))}

            {/* Área de adicionar foto (câmera + galeria) — fonte: ItemForm.tsx linhas 979-1009 */}
            {photos.length < 3 && (
              <View style={[s.addPhotoBox, { borderColor: tokens.border, backgroundColor: tokens.surface }]}>
                {/* Botão Câmera */}
                <TouchableOpacity
                  onPress={handleCamera}
                  accessibilityRole="button"
                  accessibilityLabel="Tirar foto com a câmera"
                  style={s.photoSourceBtn}
                >
                  <CameraIcon color={tokens.muted} />
                  <Text style={[s.photoSourceLabel, { color: tokens.muted }]}>Câmera</Text>
                </TouchableOpacity>

                {/* Divisor */}
                <View style={[s.photoDivider, { backgroundColor: tokens.border }]} />

                {/* Botão Galeria */}
                <TouchableOpacity
                  onPress={handleGallery}
                  accessibilityRole="button"
                  accessibilityLabel="Escolher da galeria"
                  style={s.photoSourceBtn}
                >
                  <GalleryIcon color={tokens.muted} />
                  <Text style={[s.photoSourceLabel, { color: tokens.muted }]}>Galeria</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Texto de limite de formato/tamanho — fonte: ItemForm.tsx linhas 1030-1032 */}
          <Text style={[s.helper, { color: tokens.muted }]}>
            Máximo 10 MB por foto · JPEG, PNG, WebP ou HEIC
          </Text>

          {/* Dica geral de fotos — fonte: ItemForm.tsx linha 1034 (FIELD_TIPS.photos) */}
          <Text style={[s.helper, { color: tokens.green }]}>
            Anúncios com 3 fotos recebem 4× mais contatos.
          </Text>

          {/* Dicas colapsáveis — fonte: ItemForm.tsx linhas 1036-1047 (<details>) */}
          <TouchableOpacity
            onPress={() => setTipsExpanded((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={tipsExpanded ? "Ocultar dicas de fotografia" : "Ver dicas para fotos que convertem mais"}
            style={s.tipsToggle}
          >
            <Text style={[s.tipsToggleText, { color: tokens.muted }]}>
              Dicas para fotos que convertem mais {tipsExpanded ? "▴" : "▾"}
            </Text>
          </TouchableOpacity>

          {tipsExpanded && (
            <View style={s.tipsList}>
              {[
                "Use luz natural — abra janelas e evite flash direto",
                "Fotografe de múltiplos ângulos: frente, lateral, detalhe e uso em escala",
                "Fundo neutro ou organizado transmite mais confiança",
                "Inclua todos os acessórios que acompanham o item",
                "Evite filtros excessivos — o item deve parecer exatamente como é",
              ].map((tip, i) => (
                <View key={i} style={s.tipItem}>
                  <Text style={[s.tipBullet, { color: tokens.muted }]}>•</Text>
                  <Text style={[s.tipText, { color: tokens.muted }]}>{tip}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ══════════════════════════════════════════════════════════════════
            SEÇÃO: Requisitos para reserva
            Fonte: ItemForm.tsx linhas 1050-1098
        ══════════════════════════════════════════════════════════════════ */}
        <View style={[s.section, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
          <View style={s.field}>
            <Text style={[s.sectionTitle, { color: tokens.navy }]}>Requisitos para reserva</Text>
            {/* Subtítulo — fonte: ItemForm.tsx linhas 1054-1056 */}
            <Text style={[s.helper, { color: tokens.muted }]}>
              Defina o que os locatários precisam ter para alugar este item. Aumenta a confiança e reduz riscos.
            </Text>
          </View>

          {/* Identidade verificada — fonte: ItemForm.tsx linhas 1060-1077 */}
          <TouchableOpacity
            onPress={() => setRequireIdVerification((v) => !v)}
            accessibilityRole="checkbox"
            accessibilityLabel="Identidade verificada"
            accessibilityState={{ checked: requireIdVerification }}
            style={s.requireRow}
          >
            <View style={[
              s.checkbox,
              requireIdVerification
                ? { borderColor: tokens.green, backgroundColor: tokens.green }
                : { borderColor: tokens.border, backgroundColor: tokens.surface },
            ]}>
              {requireIdVerification && (
                <Text style={s.checkmark}>✓</Text>
              )}
            </View>
            <View style={s.requireInfo}>
              <Text style={[s.requireTitle, { color: tokens.text }]}>Identidade verificada</Text>
              {/* Fonte: ItemForm.tsx linhas 1073-1076 */}
              <Text style={[s.requireDesc, { color: tokens.muted }]}>
                O locatário deve ter enviado e aprovado documento de identidade. Recomendado para itens de alto valor.
              </Text>
            </View>
          </TouchableOpacity>

          {/* Telefone cadastrado — fonte: ItemForm.tsx linhas 1079-1096 */}
          <TouchableOpacity
            onPress={() => setRequirePhone((v) => !v)}
            accessibilityRole="checkbox"
            accessibilityLabel="Telefone cadastrado"
            accessibilityState={{ checked: requirePhone }}
            style={s.requireRow}
          >
            <View style={[
              s.checkbox,
              requirePhone
                ? { borderColor: tokens.green, backgroundColor: tokens.green }
                : { borderColor: tokens.border, backgroundColor: tokens.surface },
            ]}>
              {requirePhone && (
                <Text style={s.checkmark}>✓</Text>
              )}
            </View>
            <View style={s.requireInfo}>
              <Text style={[s.requireTitle, { color: tokens.text }]}>Telefone cadastrado</Text>
              {/* Fonte: ItemForm.tsx linhas 1092-1095 */}
              <Text style={[s.requireDesc, { color: tokens.muted }]}>
                O locatário deve ter um número de telefone no perfil para permitir contato direto.
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* TODO(revisão): ListingQualityIndicator e ItemCardPreview omitidos.
            São componentes React DOM puros (JSX com className, next/image) e não
            podem ser reutilizados em React Native. Uma versão native seria feature
            nova, fora da regra de transcrição. Documentado no PR. */}

      </ScrollView>

      {/* ── CTA fixo — fonte: ItemForm.tsx linhas 1101-1118 ── */}
      <View style={[s.cta, { borderTopColor: tokens.border, backgroundColor: tokens.surface, paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          onPress={() => {
            setError(null)
            createItem.mutate()
          }}
          disabled={isSubmitting}
          accessibilityRole="button"
          accessibilityLabel={photos.length > 0 ? "Publicar anúncio" : "Criar rascunho"}
          accessibilityState={{ disabled: isSubmitting }}
          style={[s.ctaBtn, { backgroundColor: isSubmitting ? `${tokens.green}80` : tokens.green }]}
        >
          {isSubmitting ? (
            <View style={s.ctaLoading}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={s.ctaBtnText}>
                {photos.length > 0 ? "Enviando fotos..." : "Criando anúncio..."}
              </Text>
            </View>
          ) : (
            <Text style={s.ctaBtnText}>
              {photos.length > 0 ? "Publicar anúncio" : "Criar rascunho"}
            </Text>
          )}
        </TouchableOpacity>
        {/* Fonte: ItemForm.tsx linha 1116 (modo create → "Publicar anúncio") */}
        <Text style={[s.ctaNote, { color: tokens.muted }]}>
          Anúncio revisado pela equipe ShareO antes de ir ao ar
        </Text>
      </View>

    </View>
  )
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
// Padrão StyleSheet + tokens do redesign (ver apps/mobile/app/(tabs)/index.tsx)

function makeStyles(tokens: Tokens) {
  return StyleSheet.create({
    root:     { flex: 1 },
    center:   { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
    lockIcon: { fontSize: 48 },
    lockTitle:{ marginTop: 12, fontSize: 16, fontWeight: "600", color: tokens.navy, textAlign: "center" },
    loginBtn: { marginTop: 24, backgroundColor: tokens.green, paddingHorizontal: 32, paddingVertical: 12, borderRadius: 12 },
    loginBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },

    header: {
      flexDirection: "row", alignItems: "center", gap: 12,
      borderBottomWidth: 1, paddingHorizontal: 16, paddingBottom: 12,
    },
    backBtn:     { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
    backArrow:   { fontSize: 28 },
    headerTitle: { flex: 1, fontSize: 18, fontWeight: "700" },

    scroll:   { flex: 1 },
    content:  { padding: 16, gap: 12 },

    errorBanner: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 4 },
    errorText:   { fontSize: 14 },

    section: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 12 },
    sectionTitle: { fontSize: 16, fontWeight: "700" },

    field: { gap: 6 },
    label: { fontSize: 13, fontWeight: "600" },
    helper: { fontSize: 11 },
    counter: { fontSize: 10, textAlign: "right" },

    input: {
      minHeight: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12,
      paddingVertical: 10, fontSize: 14,
    },
    textarea: {
      minHeight: 100, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12,
      paddingVertical: 10, fontSize: 14,
    },

    loadingRow: { minHeight: 44, alignItems: "center", justifyContent: "center", borderWidth: 1, borderRadius: 10 },

    chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: { minHeight: 44, alignItems: "center", justifyContent: "center", borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
    chipText: { fontSize: 13, fontWeight: "600" },

    conditionRow: { flexDirection: "row", gap: 8 },
    conditionChip: { flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", borderWidth: 1, borderRadius: 10, paddingVertical: 8 },
    conditionText: { fontSize: 12, fontWeight: "600" },

    voltageRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    voltageChip: { minHeight: 40, alignItems: "center", justifyContent: "center", borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
    voltageText: { fontSize: 12, fontWeight: "500" },

    priceRow: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, minHeight: 44 },
    currencyPrefix: { fontSize: 14, marginRight: 4 },
    priceInput: { flex: 1, minHeight: 44, fontSize: 14 },

    suggestRow: { gap: 2 },
    suggestText: { fontSize: 11 },
    suggestNote: { fontSize: 10, opacity: 0.7 },
    applyBtn:    { fontSize: 11, textDecorationLine: "underline", marginTop: 2 },

    infoBanner:     { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
    infoBannerText: { fontSize: 12 },
    infoBannerLink: { fontWeight: "700", textDecorationLine: "underline" },
    warnBanner:     { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
    warnBannerText: { fontSize: 12 },
    warnBannerLink: { fontWeight: "700", textDecorationLine: "underline" },

    locationField:       { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, minHeight: 44, justifyContent: "center" },
    locationText:        { fontSize: 14 },
    locationPlaceholder: { fontSize: 14, fontStyle: "italic" },

    photoHeader:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    photoCount:   { fontSize: 12 },
    photoGrid:    { flexDirection: "row", flexWrap: "wrap", gap: 8 },

    photoThumb:    { width: 96, height: 96, borderRadius: 10, overflow: "hidden", position: "relative" },
    photoImg:      { width: 96, height: 96 },
    coverBadge:    { position: "absolute", left: 4, top: 4, borderRadius: 3, backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 5, paddingVertical: 2 },
    coverBadgeText:{ color: "#FFFFFF", fontSize: 10 },
    photoRemoveBtn:{ position: "absolute", right: 4, top: 4, width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center" },

    addPhotoBox:   { width: 96, height: 96, borderWidth: 2, borderStyle: "dashed", borderRadius: 10, alignItems: "center", justifyContent: "center", gap: 0 },
    photoSourceBtn:{ alignItems: "center", paddingHorizontal: 8, paddingVertical: 4, gap: 2, minHeight: 36 },
    photoSourceLabel: { fontSize: 10, fontWeight: "500" },
    photoDivider:  { width: 32, height: 1 },

    tipsToggle:     { paddingVertical: 4 },
    tipsToggleText: { fontSize: 12, fontWeight: "500" },
    tipsList:       { gap: 4, marginTop: 4 },
    tipItem:        { flexDirection: "row", gap: 6 },
    tipBullet:      { fontSize: 12 },
    tipText:        { fontSize: 12, flex: 1 },

    requireRow:  { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 4 },
    checkbox:    { width: 18, height: 18, borderWidth: 1, borderRadius: 4, alignItems: "center", justifyContent: "center", marginTop: 2 },
    checkmark:   { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
    requireInfo: { flex: 1, gap: 2 },
    requireTitle:{ fontSize: 14, fontWeight: "600" },
    requireDesc: { fontSize: 12 },

    cta:     { borderTopWidth: 1, paddingHorizontal: 16, paddingTop: 12 },
    ctaBtn:  { minHeight: 52, alignItems: "center", justifyContent: "center", borderRadius: 12 },
    ctaLoading: { flexDirection: "row", alignItems: "center", gap: 8 },
    ctaBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
    ctaNote: { marginTop: 8, textAlign: "center", fontSize: 12 },
  })
}
