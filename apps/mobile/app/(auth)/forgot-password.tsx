// Fonte: app/(auth)/esqueci-senha/_ForgotPasswordForm.tsx
// Transcrição do formulário de recuperação de senha do site.
// NOTA: o site usa /esqueci-senha, o arquivo mobile chama forgot-password — apenas nomenclatura,
//       o CONTEÚDO da tela (labels, estados, validação, CTA) é transcrito verbatim do site.
//
// Correspondência elemento-por-elemento:
//   site linha 77: "Recuperar senha"         → <Text s.title>Recuperar senha</Text>
//   site linha 79: "Informe seu e-mail..."   → <Text s.desc>Informe seu e-mail...</Text>
//   site linha 93: Input label "E-mail"       → <Text s.label>E-mail</Text>
//   site linha 101: Button "Enviar link..."  → <TouchableOpacity>Enviar link de recuperação</TouchableOpacity>
//   site linha 107: "Lembrou a senha? Entrar" → link na parte inferior
//   site estado sent linha 43: "Verifique seu e-mail" + e-mail interpolado + "tente novamente" + "← Voltar para o login"

import { useState } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from "react-native"
import { router } from "expo-router"
import { API_URL } from "@/lib/api"
import { useTheme } from "@/lib/theme"
import Svg, { Path, Rect, Polyline } from "react-native-svg"

// ── Ícone cadeado — transcrito de _ForgotPasswordForm.tsx (ícone decorativo no topo) ──
function LockIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <Path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </Svg>
  )
}

// ── Ícone envelope — transcrito de _ForgotPasswordForm.tsx estado enviado ──
function MailIcon({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
      <Polyline points="22,6 12,13 2,6"/>
    </Svg>
  )
}

