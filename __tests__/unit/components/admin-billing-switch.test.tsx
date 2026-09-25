/**
 * app/admin/financeiro/_BillingSwitch.tsx — o botão que abre a cobrança REAL.
 *
 * O gesto que importa: abrir exige confirmação (é dinheiro de verdade) e grava a
 * chave `billingEnabled` com a string exata "true"/"false" — a mesma que
 * getBillingConfig() lê e que o PATCH valida.
 */
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { BillingSwitch } from "@/app/admin/financeiro/_BillingSwitch"

let fetchMock: jest.Mock
let confirmMock: jest.SpyInstance

beforeEach(() => {
  fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
  global.fetch = fetchMock as unknown as typeof fetch
  confirmMock = jest.spyOn(window, "confirm").mockReturnValue(true)
})
afterEach(() => confirmMock.mockRestore())

describe("BillingSwitch", () => {
  it("fechada: mostra FECHADA e o botão 'Abrir cobrança real'", () => {
    render(<BillingSwitch enabled={false} testMode={false} />)
    expect(screen.getByText("FECHADA")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Abrir cobrança real" })).toBeInTheDocument()
  })

  it("abrir PEDE confirmação; cancelada, não grava nada", async () => {
    confirmMock.mockReturnValue(false)
    render(<BillingSwitch enabled={false} testMode={false} />)

    await userEvent.setup().click(screen.getByRole("button", { name: "Abrir cobrança real" }))

    expect(confirmMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.getByText("FECHADA")).toBeInTheDocument()
  })

  it("abrir confirmado: PATCH billingEnabled=\"true\" e passa a mostrar ABERTA", async () => {
    render(<BillingSwitch enabled={false} testMode={false} />)

    await userEvent.setup().click(screen.getByRole("button", { name: "Abrir cobrança real" }))

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/platform-config?key=billingEnabled",
      expect.objectContaining({ method: "PATCH", body: JSON.stringify({ value: "true" }) }),
    )
    expect(await screen.findByText("ABERTA")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Fechar cobrança real" })).toBeInTheDocument()
  })

  it("fechar NÃO pede confirmação e grava \"false\"", async () => {
    render(<BillingSwitch enabled={true} testMode={false} />)

    await userEvent.setup().click(screen.getByRole("button", { name: "Fechar cobrança real" }))

    expect(confirmMock).not.toHaveBeenCalled()
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/platform-config?key=billingEnabled",
      expect.objectContaining({ body: JSON.stringify({ value: "false" }) }),
    )
    expect(await screen.findByText("FECHADA")).toBeInTheDocument()
  })

  it("erro do servidor: mostra a mensagem e NÃO troca o estado exibido", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 403, json: async () => ({ error: "Acesso negado" }) })
    render(<BillingSwitch enabled={false} testMode={false} />)

    await userEvent.setup().click(screen.getByRole("button", { name: "Abrir cobrança real" }))

    expect(await screen.findByRole("status")).toHaveTextContent("Acesso negado")
    expect(screen.getByText("FECHADA")).toBeInTheDocument()
  })

  it("🪤 não promete que fechar para tudo: links já emitidos seguem valendo até expirar", () => {
    render(<BillingSwitch enabled={true} testMode={false} />)
    expect(screen.getByText(/links de pagamento que já foram emitidos continuam valendo até\s+expirarem/i)).toBeInTheDocument()
    expect(screen.getByText(/nenhuma cobrança NOVA é criada/)).toBeInTheDocument()
  })

  it("chave de TESTE: avisa que o checkout funciona de qualquer forma", () => {
    render(<BillingSwitch enabled={false} testMode={true} />)
    expect(screen.getByText(/chave Stripe atual é de TESTE/)).toBeInTheDocument()
  })
})
