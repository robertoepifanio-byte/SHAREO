// Fonte: app/perfil/endereco/page.tsx, app/perfil/endereco/_EnderecoForm.tsx

/**
 * EnderecoScreen — apps/mobile/app/perfil/endereco.tsx
 *
 * Tela nativa de edição de endereço.
 * Transcrição literal de app/perfil/endereco/_EnderecoForm.tsx para React Native.
 *
 * Recursos especiais:
 *  - Busca automática por CEP via ViaCEP (viacep.com.br) ao sair do campo
 *  - Botão GPS: expo-location (substitui navigator.geolocation do site) +
 *    reverse-geocode via API REST do Mapbox (fetch comum, mesmo do site)
 *  - Picker de estado com Modal nativo (substitui <select> HTML)
 *
 * Salvar: PATCH /api/users/me (Bearer via apiFetch).
 */
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from "react-native"
import { useState, useRef, useEffect } from "react"
import { router } from "expo-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import * as Location from "expo-location"
import { apiFetch } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useTheme } from "@/lib/theme"

// ─── Constantes ────────────────────────────────────────────────────────────────

const BR_STATES = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA",
  "MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN",
  "RO","RR","RS","SC","SE","SP","TO",
] as const

type BRState = typeof BR_STATES[number]

// ─── Tipos ─────────────────────────────────────────────────────────────────────

interface UserAddress {
  cep:          string | null
  street:       string | null
  city:         string | null
  state:        string | null
  neighborhood: string | null
}

