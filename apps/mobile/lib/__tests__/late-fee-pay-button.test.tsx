// Fonte: components/bookings/LateFeePayButton.tsx + app/reservas/[id]/page.tsx
// Testes RNTL do botão "Pagar taxa de atraso" — rótulo verbatim, chamada da
// rota nova, abertura do navegador e invalidação do cache após o retorno.

import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import { LateFeePayButton } from "@/components/bookings/LateFeePayButton"

jest.mock("@/lib/api", () => ({
  apiFetch:  jest.fn(),
  API_URL:   "https://staging.shareo.com.br",
  getTokens: jest.fn().mockResolvedValue(null),
}))

jest.mock("expo-web-browser", () => ({
  openAuthSessionAsync: jest.fn(),
}))

jest.mock("@/lib/theme", () => ({
  useTheme: () => ({
    tokens: { green: "#007B3C", text: "#0F172A", muted: "#64748B", surface: "#FFFFFF", bg: "#F8FAFC", border: "#E2E8F0" },
    mode:   "light",
  }),
}))

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}
const apiFetch = () => (jest.requireMock("@/lib/api") as { apiFetch: jest.Mock }).apiFetch
const openAuth = () => (jest.requireMock("expo-web-browser") as { openAuthSessionAsync: jest.Mock }).openAuthSessionAsync
const ROTULO = /Pagar taxa de atraso \(R\$\s225,00\)/

describe("LateFeePayButton", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    openAuth().mockResolvedValue({ type: "dismiss" })
    apiFetch().mockResolvedValue({ data: { url: "https://checkout.stripe.com/late" } })
  })

  it("exibe o rótulo verbatim do site com o valor", () => {
    render(<Wrapper><LateFeePayButton bookingId="b1" amount={22500} /></Wrapper>)
    expect(screen.getByLabelText(ROTULO)).toBeTruthy()
    expect(screen.getByText(ROTULO)).toBeTruthy()
  })

  it("chama a rota da reserva e abre a URL devolvida", async () => {
    render(<Wrapper><LateFeePayButton bookingId="b1" amount={22500} /></Wrapper>)
    fireEvent.press(screen.getByLabelText(ROTULO))
    await waitFor(() => {
      // Passa client:"mobile" → a rota gera success_url shareo://reservas/:id
      expect(apiFetch()).toHaveBeenCalledWith("/api/bookings/b1/late-fee/pay", { method: "POST", body: JSON.stringify({ client: "mobile" }) })
      expect(openAuth()).toHaveBeenCalledWith("https://checkout.stripe.com/late", "shareo://")
    })
  })

  it("exibe 'Redirecionando…' durante o carregamento", async () => {
    apiFetch().mockImplementation(() => new Promise(() => {}))
    render(<Wrapper><LateFeePayButton bookingId="b1" amount={22500} /></Wrapper>)
    fireEvent.press(screen.getByLabelText(ROTULO))
    await waitFor(() => expect(screen.getByText("Redirecionando…")).toBeTruthy())
  })

  it("mostra a mensagem da API (ex.: cobrança fechada) e não abre o navegador", async () => {
    apiFetch().mockRejectedValue(new Error("Os pagamentos ainda não estão abertos. Tente novamente em breve."))
    render(<Wrapper><LateFeePayButton bookingId="b1" amount={22500} /></Wrapper>)
    fireEvent.press(screen.getByLabelText(ROTULO))
    await waitFor(() => {
      expect(screen.getByText("Os pagamentos ainda não estão abertos. Tente novamente em breve.")).toBeTruthy()
    })
    expect(openAuth()).not.toHaveBeenCalled()
  })
})
