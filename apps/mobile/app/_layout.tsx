// Fonte: app/_layout.tsx (mínimo necessário para registrar fontes e ThemeProvider)
// Adições do Lote 1: useFonts (Montserrat) + ThemeProvider.
// Não altera nenhuma tela — só envolve a stack com os novos providers.

import { useEffect } from "react"
import { Stack } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { useFonts } from "expo-font"
import {
  Montserrat_700Bold,
  Montserrat_800ExtraBold,
} from "@expo-google-fonts/montserrat"
import { useAuth } from "@/lib/auth"
import { ThemeProvider } from "@/lib/theme"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import "../global.css"

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

export default function RootLayout() {
  const loadUser = useAuth((s) => s.loadUser)

  // Registra Montserrat — usada em headings conforme design system do site
  // (--font-montserrat em globals.css → Montserrat_700Bold/Montserrat_800ExtraBold aqui)
  const [fontsLoaded] = useFonts({
    Montserrat_700Bold,
    Montserrat_800ExtraBold,
  })

  useEffect(() => { loadUser() }, [loadUser])

  // Aguarda fontes para evitar flash de fonte errada no carregamento
  if (!fontsLoaded) return null

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <ThemeProvider>
            <QueryClientProvider client={queryClient}>
              <StatusBar style="auto" />
              <Stack screenOptions={{ headerShown: false }} />
            </QueryClientProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  )
}
