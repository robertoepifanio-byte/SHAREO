import { View, Text, TouchableOpacity, ScrollView } from "react-native"
import { router } from "expo-router"

export default function RegisterScreen() {
  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="justify-center px-6 py-12">
      <TouchableOpacity className="mb-6 self-start" onPress={() => router.back()}>
        <Text className="text-sm text-muted">← Voltar</Text>
      </TouchableOpacity>

      <Text className="mb-2 text-2xl font-bold text-primary">Criar conta</Text>
      <Text className="mb-8 text-sm text-muted">
        O cadastro completo está disponível no site. Acesse{" "}
        <Text className="text-brand font-semibold">shareo.com.br</Text> pelo navegador para criar sua conta.
      </Text>

      <View className="rounded-2xl border border-border bg-surface p-6">
        <Text className="mb-4 text-sm text-foreground">
          Após criar sua conta no site, use o mesmo e-mail e senha para entrar aqui.
        </Text>
        <TouchableOpacity
          className="rounded-xl bg-brand py-4 items-center"
          onPress={() => router.replace("/(auth)/login")}
        >
          <Text className="font-bold text-white">Já tenho conta — Entrar</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}
