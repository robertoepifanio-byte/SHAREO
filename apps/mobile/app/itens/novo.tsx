/**
 * AnunciarScreen — apps/mobile/app/itens/novo.tsx
 *
 * Tela de criação de anúncio para proprietários (PF).
 * Fluxo:
 *  1. Usuário preenche título, descrição, categoria, condição e preços
 *  2. Endereço vem do perfil (campos read-only, como no web)
 *  3. POST /api/items → cria item em DRAFT
 *  4. Upload de fotos → POST /api/items/[id]/images (1 foto por vez)
 *  5. Primeira foto promove DRAFT → AVAILABLE
 *  6. Navega para detalhe do item ao concluir
 *
 * Reutiliza /api/categories e /api/items (com resolveUserId — Bearer aceito).
 * Endereço pré-preenchido de /api/users/me.
 */
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native"
import { useState, useCallback } from "react"
import { router } from "expo-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import * as ImagePicker from "expo-image-picker"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { apiFetch, API_URL, getTokens } from "@/lib/api"
import { useAuth } from "@/lib/auth"

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

interface UploadImageResponse {
  data: { id: string; url: string; order: number; itemStatus: string }
}

type Condition = "NEW" | "EXCELLENT" | "GOOD" | "FAIR"

const CONDITION_LABELS: Record<Condition, string> = {
  NEW:       "Novo",
  EXCELLENT: "Seminovo",
  GOOD:      "Bom estado",
  FAIR:      "Regular",
}

const CONDITIONS: Condition[] = ["NEW", "EXCELLENT", "GOOD", "FAIR"]

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Converte valor de texto ("35,50") em centavos inteiros (3550). Retorna 0 se inválido. */
function parseBRL(v: string): number {
  const cleaned = v.replace(/[^\d,]/g, "").replace(",", ".")
  const n = parseFloat(cleaned)
  return isNaN(n) ? 0 : Math.round(n * 100)
}

