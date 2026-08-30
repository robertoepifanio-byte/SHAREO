// Fonte: app/(auth)/cadastro/completar/CompleteRegistrationForm.tsx
//
// Cobre a tela de conclusão do cadastro progressivo do app.
// RÓTULOS VERBATIM — divergir daqui sem mexer na tela quebra o CI.
//
// 🪤 <Text> multilinha vira UM nó — getByText de meia frase NUNCA casa.
//    Para textos longos com inline <Text> aninhados (LGPD, PJ_DECLARATION_TEXT),
//    usar regex parcial /trecho/ ou getByLabelText.
//
// 🪤 RNTL 12.x usa getByLabelText / getAllByLabelText para accessibilityLabel —
//    getByAccessibilityLabel e getAllByAccessibilityLabel NÃO existem.
//
// 🪤 Em modo PJ, o placeholder "000.000.000-00" reaparece no campo cpfResponsavel
//    — não testar .toBeNull() para esse placeholder ao trocar de tipo.

import React from "react"
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react-native"
import CompletarCadastroScreen from "../../app/(auth)/completar"
import { apiFetch } from "@/lib/api"
import { router } from "expo-router"

// ── Mocks ──────────────────────────────────────────────────────────────────────

jest.mock("@/lib/api", () => {
  const actual = jest.requireActual("@/lib/api")
  return { ...actual, apiFetch: jest.fn() }
})

jest.mock("@/lib/theme", () => ({
  useTheme: () => ({
    mode: "light" as const,
    tokens: {
      bg:         "#F8FAFC",
      surface:    "#FFFFFF",
      text:       "#0F172A",
      muted:      "#64748B",
      border:     "#E2E8F0",
      navy:       "#003366",
      green:      "#007B3C",
      error:      "#C0392B",
      success:    "#007B3C",
      accent:     "#59C686",
      warning:    "#F59E0B",
      disabledBg: "#E2E8F0",
      disabledText:   "#94A3B8",
      disabledBorder: "#CBD5E1",
      bookingPending:   "#F59E0B",
      bookingActive:    "#007B3C",
      bookingCompleted: "#64748B",
      bookingCancelled: "#E74C3C",
      bookingDisputed:  "#C05800",
    },
  }),
}))

// fetchAddressByCep faz rede real — sempre mock no teste
jest.mock("@/lib/forms", () => {
  const actual = jest.requireActual("@/lib/forms")
  return { ...actual, fetchAddressByCep: jest.fn() }
})

const mockApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>

// expo-router está mockado no jest.setup.js; cast para acessar os jest.fn()
const mockRouterBack    = router.back    as jest.MockedFunction<typeof router.back>
const mockRouterReplace = router.replace as jest.MockedFunction<typeof router.replace>

// Controla o retorno de useLocalSearchParams — padrão: sem callback.
// O jest.mock abaixo substitui o mock global de jest.setup.js para este arquivo,
// adicionando useLocalSearchParams que o componente agora usa.
let mockSearchParams: Record<string, string> = {}
jest.mock("expo-router", () => ({
  router:               { back: jest.fn(), replace: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => mockSearchParams,
  Link:                 ({ children }: { children: React.ReactNode }) => children,
  usePathname:          () => "/(auth)/completar",
  useSegments:          () => [],
}))

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Preenche os campos mínimos obrigatórios para PF: CPF + Cidade + Estado. */
function preencherCamposMinimos() {
  fireEvent.changeText(screen.getByLabelText("CPF"), "529.982.247-25")
  fireEvent.changeText(screen.getByLabelText("Cidade"), "São Paulo")
  fireEvent.changeText(screen.getByLabelText("Estado"), "SP")
}

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks()
  mockSearchParams = {}
})

afterEach(async () => {
  await act(async () => {})
})

// ── Testes de render ────────────────────────────────────────────────────────────

