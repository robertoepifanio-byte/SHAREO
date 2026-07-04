// Fonte: app/(auth)/cadastro/RegisterForm.tsx + app/(auth)/layout.tsx
// Cadastro redireciona para o site — decisão de arquitetura documentada no handoff §5.
//
// Racional da decisão (não inventado):
//   O formulário do site (RegisterForm.tsx) requer:
//     - signIn("credentials") do next-auth (browser-only)
//     - validação server-side com consentVersion (LGPD), referralCode, city/state
//     - auto-login pós-cadastro + redirect para /bem-vindo
//   Reimplementar tudo em nativo duplicaria validação e fluxo LGPD, criando risco
//   de divergência. Decisão: abrir o site no browser e instruir o usuário a retornar.
//
// Frame "Cadastro" transcrito do protótipo + handoff:
//   - Logo solta (sem caixa navy) — verbatim de AuthLayout
//   - Slogan "Use Mais. Possua Menos."
//   - Título "Criar conta" (verbatim do site RegisterForm linha 189)
//   - Descrição + CTA "Criar conta no site →"
//   - Link "Já tenho conta — Entrar"
//
// TODO(revisão): quando o site definir /bem-vindo como rota acessível sem sessão do
//   next-auth (ex.: deep link retorna com token), implementar cadastro nativo seguindo
//   RegisterForm.tsx campo a campo.

import { View, Text, TouchableOpacity, ScrollView, Linking, StyleSheet } from "react-native"
import { Image } from "expo-image"
import { router } from "expo-router"
import { useTheme } from "@/lib/theme"

export default function RegisterScreen() {
  const { tokens } = useTheme()

  function handleOpenSite() {
    // Rota do site é /cadastro (não /register) — verbatim de app/(auth)/cadastro/page.tsx
    Linking.openURL("https://staging.shareo.com.br/cadastro")
  }

  return (
    <ScrollView
      style={[s.scroll, { backgroundColor: tokens.bg }]}
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

      {/* Logo solta — transcrita de AuthLayout (sem caixa navy) */}
      <View style={s.logoWrap}>
        <Image
          source={require("../../assets/shareo-logo.png")}
          style={s.logo}
          contentFit="contain"
          accessibilityLabel="ShareO"
        />
        {/* Slogan — verbatim do site e app/globals.css */}
        <Text style={[s.slogan, { color: tokens.muted }]}>Use Mais. Possua Menos.</Text>
      </View>

      {/* Título — verbatim do site RegisterForm.tsx linha 189 */}
      <Text style={[s.title, { color: tokens.navy }]}>Criar conta</Text>
      <Text style={[s.desc, { color: tokens.muted }]}>
        O cadastro completo está disponível no site. Acesse{" "}
        <Text style={[s.link, { color: tokens.green }]}>shareo.com.br</Text> pelo navegador para criar sua conta.
      </Text>

      {/* Card informativo */}
      <View style={[s.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
        <Text style={[s.cardText, { color: tokens.text }]}>
          Após criar sua conta no site, use o mesmo e-mail e senha para entrar aqui.
        </Text>

        {/* CTA principal — abre site */}
        <TouchableOpacity
          onPress={handleOpenSite}
          style={[s.btnPrimary, { backgroundColor: tokens.green }]}
          activeOpacity={0.85}
          accessibilityRole="link"
          accessibilityLabel="Criar conta no site ShareO"
        >
          <Text style={s.btnText}>Criar conta no site →</Text>
        </TouchableOpacity>

        {/* CTA secundário — já tem conta */}
        <TouchableOpacity
          onPress={() => router.replace("/(auth)/login")}
          style={[s.btnSecondary, { borderColor: tokens.border }]}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Já tenho conta, entrar"
        >
          <Text style={[s.btnSecondaryText, { color: tokens.navy }]}>Já tenho conta — Entrar</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow:          1,
    paddingHorizontal: 24,
    paddingVertical:   24,
  },
  back: {
    alignSelf:      "flex-start",
    minHeight:      44,
    justifyContent: "center",
    marginBottom:   8,
  },
  backText: {
    fontSize: 14,
  },
  logoWrap: {
    alignItems:   "center",
    marginBottom: 24,
  },
  logo: {
    width:  160,
    height:  48,
  },
  slogan: {
    marginTop:     8,
    fontSize:      11,
    fontWeight:    "600",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  title: {
    fontSize:     24,
    fontFamily:   "Montserrat_700Bold",
    marginBottom: 8,
  },
  desc: {
    fontSize:     14,
    lineHeight:   20,
    marginBottom: 24,
  },
  link: {
    fontWeight: "600",
  },
  card: {
    borderRadius: 16,
    borderWidth:  1,
    padding:      24,
    gap:          12,
  },
  cardText: {
    fontSize:     14,
    lineHeight:   20,
    marginBottom: 4,
  },
  btnPrimary: {
    borderRadius:   10,
    minHeight:      52,
    alignItems:     "center",
    justifyContent: "center",
  },
  btnText: {
    fontSize:   15,
    fontWeight: "700",
    color:      "#FFFFFF",
  },
  btnSecondary: {
    borderRadius:   10,
    borderWidth:    1,
    minHeight:      52,
    alignItems:     "center",
    justifyContent: "center",
  },
  btnSecondaryText: {
    fontSize:   14,
    fontWeight: "600",
  },
})
