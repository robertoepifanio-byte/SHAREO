// Fonte: app/perfil/editar/page.tsx, app/perfil/_ProfileForm.tsx

/**
 * EditarPerfilScreen — apps/mobile/app/perfil/editar.tsx
 *
 * Tela nativa de edição de perfil.
 * Transcrição literal de app/perfil/_ProfileForm.tsx para React Native.
 *
 * Campos: nome, bio, telefone, foto de perfil.
 * Avatar: expo-image-picker → POST /api/upload (bucket: item-images, Bearer).
 * Salvar: PATCH /api/users/me (Bearer via apiFetch).
 */
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native"
import { useState, useEffect } from "react"
import { router } from "expo-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Image } from "expo-image"
import * as ImagePicker from "expo-image-picker"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { apiFetch, API_URL, getTokens } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useTheme } from "@/lib/theme"
import { maskPhone, phoneToE164 } from "@/lib/forms"

// ─── Tipos ─────────────────────────────────────────────────────────────────────

interface UserProfile {
  name:      string
  bio:       string | null
  phone:     string | null
  avatarUrl: string | null
}

/**
 * Converte telefone armazenado (E.164 ex.: "+5584999990000") para exibição "(84) 99999-0000".
 * Usa maskPhone de @/lib/forms (espelho de lib/forms/masks.ts do site).
 */
