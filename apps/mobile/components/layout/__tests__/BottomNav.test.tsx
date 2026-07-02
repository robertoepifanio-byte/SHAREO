// Testes de BottomNav — 5 itens com rótulos exatos, SVGs e FAB.
// Rótulos são a trava anti-invenção: "Início","Explorar","Anunciar","Chat","Perfil"
// Fonte: components/layout/BottomNav.tsx do site.
// Lote 2: rotas atualizadas — /explorar, /chat, /perfil (ajuste de expo-router mapping).

import React from "react"
import { render, screen, fireEvent } from "@testing-library/react-native"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { BottomNav } from "@/components/layout/BottomNav"

// expo-router já está mockado em jest.setup.js
// SafeAreaProvider necessário pois BottomNav usa useSafeAreaInsets()
function renderNav() {
  return render(
    <SafeAreaProvider>
      <BottomNav />
    </SafeAreaProvider>
  )
}

describe("BottomNav", () => {
  it("renderiza exatamente 5 rótulos de navegação (4 tabs + 1 FAB)", () => {
    renderNav()
    // 4 tabs + FAB "Anunciar" com role=button
    expect(screen.getByText("Início")).toBeTruthy()
    expect(screen.getByText("Explorar")).toBeTruthy()
    expect(screen.getByText("Anunciar")).toBeTruthy()
    expect(screen.getByText("Chat")).toBeTruthy()
    expect(screen.getByText("Perfil")).toBeTruthy()
  })

  it('rótulo 1: "Início" (VERBATIM de BottomNav.tsx do site)', () => {
    renderNav()
    expect(screen.getByText("Início")).toBeTruthy()
  })

  it('rótulo 2: "Explorar" (VERBATIM de BottomNav.tsx do site)', () => {
    renderNav()
    expect(screen.getByText("Explorar")).toBeTruthy()
  })

  it('rótulo 3: "Anunciar" — FAB verde central (VERBATIM de BottomNav.tsx do site)', () => {
    renderNav()
    expect(screen.getByText("Anunciar")).toBeTruthy()
  })

  it('rótulo 4: "Chat" (VERBATIM de BottomNav.tsx do site — NÃO "Mensagens")', () => {
    renderNav()
    expect(screen.getByText("Chat")).toBeTruthy()
    // Garante que o rótulo errado (emoji ou "Mensagens") não está presente
    expect(screen.queryByText("Mensagens")).toBeNull()
    expect(screen.queryByText("💬")).toBeNull()
  })

  it('rótulo 5: "Perfil" (VERBATIM de BottomNav.tsx do site — NÃO "Dashboard")', () => {
    renderNav()
    expect(screen.getByText("Perfil")).toBeTruthy()
    expect(screen.queryByText("👤")).toBeNull()
  })

  it("FAB Anunciar tem accessibilityLabel correto", () => {
    renderNav()
    expect(screen.getByLabelText("Anunciar item")).toBeTruthy()
  })

  it("tabs têm accessibilityRole='tab' — 4 tabs (Início, Explorar, Chat, Perfil)", () => {
    renderNav()
    const tabs = screen.getAllByRole("tab")
    // FAB "Anunciar" usa role='button' separado
    expect(tabs.length).toBe(4)
  })

  it("navBar tem accessibilityLabel 'Navegação mobile'", () => {
    renderNav()
    expect(screen.getByLabelText("Navegação mobile")).toBeTruthy()
  })

  it("pressionar Início navega para '/'", () => {
    const { router } = require("expo-router")
    renderNav()
    fireEvent.press(screen.getByLabelText("Início"))
    expect(router.push).toHaveBeenCalledWith("/")
  })

  it("pressionar Explorar navega para '/explorar'", () => {
    const { router } = require("expo-router")
    renderNav()
    fireEvent.press(screen.getByLabelText("Explorar"))
    expect(router.push).toHaveBeenCalledWith("/explorar")
  })

  it("pressionar Chat navega para '/chat'", () => {
    const { router } = require("expo-router")
    renderNav()
    fireEvent.press(screen.getByLabelText("Chat"))
    expect(router.push).toHaveBeenCalledWith("/chat")
  })

  it("pressionar Perfil navega para '/perfil'", () => {
    const { router } = require("expo-router")
    renderNav()
    fireEvent.press(screen.getByLabelText("Perfil"))
    expect(router.push).toHaveBeenCalledWith("/perfil")
  })

  it("pressionar FAB Anunciar navega para '/itens/novo'", () => {
    const { router } = require("expo-router")
    renderNav()
    fireEvent.press(screen.getByLabelText("Anunciar item"))
    expect(router.push).toHaveBeenCalledWith("/itens/novo")
  })
})
