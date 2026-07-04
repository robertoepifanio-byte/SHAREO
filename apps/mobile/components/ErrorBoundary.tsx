// Error boundary de topo — em build de release o React Native fecha o app
// silenciosamente em exceção JS não tratada (a tela vermelha é dev-only).
// Sem isso, um erro de render não tem NENHUM sinal visível pro usuário nem pra nós.
import React from "react"
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native"
import { ThemeContext } from "@/lib/theme"

interface Props {
  children: React.ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends React.Component<Props, State> {
  static contextType = ThemeContext
  declare context: React.ContextType<typeof ThemeContext>

  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      const { tokens } = this.context
      return (
        <ScrollView
          style={[styles.container, { backgroundColor: tokens.bg }]}
          contentContainerStyle={styles.content}
        >
          <Text style={[styles.title, { color: tokens.error }]}>Algo deu errado</Text>
          <Text style={[styles.message, { color: tokens.text }]}>{this.state.error.message}</Text>
          <Text style={[styles.stack, { color: tokens.muted }]}>{this.state.error.stack}</Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: tokens.green }]}
            onPress={() => this.setState({ error: null })}
          >
            <Text style={styles.buttonText}>Tentar novamente</Text>
          </TouchableOpacity>
        </ScrollView>
      )
    }
    return this.props.children
  }
}

const styles = StyleSheet.create({
  container: { flex: 1 },                     // backgroundColor removido — agora inline via tokens.bg
  content:   { padding: 24, paddingTop: 64 },
  title:     { fontSize: 20, fontWeight: "700", marginBottom: 12 },  // color removido — inline via tokens.error
  message:   { fontSize: 14, marginBottom: 16 },                      // color removido — inline via tokens.text
  stack:     { fontSize: 11, marginBottom: 24 },                      // color removido — inline via tokens.muted
  button:    { borderRadius: 10, minHeight: 48, alignItems: "center", justifyContent: "center" },  // backgroundColor removido — inline via tokens.green
  buttonText: { color: "#FFFFFF", fontWeight: "700" },  // branco sobre fill verde — não migrar
})
