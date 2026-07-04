// Fonte: apps/mobile/app/perfil/editar.tsx, apps/mobile/app/perfil/endereco.tsx
//
// Testes RNTL das telas nativas de editar perfil e endereço.
// Rótulos verbatim — qualquer alteração sem correspondente nos componentes
// quebra o CI e sinaliza regressão de transcrição.
//
// Nota: os hooks do @tanstack/react-query são mockados diretamente para evitar
// a dependência do QueryClientProvider (que sofre de mismatch de versão do
// React no ambiente de testes — issue pré-existente em todo o projeto).

import React from "react"
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react-native"
import { SafeAreaProvider } from "react-native-safe-area-context"

// ── Mocks globais ──────────────────────────────────────────────────────────────

const mockMutateAsync = jest.fn().mockResolvedValue({})
const mockMutate      = jest.fn()

jest.mock("@tanstack/react-query", () => ({
  useQuery:        jest.fn(),
  useMutation:     jest.fn(),
  useQueryClient:  jest.fn(() => ({ invalidateQueries: jest.fn() })),
}))

jest.mock("@/lib/api", () => ({
  apiFetch:  jest.fn(),
  API_URL:   "https://staging.shareo.com.br",
  getTokens: jest.fn().mockResolvedValue({ accessToken: "tok", refreshToken: "ref" }),
}))

jest.mock("@/lib/auth", () => ({
  useAuth: (selector: (s: unknown) => unknown) =>
    selector({
      user:    { id: "user-1", name: "Ana Teste", email: "ana@test.com", role: "USER", avatarUrl: null, isVerified: true },
      logout:  jest.fn(),
      loading: false,
    }),
}))

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  Link:   ({ children }: { children: React.ReactNode }) => children,
}))

jest.mock("expo-image-picker", () => ({
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
  launchImageLibraryAsync:             jest.fn().mockResolvedValue({ canceled: true }),
}))

jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: "denied" }),
  getCurrentPositionAsync:           jest.fn(),
  PermissionStatus:                  { GRANTED: "granted", DENIED: "denied" },
  Accuracy:                          { Balanced: 3 },
}))

jest.mock("expo-image", () => ({
  Image: "Image",
}))

jest.mock("react-native-safe-area-context", () => {
  const insets = { top: 0, bottom: 0, left: 0, right: 0 }
  return {
    SafeAreaProvider:  ({ children }: { children: React.ReactNode }) => children,
    useSafeAreaInsets: () => insets,
  }
})

// ── Fixture ────────────────────────────────────────────────────────────────────

const PROFILE_DATA = {
  id: "user-1", name: "Ana Teste", email: "ana@test.com",
  bio: "Sou desenvolvedora.", phone: "+5584999990000", avatarUrl: null,
  role: "USER", isVerified: true, userType: "PF",
  city: "Natal", state: "RN", neighborhood: "Tirol", cep: "59020300",
  street: "Av. Prudente de Morais",
  createdAt: "2026-01-01T00:00:00Z",
  _count: { items: 0, bookingsAsBorrower: 0, bookingsAsOwner: 0 },
  reviewsReceived: [], avgRating: null, reviewCount: 0,
}

// ── Helper ─────────────────────────────────────────────────────────────────────

function Providers({ children }: { children: React.ReactNode }) {
  return <SafeAreaProvider>{children}</SafeAreaProvider>
}

function renderWithProviders(ui: React.ReactElement) {
  return render(ui, { wrapper: Providers })
}

// ── Setup de mocks antes de cada teste ────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks()

  const { useQuery, useMutation } = jest.requireMock("@tanstack/react-query")

  // Simula query retornando dados do perfil
  useQuery.mockReturnValue({
    data:      { data: PROFILE_DATA },
    isLoading: false,
    isError:   false,
  })

  // Simula mutation idle por padrão
  useMutation.mockReturnValue({
    mutate:      mockMutate,
    mutateAsync: mockMutateAsync,
    isPending:   false,
    isError:     false,
    error:       null,
  })
})

// ── Tela: EditarPerfilScreen ───────────────────────────────────────────────────

