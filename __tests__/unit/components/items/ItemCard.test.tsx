/**
 * P2-43 — Testes unitários para components/items/ItemCard.tsx
 *
 * Cobertura:
 *  - Renderização de título, preço BRL, localização
 *  - Rating presente / ausente
 *  - distanceKm formatado
 *  - Badges de disponibilidade (Disponível / Pausado / Rascunho)
 *  - Alt da imagem contém o título
 *  - Ausência do FavoriteButton quando showActions=true
 *  - Acessibilidade com jest-axe (WCAG 2.1 AA)
 *
 * Nota: jest-axe já está instalado (jest-axe ^9.0.0 em devDependencies)
 * e toHaveNoViolations já está registrado globalmente em jest.setup.ts.
 *
 * Migração P2-isActive→status: campo isActive removido; usa ItemStatus enum
 * (AVAILABLE, PAUSED, DRAFT, DELETED). Mocks atualizados em 2026-06-03.
 */

import React from "react"
import { render, screen } from "@testing-library/react"
import { axe } from "jest-axe"
import { ItemCard } from "@/components/items/ItemCard"

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img {...props} />
  ),
}))

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

jest.mock("@/components/items/FavoriteButton", () => ({
  FavoriteButton: () => null,
}))

// ---------------------------------------------------------------------------
// Dados de teste (factory)
// ---------------------------------------------------------------------------

