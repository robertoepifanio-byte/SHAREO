// Fonte: app/perfil/recebimentos/page.tsx, app/perfil/recebimentos/_PixAccountForm.tsx
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
} from "react-native"
import { useEffect, useState } from "react"
import { router, useLocalSearchParams } from "expo-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { apiFetch } from "@/lib/api"
import { usePlatformConfig, formatPayoutWindow } from "@/lib/platformConfig"
import { useAuth } from "@/lib/auth"
import { useTheme } from "@/lib/theme"

// ─── Tipos (verbatim de _PixAccountForm.tsx) ──────────────────────────────────

type PixKeyType     = "CPF" | "CNPJ" | "EMAIL" | "PHONE" | "RANDOM"
type PixAccountStatus = "PENDING_VERIFICATION" | "VERIFIED" | "REJECTED"

interface PixAccount {
  id:         string
  pixKeyType: PixKeyType | null
  pixKey:     string | null
  holderName: string | null
  bankName:   string | null
  status:     PixAccountStatus
  stripeAccountId:      string | null
  stripeChargesEnabled: boolean
  stripePayoutsEnabled: boolean
}

interface PaymentAccountResponse {
  account:             PixAccount | null
  feeRateBps:          number
  stripeConnectActive: boolean
}

// Mensagens do retorno do onboarding Stripe Connect (deep-link ?stripe=...),
// verbatim de STRIPE_STATUS em app/perfil/recebimentos/page.tsx.
const STRIPE_STATUS: Record<string, { ok: boolean; msg: string }> = {
  concluido:  { ok: true,  msg: "Dados enviados à Stripe. Assim que a verificação terminar, sua conta fica ativa para receber." },
  incompleto: { ok: false, msg: "O cadastro na Stripe ficou incompleto. Você pode retomar de onde parou a qualquer momento." },
  sem_conta:  { ok: false, msg: "Não foi possível encontrar sua conta de recebimento. Tente novamente." },
  erro:       { ok: false, msg: "Não foi possível conectar à Stripe. Tente novamente." },
}

interface SaveInput {
  pixKeyType: PixKeyType
  pixKey:     string
  holderName: string
  bankName?:  string
}

// ─── Constantes (verbatim de _PixAccountForm.tsx e page.tsx) ─────────────────

const KEY_TYPES: { value: PixKeyType; label: string }[] = [
  { value: "CPF",    label: "CPF" },
  { value: "CNPJ",   label: "CNPJ" },
  { value: "EMAIL",  label: "E-mail" },
  { value: "PHONE",  label: "Telefone (+55...)" },
  { value: "RANDOM", label: "Chave aleatória" },
]