export default function ForgotPasswordScreen() {
  const { tokens } = useTheme()

  const [email,   setEmail]   = useState("")
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState("")

  // Validação verbatim da lógica do site — _ForgotPasswordForm.tsx linha 16
  async function handleSubmit() {
    if (!email.includes("@")) {
      setError("E-mail inválido")
      return
    }
    setError("")
    setLoading(true)
    try {
      await fetch(`${API_URL}/api/auth/forgot-password`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: email.trim().toLowerCase() }),
      })
      // Sempre mostra sucesso — a API não vaza se o e-mail existe ou não
      setSent(true)
    } catch {
      setError("Falha de conexão. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  // ── Estado: enviado ──────────────────────────────────────────────────────────
  // Transcrito de _ForgotPasswordForm.tsx linhas 34-65
  if (sent) {
    return (
      <ScrollView
        style={[s.scroll, { backgroundColor: tokens.bg }]}
        contentContainerStyle={s.sentContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Ícone envelope verde — transcrito do estado sent do site */}
        <View style={[s.iconCircle, { backgroundColor: `${tokens.green}1A` }]}>
          <MailIcon color={tokens.green} />
        </View>
        <Text style={[s.sentTitle, { color: tokens.navy }]}>Verifique seu e-mail</Text>
        <Text style={[s.sentDesc, { color: tokens.muted }]}>
          Se <Text style={{ color: tokens.text, fontWeight: "600" }}>{email}</Text> estiver cadastrado,
          você receberá as instruções para redefinir a senha em breve.
        </Text>
        <Text style={[s.sentHint, { color: tokens.muted }]}>
          Não recebeu? Verifique a caixa de spam ou{" "}
          <Text
            style={{ color: tokens.green }}
            onPress={() => { setSent(false); setEmail("") }}
            accessibilityRole="link"
          >
            tente novamente
          </Text>
          .
        </Text>
        {/* "← Voltar para o login" — verbatim do site linha 58 */}
        <TouchableOpacity
          style={[s.backToLoginBtn, { marginTop: 24 }]}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Voltar para o login"
        >
          <Text style={[s.backToLoginText, { color: tokens.green }]}>← Voltar para o login</Text>
        </TouchableOpacity>
      </ScrollView>
    )
  }

  // ── Estado: formulário ───────────────────────────────────────────────────────
  // Transcrito de _ForgotPasswordForm.tsx linhas 68-114
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
        {/* Botão Voltar — link de retorno no topo (sem header/nav nas telas de auth) */}
        <TouchableOpacity
          style={s.back}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
        >
          <Text style={[s.backText, { color: tokens.muted }]}>← Voltar</Text>
        </TouchableOpacity>

        {/* Card — correspondente ao card do site linhas 69-113 */}
        <View style={[s.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>

          {/* Ícone cadeado no topo — transcrito do site linhas 71-73 */}
          <View style={s.iconWrap}>
            <View style={[s.iconCircle, { backgroundColor: `${tokens.navy}1A` }]}>
              <LockIcon color={tokens.navy} />
            </View>
          </View>

          {/* Título "Recuperar senha" — verbatim do site linha 77 */}
          <Text style={[s.title, { color: tokens.navy }]}>Recuperar senha</Text>
          {/* Subtítulo — verbatim do site linha 79 */}
          <Text style={[s.desc, { color: tokens.muted }]}>
            Informe seu e-mail e enviaremos um link para criar uma nova senha.
          </Text>

          {/* Erro inline — alerta acessível, verbatim do site linha 85 */}
          {error !== "" && (
            <View
              style={[s.errorBox, { borderColor: `${tokens.error}4D`, backgroundColor: `${tokens.error}1A` }]}
              accessibilityRole="alert"
            >
              <Text style={[s.errorText, { color: tokens.error }]}>{error}</Text>
            </View>
          )}

          {/* Campo E-mail — verbatim label do site linha 91 */}
          <View style={s.field}>
            <Text style={[s.label, { color: tokens.muted }]}>E-mail</Text>
            <TextInput
              style={[
                s.input,
                { borderColor: error ? tokens.error : tokens.border, backgroundColor: tokens.bg, color: tokens.text },
              ]}
              placeholder="seu@email.com"
              placeholderTextColor={tokens.muted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              value={email}
              onChangeText={(v) => { setEmail(v); setError("") }}
              editable={!loading}
              returnKeyType="send"
              onSubmitEditing={handleSubmit}
              accessibilityLabel="E-mail"
            />
          </View>

          {/* CTA — verbatim do site linha 101-103: "Enviar link de recuperação" */}
          <TouchableOpacity
            style={[
              s.btnPrimary,
              { backgroundColor: loading ? `${tokens.green}80` : tokens.green },
            ]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Enviar link de recuperação"
            accessibilityState={{ disabled: loading }}
          >
            <Text style={s.btnText}>
              {loading ? "Enviando…" : "Enviar link de recuperação"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* "Lembrou a senha? Entrar" — verbatim do site linhas 107-110 */}
        <View style={s.footer}>
          <Text style={[s.footerText, { color: tokens.muted }]}>Lembrou a senha? </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            accessibilityRole="link"
            accessibilityLabel="Entrar"
          >
            <Text style={[s.footerLink, { color: tokens.green }]}>Entrar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  flex:    { flex: 1 },
  scroll:  { flex: 1 },

  // Formulário
  content: {
    flexGrow:          1,
    justifyContent:    "center",
    paddingHorizontal: 24,
    paddingVertical:   32,
  },
  back: {
    alignSelf:     "flex-start",
    minHeight:     44,
    justifyContent: "center",
    marginBottom:  8,
  },
  backText: {
    fontSize: 14,
  },
  card: {
    borderRadius: 16,
    borderWidth:  1,
    padding:      24,
    gap:          16,
  },
  iconWrap: {
    alignItems: "center",
  },
  iconCircle: {
    width:          48,
    height:         48,
    borderRadius:   24,
    alignItems:     "center",
    justifyContent: "center",
  },
  title: {
    fontSize:   24,
    fontFamily: "Montserrat_700Bold",
    textAlign:  "center",
  },
  desc: {
    fontSize:   14,
    lineHeight: 20,
    textAlign:  "center",
  },
  errorBox: {
    borderRadius:  8,
    borderWidth:   1,
    paddingHorizontal: 16,
    paddingVertical:   12,
  },
  errorText: {
    fontSize: 13,
    lineHeight: 18,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize:      11,
    fontWeight:    "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  input: {
    borderWidth:       1,
    borderRadius:      10,
    paddingHorizontal: 16,
    minHeight:         48,
    fontSize:          14,
  },
  btnPrimary: {
    borderRadius:    10,
    minHeight:       52,
    alignItems:      "center",
    justifyContent:  "center",
  },
  btnText: {
    fontSize:   15,
    fontWeight: "700",
    color:      "#FFFFFF",
  },
  footer: {
    flexDirection:  "row",
    justifyContent: "center",
    alignItems:     "center",
    marginTop:      24,
  },
  footerText: {
    fontSize: 14,
  },
  footerLink: {
    fontSize:   14,
    fontWeight: "600",
  },

  // Estado enviado
  sentContent: {
    flexGrow:          1,
    alignItems:        "center",
    justifyContent:    "center",
    paddingHorizontal: 32,
    paddingVertical:   48,
    gap:               12,
  },
  sentTitle: {
    fontSize:   20,
    fontFamily: "Montserrat_700Bold",
    marginTop:  8,
    textAlign:  "center",
  },
  sentDesc: {
    fontSize:   14,
    lineHeight: 20,
    textAlign:  "center",
  },
  sentHint: {
    fontSize:   12,
    lineHeight: 18,
    textAlign:  "center",
    marginTop:  4,
  },
  backToLoginBtn: {
    paddingVertical: 8,
  },
  backToLoginText: {
    fontSize:   14,
    fontWeight: "600",
  },
})
