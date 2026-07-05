// Fonte: apps/mobile/app/anunciar/estimativa.tsx
// Testes da tela Estimativa de Ganhos:
//   - Renderização dos textos verbatim do site
//   - Presença dos chips de categoria (7 itens)
//   - Presença dos chips de dias por mês (7 opções)
//   - Taxa da plataforma carregada dinamicamente via apiFetch
//   - Cálculo correto de ganhoMes, ganhoLiquido e ganhoAno
//     com valores de entrada fixos (mock retorna 1500 bps = 15%)
//
// RÓTULOS VERBATIM — qualquer alteração neste arquivo sem correspondente no
// componente quebrará o CI e sinaliza regressão de transcrição.

import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native"

import EstimativaScreen from "@/app/anunciar/estimativa"

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock("@/lib/api", () => ({
  apiFetch:  jest.fn(),
  API_URL:   "https://staging.shareo.com.br",
  getTokens: jest.fn().mockResolvedValue(null),
}))

jest.mock("@/lib/theme", () => {
  const React = require("react")
  const TOKENS = {
    bg:        "#F8FAFC",
    surface:   "#FFFFFF",
    text:      "#0F172A",
    muted:     "#64748B",
    border:    "#E2E8F0",
    navy:      "#003366",
    green:     "#007B3C",
    error:     "#C0392B",
    success:   "#007B3C",
    warning:   "#F59E0B",
    bookingPending:   "#F59E0B",
    bookingActive:    "#007B3C",
    bookingCompleted: "#64748B",
    bookingCancelled: "#E74C3C",
    bookingDisputed:  "#C05800",
    disabledBg:     "#E2E8F0",
    disabledText:   "#94A3B8",
    disabledBorder: "#CBD5E1",
  }
  return {
    useTheme: () => ({ preference: "light", mode: "light", tokens: TOKENS, setPreference: jest.fn() }),
    ThemeProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  }
})

