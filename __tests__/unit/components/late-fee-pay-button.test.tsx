import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { LateFeePayButton } from "@/components/bookings/LateFeePayButton"

it("mostra o valor e chama a rota da reserva", async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: false, status: 403,
    json: async () => ({ error: { code: "BILLING_CLOSED", message: "Pagamentos fechados." } }),
  }) as unknown as typeof fetch
  render(<LateFeePayButton bookingId="bk-1" amount={4500} />)

  const botao = screen.getByRole("button", { name: /pagar taxa de atraso/i })
  expect(botao).toHaveTextContent("45,00")
  await userEvent.setup().click(botao)

  expect(global.fetch).toHaveBeenCalledWith("/api/bookings/bk-1/late-fee/pay", { method: "POST" })
  expect(await screen.findByText("Pagamentos fechados.")).toBeInTheDocument()
  expect(screen.getByRole("button", { name: /pagar taxa de atraso/i })).toBeEnabled()
})
