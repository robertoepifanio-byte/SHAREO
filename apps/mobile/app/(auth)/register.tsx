// Fonte: app/(auth)/register.tsx (decisão D1 do handoff) + app/(auth)/layout.tsx
// Cadastro redireciona para o site — decisão D1 do handoff §5 mantida.
// Frame "Cadastro" do protótipo: logo solta + card explicativo + CTA "Ir para o site" + link "Já tenho conta".
// Sem formulário nativo — evita duplicação de validação e verificação de email.

import { View, Text, TouchableOpacity, ScrollView, Linking, StyleSheet } from "react-native"
import { Image } from "expo-image"
import { router } from "expo-router"

export default function RegisterScreen() {
  function handleOpenSite() {
    Linking.openURL("https://staging.shareo.com.br/cadastro")
  }

  return (
    <ScrollView
      style={s.scroll}
      contentContainerStyle={s.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Botão Voltar — "← Voltar" no topo (sem header/nav nas telas de auth) */}
      <TouchableOpacity
        style={s.back}
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Voltar"
      >
        <Text style={s.backText}>← Voltar</Text>
      </TouchableOpacity>

      {/* Logo solta — transcrita de AuthLayout (sem caixa navy) */}
      <View style={s.logoWrap}>
        <Image
          source={require("../../assets/shareo-logo.png")}
          style={s.logo}
          contentFit="contain"
          accessibilityLabel="ShareO"
        />
        <Text style={s.slogan}>Use Mais. Possua Menos.</Text>
      </View>

      <Text style={s.title}>Criar conta</Text>
      <Text style={s.desc}>
        O cadastro completo está disponível no site. Acesse{" "}
        <Text style={s.link}>shareo.com.br</Text> pelo navegador para criar sua conta.
      </Text>

      {/* Card informativo */}
      <View style={s.card}>
        <Text style={s.cardText}>
          Após criar sua conta no site, use o mesmo e-mail e senha para entrar aqui.
        </Text>

        {/* CTA principal — abre site */}
        <TouchableOpacity
          onPress={handleOpenSite}
          style={s.btnPrimary}
          activeOpacity={0.85}
          accessibilityRole="link"
          accessibilityLabel="Criar conta no site ShareO"
        >
          <Text style={s.btnText}>Criar conta no site →</Text>
        </TouchableOpacity>

        {/* CTA secundário — já tem conta */}
        <TouchableOpacity
          onPress={() => router.replace("/(auth)/login")}
          style={s.btnSecondary}
          activeOpacity={0.85}
          accessibilityRole="button"
        >
          <Text style={s.btnSecondaryText}>Já tenho conta — Entrar</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  scroll: {
    flex:            1,
    backgroundColor: "#F8FAFC",
  },
  content: {
    flexGrow:          1,
    paddingHorizontal: 24,
    paddingVertical:   24,
  },
  back: {
    alignSelf: "flex-start",
    minHeight: 44,
    justifyContent: "center",
    marginBottom: 8,
  },
  backText: {
    fontSize: 14,
    color:    "#64748B",
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
    color:         "#64748B",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  title: {
    fontSize:     24,
    fontFamily:   "Montserrat_700Bold",
    color:        "#003366",
    marginBottom: 8,
  },
  desc: {
    fontSize:     14,
    color:        "#64748B",
    lineHeight:   20,
    marginBottom: 24,
  },
  link: {
    color:      "#007B3C",
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius:    16,
    borderWidth:     1,
    borderColor:     "#E2E8F0",
    padding:         24,
    gap:             12,
  },
  cardText: {
    fontSize:     14,
    color:        "#0F172A",
    lineHeight:   20,
    marginBottom: 4,
  },
  btnPrimary: {
    backgroundColor: "#007B3C",
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
  btnSecondary: {
    borderRadius: 10,
    borderWidth:  1,
    borderColor:  "#E2E8F0",
    minHeight:    52,
    alignItems:   "center",
    justifyContent: "center",
  },
  btnSecondaryText: {
    fontSize:   14,
    fontWeight: "600",
    color:      "#003366",
  },
})
