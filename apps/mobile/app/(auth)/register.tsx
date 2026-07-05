// Fonte: app/(auth)/cadastro/RegisterForm.tsx + app/(auth)/layout.tsx +
//        app/(auth)/login.tsx (convenções visuais já aprovadas da tela irmã)
//
// Resolve a decisão D1 do handoff (docs/design/mobile-app-handoff.md §5): a tela
// antes redirecionava para o site via Linking.openURL porque o fluxo original do
// site depende de signIn("credentials") do next-auth (cookie de sessão, só
// funciona em browser) e redireciona para /bem-vindo (rota web sem equivalente
// nativo). Aqui a criação de conta usa a MESMA rota server-side
// (POST /api/auth/register, mesmo body/validação/erros do site) e o "auto-login"
// pós-cadastro usa o login JWT nativo já existente (useAuth().login →
// /api/auth/mobile/login), navegando para /(tabs) — o mesmo destino pós-login
// normal — em vez de /bem-vindo.
//
// Campo a campo, verbatim de RegisterForm.tsx: Nome completo, E-mail, Senha
// (com indicador de força + olho mostrar/ocultar), Cidade/Estado, aviso LGPD,
// checkbox de consentimento (Termos + Privacidade + versão), checkbox de idade
// 18+, botão "Criar conta", linha do DPO, banner de indicação (?ref=CODIGO).

import { useState } from "react"
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, Linking, StyleSheet,
  type TextInputProps,
} from "react-native"
import { Image } from "expo-image"
import { router, useLocalSearchParams } from "expo-router"
import Svg, { Path, Circle, Polyline } from "react-native-svg"
import { useAuth } from "@/lib/auth"
import { useTheme, type Tokens } from "@/lib/theme"
import { API_URL } from "@/lib/api"

// lib/legal-config.ts (site) — não importável do app mobile (pacote separado)
const CONSENT_VERSION = "v1.1"
const DPO_EMAIL = "privacidade@shareo.com.br"

interface FormErrors {
  name?: string
  email?: string
  password?: string
  city?: string
  state?: string
  consent?: string
  ageConfirmed?: string
  form?: string
}

// ── Indicador de força de senha — verbatim de RegisterForm.tsx linhas 24-45 ──
function PasswordHints({ password, tokens }: { password: string; tokens: Tokens }) {
  if (!password) return null
  const checks = [
    { label: "8 caracteres", ok: password.length >= 8 },
    { label: "Letra maiúscula", ok: /[A-Z]/.test(password) },
    { label: "Número", ok: /[0-9]/.test(password) },
  ]
  return (
    <View style={s.hintsRow}>
      {checks.map(({ label, ok }) => (
        <View key={label} style={s.hintItem}>
          <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={ok ? tokens.green : tokens.muted} strokeWidth={3}>
            {ok ? <Polyline points="20 6 9 17 4 12" /> : <Circle cx={12} cy={12} r={10} />}
          </Svg>
          <Text style={[s.hintText, { color: ok ? tokens.green : tokens.muted }]}>{label}</Text>
        </View>
      ))}
    </View>
  )
}

// ── Ícone olho — mesmo componente de login.tsx (LoginForm.tsx linhas 144-151) ─
function EyeIcon({ visible, color }: { visible: boolean; color: string }) {
  const p = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const }
  if (visible) {
    return (
      <Svg {...p}>
        <Path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
        <Path d="m1 1 22 22" />
      </Svg>
    )
  }
  return (
    <Svg {...p}>
      <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <Circle cx={12} cy={12} r={3} />
    </Svg>
  )
}

