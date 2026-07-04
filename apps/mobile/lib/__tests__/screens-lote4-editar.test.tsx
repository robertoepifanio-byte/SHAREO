// Fonte: apps/mobile/app/itens/[id]/editar.tsx
// Testes da tela de edição de anúncio (Lote 4 — PR feat/mobile-editar-anuncio-nativo):
//   - Header "Editar anúncio"
//   - Seções: Informações básicas, Preços, Localização, Fotos, Requisitos para reserva
//   - CTA "Salvar alterações"
//   - Chips de condição: Novo / Excelente / Bom / Regular
//   - Checkboxes de requisito: Identidade verificada / Telefone cadastrado
//   - Pré-preenchimento do formulário com dados do item (title, pricePerDay, condition)
//
// RÓTULOS VERBATIM — qualquer alteração neste arquivo sem correspondente no
// componente quebrará o CI e sinaliza regressão de transcrição.

import React from "react"
import { render, screen, waitFor } from "@testing-library/react-native"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { SafeAreaProvider } from "react-native-safe-area-context"

import EditarAnuncioScreen from "@/app/itens/[id]/editar"

// ── Mocks globais ──────────────────────────────────────────────────────────────

jest.mock("@/lib/api", () => ({
  apiFetch:  jest.fn(),
  API_URL:   "https://staging.shareo.com.br",
  getTokens: jest.fn().mockResolvedValue(null),
}))

