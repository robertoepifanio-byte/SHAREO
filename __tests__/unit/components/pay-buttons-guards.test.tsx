/**
 * PayButton e ExtensionPayButton × as recusas novas da cobrança real
 * (BILLING_CLOSED 403 e OWNER_NOT_READY 409, lib/payments/charge-guards.ts).
 *
 * Os dois botões mostram o `error.message` que a API devolve — então as mensagens
 * novas já chegam ao locatário sem código novo no front. Este arquivo TRANCA isso:
 * se alguém trocar o texto do botão por um "Erro ao iniciar pagamento." fixo, o
 * locatário deixa de saber que o problema é de configuração (e não dele), e estes
 * testes reprovam.
 *
 * Os botões não ramificam por status nem por `code`, então um corpo de erro
 * genérico basta; o texto real de cada recusa é fixado nos testes de rota
 * (checkout-guards / extension-guards).
 */
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PayButton } from "@/components/bookings/PayButton"
import { ExtensionPayButton } from "@/components/bookings/ExtensionPayButton"

const MENSAGEM_DA_API = "Mensagem qualquer devolvida pela API — nenhuma cobrança foi feita."

it.each([
  ["PayButton",          <PayButton key="a" bookingId="bk-1" totalPrice={10_000} />,                            /pagar agora/i],
  ["ExtensionPayButton", <ExtensionPayButton key="b" bookingId="bk-1" amount={10_500} newEndDate="15/10/2026" />, /pagar diárias extras/i],
])("%s mostra a mensagem que a API devolveu e deixa tentar de novo", async (_nome, botao, rotulo) => {
  global.fetch = jest.fn().mockResolvedValue({
    ok:     false,
    status: 403,
    json:   async () => ({ error: { code: "QUALQUER", message: MENSAGEM_DA_API } }),
  }) as unknown as typeof fetch
  render(botao)

  await userEvent.setup().click(screen.getByRole("button", { name: rotulo }))

  expect(await screen.findByText(MENSAGEM_DA_API)).toBeInTheDocument()
  // Não some com o botão: o locatário pode tentar de novo quando abrir.
  expect(screen.getByRole("button", { name: rotulo })).toBeEnabled()
})
