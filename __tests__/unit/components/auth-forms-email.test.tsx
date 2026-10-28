/**
 * EVAL-P1-06 — cadastro e "esqueci a senha" do site validam o e-mail com o
 * MESMO critério do servidor (emailField() de lib/validations/auth.ts). O teste
 * antigo, `includes("@")`, deixava "a@" passar e a recusa só vinha do servidor.
 */
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { RegisterForm } from "@/app/(auth)/cadastro/RegisterForm"
import { ForgotPasswordForm } from "@/app/(auth)/esqueci-senha/_ForgotPasswordForm"

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))
jest.mock("next-auth/react", () => ({ signIn: jest.fn() }))
jest.mock("@/components/analytics/GoogleTagManager", () => ({ gtmEvent: jest.fn() }))

const INVALIDOS = ["a@", "@b.com", "a@b", "a b@c.com"]

beforeEach(() => {
  global.fetch = jest.fn() as unknown as typeof fetch
})

describe("RegisterForm", () => {
  it.each(INVALIDOS)("recusa %p no cliente, sem chamar a API", async (email) => {
    const user = userEvent.setup()
    render(<RegisterForm />)
    await user.type(screen.getByPlaceholderText("seu@email.com"), email)
    await user.click(screen.getByRole("button", { name: "Criar conta" }))

    expect(await screen.findByText("E-mail inválido")).toBeInTheDocument()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it("aceita e-mail válido com espaços nas pontas (o servidor faz trim)", async () => {
    const user = userEvent.setup()
    render(<RegisterForm />)
    await user.type(screen.getByPlaceholderText("seu@email.com"), " ana@exemplo.com ")
    await user.click(screen.getByRole("button", { name: "Criar conta" }))

    // Outros campos vazios reprovam, mas o e-mail não.
    expect(await screen.findByText("Nome obrigatório")).toBeInTheDocument()
    expect(screen.queryByText("E-mail inválido")).not.toBeInTheDocument()
  })
})

describe("ForgotPasswordForm", () => {
  it.each(INVALIDOS)("recusa %p no cliente, sem chamar a API", async (email) => {
    const user = userEvent.setup()
    render(<ForgotPasswordForm />)
    await user.type(screen.getByPlaceholderText("seu@email.com"), email)
    await user.click(screen.getByRole("button", { name: /enviar link/i }))

    expect(await screen.findByText("E-mail inválido")).toBeInTheDocument()
    expect(global.fetch).not.toHaveBeenCalled()
  })
})
