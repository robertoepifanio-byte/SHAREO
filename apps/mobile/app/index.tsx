import { useEffect } from "react"
import { Redirect } from "expo-router"
import { View, ActivityIndicator } from "react-native"
import { useAuth } from "@/lib/auth"

export default function Index() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#007B3C" />
      </View>
    )
  }

  return <Redirect href={user ? "/(tabs)" : "/(auth)/login"} />
}