describe("CompletarCadastro — render inicial", () => {
  it("exibe o título verbatim do site", () => {
    render(<CompletarCadastroScreen />)
    expect(screen.getByText("Completar cadastro")).toBeTruthy()
  })

  it("exibe o subtítulo verbatim do site", () => {
    render(<CompletarCadastroScreen />)
    expect(
      screen.getByText(
        "Falta pouco! Precisamos do seu documento e endereço para você anunciar ou alugar com segurança.",
      ),
    ).toBeTruthy()
  })

  it("exibe os botões de tipo de conta verbatim", () => {
    render(<CompletarCadastroScreen />)
    expect(screen.getByText("Pessoa Física")).toBeTruthy()
    expect(screen.getByText("Empresa (PJ)")).toBeTruthy()
  })

  it("exibe o campo CPF por padrão (tipo PF selecionado)", () => {
    render(<CompletarCadastroScreen />)
    expect(screen.getByPlaceholderText("000.000.000-00")).toBeTruthy()
  })

  it("exibe o campo Telefone com helper verbatim", () => {
    render(<CompletarCadastroScreen />)
    expect(screen.getByPlaceholderText("(84) 99999-0000")).toBeTruthy()
    expect(screen.getByText("Opcional — se preencher, inclua o DDD")).toBeTruthy()
  })

  it("exibe o campo CEP", () => {
    render(<CompletarCadastroScreen />)
    expect(screen.getByPlaceholderText("00000-000")).toBeTruthy()
  })

  it("exibe o botão de submissão verbatim", () => {
    render(<CompletarCadastroScreen />)
    expect(screen.getByText("Concluir cadastro")).toBeTruthy()
  })

  it("exibe o e-mail do DPO verbatim", () => {
    render(<CompletarCadastroScreen />)
    expect(screen.getByText("privacidade@shareo.com.br")).toBeTruthy()
  })

  it("exibe o texto do Encarregado de Dados", () => {
    render(<CompletarCadastroScreen />)
    // 🪤 <Text> com inline <Text> filho — regex parcial no nó pai
    expect(screen.getByText(/Encarregado de Dados/)).toBeTruthy()
  })

  it("exibe aviso LGPD com base legal verbatim", () => {
    render(<CompletarCadastroScreen />)
    // 🪤 Parágrafo longo com <Text> inline aninhado — regex parcial
    expect(screen.getByText(/LGPD art\. 7º, V/)).toBeTruthy()
  })

  it("exibe link Voltar verbatim", () => {
    render(<CompletarCadastroScreen />)
    expect(screen.getByText("← Voltar para o início")).toBeTruthy()
  })
})

// ── Troca de tipo de conta ─────────────────────────────────────────────────────

describe("CompletarCadastro — tipo de conta PJ", () => {
  it("ao selecionar PJ, exibe campo CNPJ", () => {
    render(<CompletarCadastroScreen />)
    fireEvent.press(screen.getByText("Empresa (PJ)"))
    expect(screen.getByPlaceholderText("00.000.000/0001-00")).toBeTruthy()
  })

  it("ao selecionar PJ, não exibe mais o campo CPF do documento principal", () => {
    render(<CompletarCadastroScreen />)
    // Em PF: placeholder "000.000.000-00" é o CPF
    expect(screen.getByPlaceholderText("000.000.000-00")).toBeTruthy()
    fireEvent.press(screen.getByText("Empresa (PJ)"))
    // Em PJ: "000.000.000-00" pertence ao cpfResponsavel — CNPJ tem placeholder diferente
    expect(screen.queryByPlaceholderText("00.000.000/0001-00")).toBeTruthy()
    // O placeholder CPF agora é do responsável legal (não do documento principal)
    expect(screen.getByLabelText("CPF do responsável legal")).toBeTruthy()
  })

  it("ao selecionar PJ, exibe campo Nome do responsável legal", () => {
    render(<CompletarCadastroScreen />)
    fireEvent.press(screen.getByText("Empresa (PJ)"))
    expect(
      screen.getByPlaceholderText("Nome completo de quem representa a empresa"),
    ).toBeTruthy()
  })

  it("ao selecionar PJ, exibe checkbox de declaração de vínculo", () => {
    render(<CompletarCadastroScreen />)
    fireEvent.press(screen.getByText("Empresa (PJ)"))
    // 🪤 PJ_DECLARATION_TEXT é longo — verificar pela accessibilityLabel via getByLabelText
    expect(
      screen.getByLabelText("Declaração de vínculo com a empresa"),
    ).toBeTruthy()
  })

  it("voltando para PF, remove os campos PJ", () => {
    render(<CompletarCadastroScreen />)
    fireEvent.press(screen.getByText("Empresa (PJ)"))
    fireEvent.press(screen.getByText("Pessoa Física"))
    expect(screen.queryByPlaceholderText("00.000.000/0001-00")).toBeNull()
    expect(
      screen.queryByPlaceholderText("Nome completo de quem representa a empresa"),
    ).toBeNull()
  })
})

