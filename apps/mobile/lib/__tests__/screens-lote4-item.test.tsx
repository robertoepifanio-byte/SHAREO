// Fonte: apps/mobile/app/itens/[id]/index.tsx
// Testes das features novas do detalhe do item (Lote 4 — PR feat/mobile-item-detail-new-features):
//   - MobileAvailabilityCalendar: legenda ("Disponível"/"Ocupado"/"Passado"),
//     estado de erro ("Não foi possível carregar o calendário." + "Tentar novamente"),
//     dias ocupados (acessibilityLabel via mock de occupied dates).
//   - MobileAddToRentalButton: rótulos dos estados (vazio/inCart), hint text,
//     mensagem ALREADY_IN_CART.
//   - Grids "Itens do mesmo anunciante" / "Você também pode gostar":
//     títulos exatos e filtro de exclusão de ownerItems.
//
// RÓTULOS VERBATIM — qualquer alteração neste arquivo sem correspondente no
// componente quebrará o CI e sinaliza regressão de transcrição.

import React from "react"
import { render, screen, waitFor } from "@testing-library/react-native"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { useRentalCart } from "@/lib/rentalCart"

import ItemDetailScreen from "@/app/itens/[id]/index"

// ── Mocks globais ──────────────────────────────────────────────────────────────

jest.mock("@/lib/api", () => ({
  apiFetch:  jest.fn(),
  API_URL:   "https://staging.shareo.com.br",
  getTokens: jest.fn().mockResolvedValue(null),
}))

jest.mock("@/lib/auth", () => ({
  useAuth: jest.fn((selector: (s: unknown) => unknown) =>
    selector({ user: { id: "user-borrower", name: "Ana Locatária" }, logout: jest.fn(), loading: false })
  ),
}))

jest.mock("@/lib/theme", () => {
  const React = require("react")
  const TOKENS = {
    bg: "#F8FAFC", surface: "#FFFFFF", text: "#0F172A", muted: "#64748B",
    border: "#E2E8F0", navy: "#003366", green: "#007B3C", error: "#C0392B",
    success: "#059669",
  }
  return {
    useTheme: () => ({ preference: "light", mode: "light", tokens: TOKENS, setPreference: jest.fn() }),
    ThemeProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  }
})

jest.mock("expo-router", () => ({
  router:               { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({ id: "item-1" }),
  Link:                 ({ children }: { children: React.ReactNode }) => children,
  usePathname:          () => "/",
  useSegments:          () => [],
}))

jest.mock("expo-image-picker", () => ({
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ status: "denied", granted: false }),
  launchImageLibraryAsync:             jest.fn().mockResolvedValue({ canceled: true }),
}))

// Stars — componente puro de apresentação, não relevante para estes testes
jest.mock("@/components/ui/Stars", () => {
  const React = require("react")
  const { View } = require("react-native")
  return {
    Stars: ({ rating }: { rating: number }) =>
      React.createElement(View, { testID: `stars-${rating}` }),
  }
})

// ItemCard — renderiza o título do item para verificar presença nos grids
jest.mock("@/components/items/ItemCard", () => {
  const React = require("react")
  const { Text } = require("react-native")
  return {
    ItemCard: ({ item }: { item: { id: string; title: string } }) =>
      React.createElement(Text, { testID: `itemcard-${item.id}` }, item.title),
  }
})

// ── Dados de fixture ──────────────────────────────────────────────────────────

function makeItemCardItem(id: string, title: string) {
  return {
    id,
    title,
    pricePerDay:  3500,
    pricePerWeek: null,
    pricePerMonth: null,
    city:     "São Paulo",
    state:    "SP",
    category: { name: "Ferramentas" },
    images:   [],
    _count:   { reviews: 0, favorites: 0 },
    owner:    { id: "owner-1", name: "Carlos", isVerified: true },
  }
}

const ITEM_BASE = {
  id:                    "item-1",
  title:                 "Furadeira Bosch 650W",
  description:           "Furadeira potente para uso doméstico e profissional.",
  pricePerDay:           3500,
  pricePerWeek:          null,
  pricePerMonth:         null,
  depositAmount:         null,
  condition:             "GOOD",
  voltage:               null,
  city:                  "São Paulo",
  state:                 "SP",
  neighborhood:          "Centro",
  status:                "AVAILABLE",
  ownerId:               "owner-1",
  rules:                 null,
  estimatedRetailPrice:  null,
  requireIdVerification: false,
  requirePhone:          false,
  category: { name: "Ferramentas" },
  owner: {
    id:         "owner-1",
    name:       "Carlos Proprietário",
    avatarUrl:  null,
    isVerified: true,
    city:       "São Paulo",
  },
  images:  [{ url: "https://example.com/img1.jpg" }],
  reviews: [],
  _count:  { reviews: 0, favorites: 0 },
  ownerItems:   [],
  similarItems: [],
}

// ── Utilitários ───────────────────────────────────────────────────────────────

function makeQC() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
}