// Proprietário do item (id = "user-owner" = item.ownerId → guarda passa)
jest.mock("@/lib/auth", () => ({
  useAuth: jest.fn((selector: (s: unknown) => unknown) =>
    selector({ user: { id: "user-owner", name: "Carlos Proprietário" }, logout: jest.fn(), loading: false })
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
  requestCameraPermissionsAsync:       jest.fn().mockResolvedValue({ status: "denied", granted: false }),
  launchImageLibraryAsync:             jest.fn().mockResolvedValue({ canceled: true }),
  launchCameraAsync:                   jest.fn().mockResolvedValue({ canceled: true }),
}))

// ── Fixture ───────────────────────────────────────────────────────────────────

const ITEM_EDIT_MOCK = {
  id:                    "item-1",
  title:                 "Furadeira Bosch 650W",
  description:           "Furadeira potente para uso doméstico e profissional completo aqui.",
  categoryId:            "cat-ferramentas",
  condition:             "GOOD",
  pricePerDay:           3500,
  pricePerWeek:          null,
  pricePerMonth:         null,
  estimatedRetailPrice:  null,
  voltage:               null,
  requireIdVerification: false,
  requirePhone:          false,
  ownerId:               "user-owner",
  city:                  "São Paulo",
  state:                 "SP",
  neighborhood:          "Centro",
  images:                [],
}

const CATEGORIES_MOCK = [
  { id: "cat-ferramentas", name: "Ferramentas",  slug: "ferramentas"  },
  { id: "cat-eletronicos", name: "Eletrônicos",  slug: "eletronicos"  },
  { id: "cat-festas",      name: "Festas",        slug: "festas"        },
]

const PROFILE_MOCK = {
  city:         "São Paulo",
  state:        "SP",
  neighborhood: "Centro",
  street:       "Rua Augusta, 1000",
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

// Configura apiFetch para retornar os dados do item, categorias e perfil
function setupMocks(itemOverrides: Partial<typeof ITEM_EDIT_MOCK> = {}) {
  const { apiFetch } = jest.requireMock("@/lib/api") as { apiFetch: jest.Mock }
  apiFetch.mockImplementation(async (url: string) => {
    if (url === "/api/categories")       return { data: CATEGORIES_MOCK }
    if (url === "/api/users/me")         return { data: PROFILE_MOCK }
    // /api/items/item-1 (usado tanto para GET do item quanto para PUT — só GET importa aqui)
    return { data: { ...ITEM_EDIT_MOCK, ...itemOverrides } }
  })
}

// Aguarda o formulário estar pronto (após item carregar + useEffect preencher campos)
// Usamos o campo de título pré-preenchido como indicador de prontidão
async function waitForFormReady() {
  await waitFor(() =>
    expect(screen.getByDisplayValue("Furadeira Bosch 650W")).toBeTruthy(),
    { timeout: 4000 }
  )
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  setupMocks()
})

// ── Header ───────────────────────────────────────────────────────────────────

describe("EditarAnuncioScreen — header", () => {
  it("exibe 'Editar anúncio' no header — verbatim linha 614 de editar.tsx", async () => {
    wrap(<EditarAnuncioScreen />)
    await waitForFormReady()
    // Header title aparece tanto no skeleton quanto na tela carregada
    const titles = screen.queryAllByText("Editar anúncio")
    expect(titles.length).toBeGreaterThanOrEqual(1)
  })

  it("botão de voltar tem accessibilityLabel 'Voltar'", async () => {
    wrap(<EditarAnuncioScreen />)
    await waitForFormReady()
    const btns = screen.queryAllByLabelText("Voltar")
    expect(btns.length).toBeGreaterThanOrEqual(1)
  })
})

// ── Seções ────────────────────────────────────────────────────────────────────

describe("EditarAnuncioScreen — títulos de seção verbatim", () => {
  it("'Informações básicas' — verbatim linha 636 de editar.tsx", async () => {
    wrap(<EditarAnuncioScreen />)
    await waitForFormReady()
    expect(screen.getByText("Informações básicas")).toBeTruthy()
  })

  it("'Preços' — verbatim linha 785", async () => {
    wrap(<EditarAnuncioScreen />)
    await waitForFormReady()
    expect(screen.getByText("Preços")).toBeTruthy()
  })

  it("'Localização' — verbatim linha 928", async () => {
    wrap(<EditarAnuncioScreen />)
    await waitForFormReady()
    expect(screen.getByText("Localização")).toBeTruthy()
  })

  it("'Fotos' — verbatim linha 958", async () => {
    wrap(<EditarAnuncioScreen />)
    await waitForFormReady()
    expect(screen.getByText("Fotos")).toBeTruthy()
  })

  it("'Requisitos para reserva' — verbatim linha 1080", async () => {
    wrap(<EditarAnuncioScreen />)
    await waitForFormReady()
    expect(screen.getByText("Requisitos para reserva")).toBeTruthy()
  })
})

// ── Labels dos campos ─────────────────────────────────────────────────────────

describe("EditarAnuncioScreen — labels dos campos verbatim", () => {
  it("'Título do anúncio' — verbatim linha 640", async () => {
    wrap(<EditarAnuncioScreen />)
    await waitForFormReady()
    expect(screen.getByText(/Título do anúncio/)).toBeTruthy()
  })

  it("campo Título tem accessibilityLabel 'Título do anúncio'", async () => {
    wrap(<EditarAnuncioScreen />)
    await waitForFormReady()
    expect(screen.getByLabelText("Título do anúncio")).toBeTruthy()
  })

  it("'Descrição' — verbatim linha 660", async () => {
    wrap(<EditarAnuncioScreen />)
    await waitForFormReady()
    expect(screen.getByText(/^Descrição/)).toBeTruthy()
  })

  it("'Categoria' — verbatim linha 680", async () => {
    wrap(<EditarAnuncioScreen />)
    await waitForFormReady()
    expect(screen.getByText(/^Categoria/)).toBeTruthy()
  })

  it("'Estado de conservação' — verbatim linha 717", async () => {
    wrap(<EditarAnuncioScreen />)
    await waitForFormReady()
    expect(screen.getByText(/Estado de conservação/)).toBeTruthy()
  })

  it("'Preço por dia' — verbatim linha 820", async () => {
    wrap(<EditarAnuncioScreen />)
    await waitForFormReady()
    expect(screen.getByText(/Preço por dia/)).toBeTruthy()
  })

  it("'Preço por semana' — verbatim linha 850", async () => {
    wrap(<EditarAnuncioScreen />)
    await waitForFormReady()
    expect(screen.getByText("Preço por semana")).toBeTruthy()
  })

  it("'Preço por mês' — verbatim linha 886", async () => {
    wrap(<EditarAnuncioScreen />)
    await waitForFormReady()
    expect(screen.getByText("Preço por mês")).toBeTruthy()
  })
})

// ── Chips de condição ─────────────────────────────────────────────────────────

describe("EditarAnuncioScreen — chips de condição verbatim (CONDITION_LABELS)", () => {
  it("chip 'Novo' — verbatim CONDITION_LABELS.NEW linha 95", async () => {
    wrap(<EditarAnuncioScreen />)
    await waitForFormReady()
    expect(screen.getByLabelText("Novo")).toBeTruthy()
  })

  it("chip 'Excelente' — verbatim CONDITION_LABELS.EXCELLENT linha 96", async () => {
    wrap(<EditarAnuncioScreen />)
    await waitForFormReady()
    expect(screen.getByLabelText("Excelente")).toBeTruthy()
  })

  it("chip 'Bom' — verbatim CONDITION_LABELS.GOOD linha 97", async () => {
    wrap(<EditarAnuncioScreen />)
    await waitForFormReady()
    expect(screen.getByLabelText("Bom")).toBeTruthy()
  })

  it("chip 'Regular' — verbatim CONDITION_LABELS.FAIR linha 98", async () => {
    wrap(<EditarAnuncioScreen />)
    await waitForFormReady()
    expect(screen.getByLabelText("Regular")).toBeTruthy()
  })

  it("chip 'Bom' selecionado (condition = GOOD no mock) — accessibilityState.selected", async () => {
    wrap(<EditarAnuncioScreen />)
    await waitForFormReady()
    const chip = screen.getByLabelText("Bom")
    expect(chip.props.accessibilityState?.selected).toBe(true)
  })

  it("chip 'Novo' não selecionado quando condition = GOOD", async () => {
    wrap(<EditarAnuncioScreen />)
    await waitForFormReady()
    const chip = screen.getByLabelText("Novo")
    expect(chip.props.accessibilityState?.selected).toBe(false)
  })
})

// ── Requisitos para reserva ───────────────────────────────────────────────────

describe("EditarAnuncioScreen — requisitos para reserva verbatim", () => {
  it("checkbox 'Identidade verificada' — verbatim requireTitle linha 1103", async () => {
    wrap(<EditarAnuncioScreen />)
    await waitForFormReady()
    expect(screen.getByLabelText("Identidade verificada")).toBeTruthy()
  })

  it("checkbox 'Telefone cadastrado' — verbatim requireTitle linha 1127", async () => {
    wrap(<EditarAnuncioScreen />)
    await waitForFormReady()
    expect(screen.getByLabelText("Telefone cadastrado")).toBeTruthy()
  })

  it("'Identidade verificada' não marcado quando requireIdVerification = false", async () => {
    wrap(<EditarAnuncioScreen />)
    await waitForFormReady()
    const chk = screen.getByLabelText("Identidade verificada")
    expect(chk.props.accessibilityState?.checked).toBe(false)
  })

  it("'Identidade verificada' marcado quando requireIdVerification = true", async () => {
    setupMocks({ requireIdVerification: true })
    wrap(<EditarAnuncioScreen />)
    await waitForFormReady()
    await waitFor(() => {
      const chk = screen.getByLabelText("Identidade verificada")
      expect(chk.props.accessibilityState?.checked).toBe(true)
    })
  })
})

// ── CTA Salvar alterações ─────────────────────────────────────────────────────

describe("EditarAnuncioScreen — CTA verbatim", () => {
  it("CTA 'Salvar alterações' — verbatim linha 1158 (modo edit, diferente de 'Publicar anúncio')", async () => {
    wrap(<EditarAnuncioScreen />)
    await waitForFormReady()
    expect(screen.getByText("Salvar alterações")).toBeTruthy()
  })

  it("CTA tem accessibilityLabel 'Salvar alterações'", async () => {
    wrap(<EditarAnuncioScreen />)
    await waitForFormReady()
    expect(screen.getByLabelText("Salvar alterações")).toBeTruthy()
  })
})

// ── Pré-preenchimento ─────────────────────────────────────────────────────────

describe("EditarAnuncioScreen — pré-preenchimento verbatim do item", () => {
  it("campo Título exibe o valor pré-preenchido do item — 'Furadeira Bosch 650W'", async () => {
    wrap(<EditarAnuncioScreen />)
    await waitForFormReady()
    // getByDisplayValue verifica o value do TextInput
    expect(screen.getByDisplayValue("Furadeira Bosch 650W")).toBeTruthy()
  })

  it("localização pré-preenchida exibe cidade/estado/bairro do item", async () => {
    wrap(<EditarAnuncioScreen />)
    await waitForFormReady()
    // [neighborhood, city, state].filter(Boolean).join(", ") = "Centro, São Paulo, SP"
    await waitFor(() =>
      expect(screen.getByText("Centro, São Paulo, SP")).toBeTruthy()
    )
  })
})
