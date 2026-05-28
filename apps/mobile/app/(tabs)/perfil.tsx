import { View, Text, TouchableOpacity, ScrollView, Alert } from "react-native"
import { router } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useAuth } from "@/lib/auth"

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
        <TouchableOpacity className="mt-3 py-2" onPress={() => router.push("/(auth)/register")}>
          <Text className="text-sm text-muted">Criar conta</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const items: MenuItem[] = [
    { label: "Meus anúncios",  icon: "📋", onPress: () => {} },
    { label: "Favoritos",      icon: "❤️",  onPress: () => {} },
    { label: "Ganhos",         icon: "💰", onPress: () => {} },
    { label: "Calculadora de ganhos", icon: "📊", onPress: () => {} },
    { label: "Sair",           icon: "🚪", onPress: handleLogout, danger: true },
  ]

  const initial = user.name[0]?.toUpperCase() ?? "?"

  return (
    <ScrollView className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="border-b border-border bg-surface px-4 pb-3 pt-4">
        <Text className="text-xl font-bold text-primary">Perfil</Text>
      </View>

      {/* Avatar + Nome */}
      <View className="items-center border-b border-border bg-surface px-4 py-8">
        <View className="mb-3 h-20 w-20 items-center justify-center rounded-full bg-primary">
          <Text className="text-3xl font-bold text-white">{initial}</Text>
        </View>
        <Text className="text-xl font-bold text-primary">{user.name}</Text>
        <Text className="mt-0.5 text-sm text-muted">{user.email}</Text>
        {user.isVerified && (
          <View className="mt-2 flex-row items-center gap-1 rounded-full bg-success/10 px-3 py-1">
            <Text className="text-xs font-semibold text-success">✓ Verificado</Text>
          </View>
        )}
      </View>

      {/* Menu */}
      <View className="mx-4 mt-4 overflow-hidden rounded-2xl border border-border bg-surface">
        {items.map((item, i) => (
          <TouchableOpacity
            key={item.label}
            className={`flex-row items-center gap-3 px-4 py-4 ${i < items.length - 1 ? "border-b border-border" : ""}`}
            onPress={item.onPress}
            activeOpacity={0.7}
          >
            <Text className="text-xl">{item.icon}</Text>
            <Text className={`flex-1 text-sm font-medium ${item.danger ? "text-red-600" : "text-foreground"}`}>
              {item.label}
            </Text>
            {!item.danger && <Text className="text-muted">›</Text>}
          </TouchableOpacity>
        ))}
      </View>

      <Text className="mb-8 mt-6 text-center text-xs text-muted">
        ShareO v1.0 · Use Mais. Possua Menos.
      </Text>
    </ScrollView>
  )
}