function wrap(ui: React.ReactElement) {
  return render(
    <SafeAreaProvider>
      <QueryClientProvider client={makeQC()}>
        {ui}
      </QueryClientProvider>
    </SafeAreaProvider>
  )
}

// Helper para configurar apiFetch com diferentes respostas por URL
type ApiFetchImpl = (url: string) => Promise<unknown>

function setApiFetch(impl: ApiFetchImpl) {
  const { apiFetch } = jest.requireMock("@/lib/api") as { apiFetch: jest.Mock }
  apiFetch.mockImplementation(impl)
}

// Default: item carrega, stats e availability com sucesso (sem ocupados)
function mockDefault(itemOverrides = {}) {
  setApiFetch(async (url: string) => {
    if (url.includes("/availability")) return { data: [] }
    if (url.includes("/api/stats"))    return { data: { feeRate: 1500 } }
    return { data: { ...ITEM_BASE, ...itemOverrides } }
  })
}

// Aguarda o item renderizar pelo título para confirmar que a query resolveu
async function waitForItemLoad() {
  await waitFor(() =>
    expect(screen.getByText("Furadeira Bosch 650W")).toBeTruthy(),
    { timeout: 3000 }
  )
}

// ── Setup global ──────────────────────────────────────────────────────────────

beforeEach(() => {
  mockDefault()
  // Reseta o carrinho de locação entre testes
  useRentalCart.setState({ cart: null, loaded: false })
})

// ── AvailabilityCalendar — legenda ────────────────────────────────────────────

describe("MobileAvailabilityCalendar — legenda verbatim", () => {
  it("exibe 'Disponível' na legenda — verbatim calS.legendLabel linha 276", async () => {
    wrap(<ItemDetailScreen />)
    await waitForItemLoad()
    await waitFor(() => expect(screen.getByText("Disponível")).toBeTruthy())
  })

  it("exibe 'Ocupado' na legenda — verbatim calS.legendLabel linha 277", async () => {
    wrap(<ItemDetailScreen />)
    await waitForItemLoad()
    await waitFor(() => expect(screen.getByText("Ocupado")).toBeTruthy())
  })

  it("exibe 'Passado' na legenda — verbatim calS.legendLabel linha 278", async () => {
    wrap(<ItemDetailScreen />)
    await waitForItemLoad()
    await waitFor(() => expect(screen.getByText("Passado")).toBeTruthy())
  })
})

// ── AvailabilityCalendar — estado de erro ─────────────────────────────────────

describe("MobileAvailabilityCalendar — estado de erro", () => {
  beforeEach(() => {
    setApiFetch(async (url: string) => {
      // Força erro somente na rota de availability
      if (url.includes("/availability")) throw new Error("Falha de rede")
      if (url.includes("/api/stats"))    return { data: { feeRate: 1500 } }
      return { data: ITEM_BASE }
    })
  })

  it("exibe 'Não foi possível carregar o calendário.' no erro — verbatim calS.errorText linha 264", async () => {
    wrap(<ItemDetailScreen />)
    await waitForItemLoad()
    await waitFor(() =>
      expect(screen.getByText("Não foi possível carregar o calendário.")).toBeTruthy(),
      { timeout: 3000 }
    )
  })

  it("exibe botão 'Tentar novamente' no erro — verbatim calS.retryText linha 266", async () => {
    wrap(<ItemDetailScreen />)
    await waitForItemLoad()
    await waitFor(() =>
      expect(screen.getByText("Tentar novamente")).toBeTruthy(),
      { timeout: 3000 }
    )
  })

  it("botão 'Tentar novamente' tem accessibilityLabel correto", async () => {
    wrap(<ItemDetailScreen />)
    await waitForItemLoad()
    await waitFor(() =>
      expect(screen.getByLabelText("Tentar novamente")).toBeTruthy(),
      { timeout: 3000 }
    )
  })
})

// ── AvailabilityCalendar — dias ocupados ──────────────────────────────────────

describe("MobileAvailabilityCalendar — dias ocupados (accessibilityLabel)", () => {
  it("dia com data ocupada tem accessibilityLabel contendo 'ocupado'", async () => {
    // 2026-07-10 = data futura (ano de testes) — marcada como ocupada na query
    setApiFetch(async (url: string) => {
      if (url.includes("/availability")) return { data: ["2026-07-10"] }
      if (url.includes("/api/stats"))    return { data: { feeRate: 1500 } }
      return { data: ITEM_BASE }
    })
    wrap(<ItemDetailScreen />)
    await waitForItemLoad()
    await waitFor(() => {
      // accessibilityLabel = "${day} de ${CAL_MONTH_NAMES[month]}: ocupado"
      const elements = screen.queryAllByLabelText(/: ocupado$/)
      expect(elements.length).toBeGreaterThan(0)
    }, { timeout: 3000 })
  })
})

// ── MobileAddToRentalButton — estado padrão (carrinho vazio) ──────────────────