function displayPhone(raw: string | null): string {
  if (!raw) return ""
  const digits = raw.replace(/\D/g, "")
  // Remove prefixo +55 se presente
  const local  = digits.startsWith("55") && digits.length > 11 ? digits.slice(2) : digits
  return maskPhone(local)
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function EditarPerfilScreen() {
  const insets        = useSafeAreaInsets()
  const user          = useAuth((s) => s.user)
  const qc            = useQueryClient()
  const { tokens }    = useTheme()

  // ── Estado do formulário ─────────────────────────────────────────────────
  const [name,        setName]        = useState("")
  const [bio,         setBio]         = useState("")
  const [phone,       setPhone]       = useState("")
  const [avatarUrl,   setAvatarUrl]   = useState("")
  const [uploading,   setUploading]   = useState(false)
  const [error,       setError]       = useState("")
  const [success,     setSuccess]     = useState(false)
  const [initialized, setInitialized] = useState(false)

  // ── Busca dados atuais do perfil ─────────────────────────────────────────
  const { data: profileData, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn:  () => apiFetch<{ data: UserProfile }>("/api/users/me"),
    enabled:  !!user,
  })

  // Inicializa o formulário apenas uma vez ao receber os dados
  useEffect(() => {
    const profile = profileData?.data
    if (profile && !initialized) {
      setName(profile.name)
      setBio(profile.bio ?? "")
      setPhone(displayPhone(profile.phone))
      setAvatarUrl(profile.avatarUrl ?? "")
      setInitialized(true)
    }
  }, [profileData, initialized])

  // ── Upload de avatar ─────────────────────────────────────────────────────
  async function handlePickAvatar() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== "granted") {
      Alert.alert("Permissão negada", "Precisamos de acesso à galeria para enviar sua foto.")
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes:    ["images"],
      allowsEditing: true,
      aspect:        [1, 1],
      quality:       0.85,
    })
    if (result.canceled || !result.assets[0]) return

    const asset = result.assets[0]
    setError(""); setSuccess(false); setUploading(true)
    try {
      const tokens   = await getTokens()
      const formData = new FormData()
      formData.append("file", {
        uri:  asset.uri,
        name: `avatar-${Date.now()}.jpg`,
        type: asset.mimeType ?? "image/jpeg",
      } as unknown as Blob)
      formData.append("bucket", "item-images")

      const res  = await fetch(`${API_URL}/api/upload`, {
        method:  "POST",
        headers: { ...(tokens ? { Authorization: `Bearer ${tokens.accessToken}` } : {}) },
        body:    formData,
      })
      const json = await res.json().catch(() => ({})) as { url?: string; error?: { message?: string } }
      if (!res.ok || !json.url) throw new Error(json.error?.message ?? "Falha no upload da imagem.")
      setAvatarUrl(json.url)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha no upload da imagem.")
    } finally {
      setUploading(false)
    }
  }

  // ── Salvar alterações ────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ data: UserProfile }>("/api/users/me", {
        method: "PATCH",
        body:   JSON.stringify({
          name:      name.trim()  || undefined,
          bio:       bio.trim()   || null,
          phone:     phoneToE164(phone) ?? null,
          avatarUrl: avatarUrl.trim() || null,
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me"] })
      setSuccess(true)
      setTimeout(() => router.back(), 1200)
    },
    onError: (e) => {
      setError(e instanceof Error ? e.message : "Erro ao salvar.")
    },
  })

  // ── Guard de autenticação ────────────────────────────────────────────────
  if (!user) {
    return (
      <View
        className="flex-1 items-center justify-center bg-background px-6"
        style={{ paddingTop: insets.top }}
      >
        <Text className="text-base font-semibold text-primary">Faça login para editar seu perfil</Text>
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

  const saving  = saveMutation.isPending
  const initial = (name || user.name)[0]?.toUpperCase() ?? "?"

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
        <Text className="flex-1 text-lg font-bold text-primary">Editar Perfil</Text>
      </View>

      {/* Loading inicial */}
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
          {/* ── Avatar ── */}
          <View className="mb-6 items-center">
            <View className="mb-3 h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-primary">
              {avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={{ width: 80, height: 80 }}
                  contentFit="cover"
                  accessibilityLabel="Foto de perfil"
                />
              ) : (
                <Text className="text-3xl font-bold text-white">{initial}</Text>
              )}
            </View>

            <View className="flex-row items-center gap-3">
              <TouchableOpacity
                onPress={handlePickAvatar}
                disabled={uploading}
                accessibilityLabel={avatarUrl ? "Trocar foto de perfil" : "Enviar foto de perfil"}
                accessibilityRole="button"
                className="min-h-[44px] items-center justify-center rounded-xl border border-border bg-surface px-5"
              >
                {uploading ? (
                  <ActivityIndicator size="small" color="#007B3C" />
                ) : (
                  <Text className="text-sm font-semibold text-foreground">
                    {avatarUrl ? "Trocar foto" : "Enviar foto"}
                  </Text>
                )}
              </TouchableOpacity>

              {!!avatarUrl && !uploading && (
                <TouchableOpacity
                  onPress={() => setAvatarUrl("")}
                  accessibilityLabel="Remover foto de perfil"
                  accessibilityRole="button"
                  className="min-h-[44px] items-center justify-center px-2"
                >
                  <Text className="text-sm text-muted">Remover</Text>
                </TouchableOpacity>
              )}
            </View>

            <Text className="mt-2 text-xs text-muted">
              JPG, PNG ou WEBP — escolha uma imagem do seu dispositivo.
            </Text>
          </View>

          {/* ── Nome ── */}
          <View className="mb-4">
            <Text className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
              Nome
            </Text>
            <TextInput
              value={name}
              onChangeText={(v) => { setName(v); setError("") }}
              placeholder="Seu nome completo"
              placeholderTextColor={tokens.muted}
              maxLength={100}
              accessibilityLabel="Nome"
              className="min-h-[44px] rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
            />
          </View>

          {/* ── Bio ── */}
          <View className="mb-4">
            <Text className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
              Bio <Text className="font-normal normal-case text-muted">(opcional)</Text>
            </Text>
            <TextInput
              value={bio}
              onChangeText={(v) => { setBio(v); setError("") }}
              placeholder="Conte um pouco sobre você…"
              placeholderTextColor={tokens.muted}
              multiline
              maxLength={500}
              accessibilityLabel="Bio"
              className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
              style={{ textAlignVertical: "top", minHeight: 80 }}
            />
            <Text className="mt-0.5 text-right text-[10px] text-muted">{bio.length}/500</Text>
          </View>

          {/* ── Telefone ── */}
          <View className="mb-4">
            <Text className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
              Telefone <Text className="font-normal normal-case text-muted">(DDD + número)</Text>
            </Text>
            <TextInput
              value={phone}
              onChangeText={(v) => { setPhone(maskPhone(v)); setError("") }}
              placeholder="(84) 99999-0000"
              placeholderTextColor={tokens.muted}
              keyboardType="phone-pad"
              maxLength={16}
              accessibilityLabel="Telefone"
              className="min-h-[44px] rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
            />
          </View>

          {/* ── Link para Endereço ── */}
          <TouchableOpacity
            onPress={() => router.push("/perfil/endereco")}
            accessibilityLabel="Editar endereço"
            accessibilityRole="button"
            className="mb-4 flex-row items-center justify-between rounded-xl border border-border bg-surface px-4 py-3"
            style={{ minHeight: 64 }}
            activeOpacity={0.7}
          >
            <View>
              <Text className="text-sm font-medium text-foreground">Endereço</Text>
              <Text className="text-xs text-muted">Cidade, estado e bairro</Text>
            </View>
            <Text className="text-sm font-semibold text-brand">Editar →</Text>
          </TouchableOpacity>

          {/* ── Feedback ── */}
          {!!error && (
            <View className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <Text className="text-sm text-red-600">{error}</Text>
            </View>
          )}
          {success && (
            <View className="mb-4 rounded-xl bg-emerald-50 px-4 py-3">
              <Text className="text-sm font-semibold text-brand">Perfil atualizado!</Text>
            </View>
          )}

          {/* ── Botões ── */}
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={() => saveMutation.mutate()}
              disabled={saving || uploading}
              accessibilityLabel="Salvar alterações"
              accessibilityRole="button"
              className="min-h-[44px] flex-1 items-center justify-center rounded-xl bg-brand disabled:opacity-50"
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text className="font-bold text-white">Salvar alterações</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.back()}
              accessibilityLabel="Cancelar"
              accessibilityRole="button"
              className="min-h-[44px] items-center justify-center rounded-xl border border-border bg-surface px-5"
            >
              <Text className="font-semibold text-foreground">Cancelar</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      )}
    </KeyboardAvoidingView>
  )
}