// ── Campo de texto — mesma convenção visual de login.tsx (label maiúscula) ──
function FieldInput({
  label, error, required, tokens, mode, style, ...props
}: {
  label: string
  error?: string
  required?: boolean
  tokens: Tokens
  mode: "light" | "dark"
} & TextInputProps) {
  return (
    <View style={s.field}>
      <Text style={[s.label, { color: tokens.muted }]}>
        {label}
        {required && <Text style={{ color: tokens.error }}> *</Text>}
      </Text>
      <TextInput
        placeholderTextColor={tokens.muted}
        accessibilityLabel={label}
        style={[
          s.input,
          {
            borderColor: error ? tokens.error : tokens.border,
            backgroundColor: error ? (mode === "dark" ? "#2C1515" : "#FFF5F5") : tokens.bg,
            color: tokens.text,
          },
          style,
        ]}
        {...props}
      />
      {error && (
        <Text style={[s.fieldError, { color: tokens.error }]} accessibilityRole="alert">
          {error}
        </Text>
      )}
    </View>
  )
}

// ── Checkbox tipo card — mesmo padrão de kyc.tsx (checkboxRow/checkbox) ──────
function ConsentCard({
  checked, error, tokens, onPress, children, accessibilityLabel,
}: {
  checked: boolean
  error?: string
  tokens: Tokens
  onPress: () => void
  children: React.ReactNode
  accessibilityLabel: string
}) {
  const borderColor = error ? tokens.error : checked ? tokens.green : tokens.border
  const bgColor = error ? (undefined) : checked ? `${tokens.green}0D` : tokens.surface
  return (
    <View>
      <TouchableOpacity
        onPress={onPress}
        style={[s.consentCard, { borderColor, backgroundColor: bgColor }]}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel={accessibilityLabel}
        activeOpacity={0.8}
      >
        <View style={[s.checkbox, { borderColor: checked ? tokens.green : tokens.border, backgroundColor: checked ? tokens.green : tokens.bg }]}>
          {checked && <Text style={s.checkboxMark}>✓</Text>}
        </View>
        <Text style={[s.consentText, { color: tokens.text }]}>{children}</Text>
      </TouchableOpacity>
      {error && (
        <Text style={[s.fieldError, { color: tokens.error }]} accessibilityRole="alert">
          {error}
        </Text>
      )}
    </View>
  )
}