describe("MobileAddToRentalButton — rótulos estado padrão", () => {
  it("exibe '➕ Adicionar a uma locação' — verbatim addS.addBtnText linha 380", async () => {
    wrap(<ItemDetailScreen />)
    await waitForItemLoad()
    await waitFor(() =>
      expect(screen.getByText("➕ Adicionar a uma locação")).toBeTruthy()
    )
  })

  it("botão tem accessibilityLabel 'Adicionar a uma locação'", async () => {
    wrap(<ItemDetailScreen />)
    await waitForItemLoad()
    await waitFor(() =>
      expect(screen.getByLabelText("Adicionar a uma locação")).toBeTruthy()
    )
  })

  it("exibe hint text verbatim — linha 387 de index.tsx", async () => {
    wrap(<ItemDetailScreen />)
    await waitForItemLoad()
    await waitFor(() =>
      expect(screen.getByText(
        "Junte vários itens deste anunciante e alugue tudo numa só locação."
      )).toBeTruthy()
    )
  })
})

// ── MobileAddToRentalButton — estado inCart ───────────────────────────────────

describe("MobileAddToRentalButton — estado inCart (item já no carrinho)", () => {
  beforeEach(() => {
    // Pré-carrega o carrinho com item-1 do owner-1
    useRentalCart.setState({
      cart: {
        ownerId:   "owner-1",
        ownerName: "Carlos Proprietário",
        items: [{
          itemId:        "item-1",
          title:         "Furadeira Bosch 650W",
          image:         null,
          pricePerDay:   3500,
          pricePerWeek:  null,
          pricePerMonth: null,
          depositAmount: null,
        }],
      },
      loaded: true,
    })
  })

  it("exibe '✓ Na sua locação · Ver carrinho →' quando item já está no carrinho", async () => {
    wrap(<ItemDetailScreen />)
    await waitForItemLoad()
    await waitFor(() =>
      expect(screen.getByText(/✓ Na sua locação · Ver carrinho/)).toBeTruthy()
    )
  })

  it("botão inCart tem accessibilityLabel 'Ver carrinho (1 itens)'", async () => {
    wrap(<ItemDetailScreen />)
    await waitForItemLoad()
    await waitFor(() =>
      expect(screen.getByLabelText(/Ver carrinho/)).toBeTruthy()
    )
  })
})

// ── Grid "Itens do mesmo anunciante" ─────────────────────────────────────────

describe("Grid 'Itens do mesmo anunciante' — rótulo e conteúdo", () => {
  beforeEach(() => {
    mockDefault({
      ownerItems: [makeItemCardItem("item-nível", "Nível Digital")],
    })
  })

  it("exibe título 'Itens do mesmo anunciante' — verbatim index.tsx linha 1253", async () => {
    wrap(<ItemDetailScreen />)
    await waitForItemLoad()
    await waitFor(() =>
      expect(screen.getByText("Itens do mesmo anunciante")).toBeTruthy()
    )
  })

  it("exibe subtítulo com nome do proprietário — verbatim linha 1257", async () => {
    wrap(<ItemDetailScreen />)
    await waitForItemLoad()
    await waitFor(() =>
      expect(screen.getByText(
        /De Carlos Proprietário — você pode alugar vários itens deste anunciante numa só locação/
      )).toBeTruthy()
    )
  })

  it("renderiza ItemCard do item do anunciante", async () => {
    wrap(<ItemDetailScreen />)
    await waitForItemLoad()
    await waitFor(() =>
      expect(screen.getByTestId("itemcard-item-nível")).toBeTruthy()
    )
  })
})

// ── Grid "Você também pode gostar" ───────────────────────────────────────────

describe("Grid 'Você também pode gostar' — rótulo e filtro", () => {
  beforeEach(() => {
    mockDefault({
      ownerItems: [makeItemCardItem("item-nível", "Nível Digital")],
      similarItems: [
        makeItemCardItem("item-nível", "Nível Digital"),  // mesmo id → filtrado
        makeItemCardItem("item-serra", "Serra Circular"),  // id único → exibido
      ],
    })
  })

  it("exibe título 'Você também pode gostar' — verbatim index.tsx linha 1283", async () => {
    wrap(<ItemDetailScreen />)
    await waitForItemLoad()
    await waitFor(() =>
      expect(screen.getByText("Você também pode gostar")).toBeTruthy()
    )
  })

  it("exibe item único da seção similarItems após filtro", async () => {
    wrap(<ItemDetailScreen />)
    await waitForItemLoad()
    await waitFor(() =>
      expect(screen.getByTestId("itemcard-item-serra")).toBeTruthy()
    )
  })

  it("similarItems EXCLUI itens já em ownerItems — item-nível aparece só 1 vez", async () => {
    wrap(<ItemDetailScreen />)
    await waitForItemLoad()
    await waitFor(() =>
      expect(screen.getByText("Itens do mesmo anunciante")).toBeTruthy()
    )
    // item-nível aparece UMA vez (em ownerItems) — nunca duplicado em similarItems
    const all = screen.queryAllByTestId("itemcard-item-nível")
    expect(all).toHaveLength(1)
  })
})
