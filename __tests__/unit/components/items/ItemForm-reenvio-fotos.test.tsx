/**
 * ItemForm (create) × falha no upload das fotos.
 *
 * Reportado pelo Thiago em produção: "Anúncio salvo, mas 3 foto(s) não foram enviadas".
 * Depois dessa mensagem o formulário ficava travado (submittingRef não era liberado) e,
 * mesmo destravado, um novo envio faria POST /api/items de novo — anúncio duplicado.
 * Estes testes trancam: o reenvio atualiza o MESMO anúncio (PUT) e só reenvia as fotos
 * que falharam.
 */
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ItemForm } from "@/components/items/ItemForm"

jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }) }))

const ITEM_ID = "item-1"
const initialData = {
  id: "novo", title: "Furadeira de impacto", description: "Furadeira de impacto em ótimo estado, com maleta.",
  categoryId: "cat-1", condition: "GOOD", pricePerDay: 3500, estimatedRetailPrice: 80000,
  city: "Natal", state: "RN", latitude: -5.79, longitude: -35.2, images: [],
}

type Call = { url: string; method: string }
let calls: Call[]
let imageResponses: Array<{ ok: boolean; status: number; body: unknown }>

const json = (ok: boolean, status: number, body: unknown) => ({ ok, status, json: async () => body })

beforeEach(() => {
  calls = []
  let n = 0
  global.URL.createObjectURL = jest.fn(() => `blob:preview-${++n}`)
  global.URL.revokeObjectURL = jest.fn()
  global.fetch = jest.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET"
    calls.push({ url, method })
    if (url === "/api/items" && method === "POST") return json(true, 201, { data: { id: ITEM_ID } })
    if (url === `/api/items/${ITEM_ID}` && method === "PUT") return json(true, 200, { data: { id: ITEM_ID } })
    if (url === `/api/items/${ITEM_ID}/images`) {
      const r = imageResponses.shift()!
      return json(r.ok, r.status, r.body)
    }
    return json(true, 200, { data: [] })
  }) as unknown as typeof fetch
})

const falha = { ok: false, status: 500, body: { error: { message: "Erro interno." } } }
const sucesso = { ok: true, status: 201, body: { data: { id: "img" } } }

async function enviarComFotos(user: ReturnType<typeof userEvent.setup>, container: HTMLElement) {
  const inputs = container.querySelectorAll<HTMLInputElement>('input[type="file"]')
  const fotos = [1, 2, 3].map((n) => new File([`x${n}`], `f${n}.jpg`, { type: "image/jpeg" }))
  await user.upload(inputs[1], fotos)
  await user.click(screen.getByRole("button", { name: /publicar anúncio/i }))
}

const chamadas = (method: string, url: string) => calls.filter((c) => c.method === method && c.url === url).length

it("reenvio depois de falha nas fotos não cria 2º anúncio e só reenvia as que falharam", async () => {
  // 1ª rodada: foto 1 sobe, fotos 2 e 3 falham. 2ª rodada: as duas restantes sobem.
  imageResponses = [sucesso, falha, falha, sucesso, sucesso]
  const user = userEvent.setup()
  const { container } = render(<ItemForm mode="create" initialData={initialData} />)

  await enviarComFotos(user, container)
  expect(await screen.findByText(/2 foto\(s\) não foram enviadas/)).toBeInTheDocument()
  expect(chamadas("POST", "/api/items")).toBe(1)

  // Botão destravado e reenvio atualiza o MESMO anúncio.
  const botao = screen.getByRole("button", { name: /publicar anúncio/i })
  await waitFor(() => expect(botao).toBeEnabled())
  await user.click(botao)

  await waitFor(() => expect(chamadas("PUT", `/api/items/${ITEM_ID}`)).toBe(1))
  expect(chamadas("POST", "/api/items")).toBe(1)
  // 3 uploads na 1ª rodada + 2 na 2ª (a foto que subiu não é reenviada).
  expect(chamadas("POST", `/api/items/${ITEM_ID}/images`)).toBe(5)
  expect(screen.queryByText(/não foram enviadas/)).not.toBeInTheDocument()
})

it("o botão destrava depois que todas as fotos falham: clicar de novo dispara o reenvio", async () => {
  imageResponses = [falha, falha, falha, sucesso, sucesso, sucesso]
  const user = userEvent.setup()
  const { container } = render(<ItemForm mode="create" initialData={initialData} />)

  await enviarComFotos(user, container)

  expect(await screen.findByText(/3 foto\(s\) não foram enviadas/)).toBeInTheDocument()
  const botao = screen.getByRole("button", { name: /publicar anúncio/i })
  await waitFor(() => expect(botao).toBeEnabled())

  // Antes da correção o submittingRef ficava preso e este clique era engolido.
  await user.click(botao)
  await waitFor(() => expect(chamadas("PUT", `/api/items/${ITEM_ID}`)).toBe(1))
  expect(chamadas("POST", "/api/items")).toBe(1)
})