const KEY_INFO: Record<PixKeyType, { label: string; placeholder: string }> = {
  CPF:    { label: "CPF",             placeholder: "000.000.000-00" },
  CNPJ:   { label: "CNPJ",           placeholder: "00.000.000/0001-00" },
  EMAIL:  { label: "E-mail",         placeholder: "seu@email.com" },
  PHONE:  { label: "Telefone",       placeholder: "+5584999999999" },
  RANDOM: { label: "Chave aleatória", placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" },
}

const STATUS_INFO: Record<PixAccountStatus, { label: string; border: string; bg: string; text: string }> = {
  PENDING_VERIFICATION: {
    label:  "Aguardando verificação",
    border: "border-yellow-200",
    bg:     "bg-yellow-50",
    text:   "text-yellow-700",
  },
  VERIFIED: {
    label:  "Verificada",
    border: "border-green-200",
    bg:     "bg-green-50",
    text:   "text-green-700",
  },
  REJECTED: {
    label:  "Rejeitada — edite e reenvie",
    border: "border-red-200",
    bg:     "bg-red-50",
    text:   "text-red-600",
  },
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function RecebimentosScreen() {
  const insets     = useSafeAreaInsets()
  const user       = useAuth((s) => s.user)
  const qc         = useQueryClient()
  const payoutLabel = formatPayoutWindow(usePlatformConfig().payoutWindowDays)
  const { tokens } = useTheme()
  const { stripe: stripeParam } = useLocalSearchParams<{ stripe?: string }>()
  const stripeStatus = stripeParam ? STRIPE_STATUS[stripeParam] : undefined

  // ── Estado do formulário ───────────────────────────────────────────────────
  const [formInitialized, setFormInitialized] = useState(false)
  const [keyType,         setKeyType]         = useState<PixKeyType>("CPF")
  const [pixKey,          setPixKey]          = useState("")
  const [holderName,      setHolderName]      = useState("")
  const [bankName,        setBankName]        = useState("")
  const [formStatus,      setFormStatus]      = useState<PixAccountStatus | null>(null)
  const [formError,       setFormError]       = useState<string | null>(null)
  const [formSuccess,     setFormSuccess]     = useState(false)

  // ── Busca conta existente ──────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ["payment-account"],
    queryFn:  () => apiFetch<PaymentAccountResponse>("/api/user/payment-account"),
    enabled:  !!user,
  })

  const account             = data?.account ?? null
  const feeRateBps          = data?.feeRateBps ?? 1500
  const feeLabel            = `${feeRateBps / 100}%`
  const stripeConnectActive = data?.stripeConnectActive ?? false
  const stripeReady         = account?.stripeChargesEnabled && account?.stripePayoutsEnabled

  // Onboarding Stripe Connect (client:"mobile" → resposta JSON com a URL, o
  // app abre com Linking.openURL). É o padrão de rota que o app consome:
  // GET para o site (cookie), POST para o app (Bearer via resolveUserId).
  // Fonte: app/api/payments/stripe/connect/route.ts (POST)
  const stripeConnect = useMutation({
    mutationFn: async () => {
      const res = await apiFetch<{ data: { url: string } }>(
        "/api/payments/stripe/connect",
        { method: "POST" },
      )
      return res.data.url
    },
    onSuccess: async (url) => {
      const canOpen = await Linking.canOpenURL(url)
      if (canOpen) {
        await Linking.openURL(url)
      } else {
        Alert.alert("Erro", "Não foi possível abrir o link de cadastro.")
      }
    },
    onError: (e) => {
      Alert.alert("Erro", e instanceof Error ? e.message : "Não foi possível conectar à Stripe.")
    },
  })

  // Inicializa o formulário com os dados da conta quando o carregamento termina (uma vez).
  useEffect(() => {
    if (!isLoading && !formInitialized) {
      setFormInitialized(true)
      if (account) {
        setKeyType(account.pixKeyType ?? "CPF")
        setPixKey(account.pixKey ?? "")
        setHolderName(account.holderName ?? "")
        setBankName(account.bankName ?? "")
        setFormStatus(account.status)
      }
    }
  }, [isLoading, formInitialized, account])

  // ── Salvar (upsert via PATCH) ──────────────────────────────────────────────
  const save = useMutation({
    mutationFn: (input: SaveInput) =>
      apiFetch<{ account: { status: PixAccountStatus } }>("/api/user/payment-account", {
        method: "PATCH",
        body:   JSON.stringify(input),
      }),
    onSuccess: (res) => {
      setFormStatus(res.account.status)
      setFormSuccess(true)
      setFormError(null)
      qc.invalidateQueries({ queryKey: ["payment-account"] })
    },
    onError: (e) => {
      const raw = e instanceof Error ? e.message : ""
      // apiFetch lança "API NNN" quando a rota retorna erro sem .error.message;
      // nesse caso exibe mensagem amigável em vez do código HTTP.
      const msg = raw.startsWith("API ")
        ? "Erro ao salvar. Verifique os dados e tente novamente."
        : raw
      setFormError(msg || "Erro ao salvar. Tente novamente.")
      setFormSuccess(false)
    },
  })

  function handleSubmit() {
    if (!pixKey.trim() || !holderName.trim()) {
      setFormError("Preencha a chave PIX e o nome do titular.")
      return
    }
    setFormError(null)
    setFormSuccess(false)
    save.mutate({
      pixKeyType: keyType,
      pixKey:     pixKey.trim(),
      holderName: holderName.trim(),
      bankName:   bankName.trim() || undefined,
    })
  }

  // ── Guard: não autenticado ─────────────────────────────────────────────────
  if (!user) {
    return (
      <View
        className="flex-1 items-center justify-center bg-background px-6"
        style={{ paddingTop: insets.top }}
      >
        <Text className="text-5xl">💸</Text>
        <Text className="mt-3 text-base font-semibold text-primary">
          Faça login para gerenciar seus recebimentos
        </Text>
        <TouchableOpacity
          className="mt-6 min-h-[44px] rounded-xl bg-brand px-8 py-3"
          onPress={() => router.push("/(auth)/login")}
          accessibilityRole="button"
          accessibilityLabel="Entrar"
        >
          <Text className="font-bold text-white">Entrar</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-background">

      {/* ── Header (verbatim de kyc.tsx / favoritos.tsx) ── */}
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
        <Text className="flex-1 text-lg font-bold text-primary">Conta de Recebimento PIX</Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#007B3C" />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── Descrição (verbatim de page.tsx) ── */}
          <Text className="text-sm text-muted">
            Cadastre a chave PIX para receber os repasses das suas locações.
            O valor fica retido na plataforma por {payoutLabel} após a confirmação da devolução.
          </Text>

          {/* ── Banner de retorno do onboarding Stripe (verbatim de page.tsx) ── */}
          {stripeStatus && (
            <View
              className={`mt-4 rounded-xl border p-3 ${
                stripeStatus.ok
                  ? "border-green-200 bg-green-50"
                  : "border-red-200 bg-red-50"
              }`}
              accessible
              accessibilityLiveRegion="polite"
            >
              <Text className={`text-sm ${stripeStatus.ok ? "text-green-700" : "text-red-600"}`}>
                {stripeStatus.msg}
              </Text>
            </View>
          )}

          {/* ── Card do formulário (verbatim de _PixAccountForm.tsx) ── */}
          <View className="mt-4 rounded-2xl border border-border bg-surface p-4 gap-4">

            {/* Status atual */}
            {formStatus && (
              <View
                className={`rounded-xl border px-4 py-3 ${STATUS_INFO[formStatus].border} ${STATUS_INFO[formStatus].bg}`}
                accessible
                accessibilityLiveRegion="polite"
              >
                <Text className={`text-sm font-medium ${STATUS_INFO[formStatus].text}`}>
                  {STATUS_INFO[formStatus].label}
                </Text>
              </View>
            )}

            {/* Aviso MVP */}
            <View className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
              <Text className="text-sm text-blue-700">
                No MVP, a verificação é feita manualmente pela equipe ShareO em até 1 dia útil.
                Você só receberá repasses após a chave ser verificada.
              </Text>
            </View>

            {/* Tipo de chave PIX */}
            <View>
              <Text className="mb-2 text-sm font-semibold text-foreground">
                Tipo de chave PIX
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {KEY_TYPES.map((kt) => (
                  <TouchableOpacity
                    key={kt.value}
                    onPress={() => { setKeyType(kt.value); setPixKey("") }}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: keyType === kt.value }}
                    accessibilityLabel={kt.label}
                    className={[
                      "min-h-[44px] justify-center rounded-xl border px-4 py-2",
                      keyType === kt.value
                        ? "border-brand bg-brand/10"
                        : "border-border bg-background",
                    ].join(" ")}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        keyType === kt.value ? "text-brand" : "text-foreground"
                      }`}
                    >
                      {kt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Chave PIX */}
            <View>
              <Text className="mb-1.5 text-sm font-semibold text-foreground">
                {KEY_INFO[keyType].label}
              </Text>
              <TextInput
                value={pixKey}
                onChangeText={setPixKey}
                placeholder={KEY_INFO[keyType].placeholder}
                placeholderTextColor={tokens.muted}
                autoCapitalize="none"
                autoCorrect={false}
                className="min-h-[44px] rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground"
                accessibilityLabel={KEY_INFO[keyType].label}
              />
            </View>

            {/* Nome do titular */}
            <View>
              <Text className="mb-1.5 text-sm font-semibold text-foreground">
                Nome do titular da conta
              </Text>
              <TextInput
                value={holderName}
                onChangeText={setHolderName}
                placeholder="Nome exatamente como na conta bancária"
                placeholderTextColor={tokens.muted}
                autoCapitalize="words"
                autoCorrect={false}
                className="min-h-[44px] rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground"
                accessibilityLabel="Nome do titular da conta"
              />
            </View>

            {/* Banco (opcional) */}
            <View>
              <Text className="mb-1.5 text-sm font-semibold text-foreground">
                Banco <Text className="font-normal text-muted">(opcional)</Text>
              </Text>
              <TextInput
                value={bankName}
                onChangeText={setBankName}
                placeholder="Ex: Nubank, Itaú, Bradesco..."
                placeholderTextColor={tokens.muted}
                autoCapitalize="words"
                autoCorrect={false}
                className="min-h-[44px] rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground"
                accessibilityLabel="Banco (opcional)"
              />
            </View>

            {/* Erro */}
            {formError && (
              <View
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3"
                accessibilityRole="alert"
              >
                <Text className="text-sm text-red-700">{formError}</Text>
              </View>
            )}

            {/* Sucesso */}
            {formSuccess && (
              <View
                className="rounded-xl border border-green-200 bg-green-50 px-4 py-3"
                accessible
                accessibilityLiveRegion="polite"
              >
                <Text className="text-sm text-green-700">
                  Chave salva! Aguardando verificação pela equipe ShareO.
                </Text>
              </View>
            )}

            {/* Botão salvar */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={save.isPending}
              accessibilityRole="button"
              accessibilityLabel={account ? "Atualizar chave PIX" : "Cadastrar chave PIX"}
              accessibilityState={{ disabled: save.isPending }}
              className={[
                "min-h-[52px] items-center justify-center rounded-xl",
                save.isPending ? "bg-brand/50" : "bg-brand",
              ].join(" ")}
            >
              {save.isPending ? (
                <View className="flex-row items-center gap-2">
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text className="text-base font-bold text-white">Salvando...</Text>
                </View>
              ) : (
                <Text className="text-base font-bold text-white">
                  {account ? "Atualizar chave PIX" : "Cadastrar chave PIX"}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* ── Stripe Connect — PSP definitivo, onboarding EM CONSTRUÇÃO (ADR-028).
              Só aparece com a flag ativa; verbatim de page.tsx. ── */}
          {stripeConnectActive && (
            <View className="mt-4 rounded-2xl border border-border bg-surface p-4 gap-3">
              <Text className="font-semibold text-foreground">Receber pela Stripe</Text>
              {account?.stripeAccountId ? (
                stripeReady ? (
                  <View className="gap-2">
                    <Text className="text-sm text-green-700">
                      ✅ Conta verificada e pronta para receber.
                    </Text>
                    <Text className="text-xs text-muted">
                      Os repasses das suas locações cairão automaticamente na conta bancária
                      cadastrada, já com a taxa ShareO de {feeLabel} descontada.
                    </Text>
                  </View>
                ) : (
                  <View className="gap-3">
                    <Text className="text-sm text-muted">
                      ⏳ Cadastro iniciado, verificação da Stripe pendente.
                    </Text>
                    <TouchableOpacity
                      onPress={() => stripeConnect.mutate()}
                      disabled={stripeConnect.isPending}
                      accessibilityRole="button"
                      accessibilityLabel="Continuar cadastro"
                      className="min-h-[44px] items-start justify-center"
                    >
                      <Text className="text-sm font-medium text-brand">Continuar cadastro</Text>
                    </TouchableOpacity>
                  </View>
                )
              ) : (
                <View className="gap-3">
                  <Text className="text-sm text-muted">
                    Cadastre seus dados bancários pela Stripe para receber os repasses
                    automaticamente, sem espera pelo repasse manual.
                  </Text>
                  <TouchableOpacity
                    onPress={() => stripeConnect.mutate()}
                    disabled={stripeConnect.isPending}
                    accessibilityRole="button"
                    accessibilityLabel="Cadastrar dados bancários"
                    accessibilityState={{ disabled: stripeConnect.isPending }}
                    className={[
                      "min-h-[52px] items-center justify-center rounded-xl",
                      stripeConnect.isPending ? "bg-brand/50" : "bg-brand",
                    ].join(" ")}
                  >
                    {stripeConnect.isPending ? (
                      <View className="flex-row items-center gap-2">
                        <ActivityIndicator size="small" color="#FFFFFF" />
                        <Text className="text-base font-bold text-white">Abrindo...</Text>
                      </View>
                    ) : (
                      <Text className="text-base font-bold text-white">Cadastrar dados bancários</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* ── Como funciona (verbatim de page.tsx) ── */}
          <View className="mt-4 rounded-2xl border border-border bg-surface p-4 gap-3">
            <Text className="font-semibold text-foreground">Como funciona o repasse</Text>

            {([
              {
                icon:  "✅",
                title: "Devolução confirmada",
                desc:  "Locatário e você confirmam a devolução do item.",
              },
              {
                icon:  "⏳",
                title: "Janela de retenção",
                desc:  `O valor fica retido por ${payoutLabel} após a devolução — janela que cobre o prazo de abertura de disputa.`,
              },
              {
                icon:  "💸",
                title: "Repasse via PIX",
                desc:  `O valor líquido (após a taxa ShareO de ${feeLabel}) é enviado para a sua chave cadastrada.`,
              },
            ] as const).map((item) => (
              <View key={item.title} className="flex-row gap-3">
                <Text
                  className="text-lg flex-shrink-0"
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                >
                  {item.icon}
                </Text>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-foreground">{item.title}</Text>
                  <Text className="mt-0.5 text-xs text-muted">{item.desc}</Text>
                </View>
              </View>
            ))}
          </View>

        </ScrollView>
      )}
    </View>
  )
}
