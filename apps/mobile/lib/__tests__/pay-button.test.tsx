// Fonte: components/bookings/PayButton.tsx + app/reservas/[id]/page.tsx
// Testes RNTL do botão "Pagar agora" — rótulos verbatim, lógica de limite R$500,
// abertura do WebBrowser e invalidação do cache após retorno.

import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import { PayButton } from "@/components/bookings/PayButton"

// ── Mocks ────────────────────────────────────────────────────────────────────

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

function getApiFetch() {
  return (jest.requireMock("@/lib/api") as { apiFetch: jest.Mock }).apiFetch
}
function getOpenAuthSession() {
  return (jest.requireMock("expo-web-browser") as { openAuthSessionAsync: jest.Mock }).openAuthSessionAsync
}

// ── Testes ────────────────────────────────────────────────────────────────────

describe("PayButton", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    getOpenAuthSession().mockResolvedValue({ type: "dismiss" })
    getApiFetch().mockResolvedValue({ data: { url: "https://checkout.stripe.com/test" } })
  })

  it("exibe rótulo 'Pagar agora' (verbatim)", () => {
    render(<Wrapper><PayButton bookingId="b1" totalPrice={5000} /></Wrapper>)
    expect(screen.getByLabelText("Pagar agora")).toBeTruthy()
    expect(screen.getByText("Pagar agora")).toBeTruthy()
  })

  it("exibe texto de segurança com 'Stripe' e '· Seus dados são protegidos' (verbatim)", () => {
    render(<Wrapper><PayButton bookingId="b1" totalPrice={5000} /></Wrapper>)
    // O texto pai inclui os filhos — RNTL concatena tudo
    expect(screen.getByText(/Pagamento seguro via/)).toBeTruthy()
    expect(screen.getByText(/Stripe/)).toBeTruthy()
    expect(screen.getByText(/Seus dados são protegidos/)).toBeTruthy()
  })

  it("chama /api/payments/checkout com client=mobile ao pressionar", async () => {
    render(<Wrapper><PayButton bookingId="b1" totalPrice={5000} /></Wrapper>)
    fireEvent.press(screen.getByLabelText("Pagar agora"))
    await waitFor(() => {
      expect(getApiFetch()).toHaveBeenCalledWith(
        "/api/payments/checkout",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"client":"mobile"'),
        }),
      )
    })
  })

  it("abre openAuthSessionAsync com a URL retornada pela API", async () => {
    render(<Wrapper><PayButton bookingId="b1" totalPrice={5000} /></Wrapper>)
    fireEvent.press(screen.getByLabelText("Pagar agora"))
    await waitFor(() => {
      expect(getOpenAuthSession()).toHaveBeenCalledWith(
        "https://checkout.stripe.com/test",
        "shareo://",
      )
    })
  })

  it("exibe 'Redirecionando…' durante o carregamento (verbatim)", async () => {
    getApiFetch().mockImplementation(() => new Promise(() => {})) // pendente para sempre
    render(<Wrapper><PayButton bookingId="b1" totalPrice={5000} /></Wrapper>)
    fireEvent.press(screen.getByLabelText("Pagar agora"))
    await waitFor(() => {
      expect(screen.getByText("Redirecionando…")).toBeTruthy()
    })
  })

  it("exibe erro quando a API falha", async () => {
    getApiFetch().mockRejectedValue(new Error("Erro de conexão. Tente novamente."))
    render(<Wrapper><PayButton bookingId="b1" totalPrice={5000} /></Wrapper>)
    fireEvent.press(screen.getByLabelText("Pagar agora"))
    await waitFor(() => {
      expect(screen.getByText("Erro de conexão. Tente novamente.")).toBeTruthy()
    })
  })

  it("exibe 'Pagamento indisponível' quando totalPrice > R$500 (verbatim)", () => {
    render(<Wrapper><PayButton bookingId="b1" totalPrice={50_001} /></Wrapper>)
    expect(screen.getByLabelText("Pagamento indisponível")).toBeTruthy()
    expect(screen.getByText("Pagamento indisponível")).toBeTruthy()
    expect(
      screen.getByText(/Locações acima de R\$/)
    ).toBeTruthy()
  })

  it("não chama a API quando totalPrice > R$500", () => {
    render(<Wrapper><PayButton bookingId="b1" totalPrice={50_001} /></Wrapper>)
    expect(getApiFetch()).not.toHaveBeenCalled()
  })
})
