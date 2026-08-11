/**
 * Cobre o CTA de reenvio de verificação de e-mail — o mesmo componente usado em
 * Perfil → Segurança (variant padrão) e dentro do box de erro do _PriceCalc
 * quando a reserva é barrada com 403 EMAIL_NOT_VERIFIED (variant="inline").
 *
 * Rótulos verbatim: o app mobile transcreve este componente
 * (apps/mobile/components/ui/ResendVerificationLink.tsx), então divergir aqui
 * sem atualizar lá quebra a paridade site↔app.
 */
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ResendVerificationButton } from "@/components/shared/ResendVerificationButton"

const fetchMock = jest.fn()
global.fetch = fetchMock as unknown as typeof fetch

function okResponse() {
  return { ok: true, status: 200, json: async () => ({ data: { sent: true } }), headers: new Headers() }
}

beforeEach(() => jest.clearAllMocks())

describe("ResendVerificationButton", () => {
  it("chama o endpoint e confirma o envio", async () => {
    fetchMock.mockResolvedValueOnce(okResponse())
    render(<ResendVerificationButton />)

    await userEvent.click(screen.getByRole("button", { name: "Reenviar e-mail de verificação" }))

    expect(fetchMock).toHaveBeenCalledWith("/api/auth/resend-verification", { method: "POST" })
    await waitFor(() =>
      expect(
        screen.getByText(
          "E-mail de verificação enviado. Verifique sua caixa de entrada e a pasta de spam."
        )
      ).toBeInTheDocument()
    )
  })

  it("variant inline usa o rótulo com seta, igual ao CTA vizinho de cadastro", () => {
    render(<ResendVerificationButton variant="inline" />)
    expect(
      screen.getByRole("button", { name: "Reenviar e-mail de verificação →" })
    ).toBeInTheDocument()
  })

  it("traduz 429 em minutos usando o header Retry-After", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 429,
      headers: new Headers({ "Retry-After": "120" }),
      json: async () => ({ error: { code: "RATE_LIMITED" } }),
    })
    render(<ResendVerificationButton />)

    await userEvent.click(screen.getByRole("button", { name: "Reenviar e-mail de verificação" }))

    await waitFor(() =>
      expect(
        screen.getByText("Limite de reenvios atingido. Tente novamente em 2 minutos.")
      ).toBeInTheDocument()
    )
  })

  it("mostra mensagem de conexão quando o fetch rejeita", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network"))
    render(<ResendVerificationButton />)

    await userEvent.click(screen.getByRole("button", { name: "Reenviar e-mail de verificação" }))

    await waitFor(() =>
      expect(
        screen.getByText("Falha de conexão. Verifique sua internet e tente novamente.")
      ).toBeInTheDocument()
    )
  })
})
