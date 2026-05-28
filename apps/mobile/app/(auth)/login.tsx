import { useState } from "react"
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from "react-native"
import { Link, router } from "expo-router"
import { useAuth } from "@/lib/auth"

export default function LoginScreen() {
  const login = useAuth((s) => s.login)
  const [email,    setEmail]    = useState("")
  const [password, setPassword] = useState("")
  const [loading,  setLoading]  = useState(false)

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Atenção", "Preencha e-mail e senha.")
      return
    }
    setLoading(true)
    try {
      await login(email.trim().toLowerCase(), password)
      router.replace("/(tabs)")
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao entrar."
      Alert.alert("Erro", msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="flex-1 justify-center px-6 py-12"
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View className="mb-10 items-center">
          <Text className="text-4xl font-black tracking-tight text-primary">
            Share<Text className="text-brand">O</Text>
          </Text>
          <Text className="mt-1 text-xs font-semibold uppercase tracking-widest text-muted">
            Use Mais. Possua Menos.
          </Text>
        </View>

        {/* Form */}
        <View className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <Text className="mb-6 text-xl font-bold text-primary">Entrar</Text>

          <View className="mb-4">
            <Text className="mb-1.5 text-sm font-medium text-foreground">E-mail</Text>
            <TextInput
              className="rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground"
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

          <View className="mb-6">
            <Text className="mb-1.5 text-sm font-medium text-foreground">Senha</Text>
            <TextInput
              className="rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground"
              placeholder="••••••••"
              placeholderTextColor="#94A3B8"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              editable={!loading}
              onSubmitEditing={handleLogin}
              returnKeyType="done"
            />
          </View>

          <TouchableOpacity
            className={`rounded-xl py-4 items-center ${loading ? "bg-brand/50" : "bg-brand"}`}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text className="text-base font-bold text-white">
              {loading ? "Entrando…" : "Entrar"}
            </Text>
          </TouchableOpacity>

          <Link href="/(auth)/forgot-password" asChild>
            <TouchableOpacity className="mt-4 items-center py-2">
              <Text className="text-sm text-muted">Esqueci minha senha</Text>
            </TouchableOpacity>
          </Link>
        </View>

        {/* Cadastro */}
        <View className="mt-6 flex-row items-center justify-center gap-1">
          <Text className="text-sm text-muted">Não tem conta?</Text>
          <Link href="/(auth)/register" asChild>
            <TouchableOpacity>
              <Text className="text-sm font-semibold text-brand">Criar conta</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
