// Fonte: components/items/ItemCard.tsx (site) e apps/mobile/components/items/ItemCard.tsx
// RÓTULOS VERBATIM — alteração no componente sem atualizar aqui quebra o CI.

import React from "react"
import { render, screen } from "@testing-library/react-native"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ItemCard, type ItemCardItem } from "@/components/items/ItemCard"

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
}))

jest.mock("@/lib/api", () => ({ apiFetch: jest.fn() }))

jest.mock("@/lib/auth", () => ({
  useAuth: (sel: (s: unknown) => unknown) => sel({ user: null }),
}))

jest.mock("@/lib/theme", () => ({
  useTheme: () => ({
    mode: "light",
    tokens: {
      surface: "#FFFFFF", border: "#E2E8F0", text: "#0F172A",
      muted: "#64748B", success: "#007B3C", bg: "#F8FAFC",
      disabledBg: "#E2E8F0",
    },
  }),
}))

jest.mock("expo-image", () => {
  const React = require("react")
  const { View } = require("react-native")
  return { Image: (props: Record<string, unknown>) => React.createElement(View, props) }
})

function makeItem(overrides: Partial<ItemCardItem> = {}): ItemCardItem {
  return {
    id:           "item-001",
    title:        "Furadeira de Impacto",
    pricePerDay:  3500,
    city:         "Recife",
    state:        "PE",
    neighborhood: "Boa Viagem",
    images:       [],
    category:     { name: "Ferramentas", slug: "ferramentas" },
    owner:        { name: "João", isVerified: false },
    ...overrides,
  }
}

function renderCard(props: Partial<React.ComponentProps<typeof ItemCard>> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <ItemCard item={makeItem()} onPress={jest.fn()} {...props} />
    </QueryClientProvider>,
  )
}

describe("ItemCard mobile — paridade de rótulos com o site", () => {
  it('exibe "Mais alugado" (VERBATIM) quando hotBadge=true', () => {
    renderCard({ hotBadge: true })
    expect(screen.getByText("🔥 Mais alugado")).toBeTruthy()
  })

  it('não exibe "Mais alugado" quando hotBadge=false (padrão)', () => {
    renderCard({ hotBadge: false })
    expect(screen.queryByText("🔥 Mais alugado")).toBeNull()
  })

  it('exibe "Editar" (VERBATIM) quando showActions=true', () => {
    renderCard({ showActions: true })
    expect(screen.getByText("Editar")).toBeTruthy()
  })

  it('não exibe "Editar" quando showActions=false (padrão)', () => {
    renderCard({ showActions: false })
    expect(screen.queryByText("Editar")).toBeNull()
  })
})
