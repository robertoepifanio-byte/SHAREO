/**
 * EVAL-P1-01 — semântica ARIA do cartão de locação (app/itens/[id]/_PriceCalc.tsx).
 *
 * Antes: o erro de reserva era um <div> mudo (leitor de tela não anunciava a
 * recusa do servidor) e as modalidades Diário/Semanal/Mensal eram botões
 * soltos, sem dizer qual estava escolhida.
 */
import { render, screen, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PriceCalc } from "@/app/itens/[id]/_PriceCalc"

jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }) }))
jest.mock("@/components/analytics/GoogleAnalytics", () => ({ trackEvent: jest.fn() }))

const props = {
  pricePerDay: 3500,
  pricePerWeek: 9000,
  itemId: "item-1",
  isLoggedIn: true,
  feeRatePct: 15,
  checkoutMaxCents: 50000,
}

it("modalidades formam um tablist e marcam a aba escolhida com aria-selected", async () => {
  const user = userEvent.setup()
  render(<PriceCalc {...props} />)

  expect(screen.getByRole("tablist", { name: "Modalidade de locação" })).toBeInTheDocument()
  const [diario, semanal] = screen.getAllByRole("tab")
  expect(diario).toHaveAttribute("aria-selected", "true")
  expect(semanal).toHaveAttribute("aria-selected", "false")

  await user.click(semanal)
  expect(diario).toHaveAttribute("aria-selected", "false")
  expect(semanal).toHaveAttribute("aria-selected", "true")
})

it("setas trocam a aba e o foco; só a aba ativa fica no Tab (roving tabindex)", async () => {
  const user = userEvent.setup()
  render(<PriceCalc {...props} pricePerMonth={30000} />)
  const [diario, semanal, mensal] = screen.getAllByRole("tab")
  expect([diario, semanal, mensal].map((t) => t.tabIndex)).toEqual([0, -1, -1])

  diario.focus()
  await user.keyboard("{ArrowRight}")
  expect(semanal).toHaveAttribute("aria-selected", "true")
  expect(semanal).toHaveFocus()
  expect(semanal.tabIndex).toBe(0)

  await user.keyboard("{ArrowLeft}{ArrowLeft}")
  expect(mensal).toHaveAttribute("aria-selected", "true")
  expect(mensal).toHaveFocus()
})

it("erro devolvido pela API de reserva é anunciado com role=alert", async () => {
  global.fetch = jest.fn(async () => ({
    ok: false,
    status: 409,
    json: async () => ({ error: { code: "CONFLICT", message: "Item indisponível nessas datas." } }),
  })) as unknown as typeof fetch

  const user = userEvent.setup()
  render(<PriceCalc {...props} />)
  fireEvent.change(screen.getByLabelText("Retirada"), { target: { value: "2099-01-10" } })
  await user.click(screen.getByRole("button", { name: /solicitar locação/i }))

  const alerta = await screen.findByRole("alert")
  expect(alerta).toHaveTextContent("Item indisponível nessas datas.")
})