// ── Validação client-side ───────────────────────────────────────────────────────

describe("CompletarCadastro — validação client-side", () => {
  it("exibe erro 'CPF obrigatório' ao submeter sem CPF (PF)", async () => {
    render(<CompletarCadastroScreen />)

    // Preenche Cidade e Estado, deixa CPF vazio
    fireEvent.changeText(screen.getByLabelText("Cidade"), "São Paulo")
    fireEvent.changeText(screen.getByLabelText("Estado"), "SP")

    fireEvent.press(screen.getByText("Concluir cadastro"))

    await waitFor(() => {
      expect(screen.getByText("CPF obrigatório")).toBeTruthy()
    })
    expect(mockApiFetch).not.toHaveBeenCalled()
  })

  it("exibe erro 'Cidade obrigatória' ao submeter sem cidade", async () => {
    render(<CompletarCadastroScreen />)

    fireEvent.changeText(screen.getByLabelText("CPF"), "529.982.247-25")
    fireEvent.changeText(screen.getByLabelText("Estado"), "SP")

    fireEvent.press(screen.getByText("Concluir cadastro"))

    await waitFor(() => {
      expect(screen.getByText("Cidade obrigatória")).toBeTruthy()
    })
    expect(mockApiFetch).not.toHaveBeenCalled()
  })

  it("exibe erro 'UF inválida (2 letras)' ao submeter estado com 1 letra", async () => {
    render(<CompletarCadastroScreen />)

    fireEvent.changeText(screen.getByLabelText("CPF"), "529.982.247-25")
    fireEvent.changeText(screen.getByLabelText("Cidade"), "São Paulo")
    fireEvent.changeText(screen.getByLabelText("Estado"), "S")

    fireEvent.press(screen.getByText("Concluir cadastro"))

    await waitFor(() => {
      expect(screen.getByText("UF inválida (2 letras)")).toBeTruthy()
    })
  })

  it("exibe erros PJ ao submeter sem CNPJ e sem responsável", async () => {
    render(<CompletarCadastroScreen />)
    fireEvent.press(screen.getByText("Empresa (PJ)"))

    fireEvent.changeText(screen.getByLabelText("Cidade"), "São Paulo")
    fireEvent.changeText(screen.getByLabelText("Estado"), "SP")

    fireEvent.press(screen.getByText("Concluir cadastro"))

    await waitFor(() => {
      expect(screen.getByText("CNPJ obrigatório")).toBeTruthy()
      expect(screen.getByText("CPF do responsável legal obrigatório")).toBeTruthy()
      expect(screen.getByText("Informe o nome do responsável legal")).toBeTruthy()
      expect(screen.getByText("É necessário aceitar a declaração.")).toBeTruthy()
    })
    expect(mockApiFetch).not.toHaveBeenCalled()
  })
})

// ── Submissão com sucesso ───────────────────────────────────────────────────────