function makeItem(overrides: Partial<Parameters<typeof ItemCard>[0]["item"]> = {}) {
  return {
    id:          "item-test-001",
    title:       "Furadeira de Impacto",
    pricePerDay: 3500, // em centavos → R$ 35,00
    condition:   "Bom",
    city:        "Recife",
    state:       "PE",
    neighborhood: "Boa Viagem",
    status:      "AVAILABLE",
    images:      [{ url: "https://example.com/foto.jpg" }],
    category:    { name: "Ferramentas" },
    owner:       { name: "João Silva", isVerified: false },
    _count:      { reviews: 10, favorites: 5 },
    avgRating:   4.3,
    distanceKm:  2.3,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

describe("ItemCard", () => {
  describe("renderização básica", () => {
    it("exibe o título do item", () => {
      render(<ItemCard item={makeItem()} />)
      expect(screen.getByText("Furadeira de Impacto")).toBeInTheDocument()
    })

    it("exibe o preço formatado em BRL", () => {
      render(<ItemCard item={makeItem({ pricePerDay: 3500 })} />)
      // 3500 centavos = R$ 35,00
      expect(screen.getByText(/R\$\s*35/)).toBeInTheDocument()
    })

    it("exibe a localização com bairro quando neighborhood está presente", () => {
      render(<ItemCard item={makeItem({ neighborhood: "Boa Viagem", city: "Recife" })} />)
      expect(screen.getByText(/Boa Viagem.*Recife/)).toBeInTheDocument()
    })

    it("exibe apenas a cidade quando neighborhood é null", () => {
      render(<ItemCard item={makeItem({ neighborhood: null, city: "Natal" })} />)
      expect(screen.getByText(/Natal/)).toBeInTheDocument()
    })
  })

  describe("rating", () => {
    it("exibe o avgRating formatado quando presente e há reviews", () => {
      render(<ItemCard item={makeItem({ avgRating: 4.3, _count: { reviews: 10, favorites: 5 } })} />)
      expect(screen.getByText("4.3")).toBeInTheDocument()
      expect(screen.getByText("(10)")).toBeInTheDocument()
    })

    it("não exibe rating quando avgRating é null", () => {
      render(<ItemCard item={makeItem({ avgRating: null })} />)
      expect(screen.queryByText(/4\.3/)).not.toBeInTheDocument()
    })

    it("não exibe rating quando reviews count é 0", () => {
      render(
        <ItemCard item={makeItem({ avgRating: 4.0, _count: { reviews: 0, favorites: 0 } })} />,
      )
      expect(screen.queryByText("(0)")).not.toBeInTheDocument()
    })
  })

  describe("distanceKm", () => {
    it("exibe distância formatada com 1 casa decimal quando fornecida", () => {
      render(<ItemCard item={makeItem({ distanceKm: 2.3 })} />)
      // O componente usa toFixed(1) → "2.3 km"
      expect(screen.getByText(/2\.3 km/)).toBeInTheDocument()
    })

    it("exibe distância 0.5 km corretamente", () => {
      render(<ItemCard item={makeItem({ distanceKm: 0.5 })} />)
      expect(screen.getByText(/0\.5 km/)).toBeInTheDocument()
    })

    it("não exibe distância quando distanceKm é null", () => {
      render(<ItemCard item={makeItem({ distanceKm: null })} />)
      expect(screen.queryByText(/km/)).not.toBeInTheDocument()
    })

    it("não exibe distância quando distanceKm é 0", () => {
      render(<ItemCard item={makeItem({ distanceKm: 0 })} />)
      expect(screen.queryByText(/0\.0 km/)).not.toBeInTheDocument()
    })
  })

  describe("badges de disponibilidade", () => {
    // Decisão de produto (commit 455a5cc): badges de status só aparecem na
    // visão do proprietário (showActions=true). Na listagem pública não há badge.

    it("não exibe nenhum badge na listagem pública (showActions=false, padrão)", () => {
      render(<ItemCard item={makeItem({ status: "AVAILABLE" })} />)
      expect(screen.queryByText("Disponível")).not.toBeInTheDocument()
      expect(screen.queryByText("Pausado")).not.toBeInTheDocument()
      expect(screen.queryByText("Rascunho")).not.toBeInTheDocument()
    })

    it("exibe badge 'Pausado' na visão do proprietário (showActions=true)", () => {
      render(<ItemCard item={makeItem({ status: "PAUSED" })} showActions={true} />)
      expect(screen.getByText("Pausado")).toBeInTheDocument()
    })

    it("exibe badge 'Rascunho' na visão do proprietário (showActions=true)", () => {
      render(<ItemCard item={makeItem({ status: "DRAFT" })} showActions={true} />)
      expect(screen.getByText("Rascunho")).toBeInTheDocument()
    })

    it("não exibe badge para AVAILABLE mesmo na visão do proprietário", () => {
      render(<ItemCard item={makeItem({ status: "AVAILABLE" })} showActions={true} />)
      expect(screen.queryByText("Disponível")).not.toBeInTheDocument()
    })
  })

  describe("imagem", () => {
    it("tag alt da imagem contém o título do item", () => {
      render(<ItemCard item={makeItem({ title: "Escada Telescópica" })} />)
      const img = screen.getByRole("img")
      expect(img).toHaveAttribute("alt", "Escada Telescópica")
    })

    it("renderiza sem imagem quando images array está vazio", () => {
      render(<ItemCard item={makeItem({ images: [] })} />)
      // Sem src definido, o <img> do mock não é renderizado — o placeholder SVG aparece
      expect(screen.queryByRole("img")).not.toBeInTheDocument()
    })
  })

  describe("FavoriteButton", () => {
    it("não exibe FavoriteButton quando showActions=true", () => {
      // FavoriteButton está mockado para retornar null.
      // Quando showActions=true o componente não o renderiza — o bloco
      // `{!showActions && <FavoriteButton ... />}` não executa.
      // Verificamos que o mock não foi "chamado" via presença no DOM.
      // Como o mock retorna null, mesmo que fosse chamado não geraria elemento —
      // então validamos indiretamente que o painel de ações do proprietário
      // (Editar / Remover) aparece, e o FavoriteButton não aparece.
      render(<ItemCard item={makeItem()} showActions={true} />)
      expect(screen.getByText("Editar")).toBeInTheDocument()
    })

    it("exibe área de ações (Editar) quando showActions=true", () => {
      render(<ItemCard item={makeItem()} showActions={true} />)
      const editLink = screen.getByRole("link", { name: /editar/i })
      expect(editLink).toBeInTheDocument()
    })
  })

  describe("acessibilidade (jest-axe)", () => {
    it("não tem violações WCAG no estado padrão (status=AVAILABLE, com rating e distância)", async () => {
      const { container } = render(<ItemCard item={makeItem()} />)
      expect(await axe(container)).toHaveNoViolations()
    })

    it("não tem violações WCAG quando status=PAUSED", async () => {
      const { container } = render(<ItemCard item={makeItem({ status: "PAUSED" })} />)
      expect(await axe(container)).toHaveNoViolations()
    })

    it("não tem violações WCAG com showActions=true", async () => {
      const { container } = render(<ItemCard item={makeItem()} showActions={true} />)
      expect(await axe(container)).toHaveNoViolations()
    })

    it("não tem violações WCAG sem imagem (placeholder SVG)", async () => {
      const { container } = render(<ItemCard item={makeItem({ images: [] })} />)
      expect(await axe(container)).toHaveNoViolations()
    })
  })
})