interface ViaCepResponse {
  erro?:        boolean
  logradouro?:  string
  bairro?:      string
  uf?:          string
  localidade?:  string
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Formata CEP: XXXXX-XXX. Espelha maskCEP de lib/forms/masks.ts. */
function maskCEP(v: string): string {
  const digits = v.replace(/\D/g, "").slice(0, 8)
  if (digits.length <= 5) return digits
  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

/** Converte nome do estado (ex.: "Rio Grande do Norte") para sigla (ex.: "RN"). */
function stateAbbr(name: string): string {
  const map: Record<string, string> = {
    "Acre": "AC", "Alagoas": "AL", "Amapá": "AP", "Amazonas": "AM",
    "Bahia": "BA", "Ceará": "CE", "Distrito Federal": "DF", "Espírito Santo": "ES",
    "Goiás": "GO", "Maranhão": "MA", "Mato Grosso": "MT", "Mato Grosso do Sul": "MS",
    "Minas Gerais": "MG", "Pará": "PA", "Paraíba": "PB", "Paraná": "PR",
    "Pernambuco": "PE", "Piauí": "PI", "Rio de Janeiro": "RJ",
    "Rio Grande do Norte": "RN", "Rio Grande do Sul": "RS", "Rondônia": "RO",
    "Roraima": "RR", "Santa Catarina": "SC", "São Paulo": "SP", "Sergipe": "SE",
    "Tocantins": "TO",
  }
  return map[name] ?? name.slice(0, 2).toUpperCase()
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function EnderecoScreen() {
  const insets     = useSafeAreaInsets()
  const user       = useAuth((s) => s.user)
  const qc         = useQueryClient()
  const { tokens } = useTheme()

  // ── Estado do formulário ─────────────────────────────────────────────────
  const [cepVal,    setCepVal]    = useState("")
  const [streetVal, setStreetVal] = useState("")
  const [neighVal,  setNeighVal]  = useState("")
  const [cityVal,   setCityVal]   = useState("")
  const [stateVal,  setStateVal]  = useState("")

  const [initialized,  setInitialized]  = useState(false)
  const [cepLoading,   setCepLoading]   = useState(false)
  const [cepError,     setCepError]     = useState("")
  const [cepFilled,    setCepFilled]    = useState(false)
  const [gettingLoc,   setGettingLoc]   = useState(false)
  const [locError,     setLocError]     = useState("")
  const [saveError,    setSaveError]    = useState("")
  const [success,      setSuccess]      = useState(false)
  const [stateModal,   setStateModal]   = useState(false)

  // Evita busca duplicada se usuário sair/entrar no campo sem mudar o valor
  const lastFetchedCep = useRef("")

  // ── Busca dados atuais do perfil ─────────────────────────────────────────
  const { data: profileData, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn:  () => apiFetch<{ data: UserAddress }>("/api/users/me"),
    enabled:  !!user,
  })

  useEffect(() => {
    const addr = profileData?.data
    if (addr && !initialized) {
      const cep = addr.cep
      setCepVal(cep ? `${cep.slice(0, 5)}-${cep.slice(5)}` : "")
      setStreetVal(addr.street       ?? "")
      setNeighVal(addr.neighborhood  ?? "")
      setCityVal(addr.city           ?? "")
      setStateVal(addr.state         ?? "")
      setInitialized(true)
    }
  }, [profileData, initialized])

  // ── Busca ViaCEP ao sair do campo (onBlur) ───────────────────────────────
  async function handleCepBlur() {
    const digits = cepVal.replace(/\D/g, "")
    if (digits.length !== 8 || digits === lastFetchedCep.current) return

    setCepLoading(true)
    setCepError("")
    setCepFilled(false)
    try {
      const res  = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
      const data = (await res.json()) as ViaCepResponse
      if (data.erro) {
        setCepError("CEP não encontrado. Verifique e tente novamente.")
        return
      }
      lastFetchedCep.current = digits
      if (data.logradouro) setStreetVal(data.logradouro)
      if (data.bairro)     setNeighVal(data.bairro)
      if (data.uf)         setStateVal(data.uf)
      if (data.localidade) setCityVal(data.localidade)
      setCepFilled(true)
    } catch {
      setCepError("Erro ao consultar o CEP. Verifique sua conexão.")
    } finally {
      setCepLoading(false)
    }
  }

  // ── GPS → Mapbox reverse geocode ────────────────────────────────────────
  async function handleGetLocation() {
    setGettingLoc(true)
    setLocError("")
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== Location.PermissionStatus.GRANTED) {
        setLocError("Não foi possível obter a localização. Permita o acesso ao GPS.")
        return
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      })
      const { latitude: lat, longitude: lng } = pos.coords

      const token = process.env.EXPO_PUBLIC_MAPBOX_TOKEN
      if (!token) {
        setLocError("Token de mapa não configurado.")
        return
      }

      const url =
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json` +
        `?access_token=${token}&country=BR&language=pt&types=place,locality,neighborhood,address&limit=1`
      const res     = await fetch(url)
      const data    = await res.json() as {
        features?: {
          place_type: string[]
          text:       string
          context?:   { id: string; text: string }[]
        }[]
      }
      const feature = data?.features?.[0]
      if (feature) {
        const ctx    = feature.context ?? []
        const place  = ctx.find((c) => c.id.startsWith("place"))?.text
        const region = ctx.find((c) => c.id.startsWith("region"))?.text
        const neigh  = ctx.find((c) => c.id.startsWith("neighborhood"))?.text
                    ?? (feature.place_type.includes("neighborhood") ? feature.text : "")
        if (place)  setCityVal(place)
        if (region) setStateVal(stateAbbr(region))
        if (neigh)  setNeighVal(neigh)
      } else {
        setLocError("Não foi possível identificar o endereço a partir do GPS.")
      }
    } catch {
      setLocError("Erro ao buscar localização. Tente novamente.")
    } finally {
      setGettingLoc(false)
    }
  }

  // ── Salvar endereço ──────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ data: UserAddress }>("/api/users/me", {
        method: "PATCH",
        body:   JSON.stringify({
          cep:          cepVal.replace(/\D/g, "") || null,
          street:       streetVal.trim()  || null,
          neighborhood: neighVal.trim()   || null,
          city:         cityVal.trim()    || null,
          state:        stateVal          || null,
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me"] })
      setSuccess(true)
      setTimeout(() => router.back(), 1200)
    },
    onError: (e) => {
      setSaveError(e instanceof Error ? e.message : "Erro ao salvar.")
    },
  })

  // ── Guard de autenticação ────────────────────────────────────────────────
  if (!user) {
    return (
      <View
        className="flex-1 items-center justify-center bg-background px-6"
        style={{ paddingTop: insets.top }}
      >
        <Text className="text-base font-semibold text-primary">Faça login para editar seu endereço</Text>
        <TouchableOpacity
          className="mt-6 min-h-[44px] items-center justify-center rounded-xl bg-brand px-8"
          onPress={() => router.replace("/(auth)/login")}
          accessibilityRole="button"
        >
          <Text className="font-bold text-white">Entrar</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const saving = saveMutation.isPending

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
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
        <Text className="flex-1 text-lg font-bold text-primary">Endereço</Text>
      </View>

      {isLoading && !initialized ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#007B3C" />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Botão GPS ── */}
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="flex-1 text-xs text-muted">
              Sua localização é usada para centralizar o mapa e exibir itens próximos.
            </Text>
            <TouchableOpacity
              onPress={handleGetLocation}
              disabled={gettingLoc}
              accessibilityLabel="Usar minha localização"
              accessibilityRole="button"
              className="ml-3 min-h-[44px] flex-row items-center gap-1.5 disabled:opacity-50"
            >
              {gettingLoc ? (
                <ActivityIndicator size="small" color="#007B3C" />
              ) : (
                <Text className="text-lg">📍</Text>
              )}
              <Text className="text-xs font-semibold text-brand">Usar minha localização</Text>
            </TouchableOpacity>
          </View>
          {!!locError && (
            <Text className="mb-3 text-xs text-red-600">{locError}</Text>
          )}

          {/* ── CEP ── */}
          <View className="mb-4">
            <Text className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
              CEP <Text className="font-normal normal-case text-muted">(opcional)</Text>
            </Text>
            <View className="relative">
              <TextInput
                value={cepVal}
                onChangeText={(v) => { setCepVal(maskCEP(v)); setCepError("") }}
                onBlur={handleCepBlur}
                placeholder="00000-000"
                placeholderTextColor={tokens.muted}
                keyboardType="numeric"
                maxLength={9}
                accessibilityLabel="CEP"
                className="min-h-[44px] rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
              />
              {cepLoading && (
                <ActivityIndicator
                  size="small"
                  color="#007B3C"
                  style={{ position: "absolute", right: 12, top: "50%", marginTop: -8 }}
                />
              )}
            </View>
            {!!cepError && (
              <Text className="mt-1 text-xs text-red-600">{cepError}</Text>
            )}
            {cepFilled && !cepError && (
              <Text className="mt-1 text-xs text-brand">Endereço preenchido automaticamente</Text>
            )}
          </View>

          {/* ── Rua / Logradouro ── */}
          <View className="mb-4">
            <Text className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
              Rua / Logradouro <Text className="font-normal normal-case text-muted">(opcional)</Text>
            </Text>
            <TextInput
              value={streetVal}
              onChangeText={setStreetVal}
              maxLength={200}
              accessibilityLabel="Rua ou logradouro"
              className="min-h-[44px] rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
            />
          </View>

          {/* ── Bairro ── */}
          <View className="mb-4">
            <Text className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
              Bairro <Text className="font-normal normal-case text-muted">(opcional)</Text>
            </Text>
            <TextInput
              value={neighVal}
              onChangeText={setNeighVal}
              maxLength={100}
              accessibilityLabel="Bairro"
              className="min-h-[44px] rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
            />
          </View>

          {/* ── Cidade ── */}
          <View className="mb-4">
            <Text className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
              Cidade
            </Text>
            <TextInput
              value={cityVal}
              onChangeText={setCityVal}
              maxLength={100}
              accessibilityLabel="Cidade"
              className="min-h-[44px] rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
            />
          </View>

          {/* ── Estado ── */}
          <View className="mb-4">
            <Text className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
              Estado
            </Text>
            <TouchableOpacity
              onPress={() => setStateModal(true)}
              accessibilityLabel={`Estado: ${stateVal || "Selecione"}`}
              accessibilityRole="button"
              className="min-h-[44px] flex-row items-center justify-between rounded-xl border border-border bg-surface px-4 py-3"
            >
              <Text className={`text-sm ${stateVal ? "text-foreground" : "text-muted"}`}>
                {stateVal || "Selecione"}
              </Text>
              <Text className="text-muted">›</Text>
            </TouchableOpacity>
          </View>

          {/* ── Dica ── */}
          <Text className="mb-4 text-xs text-muted">
            Ao salvar, sua localização será atualizada automaticamente para centralizar o mapa.
          </Text>

          {/* ── Feedback ── */}
          {!!saveError && (
            <View className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <Text className="text-sm text-red-600">{saveError}</Text>
            </View>
          )}
          {success && (
            <View className="mb-4 rounded-xl bg-emerald-50 px-4 py-3">
              <Text className="text-sm font-semibold text-brand">Endereço atualizado! Redirecionando…</Text>
            </View>
          )}

          {/* ── Botão Salvar ── */}
          <TouchableOpacity
            onPress={() => saveMutation.mutate()}
            disabled={saving || cepLoading}
            accessibilityLabel="Salvar endereço"
            accessibilityRole="button"
            className="min-h-[44px] items-center justify-center rounded-xl bg-brand disabled:opacity-50"
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text className="font-bold text-white">Salvar endereço</Text>
            )}
          </TouchableOpacity>

        </ScrollView>
      )}

      {/* ── Modal de seleção de estado ── */}
      <Modal
        visible={stateModal}
        animationType="slide"
        transparent
        onRequestClose={() => setStateModal(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }}
          activeOpacity={1}
          onPress={() => setStateModal(false)}
        >
          <View
            className="absolute bottom-0 left-0 right-0 rounded-t-2xl bg-surface"
            style={{ maxHeight: "60%" }}
          >
            {/* Alça */}
            <View className="items-center py-3">
              <View className="h-1 w-10 rounded-full bg-border" />
            </View>

            <Text className="mb-2 px-4 text-base font-bold text-primary">Estado</Text>

            {/* Opção vazia */}
            <TouchableOpacity
              onPress={() => { setStateVal(""); setStateModal(false) }}
              accessibilityRole="button"
              accessibilityLabel="Selecione o estado"
              className="border-b border-border px-4 py-4"
            >
              <Text className="text-sm text-muted">Selecione</Text>
            </TouchableOpacity>

            <FlatList
              data={BR_STATES as unknown as BRState[]}
              keyExtractor={(s) => s}
              renderItem={({ item: s }) => (
                <TouchableOpacity
                  onPress={() => { setStateVal(s); setStateModal(false) }}
                  accessibilityRole="button"
                  accessibilityLabel={`Estado ${s}`}
                  accessibilityState={{ selected: stateVal === s }}
                  className={`border-b border-border px-4 py-4 ${stateVal === s ? "bg-emerald-50" : ""}`}
                >
                  <Text className={`text-sm ${stateVal === s ? "font-semibold text-brand" : "text-foreground"}`}>
                    {s}
                  </Text>
                </TouchableOpacity>
              )}
              style={{ paddingBottom: 32 }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  )
}
