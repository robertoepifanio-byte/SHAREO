import { View, Text, TouchableOpacity, ScrollView, Alert } from "react-native"
import { router } from "expo-router"
import Constants from "expo-constants"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useAuth } from "@/lib/auth"

const APP_VERSION = Constants.expoConfig?.version ?? "—"

interface MenuItem { label: string; icon: string; onPress: () => void; danger?: boolean }

export default function PerfilScreen() {
  const insets = useSafeAreaInsets()
  const { user, logout } = useAuth()

  async function handleLogout() {
    Alert.alert("Sair", "Deseja sair da sua conta?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair", style: "destructive",
        onPress: async () => { await logout(); router.replace("/(auth)/login") },
      },
    ])
  }

  if (!user) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6" style={{ paddingTop: insets.top }}>
        <Text className="text-5xl">👤</Text>
        <Text className="mt-3 text-base font-semibold text-primary">Faça login para acessar seu perfil</Text>
        <TouchableOpacity
          className="mt-6 rounded-xl bg-brand px-8 py-3"
          onPress={() => router.push("/(auth)/login")}
        >
          <Text className="font-bold text-white">Entrar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="mt-3 min-h-[44px] justify-center px-2"
          onPress={() => router.push("/(auth)/register")}
          accessibilityRole="button"
          accessibilityLabel="Criar conta"
        >
          <Text className="text-sm text-muted">Criar conta</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const items: MenuItem[] = [
    {
      label: "Anunciar item",
      icon: "➕",
      onPress: () => router.push("/itens/novo" as never),
    },
    {
      label: "Meus anúncios",
      icon: "📋",
      onPress: () => router.push("/meus-anuncios" as never),
    },
    {
      label: "Favoritos",
      icon: "❤️",
      onPress: () => router.push("/favoritos" as never),
    },
    {
      label: "Verificação de identidade",
      icon: "🪪",
      onPress: () => router.push("/kyc" as never),
    },
  ]

  const initial = user.name[0]?.toUpperCase() ?? "?"

  return (
    <ScrollView className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="border-b border-border bg-surface px-4 pb-3 pt-4">
        <Text className="text-xl font-bold text-primary">Perfil</Text>
      </View>

      {/* Avatar + Nome */}
      <View className="items-center bg-primary px-4 py-8">
        <View className="mb-3 h-20 w-20 items-center justify-center rounded-full border-4 border-accent bg-primary">
          <Text className="font-display text-3xl font-bold text-white">{initial}</Text>
        </View>
        <Text className="font-display text-xl font-bold text-white">{user.name}</Text>
        <Text className="mt-0.5 text-sm text-white/70">{user.email}</Text>
        {user.isVerified && (
          <View className="mt-2 flex-row items-center gap-1 rounded-full bg-accent/20 px-3 py-1">
            <Text className="text-xs font-semibold text-accent">✓ Verificado</Text>
          </View>
        )}
      </View>

      {/* Menu */}
      <View className="mx-4 mt-4 overflow-hidden rounded-2xl bg-surface shadow-sm">
        {items.map((item, i) => (
          <TouchableOpacity
            key={item.label}
            className={`flex-row items-center gap-3 px-4 py-4 ${i < items.length - 1 ? "border-b border-border" : ""}`}
            onPress={item.onPress}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={item.label}
          >
            <Text className="text-xl">{item.icon}</Text>
            <Text className="flex-1 text-sm font-medium text-foreground">
              {item.label}
            </Text>
            <Text className="text-muted">›</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Sair — isolado por ser ação destrutiva */}
      <View className="mx-4 mt-4 overflow-hidden rounded-2xl bg-surface shadow-sm">
        <TouchableOpacity
          className="min-h-[44px] flex-row items-center gap-3 px-4 py-4"
          onPress={handleLogout}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Sair"
        >
          <Text className="text-xl">🚪</Text>
          <Text className="flex-1 text-sm font-medium text-red-600">Sair</Text>
        </TouchableOpacity>
      </View>

      <Text className="mb-8 mt-6 text-center text-xs text-muted">
        ShareO v{APP_VERSION} · Use Mais. Possua Menos.
      </Text>
    </ScrollView>
  )
}