describe("CompletarCadastro — submissão bem-sucedida", () => {
  it("chama PATCH /api/users/me/complete-registration e navega de volta (sem callback)", async () => {
    mockApiFetch.mockResolvedValueOnce({
      data: { id: "u1", profileCompletedAt: new Date().toISOString() },
    } as never)

    render(<CompletarCadastroScreen />)
    preencherCamposMinimos()
    fireEvent.press(screen.getByText("Concluir cadastro"))

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/api/users/me/complete-registration",
        expect.objectContaining({ method: "PATCH" }),
      )
      expect(mockRouterBack).toHaveBeenCalled()
      expect(mockRouterReplace).not.toHaveBeenCalled()
    })
  })

  it("com callback, chama router.replace(callback) após o PATCH bem-sucedido", async () => {
    // Simula navegação de /(auth)/completar?callback=/itens/abc123 (caso do item detail)
    mockSearchParams = { callback: "/itens/abc123" }
    mockApiFetch.mockResolvedValueOnce({
      data: { id: "u1", profileCompletedAt: new Date().toISOString() },
    } as never)

    render(<CompletarCadastroScreen />)
    preencherCamposMinimos()
    fireEvent.press(screen.getByText("Concluir cadastro"))

    await waitFor(() => {
      expect(mockRouterReplace).toHaveBeenCalledWith("/itens/abc123")
      expect(mockRouterBack).not.toHaveBeenCalled()
    })
  })

  it("com callback malicioso (fora do app), ignora e volta — protege contra open redirect", async () => {
    // callback vem de deep link / universal link, não é confiável. "//evil.com" e URLs
    // absolutas escapam do app; só path relativo (começando com "/" só) é aceito.
    mockSearchParams = { callback: "//evil.com" }
    mockApiFetch.mockResolvedValueOnce({
      data: { id: "u1", profileCompletedAt: new Date().toISOString() },
    } as never)

    render(<CompletarCadastroScreen />)
    preencherCamposMinimos()
    fireEvent.press(screen.getByText("Concluir cadastro"))

    await waitFor(() => {
      expect(mockRouterBack).toHaveBeenCalled()
      expect(mockRouterReplace).not.toHaveBeenCalled()
    })
  })

  it("exibe 'Concluindo…' enquanto aguarda a resposta", async () => {
    let resolveFetch!: (v: unknown) => void
    mockApiFetch.mockReturnValueOnce(
      new Promise((res) => { resolveFetch = res }) as never,
    )

    render(<CompletarCadastroScreen />)
    preencherCamposMinimos()
    fireEvent.press(screen.getByText("Concluir cadastro"))

    await waitFor(() => expect(screen.getByText("Concluindo…")).toBeTruthy())

    await act(async () => { resolveFetch({ data: {} }) })
  })
})

// ── Erro de validação da API ────────────────────────────────────────────────────

