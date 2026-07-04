// Error boundary de topo — em build de release o React Native fecha o app
// silenciosamente em exceção JS não tratada (a tela vermelha é dev-only).
// Sem isso, um erro de render não tem NENHUM sinal visível pro usuário nem pra nós.
import React from "react"
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native"

interface Props {
  children: React.ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          <Text style={styles.title}>Algo deu errado</Text>
          <Text style={styles.message}>{this.state.error.message}</Text>
          <Text style={styles.stack}>{this.state.error.stack}</Text>
          <TouchableOpacity
            style={styles.button}
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
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  content:   { padding: 24, paddingTop: 64 },
  title:     { fontSize: 20, fontWeight: "700", color: "#C0392B", marginBottom: 12 },
  message:   { fontSize: 14, color: "#0F172A", marginBottom: 16 },
  stack:     { fontSize: 11, color: "#64748B", marginBottom: 24 },
  button:    { backgroundColor: "#007B3C", borderRadius: 10, minHeight: 48, alignItems: "center", justifyContent: "center" },
  buttonText: { color: "#FFFFFF", fontWeight: "700" },
})
