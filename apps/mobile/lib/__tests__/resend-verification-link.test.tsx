// Fonte: components/shared/ResendVerificationButton.tsx (variant="inline")
//
// Cobre o beco sem saída relatado pelo testador em 10/08: a reserva era barrada
// com 403 EMAIL_NOT_VERIFIED e a tela do item só imprimia o texto do erro — o
// reenvio existia apenas em Perfil → Segurança.
//
// RÓTULOS VERBATIM — divergir daqui sem mexer no componente quebra o CI.

import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native"
import { ResendVerificationLink } from "@/components/ui/ResendVerificationLink"
import { apiFetch } from "@/lib/api"

jest.mock("@/lib/api", () => {
  const actual = jest.requireActual("@/lib/api")
  return { apiFetch: jest.fn(), hasErrorStatus: actual.hasErrorStatus }
})

jest.mock("@/lib/theme", () => ({
  useTheme: () => ({
    mode: "light",
    tokens: { green: "#007B3C", error: "#C0392B", success: "#059669" },
  }),
}))

const mockFetch = apiFetch as jest.MockedFunction<typeof apiFetch>

beforeEach(() => jest.clearAllMocks())

describe("ResendVerificationLink", () => {
  it("mostra o rótulo do site verbatim", () => {
    render(<ResendVerificationLink />)
    expect(screen.getByText("Reenviar e-mail de verificação →")).toBeTruthy()
  })

  it("chama o endpoint de reenvio e confirma o envio", async () => {
    mockFetch.mockResolvedValueOnce({ data: { sent: true } } as never)
    render(<ResendVerificationLink />)

    fireEvent.press(screen.getByText("Reenviar e-mail de verificação →"))

    await waitFor(() =>
      expect(
        screen.getByText(
          "E-mail de verificação enviado. Verifique sua caixa de entrada e a pasta de spam."
        )
      ).toBeTruthy()
    )
    expect(mockFetch).toHaveBeenCalledWith("/api/auth/resend-verification", { method: "POST" })
  })

  it("traduz 429 em mensagem de limite, sem vazar o erro cru", async () => {
    mockFetch.mockRejectedValueOnce(Object.assign(new Error("API 429"), { status: 429, code: null }))
    render(<ResendVerificationLink />)

    fireEvent.press(screen.getByText("Reenviar e-mail de verificação →"))

    await waitFor(() =>
      expect(
        screen.getByText("Limite de reenvios atingido. Aguarde alguns minutos e tente novamente.")
      ).toBeTruthy()
    )
    expect(screen.queryByText("API 429")).toBeNull()
  })

  it("cai na mensagem de conexão quando o erro não é da API", async () => {
    mockFetch.mockRejectedValueOnce("network down")
    render(<ResendVerificationLink />)

    fireEvent.press(screen.getByText("Reenviar e-mail de verificação →"))

    await waitFor(() =>
      expect(
        screen.getByText("Falha de conexão. Verifique sua internet e tente novamente.")
      ).toBeTruthy()
    )
  })

  it("tem tap target de 44px (regra do design system)", () => {
    render(<ResendVerificationLink />)
    const btn = screen.getByRole("button", { name: "Reenviar e-mail de verificação" })
    expect(StyleSheetFlatten(btn.props.style).minHeight).toBe(44)
  })
})

function StyleSheetFlatten(style: unknown): { minHeight?: number } {
  const { StyleSheet } = require("react-native")
  return StyleSheet.flatten(style) ?? {}
}
