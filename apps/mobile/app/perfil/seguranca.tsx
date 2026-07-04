// Fonte: app/perfil/seguranca/page.tsx, app/perfil/seguranca/_ChangeEmailForm.tsx,
//        app/perfil/seguranca/_ChangePasswordForm.tsx,
//        app/perfil/seguranca/_ResendVerificationButton.tsx,
//        app/perfil/_DeleteAccountButton.tsx
//
// Regra CLAUDE.md: transcrição literal do site em 375px.
// Rótulos, textos, fluxos e mensagens verbatim dos arquivos-fonte.
// Admins veem form de senha (ChangePasswordForm); não-admins veem link forgot-password.
// Zona de perigo (delete 2-passos) oculta para admins — idêntico ao site.

import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from "react-native"
import { useState } from "react"
import { router } from "expo-router"
import { useQuery } from "@tanstack/react-query"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { apiFetch, API_URL, getTokens } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useTheme } from "@/lib/theme"

// ─── maskEmail — verbatim de app/perfil/seguranca/page.tsx ───────────────────
function maskEmail(email: string) {
  const [local, domain] = email.split("@")
  if (!local || !domain) return email
  const visible = local.slice(0, 2)
  const masked  = "*".repeat(Math.max(local.length - 2, 3))
  return `${visible}${masked}@${domain}`
}

// ─── Helper de fetch autenticado com tratamento de ambos os formatos de erro ─
// (o site usa `{ error: "string" }` em alguns endpoints e `{ error: { message } }` em outros)
async function authFetch(path: string, options: RequestInit = {}) {
  const tokens = await getTokens()
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(tokens ? { Authorization: `Bearer ${tokens.accessToken}` } : {}),
      ...(options.headers as Record<string, string> ?? {}),
    },
  })
  const json = await res.json().catch(() => ({}))
  return { res, json }
}

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface MeSecurityData {
  email:         string
  createdAt:     string
  emailVerified: string | null
}

type ResendState = "idle" | "loading" | "success" | "error"

