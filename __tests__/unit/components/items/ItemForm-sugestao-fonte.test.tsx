/**
 * EVAL-P1-07 — textos de sugestão de preço semanal/mensal do ItemForm usavam
 * `text-[11px]`, abaixo do mínimo de 12px do design system.
 */
import { render, screen } from "@testing-library/react"
import { ItemForm } from "@/components/items/ItemForm"

jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }) }))

const initialData = {
  id: "item-1", title: "Furadeira de impacto", description: "Furadeira de impacto em ótimo estado, com maleta.",
  categoryId: "cat-1", condition: "GOOD", pricePerDay: 3500, estimatedRetailPrice: 80000,
  city: "Natal", state: "RN", latitude: -5.79, longitude: -35.2, images: [],
}

beforeEach(() => {
  global.fetch = jest.fn(async () => ({ ok: true, status: 200, json: async () => ({ data: [] }) })) as unknown as typeof fetch
})

it("sugestões 'Sugerido: R$' (semana e mês) e o botão Aplicar/Recalcular usam no mínimo 12px", () => {
  render(<ItemForm mode="edit" initialData={initialData} />)

  const sugestoes = screen.getAllByText(/Sugerido: R\$/)
  expect(sugestoes).toHaveLength(2)
  const botoes = screen.getAllByRole("button", { name: /^(Aplicar|Recalcular) \(/ })
  expect(botoes.length).toBeGreaterThan(0)

  for (const el of [...sugestoes, ...botoes]) {
    // text-xs = 12px; nenhum tamanho arbitrário (text-[11px]) por cima dele.
    expect(el.className).toMatch(/\btext-xs\b/)
    expect(el.className).not.toMatch(/\btext-\[/)
  }
})