export default function RegisterScreen() {
  const login = useAuth((s) => s.login)
  const { tokens, mode } = useTheme()
  const { ref } = useLocalSearchParams<{ ref?: string }>()
  const referralCode = (ref ?? "").trim().toUpperCase()

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPwd, setShowPwd] = useState(false)
  const [city, setCity] = useState("")
  const [state, setState] = useState("")
  const [consent, setConsent] = useState(false)
  const [ageConfirmed, setAgeConfirmed] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)

  function clearError(key: keyof FormErrors) {
    setErrors((p) => ({ ...p, [key]: undefined }))
  }

  function validate(): FormErrors {
    const errs: FormErrors = {}
    if (!name.trim()) errs.name = "Nome obrigatório"
    if (!email.includes("@")) errs.email = "E-mail inválido"
    if (password.length < 8) errs.password = "Senha muito curta"
    else if (!/[A-Z]/.test(password)) errs.password = "Precisa de letra maiúscula"
    else if (!/[0-9]/.test(password)) errs.password = "Precisa de número"
    if (!city.trim()) errs.city = "Cidade obrigatória"
    if (state.length !== 2) errs.state = "UF inválida (2 letras)"
    if (!consent) errs.consent = "Aceite os termos para continuar"
    if (!ageConfirmed) errs.ageConfirmed = "Confirme que você tem 18 anos ou mais"
    return errs
  }

  async function handleSubmit() {
    const clientErrors = validate()
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors)
      return
    }
    setErrors({})
    setLoading(true)

    const body = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      city: city.trim(),
      state: state.trim().toUpperCase(),
      referralCode: referralCode || undefined,
      consentVersion: CONSENT_VERSION,
    }

    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const json = await res.json()

      if (!res.ok) {
        const code = json.error?.code as string
        const details = json.error?.details as Record<string, string[]> | undefined

        if (code === "VALIDATION_ERROR" && details) {
          const fieldKeys = new Set(["name", "email", "password", "city", "state", "consent", "ageConfirmed"])
          const mapped: FormErrors = {}
          for (const [k, msgs] of Object.entries(details)) {
            if (fieldKeys.has(k)) (mapped as Record<string, string>)[k] = msgs[0]
            else mapped.form = msgs[0]
          }
          setErrors(mapped)
          return
        }

        const MSG: Record<string, string> = {
          EMAIL_ALREADY_EXISTS: "E-mail já cadastrado. Tente fazer login.",
          RATE_LIMITED: "Muitas tentativas. Aguarde um momento e tente novamente.",
        }
        setErrors({ form: MSG[code] ?? "Erro ao criar conta. Tente novamente." })
        return
      }

      // Conta criada — auto-login nativo (JWT), equivalente ao signIn+/bem-vindo do site
      try {
        await login(body.email, password)
        router.replace("/(tabs)")
      } catch {
        // Conta foi criada, mas o login automático falhou — usuário loga manualmente
        router.replace("/(auth)/login")
      }
    } catch {
      setErrors({ form: "Erro de conexão. Verifique sua internet e tente novamente." })
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={[s.flex, { backgroundColor: tokens.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={s.flex}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo solta — transcrita de AuthLayout (sem caixa navy), igual login.tsx */}
        <View style={s.logoWrap}>
          <Image
            source={require("../../assets/shareo-logo.png")}
            style={s.logo}
            contentFit="contain"
            accessibilityLabel="ShareO"
          />
          <Text style={[s.slogan, { color: tokens.muted }]}>Use Mais. Possua Menos.</Text>
        </View>

        <View style={[s.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
          {/* "← Voltar para o início" — verbatim de RegisterForm.tsx linhas 178-186 */}
          <TouchableOpacity
            style={s.backHomeLink}
            onPress={() => router.back()}
            accessibilityRole="link"
            accessibilityLabel="Voltar para o início"
          >
            <Text style={[s.backHomeLinkText, { color: tokens.muted }]}>← Voltar para o início</Text>
          </TouchableOpacity>

          {/* Título + subtítulo — verbatim de RegisterForm.tsx linhas 189-192 */}
          <Text style={[s.cardTitle, { color: tokens.navy }]}>Criar conta</Text>
          <Text style={[s.cardSubtitle, { color: tokens.muted }]}>
            É grátis e leva menos de 1 minuto — só o essencial para começar a explorar.
          </Text>

          {/* Banner de indicação — verbatim de RegisterForm.tsx linhas 194-206 */}
          {referralCode !== "" && (
            <View style={[s.referralBox, { borderColor: `${tokens.green}4D`, backgroundColor: `${tokens.green}0D` }]}>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={tokens.green} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <Circle cx={9} cy={7} r={4} />
                <Path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <Path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </Svg>
              <Text style={[s.referralText, { color: tokens.green }]}>
                Você foi convidado com o código <Text style={s.referralCode}>{referralCode}</Text>. A indicação será registrada automaticamente.
              </Text>
            </View>
          )}

          {/* Erro de formulário — verbatim de RegisterForm.tsx linhas 209-213 */}
          {errors.form && (
            <View
              style={[s.errorBox, {
                backgroundColor: mode === "dark" ? "#2C1515" : "#FEE2E2",
                borderColor: mode === "dark" ? "#5B2020" : "#FECACA",
              }]}
              accessibilityRole="alert"
            >
              <Text style={[s.errorText, { color: tokens.error }]}>{errors.form}</Text>
            </View>
          )}

          {/* Nome completo — verbatim de RegisterForm.tsx linhas 215-225 */}
          <FieldInput
            label="Nome completo"
            placeholder="Ana Souza"
            autoComplete="name"
            required
            tokens={tokens}
            mode={mode}
            value={name}
            onChangeText={(v) => { setName(v); clearError("name") }}
            error={errors.name}
            editable={!loading}
          />

          {/* E-mail — verbatim de RegisterForm.tsx linhas 227-237 */}
          <FieldInput
            label="E-mail"
            placeholder="seu@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            required
            tokens={tokens}
            mode={mode}
            value={email}
            onChangeText={(v) => { setEmail(v); clearError("email") }}
            error={errors.email}
            editable={!loading}
          />

          {/* Senha com olho + indicador de força — verbatim de RegisterForm.tsx linhas 240-265 */}
          <View style={s.field}>
            <Text style={[s.label, { color: tokens.muted }]}>
              Senha<Text style={{ color: tokens.error }}> *</Text>
            </Text>
            <View style={[
              s.inputWrap,
              {
                borderColor: errors.password ? tokens.error : tokens.border,
                backgroundColor: errors.password ? (mode === "dark" ? "#2C1515" : "#FFF5F5") : tokens.bg,
              },
            ]}>
              <TextInput
                value={password}
                onChangeText={(v) => { setPassword(v); clearError("password") }}
                placeholder="Mín. 8 caracteres"
                placeholderTextColor={tokens.muted}
                secureTextEntry={!showPwd}
                autoComplete="password-new"
                editable={!loading}
                accessibilityLabel="Senha"
                style={[s.input, s.inputInner, { color: tokens.text }]}
              />
              <TouchableOpacity
                onPress={() => setShowPwd((v) => !v)}
                style={s.eyeBtn}
                accessibilityRole="button"
                accessibilityLabel={showPwd ? "Ocultar senha" : "Mostrar senha"}
              >
                <EyeIcon visible={showPwd} color={tokens.muted} />
              </TouchableOpacity>
            </View>
            {errors.password ? (
              <Text style={[s.fieldError, { color: tokens.error }]} accessibilityRole="alert">
                {errors.password}
              </Text>
            ) : (
              <PasswordHints password={password} tokens={tokens} />
            )}
          </View>

          {/* Cidade / Estado — verbatim de RegisterForm.tsx linhas 267-296 */}
          <View style={s.row}>
            <View style={s.rowCity}>
              <FieldInput
                label="Cidade"
                placeholder="Sua cidade"
                autoComplete="address-line1"
                required
                tokens={tokens}
                mode={mode}
                value={city}
                onChangeText={(v) => { setCity(v); clearError("city") }}
                error={errors.city}
                editable={!loading}
              />
            </View>
            <View style={s.rowState}>
              <FieldInput
                label="Estado"
                placeholder="UF"
                maxLength={2}
                autoCapitalize="characters"
                required
                tokens={tokens}
                mode={mode}
                value={state}
                onChangeText={(v) => { setState(v.toUpperCase()); clearError("state") }}
                error={errors.state}
                editable={!loading}
              />
            </View>
          </View>

          {/* LGPD — finalidade no ponto de coleta, verbatim de RegisterForm.tsx linhas 298-304 */}
          <Text style={[s.lgpdText, { color: tokens.muted, backgroundColor: mode === "dark" ? tokens.disabledBg : "#F1F5F9" }]}>
            Usamos seus dados apenas para criar e manter sua conta, viabilizar locações e garantir
            segurança jurídica — detalhes na{" "}
            <Text style={{ color: tokens.green, fontWeight: "600" }} onPress={() => Linking.openURL(`${API_URL}/privacidade`)}>
              Política de Privacidade
            </Text>
            . Dados de pagamento e documento (CPF) só serão pedidos quando você anunciar ou alugar.
          </Text>

          {/* Consentimento LGPD — verbatim de RegisterForm.tsx linhas 306-339 */}
          <ConsentCard
            checked={consent}
            error={errors.consent}
            tokens={tokens}
            accessibilityLabel="Li e aceito os Termos de Uso e a Política de Privacidade"
            onPress={() => { setConsent((v) => !v); clearError("consent") }}
          >
            Li e aceito os{" "}
            <Text style={{ color: tokens.green, fontWeight: "600" }} onPress={() => Linking.openURL(`${API_URL}/termos`)}>
              Termos de Uso
            </Text>
            {" "}e a{" "}
            <Text style={{ color: tokens.green, fontWeight: "600" }} onPress={() => Linking.openURL(`${API_URL}/privacidade`)}>
              Política de Privacidade
            </Text>
            {" "}({CONSENT_VERSION}) <Text style={{ color: tokens.error }}>*</Text>
          </ConsentCard>

          {/* Confirmação de idade — verbatim de RegisterForm.tsx linhas 341-371 */}
          <ConsentCard
            checked={ageConfirmed}
            error={errors.ageConfirmed}
            tokens={tokens}
            accessibilityLabel="Declaro que tenho 18 anos ou mais"
            onPress={() => { setAgeConfirmed((v) => !v); clearError("ageConfirmed") }}
          >
            Declaro que tenho <Text style={{ fontWeight: "700" }}>18 anos ou mais</Text>{" "}
            <Text style={{ color: tokens.error }}>*</Text>
          </ConsentCard>

          {/* Botão Criar conta — verbatim de RegisterForm.tsx linhas 373-375 */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
            style={[s.btnPrimary, { backgroundColor: tokens.green }, loading && s.btnDisabled]}
            accessibilityRole="button"
            accessibilityLabel="Criar conta"
            accessibilityState={{ disabled: loading }}
          >
            <Text style={s.btnText}>{loading ? "Criando conta…" : "Criar conta"}</Text>
          </TouchableOpacity>

          {/* DPO — verbatim de RegisterForm.tsx linhas 377-381 */}
          <Text style={[s.dpoText, { color: tokens.muted }]}>
            Encarregado de Dados (DPO):{" "}
            <Text style={{ color: tokens.green }} onPress={() => Linking.openURL(`mailto:${DPO_EMAIL}`)}>
              {DPO_EMAIL}
            </Text>
          </Text>
        </View>

        {/* Já tem conta — verbatim de RegisterForm.tsx linhas 384-392 */}
        <View style={s.loginRow}>
          <Text style={[s.loginLabel, { color: tokens.muted }]}>Já tem conta? </Text>
          <TouchableOpacity onPress={() => router.replace("/(auth)/login")} accessibilityRole="link">
            <Text style={[s.loginLink, { color: tokens.green }]}>Entrar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, paddingVertical: 32 },
  logoWrap: { alignItems: "center", marginBottom: 24 },
  logo: { width: 160, height: 48 },
  slogan: { marginTop: 8, fontSize: 11, fontWeight: "600", letterSpacing: 1, textTransform: "uppercase" },
  card: { borderRadius: 16, borderWidth: 1, padding: 24 },
  backHomeLink: { alignSelf: "flex-start", minHeight: 32, marginBottom: 8, justifyContent: "center" },
  backHomeLinkText: { fontSize: 13 },
  cardTitle: { fontSize: 22, fontFamily: "Montserrat_700Bold", textAlign: "center", marginBottom: 4 },
  cardSubtitle: { fontSize: 13, textAlign: "center", marginBottom: 16, lineHeight: 18 },
  referralBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 16,
  },
  referralText: { flex: 1, fontSize: 13, lineHeight: 18 },
  referralCode: { fontWeight: "700" },
  errorBox: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 16 },
  errorText: { fontSize: 13 },
  field: { marginBottom: 16 },
  label: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 16, minHeight: 48, fontSize: 14 },
  fieldError: { fontSize: 11, marginTop: 4 },
  inputWrap: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1, borderRadius: 10, minHeight: 48, paddingHorizontal: 16,
  },
  inputInner: { flex: 1, borderWidth: 0, padding: 0, minHeight: 44 },
  eyeBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  hintsRow: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 6 },
  hintItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  hintText: { fontSize: 11 },
  row: { flexDirection: "row", gap: 12 },
  rowCity: { flex: 2 },
  rowState: { flex: 1 },
  lgpdText: { fontSize: 11, lineHeight: 16, borderRadius: 8, padding: 10, marginBottom: 16 },
  consentCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 4,
  },
  checkbox: {
    width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, marginTop: 1,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  checkboxMark: { fontSize: 12, fontWeight: "700", color: "#FFFFFF" },
  consentText: { flex: 1, fontSize: 13, lineHeight: 18 },
  btnPrimary: { borderRadius: 10, minHeight: 52, alignItems: "center", justifyContent: "center", marginTop: 12 },
  btnDisabled: { opacity: 0.55 },
  btnText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
  dpoText: { fontSize: 11, textAlign: "center", marginTop: 12 },
  loginRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 24 },
  loginLabel: { fontSize: 13 },
  loginLink: { fontSize: 13, fontWeight: "600" },
})