describe("EditarPerfilScreen", () => {

  it("renderiza cabeçalho 'Editar Perfil' verbatim", () => {
    const EditarPerfilScreen = require("@/app/perfil/editar").default
    renderWithProviders(<EditarPerfilScreen />)
    expect(screen.getByText("Editar Perfil")).toBeTruthy()
  })

  it("exibe rótulo 'Nome' verbatim", () => {
    const EditarPerfilScreen = require("@/app/perfil/editar").default
    renderWithProviders(<EditarPerfilScreen />)
    expect(screen.getByText("Nome")).toBeTruthy()
  })

  it("exibe rótulo 'Endereço' verbatim", () => {
    const EditarPerfilScreen = require("@/app/perfil/editar").default
    renderWithProviders(<EditarPerfilScreen />)
    expect(screen.getByText("Endereço")).toBeTruthy()
  })

  it("botão 'Salvar alterações' presente verbatim", () => {
    const EditarPerfilScreen = require("@/app/perfil/editar").default
    renderWithProviders(<EditarPerfilScreen />)
    expect(screen.getByText("Salvar alterações")).toBeTruthy()
  })

  it("botão 'Cancelar' presente verbatim", () => {
    const EditarPerfilScreen = require("@/app/perfil/editar").default
    renderWithProviders(<EditarPerfilScreen />)
    expect(screen.getByText("Cancelar")).toBeTruthy()
  })

  it("placeholder de telefone verbatim: (84) 99999-0000", () => {
    const EditarPerfilScreen = require("@/app/perfil/editar").default
    renderWithProviders(<EditarPerfilScreen />)
    expect(screen.getByPlaceholderText("(84) 99999-0000")).toBeTruthy()
  })

  it("placeholder de bio verbatim: Conte um pouco sobre você…", () => {
    const EditarPerfilScreen = require("@/app/perfil/editar").default
    renderWithProviders(<EditarPerfilScreen />)
    expect(screen.getByPlaceholderText("Conte um pouco sobre você…")).toBeTruthy()
  })

  it("link 'Editar →' navega para /perfil/endereco", () => {
    const { router } = jest.requireMock("expo-router")
    const EditarPerfilScreen = require("@/app/perfil/editar").default
    renderWithProviders(<EditarPerfilScreen />)
    const editarBtn = screen.getByLabelText("Editar endereço")
    fireEvent.press(editarBtn)
    expect(router.push).toHaveBeenCalledWith("/perfil/endereco")
  })

  it("botão Voltar chama router.back()", () => {
    const { router } = jest.requireMock("expo-router")
    const EditarPerfilScreen = require("@/app/perfil/editar").default
    renderWithProviders(<EditarPerfilScreen />)
    fireEvent.press(screen.getByLabelText("Voltar"))
    expect(router.back).toHaveBeenCalled()
  })

  it("botão 'Cancelar' chama router.back()", () => {
    const { router } = jest.requireMock("expo-router")
    const EditarPerfilScreen = require("@/app/perfil/editar").default
    renderWithProviders(<EditarPerfilScreen />)
    fireEvent.press(screen.getByText("Cancelar"))
    expect(router.back).toHaveBeenCalled()
  })

  it("'Salvar alterações' chama mutate ao pressionar", () => {
    const EditarPerfilScreen = require("@/app/perfil/editar").default
    renderWithProviders(<EditarPerfilScreen />)
    fireEvent.press(screen.getByText("Salvar alterações"))
    expect(mockMutate).toHaveBeenCalled()
  })

  it("'Trocar foto' / 'Enviar foto' — acessibilidade de upload verbatim", () => {
    const EditarPerfilScreen = require("@/app/perfil/editar").default
    renderWithProviders(<EditarPerfilScreen />)
    // Sem avatarUrl → "Enviar foto"
    expect(screen.getByText("Enviar foto")).toBeTruthy()
  })

  it("dica de upload verbatim: JPG, PNG ou WEBP", () => {
    const EditarPerfilScreen = require("@/app/perfil/editar").default
    renderWithProviders(<EditarPerfilScreen />)
    expect(
      screen.getByText("JPG, PNG ou WEBP — escolha uma imagem do seu dispositivo.")
    ).toBeTruthy()
  })

  it("descrição do link de endereço verbatim: Cidade, estado e bairro", () => {
    const EditarPerfilScreen = require("@/app/perfil/editar").default
    renderWithProviders(<EditarPerfilScreen />)
    expect(screen.getByText("Cidade, estado e bairro")).toBeTruthy()
  })

  it("exibe 'Perfil atualizado!' quando success=true (via useMutation.onSuccess)", async () => {
    const { useMutation } = jest.requireMock("@tanstack/react-query")
    // Simula o onSuccess chamando o callback do componente
    useMutation.mockImplementation(({ onSuccess }: { onSuccess: () => void }) => ({
      mutate:    () => onSuccess(),
      isPending: false,
    }))

    const EditarPerfilScreen = require("@/app/perfil/editar").default
    renderWithProviders(<EditarPerfilScreen />)

    await act(async () => {
      fireEvent.press(screen.getByText("Salvar alterações"))
    })

    await waitFor(() => {
      expect(screen.getByText("Perfil atualizado!")).toBeTruthy()
    })
  })
})

// ── Tela: EnderecoScreen ───────────────────────────────────────────────────────

