// Fonte: app/(auth)/login/LoginForm.tsx + app/(auth)/layout.tsx
// Transcrição literal do frame "Login" do protótipo (mobile-app-prototipo-v1.html):
// - Logo solta (sem caixa navy) — transcrita de AuthLayout linha 8-17
// - Card branco com formulário
// - Ícone olho de senha — transcrito de LoginForm.tsx linhas 144-151
// - "Esqueci minha senha" inline abaixo da senha
// - Estados erro (alerta inline) e loading (botão desabilitado + spinner)

import { useState } from "react"
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, StyleSheet,
} from "react-native"
import { Image } from "expo-image"
import { Link, router } from "expo-router"
import { useAuth } from "@/lib/auth"
import Svg, { Path, Circle } from "react-native-svg"

// ── Ícone olho — transcrito de LoginForm.tsx linhas 144-151 ──────────────────
function EyeIcon({ visible }: { visible: boolean }) {
  const p = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "#64748B", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const }
  if (visible) {
    // EyeOff
    return (
      <Svg {...p}>
        <Path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
        <Path d="m1 1 22 22"/>
      </Svg>
    )
  }
  return (
    <Svg {...p}>
      <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <Circle cx="12" cy="12" r="3"/>
    </Svg>
  )
}

export default function LoginScreen() {
  const login = useAuth((s) => s.login)
  const [email,    setEmail]    = useState("")
  const [password, setPassword] = useState("")
  const [showPwd,  setShowPwd]  = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setError("Preencha e-mail e senha.")
      return
    }
    setLoading(true)
    setError(null)
    try {
      await login(email.trim().toLowerCase(), password)
      router.replace("/(tabs)")
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao entrar."
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={s.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={s.flex}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo solta sobre fundo claro — transcrita de AuthLayout linha 8-17 */}
        {/* "sem caixa navy" — handoff §0 correção "Login (normal / erro / loading)" */}
        <View style={s.logoWrap}>
          <Image
            source={require("../../assets/shareo-logo.png")}
            style={s.logo}
            contentFit="contain"
            accessibilityLabel="ShareO"
          />
          <Text style={s.slogan}>Use Mais. Possua Menos.</Text>
        </View>

        {/* Card branco */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Entrar</Text>

          {/* Erro inline — estado error */}
          {error && (
            <View style={s.errorBox} accessibilityRole="alert">
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}

          {/* E-mail */}
          <View style={s.field}>
            <Text style={s.label}>E-mail</Text>
            <TextInput
              value={email}
              onChangeText={(v) => { setEmail(v); setError(null) }}
              placeholder="seu@email.com"
              placeholderTextColor="#94A3B8"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
              returnKeyType="next"
              style={[s.input, error ? s.inputError : undefined]}
              accessibilityLabel="E-mail"
            />
          </View>

          {/* Senha com olho */}
          <View style={s.field}>
            <Text style={s.label}>Senha</Text>
            <View style={[s.inputWrap, error ? s.inputError : undefined]}>
              <TextInput
                value={password}
                onChangeText={(v) => { setPassword(v); setError(null) }}
                placeholder="••••••••"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showPwd}
                editable={!loading}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                style={[s.input, s.inputInner]}
                accessibilityLabel="Senha"
              />
              {/* Ícone olho — transcrito de LoginForm.tsx linhas 144-151 */}
              <TouchableOpacity
                onPress={() => setShowPwd((v) => !v)}
                style={s.eyeBtn}
                accessibilityRole="button"
                accessibilityLabel={showPwd ? "Ocultar senha" : "Mostrar senha"}
              >
                <EyeIcon visible={showPwd} />
              </TouchableOpacity>
            </View>
          </View>

          {/* "Esqueci minha senha" — inline, logo abaixo da senha */}
          <Link href="/(auth)/forgot-password" asChild>
            <TouchableOpacity style={s.forgotLink} accessibilityRole="link">
              <Text style={s.forgotText}>Esqueci minha senha</Text>
            </TouchableOpacity>
          </Link>

          {/* Botão Entrar */}
          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
            style={[s.btnPrimary, loading && s.btnDisabled]}
            accessibilityRole="button"
            accessibilityLabel="Entrar"
            accessibilityState={{ disabled: loading }}
          >
            <Text style={s.btnText}>{loading ? "Entrando…" : "Entrar"}</Text>
          </TouchableOpacity>
        </View>

        {/* Link criar conta */}
        <View style={s.createRow}>
          <Text style={s.createLabel}>Não tem conta? </Text>
          <Link href="/(auth)/register" asChild>
            <TouchableOpacity accessibilityRole="link">
              <Text style={s.createLink}>Criar conta</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  flex:    { flex: 1, backgroundColor: "#F8FAFC" },
  content: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, paddingVertical: 48 },
  logoWrap: {
    alignItems:   "center",
    marginBottom:  32,
  },
  logo: {
    // "height: 48px" — handoff §0 AuthLayout
    width:  160,
    height:  48,
  },
  slogan: {
    marginTop:     8,
    fontSize:      11,
    fontWeight:    "600",
    color:         "#64748B",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius:    16,
    borderWidth:     1,
    borderColor:     "#E2E8F0",
    padding:         24,
  },
  cardTitle: {
    fontSize:     22,
    fontFamily:   "Montserrat_700Bold",
    color:        "#003366",
    marginBottom: 20,
  },
  errorBox: {
    backgroundColor: "#FEE2E2",
    borderWidth:     1,
    borderColor:     "#FECACA",
    borderRadius:    8,
    padding:         12,
    marginBottom:    16,
  },
  errorText: {
    fontSize:   13,
    color:      "#991B1B",
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize:     11,
    fontWeight:   "600",
    color:        "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom:  6,
  },
  input: {
    borderWidth:       1,
    borderColor:       "#E2E8F0",
    borderRadius:      10,
    backgroundColor:   "#F8FAFC",
    paddingHorizontal: 16,
    minHeight:         48,
    fontSize:          14,
    color:             "#0F172A",
  },
  inputError: {
    borderColor:     "#E74C3C",
    backgroundColor: "#FFF5F5",
  },
  inputWrap: {
    flexDirection:   "row",
    alignItems:      "center",
    borderWidth:     1,
    borderColor:     "#E2E8F0",
    borderRadius:    10,
    backgroundColor: "#F8FAFC",
    minHeight:       48,
    paddingHorizontal: 16,
  },
  inputInner: {
    flex:        1,
    borderWidth: 0,
    padding:     0,
    minHeight:   44,
  },
  eyeBtn: {
    width:          44,
    height:         44,
    alignItems:     "center",
    justifyContent: "center",
  },
  forgotLink: {
    alignSelf:    "flex-end",
    paddingBottom: 20,
    paddingTop:    4,
  },
  forgotText: {
    fontSize:   13,
    color:      "#64748B",
  },
  btnPrimary: {
    backgroundColor: "#007B3C",
    borderRadius:    10,
    minHeight:       52,
    alignItems:      "center",
    justifyContent:  "center",
  },
  btnDisabled: {
    opacity: 0.55,
  },
  btnText: {
    fontSize:   15,
    fontWeight: "700",
    color:      "#FFFFFF",
  },
  createRow: {
    flexDirection:  "row",
    justifyContent: "center",
    alignItems:     "center",
    marginTop:      24,
  },
  createLabel: {
    fontSize: 13,
    color:    "#64748B",
  },
  createLink: {
    fontSize:   13,
    fontWeight: "600",
    color:      "#007B3C",
  },
})