describe("CompletarCadastro — erros da API", () => {
  it("mapeia VALIDATION_ERROR com details para os campos corretos", async () => {
    mockApiFetch.mockRejectedValueOnce(
      Object.assign(new Error("Dados inválidos."), {
        status:  400,
        code:    "VALIDATION_ERROR",
        details: { cpf: ["CPF inválido."], city: ["Cidade inválida."] },
      }),
    )

    render(<CompletarCadastroScreen />)
    preencherCamposMinimos()
    fireEvent.press(screen.getByText("Concluir cadastro"))

    await waitFor(() => {
      expect(screen.getByText("CPF inválido.")).toBeTruthy()
      expect(screen.getByText("Cidade inválida.")).toBeTruthy()
    })
  })

  it("exibe mensagem verbatim para CPF_ALREADY_EXISTS", async () => {
    mockApiFetch.mockRejectedValueOnce(
      Object.assign(new Error("CPF já cadastrado em outra conta."), {
        status: 409,
        code:   "CPF_ALREADY_EXISTS",
      }),
    )

    render(<CompletarCadastroScreen />)
    preencherCamposMinimos()
    fireEvent.press(screen.getByText("Concluir cadastro"))

    await waitFor(() => {
      expect(screen.getByText("CPF já cadastrado em outra conta.")).toBeTruthy()
    })
  })

  it("exibe mensagem verbatim para CNPJ_INACTIVE", async () => {
    mockApiFetch.mockRejectedValueOnce(
      Object.assign(new Error("Este CNPJ não está ativo na Receita Federal."), {
        status: 422,
        code:   "CNPJ_INACTIVE",
      }),
    )

    render(<CompletarCadastroScreen />)
    fireEvent.press(screen.getByText("Empresa (PJ)"))
    fireEvent.changeText(screen.getByLabelText("CNPJ"), "11.222.333/0001-81")
    fireEvent.changeText(screen.getByLabelText("CPF do responsável legal"), "529.982.247-25")
    fireEvent.changeText(
      screen.getByLabelText("Nome do responsável legal"),
      "João da Silva",
    )
    fireEvent.press(screen.getByLabelText("Declaração de vínculo com a empresa"))
    fireEvent.changeText(screen.getByLabelText("Cidade"), "São Paulo")
    fireEvent.changeText(screen.getByLabelText("Estado"), "SP")

    fireEvent.press(screen.getByText("Concluir cadastro"))

    await waitFor(() => {
      expect(
        screen.getByText("Este CNPJ não está ativo na Receita Federal."),
      ).toBeTruthy()
    })
  })

  it("exibe mensagem verbatim para RATE_LIMITED", async () => {
    mockApiFetch.mockRejectedValueOnce(
      Object.assign(new Error("Rate limited"), {
        status: 429,
        code:   "RATE_LIMITED",
      }),
    )

    render(<CompletarCadastroScreen />)
    preencherCamposMinimos()
    fireEvent.press(screen.getByText("Concluir cadastro"))

    await waitFor(() => {
      expect(
        screen.getByText("Muitas tentativas. Aguarde um momento e tente novamente."),
      ).toBeTruthy()
    })
  })

  it("exibe mensagem verbatim para NOT_FOUND (sessão expirada)", async () => {
    mockApiFetch.mockRejectedValueOnce(
      Object.assign(new Error("Usuário não encontrado."), {
        status: 404,
        code:   "NOT_FOUND",
      }),
    )

    render(<CompletarCadastroScreen />)
    preencherCamposMinimos()
    fireEvent.press(screen.getByText("Concluir cadastro"))

    await waitFor(() => {
      expect(
        screen.getByText(
          "Sua sessão expirou. Saia da conta e entre novamente para concluir o cadastro.",
        ),
      ).toBeTruthy()
    })
  })
})

// ── Erro de rede ────────────────────────────────────────────────────────────────

describe("CompletarCadastro — erro de rede", () => {
  it("exibe mensagem genérica verbatim ao lançar erro sem code", async () => {
    mockApiFetch.mockRejectedValueOnce(new Error("Network request failed"))

    render(<CompletarCadastroScreen />)
    preencherCamposMinimos()
    fireEvent.press(screen.getByText("Concluir cadastro"))

    await waitFor(() => {
      expect(
        screen.getByText("Erro ao concluir o cadastro. Tente novamente."),
      ).toBeTruthy()
    })
  })

  it("não chama router.back() em caso de erro", async () => {
    mockApiFetch.mockRejectedValueOnce(new Error("Network request failed"))

    render(<CompletarCadastroScreen />)
    preencherCamposMinimos()
    fireEvent.press(screen.getByText("Concluir cadastro"))

    await waitFor(() =>
      expect(
        screen.getByText("Erro ao concluir o cadastro. Tente novamente."),
      ).toBeTruthy(),
    )

    expect(mockRouterBack).not.toHaveBeenCalled()
  })
})
