/**
 * A imagem do primeiro card é candidata a LCP e não pode ficar em `loading="lazy"`.
 *
 * O que se prova aqui é só o repasse do prop ao `next/image` (que é quem decide o `loading`):
 * com `priority` ele chega true, sem ele chega false — o padrão segue lazy para o resto da grade.
 */
import React from "react"
import { render, screen } from "@testing-library/react"
import { ItemCard } from "@/components/items/ItemCard"

jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ priority, alt }: { priority?: boolean; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} data-priority={String(!!priority)} />
  ),
}))
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}))
jest.mock("@/components/items/FavoriteButton", () => ({ FavoriteButton: () => null }))

const item = {
  id: "i1", title: "Furadeira", pricePerDay: 3500, condition: "GOOD",
  city: "Natal", state: "RN", images: [{ url: "https://x/y.jpg" }],
  category: { name: "Ferramentas" }, owner: { name: "Ana", isVerified: false },
}

describe("ItemCard priority", () => {
  it("com priority, a imagem recebe priority", () => {
    render(<ItemCard item={item} priority />)
    expect(screen.getByAltText("Furadeira")).toHaveAttribute("data-priority", "true")
  })

  it("sem priority, a imagem segue lazy (padrão)", () => {
    render(<ItemCard item={item} />)
    expect(screen.getByAltText("Furadeira")).toHaveAttribute("data-priority", "false")
  })
})