describe("EnderecoScreen", () => {

  it("renderiza cabeçalho 'Endereço' verbatim", () => {
    const EnderecoScreen = require("@/app/perfil/endereco").default
    renderWithProviders(<EnderecoScreen />)
    // Header tem "Endereço"
    expect(screen.getAllByText("Endereço").length).toBeGreaterThan(0)
  })

  it("exibe rótulo 'Usar minha localização' verbatim", () => {
    const EnderecoScreen = require("@/app/perfil/endereco").default
    renderWithProviders(<EnderecoScreen />)
    expect(screen.getByText("Usar minha localização")).toBeTruthy()
  })

  it("botão 'Salvar endereço' presente verbatim", () => {
    const EnderecoScreen = require("@/app/perfil/endereco").default
    renderWithProviders(<EnderecoScreen />)
    expect(screen.getByText("Salvar endereço")).toBeTruthy()
  })

  it("placeholder de CEP verbatim: 00000-000", () => {
    const EnderecoScreen = require("@/app/perfil/endereco").default
    renderWithProviders(<EnderecoScreen />)
    expect(screen.getByPlaceholderText("00000-000")).toBeTruthy()
  })

  it("rótulo 'Cidade' presente verbatim", () => {
    const EnderecoScreen = require("@/app/perfil/endereco").default
    renderWithProviders(<EnderecoScreen />)
    expect(screen.getByText("Cidade")).toBeTruthy()
  })

  it("rótulo 'Estado' presente verbatim", () => {
    const EnderecoScreen = require("@/app/perfil/endereco").default
    renderWithProviders(<EnderecoScreen />)
    expect(screen.getByText("Estado")).toBeTruthy()
  })

  it("texto de dica verbatim sobre mapa", () => {
    const EnderecoScreen = require("@/app/perfil/endereco").default
    renderWithProviders(<EnderecoScreen />)
    expect(
      screen.getByText("Ao salvar, sua localização será atualizada automaticamente para centralizar o mapa.")
    ).toBeTruthy()
  })

  it("texto descritivo sobre localização verbatim", () => {
    const EnderecoScreen = require("@/app/perfil/endereco").default
    renderWithProviders(<EnderecoScreen />)
    expect(
      screen.getByText("Sua localização é usada para centralizar o mapa e exibir itens próximos.")
    ).toBeTruthy()
  })

  it("botão Voltar chama router.back()", () => {
    const { router } = jest.requireMock("expo-router")
    const EnderecoScreen = require("@/app/perfil/endereco").default
    renderWithProviders(<EnderecoScreen />)
    fireEvent.press(screen.getByLabelText("Voltar"))
    expect(router.back).toHaveBeenCalled()
  })

  it("'Salvar endereço' chama mutate ao pressionar", () => {
    const EnderecoScreen = require("@/app/perfil/endereco").default
    renderWithProviders(<EnderecoScreen />)
    fireEvent.press(screen.getByText("Salvar endereço"))
    expect(mockMutate).toHaveBeenCalled()
  })

  it("exibe mensagem de GPS negado verbatim ao pressionar botão", async () => {
    const Location = jest.requireMock("expo-location")
    Location.requestForegroundPermissionsAsync.mockResolvedValueOnce({ status: "denied" })

    const EnderecoScreen = require("@/app/perfil/endereco").default
    renderWithProviders(<EnderecoScreen />)

    await act(async () => {
      fireEvent.press(screen.getByLabelText("Usar minha localização"))
    })

    await waitFor(() => {
      expect(
        screen.getByText("Não foi possível obter a localização. Permita o acesso ao GPS.")
      ).toBeTruthy()
    })
  })

  it("exibe 'Endereço atualizado! Redirecionando…' verbatim após sucesso", async () => {
    const { useMutation } = jest.requireMock("@tanstack/react-query")
    useMutation.mockImplementation(({ onSuccess }: { onSuccess: () => void }) => ({
      mutate:    () => onSuccess(),
      isPending: false,
    }))

    const EnderecoScreen = require("@/app/perfil/endereco").default
    renderWithProviders(<EnderecoScreen />)

    await act(async () => {
      fireEvent.press(screen.getByText("Salvar endereço"))
    })

    await waitFor(() => {
      expect(screen.getByText("Endereço atualizado! Redirecionando…")).toBeTruthy()
    })
  })

  it("rótulos de campos opcionais verbatim presentes", () => {
    const EnderecoScreen = require("@/app/perfil/endereco").default
    renderWithProviders(<EnderecoScreen />)
    // Usar regex porque rótulos contêm Text aninhado "(opcional)" —
    // React Native concatena os nós filhos: "Rua / Logradouro (opcional)"
    expect(screen.getByText(/Rua \/ Logradouro/i)).toBeTruthy()
    expect(screen.getAllByText(/Bairro/i).length).toBeGreaterThan(0)
  })
})
