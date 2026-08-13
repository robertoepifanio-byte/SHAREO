// Testes da tela Explorar — app/(tabs)/explorar.tsx
// (fonte: app/itens/page.tsx + app/itens/_RentBanner.tsx + components/ui/CategoryChip.tsx)
//
// Motivação (2026-08-10): busca, RentBanner e chips de categoria ficavam FIXOS
// acima do FlatList — só o grid rolava. Isso divergia do site (em 375px nada é
// sticky; o único `sticky` de app/itens/page.tsx é `lg:`, da sidebar de desktop)
// e espremia a fileira de categorias, que aparecia cortada ao meio no aparelho
// do testador. Estes testes fixam a estrutura corrigida para que ela não
// regrida: os três blocos são ListHeaderComponent, não irmãos do FlatList.

import React from "react"
import fs from "fs"
import path from "path"
import { render, screen, waitFor } from "@testing-library/react-native"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { SafeAreaProvider } from "react-native-safe-area-context"

import ExplorarScreen from "@/app/(tabs)/explorar"
import { categoryChipHeight } from "@/components/ui/CategoryChip"

// ── Mocks globais ──────────────────────────────────────────────────────────────
jest.mock("@/lib/api", () => ({
  apiFetch: jest.fn((path: string) =>
    path.startsWith("/api/categories")
      ? Promise.resolve({ data: [
          { id: "c1", name: "Ferramentas", slug: "ferramentas" },
          { id: "c2", name: "Eletrônicos", slug: "eletronicos" },
        ] })
      : Promise.resolve({ data: [], meta: { total: 0 } })
  ),
  API_URL: "https://staging.shareo.com.br",
  getTokens: jest.fn().mockResolvedValue(null),
}))

jest.mock("@/lib/auth", () => ({
  useAuth: jest.fn((selector?: (s: unknown) => unknown) => {
    const state = { user: null, logout: jest.fn(), login: jest.fn(), loading: false }
    return selector ? selector(state) : state
  }),
}))

jest.mock("@/lib/theme", () => {
  const LIGHT = {
    bg: "#F8FAFC", surface: "#FFFFFF", text: "#0F172A", muted: "#64748B",
    border: "#E2E8F0", navy: "#003366", green: "#007B3C", error: "#C0392B",
    warning: "#F59E0B", success: "#007B3C",
    disabledBg: "#E2E8F0", disabledText: "#94A3B8", disabledBorder: "#CBD5E1",
  }
  return {
    useTheme: () => ({ preference: "light", mode: "light", tokens: LIGHT, setPreference: jest.fn() }),
  }
})

jest.mock("expo-image", () => ({ Image: "Image" }))

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({})),
}))

jest.mock("react-native-safe-area-context", () => {
  const insets = { top: 0, right: 0, bottom: 0, left: 0 }
  return {
    useSafeAreaInsets: () => insets,
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
    SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
    initialWindowMetrics: { insets, frame: { x: 0, y: 0, width: 375, height: 812 } },
  }
})

function wrap(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  return render(
    <SafeAreaProvider>
      <QueryClientProvider client={qc}>{ui}</QueryClientProvider>
    </SafeAreaProvider>
  )
}

const SOURCE = fs.readFileSync(
  path.join(__dirname, "..", "..", "app", "(tabs)", "explorar.tsx"),
  "utf8",
)

describe("ExplorarScreen — conteúdo", () => {
  it("renderiza a busca com o placeholder verbatim do site", async () => {
    wrap(<ExplorarScreen />)
    expect(await screen.findByPlaceholderText("Buscar itens para alugar...")).toBeTruthy()
  })

  it("renderiza o botão Buscar (verbatim)", async () => {
    wrap(<ExplorarScreen />)
    expect(await screen.findByLabelText("Buscar")).toBeTruthy()
  })

  it("renderiza os chips de categoria vindos da API", async () => {
    wrap(<ExplorarScreen />)
    await waitFor(() => {
      expect(screen.getByLabelText("Ferramentas")).toBeTruthy()
      expect(screen.getByLabelText("Eletrônicos")).toBeTruthy()
    })
  })

  it("renderiza o chip 'Todas Categorias' (verbatim)", async () => {
    wrap(<ExplorarScreen />)
    expect(await screen.findByLabelText("Todas Categorias")).toBeTruthy()
  })
})

describe("ExplorarScreen — estrutura de scroll (regressão 10/08)", () => {
  // Guarda de estrutura no nível do código-fonte, no mesmo espírito do teste
  // "StyleSheet: NÃO usa className" da suíte da Frente B: o que precisa ser
  // fixado aqui é ONDE os blocos são renderizados, e isso a árvore RNTL
  // (que não tem viewport nem layout real) não consegue distinguir.

  it("busca, RentBanner e chips ficam no cabeçalho rolável (pageHeader)", () => {
    // Os três blocos vivem dentro de const pageHeader = (...)
    expect(SOURCE).toMatch(/const pageHeader = \(/)
    // ...e o pageHeader é consumido pelo ListHeaderComponent do FlatList.
    expect(SOURCE).toMatch(/ListHeaderComponent=\{\s*<>\s*\{pageHeader\}/)
  })

  it("nada é renderizado como irmão fixo acima do FlatList", () => {
    // Entre a abertura da View raiz e o <FlatList> só pode haver comentário/espaço.
    // Se alguém reintroduzir um bloco fixo aqui, o corte da fileira de categorias
    // volta a acontecer em telas com pouca altura útil.
    const root = SOURCE.split("<View style={[s.screen")[1] ?? ""
    const beforeList = root.split("<FlatList")[0] ?? ""
    expect(beforeList).not.toMatch(/<(View|ScrollView|TextInput|RentBanner)\b/)
  })

  it("a tela não usa className (padrão StyleSheet + tokens)", () => {
    expect(SOURCE).not.toMatch(/className=/)
  })

  it("a altura da fileira de categorias não é pixel fixo", () => {
    // Um número mágico aqui foi a causa das três regressões de rótulo cortado.
    expect(SOURCE).toMatch(/categoryChipHeight\(fontScale\)/)
    expect(SOURCE).not.toMatch(/chipsScroll:[\s\S]{0,200}?height:\s*\d+/)
  })
})

describe("categoryChipHeight — fonte do sistema", () => {
  it("comporta o conteúdo do chip em fontScale 1", () => {
    // padding 8 + ícone 80 + gap 6 + 2 linhas de 15 = 124
    expect(categoryChipHeight(1)).toBe(124)
  })

  it("cresce com o fontScale (rótulo ampliado não pode ser cortado)", () => {
    expect(categoryChipHeight(1.3)).toBeGreaterThan(categoryChipHeight(1))
    expect(categoryChipHeight(1.5)).toBeGreaterThan(categoryChipHeight(1.3))
  })

  it("cresce exatamente o quanto as 2 linhas de rótulo crescem", () => {
    // Só o rótulo escala: ícone, gap e padding são independentes da fonte.
    const delta = categoryChipHeight(2) - categoryChipHeight(1)
    expect(delta).toBe(2 * 15) // 2 linhas × lineHeight 15 × (2 - 1)
  })
})
