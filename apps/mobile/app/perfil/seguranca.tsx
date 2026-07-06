// Fonte: app/perfil/seguranca/page.tsx, app/perfil/seguranca/_ChangeEmailForm.tsx,
//        app/perfil/seguranca/_ChangePasswordForm.tsx,
//        app/perfil/seguranca/_ResendVerificationButton.tsx,
//        app/perfil/_DeleteAccountButton.tsx
//
// Regra CLAUDE.md: transcrição literal do site em 375px.
// Rótulos, textos, fluxos e mensagens verbatim dos arquivos-fonte.
// Admins veem form de senha (ChangePasswordForm); não-admins veem link forgot-password.
// Zona de perigo (delete 2-passos) oculta para admins — idêntico ao site.
//
// Revisão s41 (dark mode): reescrita de NativeWind `className` (cores hex fixas
// de light no tailwind.config, não reagem ao ThemeContext → dark mode quebrado)
// para StyleSheet + useTheme(), como as ~35 outras telas. Superfícies/textos/
// bordas usam tokens; badges e callouts de status (verde/amarelo/vermelho/âmbar)
// ficam em hex fixo, igual ao site (que não tem variantes dark nesses elementos).
// Lógica, handlers e rótulos preservados verbatim.

import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
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

// Paleta fixa (light-only, paridade com o site — badges/callouts sem variante dark)
const C = {
  greenText:   "#15803D",
  greenBadgeBg:"#DCFCE7",
  greenCardBg: "#F0FDF4",
  yellowText:  "#854D0E",
  yellowBadgeBg:"#FEF9C3",
  yellowBtnBorder:"#FACC15",
  yellowBtnBg: "#FEFCE8",
  redText:     "#DC2626",
  redBorder:   "#FECACA",
  redCardBg:   "#FEF2F2",
  redErrBg:    "#FEE2E2",
  amberBorder: "#FDE68A",
  amberBg:     "#FFFBEB",
  amberText:   "#92400E",
}

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

  // Estilo de input reutilizável (bg-background + border-border + text-foreground)
  const inputStyle = [s.input, { borderColor: tokens.border, backgroundColor: tokens.bg, color: tokens.text }]

  // ── Guard: não autenticado ─────────────────────────────────────────────────
  if (!user) {
    return (
      <View style={[s.gate, { backgroundColor: tokens.bg, paddingTop: insets.top }]}>
        <Text style={s.gateEmoji}>🔒</Text>
        <Text style={[s.gateTitle, { color: tokens.navy }]}>Faça login para acessar</Text>
        <TouchableOpacity
          style={[s.gateBtn, { backgroundColor: tokens.green }]}
          onPress={() => router.push("/(auth)/login")}
          accessibilityRole="button"
          accessibilityLabel="Entrar"
        >
          <Text style={s.whiteBold}>Entrar</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={[s.root, { backgroundColor: tokens.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* ── Header — verbatim de kyc.tsx ── */}
      <View
        style={[
          s.header,
          { backgroundColor: tokens.surface, borderBottomColor: tokens.border, paddingTop: insets.top + 8 },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityLabel="Voltar"
          accessibilityRole="button"
          style={s.backBtn}
        >
          <Text style={[s.backIcon, { color: tokens.muted }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: tokens.navy }]}>Login e Segurança</Text>
      </View>

      {meLoading ? (
        <View style={s.loading}>
          <ActivityIndicator size="large" color={tokens.green} />
        </View>
      ) : (
        <ScrollView
          style={s.flex1}
          contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── Seção E-mail ─────────────────────────────────────────────── */}
          {/* Fonte: app/perfil/seguranca/page.tsx + _ChangeEmailForm.tsx + _ResendVerificationButton.tsx */}
          <View style={[s.card, { borderColor: tokens.border, backgroundColor: tokens.surface }]}>
            <Text style={[s.cardTitle, { color: tokens.text }]}>E-mail</Text>

            {/* E-mail mascarado + badge Verificado/Pendente */}
            <View style={s.rowBetween}>
              <View style={s.emailInfo}>
                <Text style={[s.emailText, { color: tokens.text }]}>
                  {meData?.email ? maskEmail(meData.email) : maskEmail(user.email)}
                </Text>
                {meData?.createdAt ? (
                  <Text style={[s.metaText, { color: tokens.muted }]}>
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
                <View style={[s.badge, { backgroundColor: C.greenBadgeBg }]}>
                  <Text style={[s.badgeText, { color: C.greenText }]}>Verificado</Text>
                </View>
              ) : (
                <View style={[s.badge, { backgroundColor: C.yellowBadgeBg }]}>
                  <Text style={[s.badgeText, { color: C.yellowText }]}>Pendente</Text>
                </View>
              )}
            </View>

            {/* ResendVerificationButton — só se e-mail não verificado */}
            {!meData?.emailVerified && (
              <View style={[s.divTop, { borderTopColor: tokens.border }]}>
                <Text style={[s.smallMuted, { color: tokens.muted }]}>
                  Confirme seu e-mail para poder realizar reservas na plataforma.
                </Text>
                {resendState === "success" ? (
                  <Text style={[s.sm, { color: C.greenText }]}>
                    E-mail de verificação enviado. Verifique sua caixa de entrada e a pasta de spam.
                  </Text>
                ) : resendState === "error" ? (
                  <Text style={[s.sm, { color: C.redText }]}>{resendError}</Text>
                ) : (
                  <TouchableOpacity
                    onPress={handleResend}
                    disabled={resendState === "loading"}
                    accessibilityRole="button"
                    accessibilityLabel="Reenviar e-mail de verificação"
                    style={[s.resendBtn, { borderColor: C.yellowBtnBorder, backgroundColor: C.yellowBtnBg, opacity: resendState === "loading" ? 0.6 : 1 }]}
                  >
                    <Text style={[s.badgeText, { color: C.yellowText }]}>
                      {resendState === "loading" ? "Enviando..." : "Reenviar e-mail de verificação"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* ChangeEmailForm */}
            {emailSuccess ? (
              <View style={[s.divTop, { borderTopColor: tokens.border }]}>
                <View style={[s.successCard, { backgroundColor: C.greenCardBg }]}>
                  <Text style={[s.sm, { color: C.greenText }]}>
                    E-mail alterado! Enviamos um link de verificação para o novo endereço.{"\n"}
                    Você será desconectado em instantes para fazer login novamente.
                  </Text>
                </View>
              </View>
            ) : !emailOpen ? (
              <View style={[s.divTop, { borderTopColor: tokens.border }]}>
                <TouchableOpacity
                  onPress={() => setEmailOpen(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Alterar e-mail"
                  style={s.linkBtn}
                >
                  <Text style={[s.linkAction, { color: tokens.success }]}>Alterar e-mail</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={[s.divTop, { borderTopColor: tokens.border }]}>
                {/* Aviso de verificação — verbatim _ChangeEmailForm.tsx */}
                <View style={[s.warnCard, { borderColor: C.amberBorder, backgroundColor: C.amberBg }]}>
                  <Text style={[s.sm, { color: C.amberText }]}>
                    ⚠️ O novo e-mail precisará ser{" "}
                    <Text style={s.bold}>verificado</Text>{" "}
                    antes de ser ativado. Você receberá um link de confirmação no novo endereço
                    e será desconectado para fazer login novamente.
                  </Text>
                </View>

                <Text style={[s.fieldLabel, { color: tokens.muted }]}>Novo e-mail</Text>
                <TextInput
                  value={newEmail}
                  onChangeText={(v) => { setNewEmail(v); setEmailError("") }}
                  placeholder="novo@email.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  editable={!emailLoading}
                  accessibilityLabel="Novo e-mail"
                  style={inputStyle}
                  placeholderTextColor={tokens.muted}
                />

                <Text style={[s.fieldLabel, { color: tokens.muted }]}>Confirme sua senha</Text>
                <TextInput
                  value={emailPwd}
                  onChangeText={(v) => { setEmailPwd(v); setEmailError("") }}
                  placeholder="Sua senha atual"
                  secureTextEntry
                  autoComplete="current-password"
                  editable={!emailLoading}
                  accessibilityLabel="Confirme sua senha"
                  style={inputStyle}
                  placeholderTextColor={tokens.muted}
                />

                {emailError ? (
                  <Text style={[s.errText, { color: C.redText }]} accessibilityRole="alert">
                    {emailError}
                  </Text>
                ) : null}

                <View style={s.btnRow}>
                  <TouchableOpacity
                    onPress={handleChangeEmail}
                    disabled={emailLoading || !newEmail || !emailPwd}
                    accessibilityRole="button"
                    accessibilityLabel="Confirmar alteração"
                    style={[s.primaryBtn, { backgroundColor: tokens.navy, opacity: emailLoading || !newEmail || !emailPwd ? 0.5 : 1 }]}
                  >
                    {emailLoading
                      ? <ActivityIndicator size="small" color="#ffffff" />
                      : <Text style={s.primaryBtnText}>Confirmar alteração</Text>
                    }
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => { setEmailOpen(false); setNewEmail(""); setEmailPwd(""); setEmailError("") }}
                    disabled={emailLoading}
                    accessibilityRole="button"
                    accessibilityLabel="Cancelar"
                    style={[s.cancelBtn, { borderColor: tokens.border, opacity: emailLoading ? 0.5 : 1 }]}
                  >
                    <Text style={[s.sm, { color: tokens.muted }]}>Cancelar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* ── Seção Senha ──────────────────────────────────────────────── */}
          {/* Fonte: app/perfil/seguranca/page.tsx + _ChangePasswordForm.tsx */}
          <View style={[s.card, { borderColor: tokens.border, backgroundColor: tokens.surface }]}>
            <Text style={[s.cardTitleTight, { color: tokens.text }]}>Senha</Text>

            {isAdmin ? (
              // Admins: form de troca de senha (verbatim _ChangePasswordForm.tsx)
              <>
                <Text style={[s.sectionDesc, { color: tokens.muted }]}>
                  Altere sua senha de acesso ao painel admin.
                </Text>

                <Text style={[s.fieldLabel, { color: tokens.muted }]}>Senha atual</Text>
                <TextInput
                  value={pwdCurrent}
                  onChangeText={setPwdCurrent}
                  secureTextEntry
                  autoComplete="current-password"
                  editable={!pwdLoading}
                  accessibilityLabel="Senha atual"
                  style={inputStyle}
                  placeholderTextColor={tokens.muted}
                />

                <Text style={[s.fieldLabel, { color: tokens.muted }]}>Nova senha</Text>
                <TextInput
                  value={pwdNew}
                  onChangeText={setPwdNew}
                  secureTextEntry
                  autoComplete="new-password"
                  editable={!pwdLoading}
                  accessibilityLabel="Nova senha"
                  style={inputStyle}
                  placeholderTextColor={tokens.muted}
                />

                <Text style={[s.fieldLabel, { color: tokens.muted }]}>Confirmar nova senha</Text>
                <TextInput
                  value={pwdConfirm}
                  onChangeText={setPwdConfirm}
                  secureTextEntry
                  autoComplete="new-password"
                  editable={!pwdLoading}
                  accessibilityLabel="Confirmar nova senha"
                  style={inputStyle}
                  placeholderTextColor={tokens.muted}
                />

                {pwdError   ? <Text style={[s.errText, { color: C.redText }]}>{pwdError}</Text> : null}
                {pwdSuccess ? <Text style={[s.errText, { color: C.greenText }]}>Senha alterada. Redirecionando para o login…</Text> : null}

                <TouchableOpacity
                  onPress={handleChangePassword}
                  disabled={pwdLoading}
                  accessibilityRole="button"
                  accessibilityLabel="Salvar nova senha"
                  style={[s.primaryBtnLg, { backgroundColor: tokens.navy, opacity: pwdLoading ? 0.5 : 1 }]}
                >
                  {pwdLoading
                    ? <ActivityIndicator size="small" color="#ffffff" />
                    : <Text style={s.primaryBtnText}>Salvar nova senha</Text>
                  }
                </TouchableOpacity>
              </>
            ) : (
              // Não-admins: link para recuperação de senha (verbatim page.tsx)
              <>
                <Text style={[s.sectionDesc, { color: tokens.muted }]}>
                  Para alterar sua senha, use o fluxo de recuperação de senha.
                </Text>
                <TouchableOpacity
                  onPress={() => router.push("/(auth)/forgot-password")}
                  accessibilityRole="button"
                  accessibilityLabel="Alterar senha"
                  style={[s.outlineBtn, { borderColor: tokens.border }]}
                >
                  <Text style={[s.smSemibold, { color: tokens.text }]}>Alterar senha</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* ── Zona de perigo — oculta para admins (verbatim page.tsx) ── */}
          {/* Fonte: app/perfil/_DeleteAccountButton.tsx */}
          {!isAdmin && (
            <View style={[s.card, { borderColor: C.redBorder, backgroundColor: tokens.surface }]}>
              <Text style={[s.cardTitleTight, { color: C.redText }]}>Zona de perigo</Text>
              <Text style={[s.sectionDesc, { color: tokens.muted }]}>
                Ações irreversíveis que afetam permanentemente sua conta.
              </Text>

              {deleteStep === "idle" ? (
                <TouchableOpacity
                  onPress={() => setDeleteStep("confirm")}
                  accessibilityRole="button"
                  accessibilityLabel="Excluir minha conta"
                  style={s.linkBtn}
                >
                  <Text style={[s.sm, { color: C.redText }]}>Excluir minha conta</Text>
                </TouchableOpacity>
              ) : (
                // Card de confirmação — 2 passos verbatim _DeleteAccountButton.tsx
                <View style={[s.dangerConfirm, { borderColor: C.redBorder, backgroundColor: C.redCardBg }]}>
                  <Text style={[s.dangerTitle, { color: C.redText }]}>Excluir conta permanentemente</Text>
                  <Text style={[s.sectionDesc, { color: tokens.muted }]}>
                    Seus dados pessoais serão removidos. Histórico de locações concluídas é mantido
                    por obrigação fiscal. Esta ação não pode ser desfeita.
                  </Text>

                  {deleteError ? (
                    <View style={[s.dangerErrBox, { backgroundColor: C.redErrBg }]}>
                      <Text style={[s.sm, { color: C.redText }]}>{deleteError}</Text>
                    </View>
                  ) : null}

                  <View style={s.btnRow3}>
                    <TouchableOpacity
                      onPress={handleDelete}
                      disabled={deleteStep === "loading"}
                      accessibilityRole="button"
                      accessibilityLabel="Confirmar exclusão"
                      style={[s.dangerBtn, { opacity: deleteStep === "loading" ? 0.5 : 1 }]}
                    >
                      {deleteStep === "loading"
                        ? <ActivityIndicator size="small" color="#ffffff" />
                        : <Text style={s.primaryBtnText}>Confirmar exclusão</Text>
                      }
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => { setDeleteStep("idle"); setDeleteError(null) }}
                      disabled={deleteStep === "loading"}
                      accessibilityRole="button"
                      accessibilityLabel="Cancelar"
                      style={[s.cancelBtn, { borderColor: tokens.border, opacity: deleteStep === "loading" ? 0.5 : 1 }]}
                    >
                      <Text style={[s.smSemibold, { color: tokens.text }]}>Cancelar</Text>
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

const s = StyleSheet.create({
  root:  { flex: 1 },
  flex1: { flex: 1 },

  // Gate
  gate:      { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  gateEmoji: { fontSize: 48 },
  gateTitle: { marginTop: 12, fontSize: 16, fontWeight: "600" },
  gateBtn:   { marginTop: 24, minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: 12, paddingHorizontal: 32 },
  whiteBold: { fontWeight: "700", color: "#FFFFFF" },

  // Header
  header:      { flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, paddingHorizontal: 16, paddingBottom: 12 },
  backBtn:     { minHeight: 44, minWidth: 44, alignItems: "center", justifyContent: "center" },
  backIcon:    { fontSize: 28, fontWeight: "700", lineHeight: 30 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "700" },

  loading: { flex: 1, alignItems: "center", justifyContent: "center" },

  // Cards de seção
  card:          { marginBottom: 16, borderRadius: 12, borderWidth: 1, padding: 20 },
  cardTitle:     { marginBottom: 16, fontWeight: "600" },
  cardTitleTight:{ marginBottom: 4, fontWeight: "600" },
  sectionDesc:   { marginBottom: 16, fontSize: 14 },

  // E-mail row
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  emailInfo:  { marginRight: 12, flex: 1 },
  emailText:  { fontSize: 14, fontWeight: "500" },
  metaText:   { fontSize: 12 },

  badge:     { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: "600" },

  divTop:     { marginTop: 16, borderTopWidth: 1, paddingTop: 16 },
  smallMuted: { marginBottom: 8, fontSize: 12 },
  sm:         { fontSize: 14 },
  smSemibold: { fontSize: 14, fontWeight: "600" },
  bold:       { fontWeight: "700" },

  resendBtn:  { minHeight: 44, alignItems: "center", justifyContent: "center", alignSelf: "flex-start", borderRadius: 12, borderWidth: 1, paddingHorizontal: 16 },

  successCard: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  warnCard:    { marginBottom: 16, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12 },

  linkBtn:    { minHeight: 44, justifyContent: "center" },
  linkAction: { fontSize: 14, fontWeight: "500" },

  fieldLabel: { marginBottom: 4, fontSize: 12, fontWeight: "500" },
  input:      { marginBottom: 12, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14 },
  errText:    { marginBottom: 8, fontSize: 12 },

  btnRow:  { flexDirection: "row", gap: 8 },
  btnRow3: { flexDirection: "row", gap: 12 },

  primaryBtn:     { minHeight: 44, flex: 1, alignItems: "center", justifyContent: "center", borderRadius: 12 },
  primaryBtnLg:   { minHeight: 52, alignItems: "center", justifyContent: "center", borderRadius: 12 },
  primaryBtnText: { fontSize: 14, fontWeight: "600", color: "#FFFFFF" },
  cancelBtn:      { minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: 12, borderWidth: 1, paddingHorizontal: 16 },
  outlineBtn:     { minHeight: 44, alignItems: "center", justifyContent: "center", alignSelf: "flex-start", borderRadius: 12, borderWidth: 1, paddingHorizontal: 16 },

  // Zona de perigo
  dangerConfirm: { borderRadius: 12, borderWidth: 1, padding: 16 },
  dangerTitle:   { marginBottom: 4, fontWeight: "600" },
  dangerErrBox:  { marginBottom: 12, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  dangerBtn:     { minHeight: 44, flex: 1, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: "#DC2626" },
})
