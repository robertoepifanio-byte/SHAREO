// Fonte: app/_layout.tsx (mínimo necessário para registrar fontes e ThemeProvider)
// Adições do Lote 1: useFonts (Montserrat) + ThemeProvider.
// Não altera nenhuma tela — só envolve a stack com os novos providers.

import { useEffect } from "react"
import { Stack, router } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from "@tanstack/react-query"
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

// Handler global de sessão expirada. apiFetch lança "SESSION_EXPIRED" quando o
// refresh token falha (após limpar os tokens). Antes NÃO havia subscriber: o
// usuário ficava preso na tela com erro genérico. Agora, qualquer query/mutation
// que bata nisso limpa o user e redireciona pro login (achado revisão s41).
function handleSessionExpired(error: unknown) {
  if (error instanceof Error && error.message === "SESSION_EXPIRED") {
    void useAuth.getState().logout()
    router.replace("/(auth)/login")
  }
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
  queryCache:    new QueryCache({ onError: handleSessionExpired }),
  mutationCache: new MutationCache({ onError: handleSessionExpired }),
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