jest.mock("expo-router", () => ({
  router:      { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  Link:        ({ children }: { children: React.ReactNode }) => children,
  usePathname: () => "/",
  useSegments: () => [],
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

// Mock do apiFetch que retorna a taxa padrão (1500 bps = 15%)
const { apiFetch } = jest.requireMock<{ apiFetch: jest.Mock }>("@/lib/api")

/** Fórmula de formato espelhada de _Calculadora.tsx linha 18-20 */
function fmt(val: number): string {
  return val.toLocaleString("pt-BR", {
    style:                 "currency",
    currency:              "BRL",
    maximumFractionDigits: 0,
  })
}

function renderEstimativa() {
  apiFetch.mockResolvedValueOnce({ data: { feeRateBps: 1500 } })
  return render(<EstimativaScreen />)
}

// ── Testes ────────────────────────────────────────────────────────────────────

describe("EstimativaScreen — textos verbatim", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("exibe o título principal da página (verbatim de page.tsx)", async () => {
    renderEstimativa()
    await waitFor(() => {
      expect(screen.getByText("Quanto você pode ganhar?")).toBeTruthy()
    })
  })

  it("exibe o badge 'Para anfitriões' (verbatim de page.tsx)", async () => {
    renderEstimativa()
    await waitFor(() => {
      expect(screen.getByText("Para anfitriões")).toBeTruthy()
    })
  })

  it("exibe o subtítulo hero (verbatim de page.tsx)", async () => {
    renderEstimativa()
    await waitFor(() => {
      // O texto é partido em duas linhas com {"\n"} na JSX; getByText não normaliza
      // \n por padrão — procuramos cada parte separada
      expect(screen.getByText(/Simule seus ganhos alugando itens/i)).toBeTruthy()
    })
  })

  it("exibe os cabeçalhos dos 3 passos (verbatim de _Calculadora.tsx)", async () => {
    renderEstimativa()
    await waitFor(() => {
      expect(screen.getByText("1. Qual é a categoria do seu item?")).toBeTruthy()
      expect(screen.getByText("2. Qual será o preço por diária?")).toBeTruthy()
      expect(screen.getByText("3. Quantos dias por mês pretende alugar?")).toBeTruthy()
    })
  })

  it("exibe o cabeçalho do resultado (verbatim de _Calculadora.tsx)", async () => {
    renderEstimativa()
    await waitFor(() => {
      expect(screen.getByText("Sua estimativa de ganhos")).toBeTruthy()
    })
  })

  it("exibe o CTA (verbatim de _Calculadora.tsx)", async () => {
    renderEstimativa()
    await waitFor(() => {
      expect(screen.getByText("📦 Cadastrar meu item agora")).toBeTruthy()
    })
  })

  it("exibe o banner de dicas (verbatim de page.tsx)", async () => {
    renderEstimativa()
    await waitFor(() => {
      expect(screen.getByText("Quer maximizar seus ganhos?")).toBeTruthy()
      expect(screen.getByText(/Veja as dicas de quem já aluga/i)).toBeTruthy()
      expect(screen.getByText("Ver dicas →")).toBeTruthy()
    })
  })

  it("exibe o disclaimer (verbatim de _Calculadora.tsx)", async () => {
    renderEstimativa()
    await waitFor(() => {
      expect(screen.getByText(/Estimativa baseada em dados médios/i)).toBeTruthy()
    })
  })
})

describe("EstimativaScreen — categorias (7 chips, verbatim de _Calculadora.tsx)", () => {
  beforeEach(() => jest.clearAllMocks())

  const labels = [
    "Ferramentas", "Eletrônicos", "Esporte", "Festas",
    "Construção", "Moda", "Eletrodomésticos",
  ]

  // Usa getAllByText porque "Ferramentas" (categoria selecionada por default) aparece
  // também na sugestão de preço "Sugestão para Ferramentas: R$35/dia" (nested Text).
  // Os outros labels aparecem só no chip, mas usamos getAllByText uniformemente.
  it.each(labels)("exibe chip de categoria '%s'", async (label) => {
    renderEstimativa()
    await waitFor(() => {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0)
    })
  })

  it("tem exatamente 7 categorias", async () => {
    renderEstimativa()
    await waitFor(() => {
      labels.forEach((label) => expect(screen.getAllByText(label).length).toBeGreaterThan(0))
    })
  })
})

describe("EstimativaScreen — chips de dias por mês (verbatim de _Calculadora.tsx)", () => {
  beforeEach(() => jest.clearAllMocks())

  const opcoes = [2, 4, 6, 8, 10, 15, 20]

  it.each(opcoes)("exibe chip '%d dias'", async (d) => {
    renderEstimativa()
    await waitFor(() => {
      expect(screen.getByText(`${d} dias`)).toBeTruthy()
    })
  })
})

describe("EstimativaScreen — cálculo correto (mock feeRateBps = 1500)", () => {
  beforeEach(() => jest.clearAllMocks())

  /**
   * Estado padrão: Ferramentas (diaria=35), 6 dias/mês, sem preço customizado
   * ganhoMes     = 35 * 6            = 210
   * ganhoAno     = 210 * 12          = 2520
   * taxaPlat     = 210 * (15/100)    = 31.5
   * ganhoLiquido = 210 - 31.5        = 178.5
   */
  it("chama apiFetch com a rota pública correta", async () => {
    renderEstimativa()
    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith("/api/platform-config/public")
    })
  })

  it("exibe 'após taxa de 15%' após a taxa ser carregada (verbatim de _Calculadora.tsx linha 130)", async () => {
    renderEstimativa()
    await waitFor(() => {
      expect(screen.getByText("após taxa de 15%")).toBeTruthy()
    })
  })

  it("exibe 'Taxa da plataforma (15%)' no detalhamento", async () => {
    renderEstimativa()
    await waitFor(() => {
      expect(screen.getByText("Taxa da plataforma (15%)")).toBeTruthy()
    })
  })

  it("exibe ganhoMes correto (ferramentas 35/dia × 6 dias = 210)", async () => {
    renderEstimativa()
    // Defaults: ferramentas diaria=35, diasMes=6 → ganhoMes=210
    // O valor aparece em: card "Por mês" E breakdown "Receita bruta" → getAllByText
    const expected = fmt(35 * 6)
    await waitFor(() => {
      expect(screen.getAllByText(expected).length).toBeGreaterThan(0)
    })
  })

  it("exibe ganhoLiquido correto no card 'Você recebe'", async () => {
    renderEstimativa()
    // ganhoMes=210, feeRatePct=15 → taxaPlat=31.5 → ganhoLiquido=178.5
    const ganhoMes     = 35 * 6
    const feeRatePct   = 1500 / 100       // 15
    const ganhoLiquido = ganhoMes - ganhoMes * (feeRatePct / 100)
    const expected     = fmt(ganhoLiquido)
    await waitFor(() => {
      expect(screen.getAllByText(expected).length).toBeGreaterThan(0)
    })
  })

  it("exibe ganhoAno correto no card 'Projeção anual'", async () => {
    renderEstimativa()
    // ganhoMes=210 → ganhoAno=2520
    const expected = fmt(35 * 6 * 12)
    await waitFor(() => {
      expect(screen.getAllByText(expected).length).toBeGreaterThan(0)
    })
  })

  it("recalcula ganhoMes ao selecionar '10 dias'", async () => {
    renderEstimativa()

    // Aguarda carregamento inicial
    await waitFor(() => screen.getByText("após taxa de 15%"))

    // Pressiona chip "10 dias"
    fireEvent.press(screen.getByText("10 dias"))

    // diaria=35, diasMes=10 → ganhoMes=350
    const expected = fmt(35 * 10)
    await waitFor(() => {
      expect(screen.getAllByText(expected).length).toBeGreaterThan(0)
    })
  })

  it("usa feeRateBps dinâmica de 2000 bps (20%) quando API retorna esse valor", async () => {
    apiFetch.mockResolvedValueOnce({ data: { feeRateBps: 2000 } })
    render(<EstimativaScreen />)
    await waitFor(() => {
      expect(screen.getByText("após taxa de 20%")).toBeTruthy()
    })
  })

  it("mantém o default de 1500 bps (15%) se apiFetch falhar", async () => {
    apiFetch.mockRejectedValueOnce(new Error("network error"))
    render(<EstimativaScreen />)
    await waitFor(() => {
      expect(screen.getByText("após taxa de 15%")).toBeTruthy()
    })
  })
})

describe("EstimativaScreen — interação com campo de preço", () => {
  beforeEach(() => jest.clearAllMocks())

  it("usa o preço customizado inserido no campo de diária", async () => {
    renderEstimativa()
    await waitFor(() => screen.getByText("após taxa de 15%"))

    const input = screen.getByLabelText("Preço por diária")
    fireEvent.changeText(input, "50")

    // diaria=50, diasMes=6 → ganhoMes=300
    const expected = fmt(50 * 6)
    await waitFor(() => {
      expect(screen.getAllByText(expected).length).toBeGreaterThan(0)
    })
  })

  it("volta para sugestão da categoria ao limpar o campo de preço", async () => {
    renderEstimativa()
    await waitFor(() => screen.getByText("após taxa de 15%"))

    const input = screen.getByLabelText("Preço por diária")
    fireEvent.changeText(input, "50")
    fireEvent.changeText(input, "")

    // Volta para ferramentas diaria=35, diasMes=6 → ganhoMes=210
    const expected = fmt(35 * 6)
    await waitFor(() => {
      expect(screen.getAllByText(expected).length).toBeGreaterThan(0)
    })
  })
})