/** Formata centavos (3500) como "35,00" para exibição em TextInput. */
function fmtInputBRL(cents: number): string {
  if (cents === 0) return ""
  return (cents / 100).toFixed(2).replace(".", ",")
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function AnunciarScreen() {
  const insets = useSafeAreaInsets()
  const user   = useAuth((s) => s.user)
  const qc     = useQueryClient()

  // ── Dados de formulário ──────────────────────────────────────────────────
  const [title,        setTitle]        = useState("")
  const [description,  setDescription]  = useState("")
  const [categoryId,   setCategoryId]   = useState("")
  const [condition,    setCondition]    = useState<Condition>("GOOD")
  const [pricePerDay,  setPricePerDay]  = useState("")   // texto BRL ex.: "35,00"
  const [pricePerWeek, setPricePerWeek] = useState("")
  const [pricePerMonth,setPricePerMonth]= useState("")
  const [photos,       setPhotos]       = useState<ImagePicker.ImagePickerAsset[]>([])
  const [error,        setError]        = useState<string | null>(null)

  // ── Busca categorias ─────────────────────────────────────────────────────
  const { data: catData } = useQuery({
    queryKey: ["categories"],
    queryFn:  () => apiFetch<{ data: Category[] }>("/api/categories"),
    staleTime: 5 * 60_000,
  })
  const categories = catData?.data ?? []

  // ── Busca perfil (endereço read-only) ────────────────────────────────────
  const { data: profileData } = useQuery({
    queryKey: ["me"],
    queryFn:  () => apiFetch<{ data: UserProfile }>("/api/users/me"),
    enabled:  !!user,
  })
  const profile = profileData?.data

  // ── Seleção de fotos ─────────────────────────────────────────────────────
  const handlePickPhoto = useCallback(async () => {
    if (photos.length >= 8) {
      Alert.alert("Limite atingido", "Você pode adicionar até 8 fotos.")
      return
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== "granted") {
      Alert.alert("Permissão negada", "Precisamos de acesso à galeria para adicionar fotos.")
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: 8 - photos.length,
      quality: 0.8,
    })
    if (!result.canceled) {
      setPhotos((prev) => [...prev, ...result.assets].slice(0, 8))
    }
  }, [photos.length])

  const handleRemovePhoto = (idx: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx))
  }

  // ── Upload de uma foto ───────────────────────────────────────────────────
  async function uploadPhoto(itemId: string, asset: ImagePicker.ImagePickerAsset): Promise<void> {
    const tokens = await getTokens()
    const formData = new FormData()

    // React Native FormData aceita objetos { uri, name, type }
    formData.append("file", {
      uri:  asset.uri,
      name: `photo-${Date.now()}.jpg`,
      type: asset.mimeType ?? "image/jpeg",
    } as unknown as Blob)

    const res = await fetch(`${API_URL}/api/items/${itemId}/images`, {
      method:  "POST",
      headers: {
        ...(tokens ? { Authorization: `Bearer ${tokens.accessToken}` } : {}),
        // NÃO definir Content-Type: boundary é gerado automaticamente pelo RN fetch
      },
      body: formData,
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body?.error?.message ?? `Upload falhou (${res.status})`)
    }

    const json = await res.json() as UploadImageResponse
    return void json
  }

  // ── Mutação de criação ───────────────────────────────────────────────────
  const createItem = useMutation({
    mutationFn: async () => {
      const priceDay   = parseBRL(pricePerDay)
      const priceWeek  = parseBRL(pricePerWeek)
      const priceMonth = parseBRL(pricePerMonth)

      // Validação básica client-side (server valida com Zod)
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

      // 1. Criar item (DRAFT)
      const createRes = await apiFetch<CreateItemResponse>("/api/items", {
        method: "POST",
        body: JSON.stringify({
          title:         title.trim(),
          description:   description.trim(),
          categoryId,
          condition,
          pricePerDay:   priceDay,
          pricePerWeek:  priceWeek > 0  ? priceWeek  : null,
          pricePerMonth: priceMonth > 0 ? priceMonth : null,
          city:          profile.city,
          state:         profile.state,
          neighborhood:  profile.neighborhood ?? undefined,
          address:       profile.street ?? undefined,
          // Coordenadas zeradas → geocoding via fire-and-forget no backend
          latitude:  0,
          longitude: 0,
        }),
      })

      const itemId = createRes.data.id

      // 2. Upload de fotos (sequencial para evitar race condition na ordem)
      for (const photo of photos) {
        await uploadPhoto(itemId, photo)
      }

      return itemId
    },
    onSuccess: (itemId) => {
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
      setError(e instanceof Error ? e.message : "Erro ao criar anúncio.")
    },
  })

  // ── Guards de autenticação ───────────────────────────────────────────────
  if (!user) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6" style={{ paddingTop: insets.top }}>
        <Text className="text-5xl">🔒</Text>
        <Text className="mt-3 text-base font-semibold text-primary">Faça login para anunciar</Text>
        <TouchableOpacity
          className="mt-6 rounded-xl bg-brand px-8 py-3"
          onPress={() => router.push("/(auth)/login")}
        >
          <Text className="font-bold text-white">Entrar</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const isSubmitting = createItem.isPending

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View
        className="flex-row items-center gap-3 border-b border-border bg-surface px-4 pb-3"
        style={{ paddingTop: insets.top + 8 }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityLabel="Voltar"
          accessibilityRole="button"
          className="min-h-[44px] min-w-[44px] items-center justify-center"
        >
          <Text className="text-2xl text-muted">‹</Text>
        </TouchableOpacity>
        <Text className="flex-1 text-lg font-bold text-primary">Anunciar item</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>

        {/* ── Título ── */}
        <View className="mb-4">
          <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600">
            Título <Text className="text-red-500">*</Text>
          </Text>
          <TextInput
            value={title}
            onChangeText={(v) => { setTitle(v); setError(null) }}
            placeholder="Ex.: Furadeira Bosch com maleta"
            placeholderTextColor="#9CA3AF"
            maxLength={120}
            accessibilityLabel="Título do anúncio"
            className="min-h-[44px] rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
          />
          <Text className="mt-0.5 text-right text-[10px] text-muted">{title.length}/120</Text>
        </View>

        {/* ── Descrição ── */}
        <View className="mb-4">
          <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600">
            Descrição <Text className="text-red-500">*</Text>
          </Text>
          <TextInput
            value={description}
            onChangeText={(v) => { setDescription(v); setError(null) }}
            placeholder="Descreva o item, acessórios inclusos, estado de conservação..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
            maxLength={2000}
            accessibilityLabel="Descrição do anúncio"
            className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
            style={{ textAlignVertical: "top", minHeight: 100 }}
          />
          <Text className="mt-0.5 text-right text-[10px] text-muted">{description.length}/2000</Text>
        </View>

        {/* ── Categoria ── */}
        <View className="mb-4">
          <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600">
            Categoria <Text className="text-red-500">*</Text>
          </Text>
          {categories.length === 0 ? (
            <View className="min-h-[44px] items-center justify-center rounded-xl border border-border bg-surface">
              <ActivityIndicator size="small" color="#007B3C" />
            </View>
          ) : (
            <View className="flex-row flex-wrap gap-2">
              {categories.map((cat) => {
                const active = categoryId === cat.id
                return (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => { setCategoryId(cat.id); setError(null) }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={cat.name}
                    className={[
                      "min-h-[44px] items-center justify-center rounded-xl border px-4 py-2",
                      active ? "border-brand bg-emerald-50" : "border-border bg-surface",
                    ].join(" ")}
                  >
                    <Text className={["text-sm font-semibold", active ? "text-brand" : "text-foreground"].join(" ")}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          )}
        </View>

        {/* ── Condição ── */}
        <View className="mb-4">
          <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600">
            Estado de conservação <Text className="text-red-500">*</Text>
          </Text>
          <View className="flex-row gap-2">
            {CONDITIONS.map((c) => {
              const active = condition === c
              return (
                <TouchableOpacity
                  key={c}
                  onPress={() => setCondition(c)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={CONDITION_LABELS[c]}
                  className={[
                    "min-h-[44px] flex-1 items-center justify-center rounded-xl border py-2",
                    active ? "border-brand bg-emerald-50" : "border-border bg-surface",
                  ].join(" ")}
                >
                  <Text className={["text-xs font-semibold", active ? "text-brand" : "text-muted"].join(" ")}>
                    {CONDITION_LABELS[c]}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* ── Preços ── */}
        <View className="mb-4">
          <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600">
            Preços
          </Text>
          <View className="rounded-xl border border-border bg-surface p-4 gap-3">
            {/* Diária (obrigatória) */}
            <View className="flex-row items-center gap-3">
              <Text className="w-24 text-sm font-semibold text-foreground">
                Diária <Text className="text-red-500">*</Text>
              </Text>
              <View className="flex-1 flex-row items-center gap-1 rounded-lg border border-border bg-background px-3">
                <Text className="text-sm text-muted">R$</Text>
                <TextInput
                  value={pricePerDay}
                  onChangeText={(v) => { setPricePerDay(v); setError(null) }}
                  placeholder="35,00"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="decimal-pad"
                  accessibilityLabel="Preço por dia"
                  className="min-h-[44px] flex-1 text-sm text-foreground"
                />
              </View>
            </View>
            {/* Semanal (opcional) */}
            <View className="flex-row items-center gap-3">
              <Text className="w-24 text-sm text-muted">Semanal</Text>
              <View className="flex-1 flex-row items-center gap-1 rounded-lg border border-border bg-background px-3">
                <Text className="text-sm text-muted">R$</Text>
                <TextInput
                  value={pricePerWeek}
                  onChangeText={setPricePerWeek}
                  placeholder="Opcional"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="decimal-pad"
                  accessibilityLabel="Preço por semana (opcional)"
                  className="min-h-[44px] flex-1 text-sm text-foreground"
                />
              </View>
            </View>
            {/* Mensal (opcional) */}
            <View className="flex-row items-center gap-3">
              <Text className="w-24 text-sm text-muted">Mensal</Text>
              <View className="flex-1 flex-row items-center gap-1 rounded-lg border border-border bg-background px-3">
                <Text className="text-sm text-muted">R$</Text>
                <TextInput
                  value={pricePerMonth}
                  onChangeText={setPricePerMonth}
                  placeholder="Opcional"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="decimal-pad"
                  accessibilityLabel="Preço por mês (opcional)"
                  className="min-h-[44px] flex-1 text-sm text-foreground"
                />
              </View>
            </View>
          </View>
          <Text className="mt-1 text-[11px] text-muted">
            Sugestão: diária ≈ 3–5% do valor do produto. Semana ≈ 3× diária.
          </Text>
        </View>

        {/* ── Endereço (read-only do perfil) ── */}
        <View className="mb-4">
          <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600">
            Localização (do seu perfil)
          </Text>
          <View
            className="min-h-[44px] justify-center rounded-xl border border-border bg-muted/20 px-4 py-3"
            accessibilityLabel="Localização do anúncio"
            accessible
          >
            {profile?.city ? (
              <Text className="text-sm text-foreground">
                {[profile.neighborhood, profile.city, profile.state].filter(Boolean).join(", ")}
              </Text>
            ) : (
              <Text className="text-sm text-muted italic">
                Complete seu endereço no Perfil para poder anunciar
              </Text>
            )}
          </View>
          {!profile?.city && (
            <TouchableOpacity
              className="mt-2 min-h-[44px] justify-center"
              onPress={() => router.push("/(tabs)/perfil" as never)}
              accessibilityRole="button"
              accessibilityLabel="Completar perfil"
            >
              <Text className="text-sm font-semibold text-brand">Completar perfil →</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Fotos ── */}
        <View className="mb-5">
          <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600">
            Fotos{" "}
            <Text className="font-normal normal-case text-[10px]">
              ({photos.length}/8 — a 1ª foto publica o anúncio)
            </Text>
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {/* Miniaturas das fotos selecionadas */}
            {photos.map((p, i) => (
              <View key={i} className="relative h-24 w-24 overflow-hidden rounded-xl">
                <Image source={{ uri: p.uri }} className="h-24 w-24" resizeMode="cover" />
                <TouchableOpacity
                  onPress={() => handleRemovePhoto(i)}
                  accessibilityLabel={`Remover foto ${i + 1}`}
                  accessibilityRole="button"
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  className="absolute right-1 top-1 h-6 w-6 items-center justify-center rounded-full bg-black/60"
                >
                  <Text className="text-xs font-bold text-white">×</Text>
                </TouchableOpacity>
              </View>
            ))}
            {/* Botão de adicionar */}
            {photos.length < 8 && (
              <TouchableOpacity
                onPress={handlePickPhoto}
                accessibilityRole="button"
                accessibilityLabel="Adicionar foto"
                className="h-24 w-24 items-center justify-center rounded-xl border-2 border-dashed border-brand/40 bg-surface"
              >
                <Text className="text-2xl text-brand">+</Text>
                <Text className="mt-0.5 text-[10px] text-brand">Foto</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text className="mt-1 text-[11px] text-muted">
            Anúncio sem foto fica como rascunho até a primeira foto ser enviada.
          </Text>
        </View>

        {/* ── Erro ── */}
        {error && (
          <View
            className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3"
            accessibilityRole="alert"
          >
            <Text className="text-sm text-red-700">{error}</Text>
          </View>
        )}

      </ScrollView>

      {/* ── CTA fixo ── */}
      <View
        className="border-t border-border bg-surface px-4 py-3"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <TouchableOpacity
          onPress={() => {
            setError(null)
            createItem.mutate()
          }}
          disabled={isSubmitting}
          accessibilityRole="button"
          accessibilityLabel="Publicar anúncio"
          accessibilityState={{ disabled: isSubmitting }}
          className={[
            "min-h-[52px] items-center justify-center rounded-xl",
            isSubmitting ? "bg-brand/50" : "bg-brand",
          ].join(" ")}
        >
          {isSubmitting ? (
            <View className="flex-row items-center gap-2">
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text className="text-base font-bold text-white">
                {photos.length > 0 ? "Enviando fotos..." : "Criando anúncio..."}
              </Text>
            </View>
          ) : (
            <Text className="text-base font-bold text-white">
              {photos.length > 0 ? "Publicar anúncio" : "Criar rascunho"}
            </Text>
          )}
        </TouchableOpacity>
        <Text className="mt-2 text-center text-xs text-muted">
          {photos.length > 0
            ? "Seu anúncio fica visível assim que publicado"
            : "Adicione uma foto para publicar o anúncio"}
        </Text>
      </View>
    </View>
  )
}
