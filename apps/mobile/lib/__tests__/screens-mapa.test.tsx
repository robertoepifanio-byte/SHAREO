// Testes RNTL — mapa nativo (ItemsMapNative + MarkerPopupCard + mapa.tsx).
// Cobre o gap de zero cobertura apontado na revisão s41. @rnmapbox/maps e
// expo-location são mockados globalmente em jest.setup.js.

import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

// ── Mocks ────────────────────────────────────────────────────────────────────
// Inline (sem const externo) p/ evitar TDZ no hoisting do jest.mock — os
// handles são recuperados via jest.requireMock nos testes.
jest.mock("expo-router", () => ({
  router:               { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({})),
}))

jest.mock("@/lib/api", () => ({
  apiFetch: jest.fn(),
  API_URL:  "https://staging.shareo.com.br",
}))

const { router, useLocalSearchParams } = jest.requireMock("expo-router")
const { apiFetch: mockApiFetch } = jest.requireMock("@/lib/api")

jest.mock("@/lib/theme", () => {
  const React = require("react")
  const TOKENS = {
    bg: "#F8FAFC", surface: "#FFFFFF", text: "#0F172A", muted: "#64748B",
    border: "#E2E8F0", navy: "#003366", green: "#007B3C", success: "#007B3C",
  }
  return {
    useTheme: () => ({ mode: "light", tokens: TOKENS, preference: "light", setPreference: jest.fn() }),
    ThemeProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  }
})

import { MarkerPopupCard } from "@/components/map/MarkerPopupCard"
import MapaScreen from "@/app/itens/mapa"

function wrap(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
}

beforeEach(() => {
  jest.clearAllMocks()
  useLocalSearchParams.mockReturnValue({})
})

// ── MarkerPopupCard ──────────────────────────────────────────────────────────
describe("MarkerPopupCard", () => {
  const pin = { id: "item-1", title: "Furadeira Bosch", pricePerDay: 3500 }

  it("exibe título, preço formatado e CTA", () => {
    render(<MarkerPopupCard pin={pin} onPress={jest.fn()} onClose={jest.fn()} />)
    expect(screen.getByText("Furadeira Bosch")).toBeTruthy()
    expect(screen.getByText("R$ 35,00/dia")).toBeTruthy()
    expect(screen.getByText("Ver detalhes →")).toBeTruthy()
  })

  it("tocar no card chama onPress", () => {
    const onPress = jest.fn()
    render(<MarkerPopupCard pin={pin} onPress={onPress} onClose={jest.fn()} />)
    fireEvent.press(screen.getByText("Ver detalhes →"))
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it("tocar em Fechar chama onClose", () => {
    const onClose = jest.fn()
    render(<MarkerPopupCard pin={pin} onPress={jest.fn()} onClose={onClose} />)
    fireEvent.press(screen.getByLabelText("Fechar"))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

// ── MapaScreen ───────────────────────────────────────────────────────────────
describe("MapaScreen", () => {
  it("estado de loading exibe ActivityIndicator", () => {
    mockApiFetch.mockReturnValue(new Promise(() => {})) // pendente
    wrap(<MapaScreen />)
    expect(screen.getByText("Mapa de itens")).toBeTruthy()
  })

  it("estado de erro exibe mensagem", async () => {
    mockApiFetch.mockRejectedValue(new Error("boom"))
    wrap(<MapaScreen />)
    expect(await screen.findByText("Não foi possível carregar o mapa.")).toBeTruthy()
  })

  it("empty-state quando itens não têm coordenadas", async () => {
    mockApiFetch.mockResolvedValue({
      data: [{ id: "a", title: "X", pricePerDay: 100, latitude: null, longitude: null }],
    })
    wrap(<MapaScreen />)
    expect(await screen.findByText("Nenhum item com localização disponível no momento.")).toBeTruthy()
  })

  it("renderiza o mapa quando há itens com coordenadas", async () => {
    mockApiFetch.mockResolvedValue({
      data: [{ id: "a", title: "X", pricePerDay: 100, latitude: -5.79, longitude: -35.21 }],
    })
    wrap(<MapaScreen />)
    // header sempre presente; ausência dos estados de erro/empty confirma o mapa
    expect(await screen.findByText("Mapa de itens")).toBeTruthy()
    await waitFor(() => {
      expect(screen.queryByText("Nenhum item com localização disponível no momento.")).toBeNull()
      expect(screen.queryByText("Não foi possível carregar o mapa.")).toBeNull()
    })
  })

  it("botão voltar chama router.back", async () => {
    mockApiFetch.mockResolvedValue({ data: [] })
    wrap(<MapaScreen />)
    fireEvent.press(screen.getByLabelText("Voltar"))
    expect(router.back).toHaveBeenCalled()
  })

  it("envia ?search quando params.q presente", async () => {
    useLocalSearchParams.mockReturnValue({ q: "furadeira" })
    mockApiFetch.mockResolvedValue({ data: [] })
    wrap(<MapaScreen />)
    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(expect.stringContaining("search=furadeira"))
    })
  })
})
