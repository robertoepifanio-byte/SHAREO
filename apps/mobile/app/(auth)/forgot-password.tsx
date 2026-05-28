import { useState } from "react"
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from "react-native"
import { router } from "expo-router"
import { API_URL } from "@/lib/api"

export default function ForgotPasswordScreen() {
  const [email,   setEmail]   = useState("")
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)

  async function handleSubmit() {
    if (!email.trim()) { Alert.alert("Atenção", "Digite seu e-mail."); return }
    setLoading(true)
    try {
      await fetch(`${API_URL}/api/auth/forgot-password`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: email.trim().toLowerCase() }),
      })
      setSent(true)
    } catch {
      Alert.alert("Erro", "Tente novamente em alguns instantes.")
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Text className="mb-2 text-5xl">📧</Text>
        <Text className="mb-2 text-xl font-bold text-primary">Verifique seu e-mail</Text>
        <Text className="mb-8 text-center text-sm text-muted">
          Se este e-mail estiver cadastrado, você receberá as instruções em breve.
        </Text>
        <TouchableOpacity
          className="rounded-xl bg-brand px-8 py-4"
          onPress={() => router.back()}
        >
          <Text className="font-bold text-white">Voltar ao login</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View className="flex-1 justify-center px-6">
        <TouchableOpacity className="mb-6 self-start" onPress={() => router.back()}>
          <Text className="text-sm text-muted">← Voltar</Text>
        </TouchableOpacity>

        <Text className="mb-2 text-2xl font-bold text-primary">Recuperar senha</Text>
        <Text className="mb-8 text-sm text-muted">
          Digite seu e-mail e enviaremos as instruções para redefinir sua senha.
        </Text>

        <View className="mb-4">
          <Text className="mb-1.5 text-sm font-medium text-foreground">E-mail</Text>
          <TextInput
            className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
            placeholder="seu@email.com"
            placeholderTextColor="#94A3B8"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
            editable={!loading}
          />
        </View>

        <TouchableOpacity
          className={`rounded-xl py-4 items-center ${loading ? "bg-brand/50" : "bg-brand"}`}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Text className="text-base font-bold text-white">
            {loading ? "Enviando…" : "Enviar instruções"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}