// ─── Componente ───────────────────────────────────────────────────────────────
export default function SegurancaScreen() {
  const insets         = useSafeAreaInsets()
  const { user, logout } = useAuth()
  const { tokens }     = useTheme()
  const isAdmin        = user?.role === "ADMIN"

  // Busca dados de segurança (email, emailVerified, createdAt)
  const { data: meData, isLoading: meLoading, refetch } = useQuery({
    queryKey: ["me-security"],
    queryFn:  () => apiFetch<{ data: MeSecurityData }>("/api/users/me"),
    enabled:  !!user,
    select:   (d) => d.data,
  })

  // ── ChangeEmailForm state ──────────────────────────────────────────────────
  const [emailOpen,    setEmailOpen]    = useState(false)
  const [newEmail,     setNewEmail]     = useState("")
  const [emailPwd,     setEmailPwd]     = useState("")
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailError,   setEmailError]   = useState("")
  const [emailSuccess, setEmailSuccess] = useState(false)

  async function handleChangeEmail() {
    setEmailError("")
    setEmailLoading(true)
    try {
      const { res, json } = await authFetch("/api/user/email", {
        method: "PATCH",
        body:   JSON.stringify({ newEmail, currentPassword: emailPwd }),
      })
      if (!res.ok) {
        const msg = typeof json?.error === "string"
          ? json.error
          : (json?.error?.message ?? "Erro ao alterar e-mail. Tente novamente.")
        setEmailError(msg)
        return
      }
      setEmailSuccess(true)
      // Sessão usa o e-mail antigo — forçar novo login após 3s (verbatim _ChangeEmailForm.tsx)
      setTimeout(async () => {
        await logout()
        router.replace("/(auth)/login")
      }, 3000)
    } finally {
      setEmailLoading(false)
    }
  }

  // ── ChangePasswordForm state (admin only) ──────────────────────────────────
  const [pwdCurrent, setPwdCurrent] = useState("")
  const [pwdNew,     setPwdNew]     = useState("")
  const [pwdConfirm, setPwdConfirm] = useState("")
  const [pwdLoading, setPwdLoading] = useState(false)
  const [pwdError,   setPwdError]   = useState("")
  const [pwdSuccess, setPwdSuccess] = useState(false)

  async function handleChangePassword() {
    setPwdError(""); setPwdSuccess(false)
    if (pwdNew !== pwdConfirm) { setPwdError("As senhas não coincidem."); return }
    if (pwdNew.length < 8)    { setPwdError("Mínimo 8 caracteres."); return }
    setPwdLoading(true)
    try {
      const { res, json } = await authFetch("/api/user/password", {
        method: "PATCH",
        body:   JSON.stringify({ currentPassword: pwdCurrent, newPassword: pwdNew }),
      })
      if (!res.ok) {
        const msg = typeof json?.error === "string"
          ? json.error
          : (json?.error?.message ?? "Erro ao alterar senha.")
        setPwdError(msg)
        return
      }
      setPwdSuccess(true)
      setPwdCurrent(""); setPwdNew(""); setPwdConfirm("")
      // Verbatim _ChangePasswordForm.tsx: redirecionar após 1.5s
      setTimeout(async () => {
        await logout()
        router.replace("/(auth)/login")
      }, 1500)
    } finally {
      setPwdLoading(false)
    }
  }

  // ── ResendVerificationButton state ─────────────────────────────────────────
  const [resendState, setResendState] = useState<ResendState>("idle")
  const [resendError, setResendError] = useState("")

  async function handleResend() {
    setResendState("loading")
    try {
      const { res, json } = await authFetch("/api/auth/resend-verification", { method: "POST" })
      if (!res.ok) {
        if (json?.error?.code === "ALREADY_VERIFIED") {
          // Não deveria ocorrer — atualiza dados
          refetch()
          return
        }
        if (res.status === 429) {
          const retryAfter = parseInt(res.headers.get("Retry-After") ?? "", 10)
          const minutes    = Number.isFinite(retryAfter) ? Math.max(1, Math.ceil(retryAfter / 60)) : null
          setResendError(
            minutes
              ? `Limite de reenvios atingido. Tente novamente em ${minutes} minuto${minutes > 1 ? "s" : ""}.`
              : "Limite de reenvios atingido. Aguarde alguns minutos e tente novamente.",
          )
        } else {
          setResendError(json?.error?.message ?? "Não foi possível enviar o e-mail. Tente novamente mais tarde.")
        }
        setResendState("error")
        return
      }
      setResendState("success")
    } catch {
      setResendError("Falha de conexão. Verifique sua internet e tente novamente.")
      setResendState("error")
    }
  }

  // ── DeleteAccountButton state ──────────────────────────────────────────────
  const [deleteStep,  setDeleteStep]  = useState<"idle" | "confirm" | "loading">("idle")
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function handleDelete() {
    setDeleteStep("loading")
    setDeleteError(null)
    try {
      const { res, json } = await authFetch("/api/users/me", { method: "DELETE" })
      if (!res.ok) {
        const msg = json?.error?.message ?? "Erro ao excluir conta."
        setDeleteError(msg)
        setDeleteStep("confirm")
        return
      }
      await logout()
      router.replace("/")
    } catch {
      setDeleteError("Erro de conexão. Tente novamente.")
      setDeleteStep("confirm")
    }
  }

  // ── Guard: não autenticado ─────────────────────────────────────────────────
  if (!user) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6" style={{ paddingTop: insets.top }}>
        <Text className="text-5xl">🔒</Text>
        <Text className="mt-3 text-base font-semibold text-primary">Faça login para acessar</Text>
        <TouchableOpacity
          className="mt-6 min-h-[44px] items-center justify-center rounded-xl bg-brand px-8"
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
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* ── Header — verbatim de kyc.tsx ── */}
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
        <Text className="flex-1 text-lg font-bold text-primary">Login e Segurança</Text>
      </View>

      {meLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#007B3C" />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── Seção E-mail ─────────────────────────────────────────────── */}
          {/* Fonte: app/perfil/seguranca/page.tsx + _ChangeEmailForm.tsx + _ResendVerificationButton.tsx */}
          <View className="mb-4 rounded-xl border border-border bg-surface p-5">
            <Text className="mb-4 font-semibold text-foreground">E-mail</Text>

            {/* E-mail mascarado + badge Verificado/Pendente */}
            <View className="flex-row items-center justify-between">
              <View className="mr-3 flex-1">
                <Text className="text-sm font-medium text-foreground">
                  {meData?.email ? maskEmail(meData.email) : maskEmail(user.email)}
                </Text>
                {meData?.createdAt ? (
                  <Text className="text-xs text-muted">
                    Conta criada em{" "}
                    {new Date(meData.createdAt).toLocaleDateString("pt-BR", {
                      day:   "numeric",
                      month: "long",
                      year:  "numeric",
                    })}
                  </Text>
                ) : null}
              </View>
              {meData?.emailVerified ? (
                <View className="rounded-full bg-green-100 px-2.5 py-1">
                  <Text className="text-xs font-semibold text-green-700">Verificado</Text>
                </View>
              ) : (
                <View className="rounded-full bg-yellow-100 px-2.5 py-1">
                  <Text className="text-xs font-semibold text-yellow-800">Pendente</Text>
                </View>
              )}
            </View>

            {/* ResendVerificationButton — só se e-mail não verificado */}
            {!meData?.emailVerified && (
              <View className="mt-4 border-t border-border pt-4">
                <Text className="mb-2 text-xs text-muted">
                  Confirme seu e-mail para poder realizar reservas na plataforma.
                </Text>
                {resendState === "success" ? (
                  <Text className="text-sm text-green-700">
                    E-mail de verificação enviado. Verifique sua caixa de entrada e a pasta de spam.
                  </Text>
                ) : resendState === "error" ? (
                  <Text className="text-sm text-red-600">{resendError}</Text>
                ) : (
                  <TouchableOpacity
                    onPress={handleResend}
                    disabled={resendState === "loading"}
                    accessibilityRole="button"
                    accessibilityLabel="Reenviar e-mail de verificação"
                    className="min-h-[44px] items-center justify-center self-start rounded-xl border border-yellow-400 bg-yellow-50 px-4"
                    style={{ opacity: resendState === "loading" ? 0.6 : 1 }}
                  >
                    <Text className="text-xs font-semibold text-yellow-800">
                      {resendState === "loading" ? "Enviando..." : "Reenviar e-mail de verificação"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* ChangeEmailForm */}
            {emailSuccess ? (
              <View className="mt-4 border-t border-border pt-4">
                <View className="rounded-xl bg-green-50 px-4 py-3">
                  <Text className="text-sm text-green-700">
                    E-mail alterado! Enviamos um link de verificação para o novo endereço.{"\n"}
                    Você será desconectado em instantes para fazer login novamente.
                  </Text>
                </View>
              </View>
            ) : !emailOpen ? (
              <View className="mt-4 border-t border-border pt-4">
                <TouchableOpacity
                  onPress={() => setEmailOpen(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Alterar e-mail"
                  className="min-h-[44px] justify-center"
                >
                  <Text className="text-sm font-medium text-brand">Alterar e-mail</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View className="mt-4 border-t border-border pt-4">
                {/* Aviso de verificação — verbatim _ChangeEmailForm.tsx */}
                <View className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <Text className="text-sm text-amber-800">
                    ⚠️ O novo e-mail precisará ser{" "}
                    <Text className="font-bold">verificado</Text>{" "}
                    antes de ser ativado. Você receberá um link de confirmação no novo endereço
                    e será desconectado para fazer login novamente.
                  </Text>
                </View>

                <Text className="mb-1 text-xs font-medium text-muted">Novo e-mail</Text>
                <TextInput
                  value={newEmail}
                  onChangeText={(v) => { setNewEmail(v); setEmailError("") }}
                  placeholder="novo@email.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  editable={!emailLoading}
                  accessibilityLabel="Novo e-mail"
                  className="mb-3 rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground"
                  placeholderTextColor={tokens.muted}
                />

                <Text className="mb-1 text-xs font-medium text-muted">Confirme sua senha</Text>
                <TextInput
                  value={emailPwd}
                  onChangeText={(v) => { setEmailPwd(v); setEmailError("") }}
                  placeholder="Sua senha atual"
                  secureTextEntry
                  autoComplete="current-password"
                  editable={!emailLoading}
                  accessibilityLabel="Confirme sua senha"
                  className="mb-3 rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground"
                  placeholderTextColor={tokens.muted}
                />

                {emailError ? (
                  <Text className="mb-2 text-xs text-red-600" accessibilityRole="alert">
                    {emailError}
                  </Text>
                ) : null}

                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={handleChangeEmail}
                    disabled={emailLoading || !newEmail || !emailPwd}
                    accessibilityRole="button"
                    accessibilityLabel="Confirmar alteração"
                    className="min-h-[44px] flex-1 items-center justify-center rounded-xl bg-primary"
                    style={{ opacity: emailLoading || !newEmail || !emailPwd ? 0.5 : 1 }}
                  >
                    {emailLoading
                      ? <ActivityIndicator size="small" color="#ffffff" />
                      : <Text className="text-sm font-semibold text-white">Confirmar alteração</Text>
                    }
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => { setEmailOpen(false); setNewEmail(""); setEmailPwd(""); setEmailError("") }}
                    disabled={emailLoading}
                    accessibilityRole="button"
                    accessibilityLabel="Cancelar"
                    className="min-h-[44px] items-center justify-center rounded-xl border border-border px-4"
                    style={{ opacity: emailLoading ? 0.5 : 1 }}
                  >
                    <Text className="text-sm text-muted">Cancelar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* ── Seção Senha ──────────────────────────────────────────────── */}
          {/* Fonte: app/perfil/seguranca/page.tsx + _ChangePasswordForm.tsx */}
          <View className="mb-4 rounded-xl border border-border bg-surface p-5">
            <Text className="mb-1 font-semibold text-foreground">Senha</Text>

            {isAdmin ? (
              // Admins: form de troca de senha (verbatim _ChangePasswordForm.tsx)
              <>
                <Text className="mb-4 text-sm text-muted">
                  Altere sua senha de acesso ao painel admin.
                </Text>

                <Text className="mb-1 text-xs font-medium text-muted">Senha atual</Text>
                <TextInput
                  value={pwdCurrent}
                  onChangeText={setPwdCurrent}
                  secureTextEntry
                  autoComplete="current-password"
                  editable={!pwdLoading}
                  accessibilityLabel="Senha atual"
                  className="mb-3 rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground"
                  placeholderTextColor={tokens.muted}
                />

                <Text className="mb-1 text-xs font-medium text-muted">Nova senha</Text>
                <TextInput
                  value={pwdNew}
                  onChangeText={setPwdNew}
                  secureTextEntry
                  autoComplete="new-password"
                  editable={!pwdLoading}
                  accessibilityLabel="Nova senha"
                  className="mb-3 rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground"
                  placeholderTextColor={tokens.muted}
                />

                <Text className="mb-1 text-xs font-medium text-muted">Confirmar nova senha</Text>
                <TextInput
                  value={pwdConfirm}
                  onChangeText={setPwdConfirm}
                  secureTextEntry
                  autoComplete="new-password"
                  editable={!pwdLoading}
                  accessibilityLabel="Confirmar nova senha"
                  className="mb-3 rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground"
                  placeholderTextColor={tokens.muted}
                />

                {pwdError   ? <Text className="mb-2 text-xs text-red-600">{pwdError}</Text>   : null}
                {pwdSuccess ? <Text className="mb-2 text-xs text-green-700">Senha alterada. Redirecionando para o login…</Text> : null}

                <TouchableOpacity
                  onPress={handleChangePassword}
                  disabled={pwdLoading}
                  accessibilityRole="button"
                  accessibilityLabel="Salvar nova senha"
                  className="min-h-[52px] items-center justify-center rounded-xl bg-primary"
                  style={{ opacity: pwdLoading ? 0.5 : 1 }}
                >
                  {pwdLoading
                    ? <ActivityIndicator size="small" color="#ffffff" />
                    : <Text className="text-sm font-semibold text-white">
                        {pwdLoading ? "Salvando…" : "Salvar nova senha"}
                      </Text>
                  }
                </TouchableOpacity>
              </>
            ) : (
              // Não-admins: link para recuperação de senha (verbatim page.tsx)
              <>
                <Text className="mb-4 text-sm text-muted">
                  Para alterar sua senha, use o fluxo de recuperação de senha.
                </Text>
                <TouchableOpacity
                  onPress={() => Linking.openURL(`${API_URL}/forgot-password`)}
                  accessibilityRole="button"
                  accessibilityLabel="Alterar senha"
                  className="min-h-[44px] items-center justify-center self-start rounded-xl border border-border px-4"
                >
                  <Text className="text-sm font-semibold text-foreground">Alterar senha</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* ── Zona de perigo — oculta para admins (verbatim page.tsx) ── */}
          {/* Fonte: app/perfil/_DeleteAccountButton.tsx */}
          {!isAdmin && (
            <View className="rounded-xl border border-red-200 bg-surface p-5">
              <Text className="mb-1 font-semibold text-red-600">Zona de perigo</Text>
              <Text className="mb-4 text-sm text-muted">
                Ações irreversíveis que afetam permanentemente sua conta.
              </Text>

              {deleteStep === "idle" ? (
                <TouchableOpacity
                  onPress={() => setDeleteStep("confirm")}
                  accessibilityRole="button"
                  accessibilityLabel="Excluir minha conta"
                  className="min-h-[44px] justify-center"
                >
                  <Text className="text-sm text-red-600">Excluir minha conta</Text>
                </TouchableOpacity>
              ) : (
                // Card de confirmação — 2 passos verbatim _DeleteAccountButton.tsx
                <View className="rounded-xl border border-red-200 bg-red-50 p-4">
                  <Text className="mb-1 font-semibold text-red-600">Excluir conta permanentemente</Text>
                  <Text className="mb-4 text-sm text-muted">
                    Seus dados pessoais serão removidos. Histórico de locações concluídas é mantido
                    por obrigação fiscal. Esta ação não pode ser desfeita.
                  </Text>

                  {deleteError ? (
                    <View className="mb-3 rounded-xl bg-red-100 px-3 py-2">
                      <Text className="text-sm text-red-600">{deleteError}</Text>
                    </View>
                  ) : null}

                  <View className="flex-row gap-3">
                    <TouchableOpacity
                      onPress={handleDelete}
                      disabled={deleteStep === "loading"}
                      accessibilityRole="button"
                      accessibilityLabel="Confirmar exclusão"
                      className="min-h-[44px] flex-1 items-center justify-center rounded-xl bg-red-600"
                      style={{ opacity: deleteStep === "loading" ? 0.5 : 1 }}
                    >
                      {deleteStep === "loading"
                        ? <ActivityIndicator size="small" color="#ffffff" />
                        : <Text className="text-sm font-semibold text-white">Confirmar exclusão</Text>
                      }
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => { setDeleteStep("idle"); setDeleteError(null) }}
                      disabled={deleteStep === "loading"}
                      accessibilityRole="button"
                      accessibilityLabel="Cancelar"
                      className="min-h-[44px] items-center justify-center rounded-xl border border-border px-4"
                      style={{ opacity: deleteStep === "loading" ? 0.5 : 1 }}
                    >
                      <Text className="text-sm font-semibold text-foreground">Cancelar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  )
}
