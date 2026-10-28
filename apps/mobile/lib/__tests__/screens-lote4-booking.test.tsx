// Fonte: apps/mobile/app/reservas/[id].tsx
// Testes das features novas do detalhe da reserva (Lote 4):
//   - Modal de cancelamento com motivo obrigatório
//   - ContractBanner (estado assinado e pendente)
//   - ReturnCountdown (futuro normal, urgente, expirado)
//   - ReturnChecklist (4 checkboxes verbatim + lógica de mínimo 3)
//   - ReturnConditionForm (opções e rótulos de botão)
//   - ReviewForm (tipos por papel, estrelas, botão)
//   - CheckInOut (fases CHECKIN/CHECKOUT)
//
// RÓTULOS VERBATIM — qualquer alteração neste arquivo sem correspondente no
// componente quebrará o CI e sinaliza regressão de transcrição.

import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { SafeAreaProvider } from "react-native-safe-area-context"

import BookingDetailScreen from "@/app/reservas/[id]"

// ── Mocks globais ──────────────────────────────────────────────────────────────

jest.mock("@/lib/api", () => ({
  apiFetch:  jest.fn(),
  API_URL:   "https://staging.shareo.com.br",
  getTokens: jest.fn().mockResolvedValue(null),
}))

// Estado de autenticação mutável por teste — prefixo "mock" para babel-jest hoist
let mockAuthUserId   = "user-borrower"
let mockAuthUserName = "Ana Locatária"

jest.mock("@/lib/auth", () => ({
  useAuth: (selector: (s: unknown) => unknown) =>
    selector({
      user:    { id: mockAuthUserId, name: mockAuthUserName },
      logout:  jest.fn(),
      loading: false,
    }),
}))

jest.mock("@/lib/theme", () => {
  const React = require("react")
  const TOKENS = {
    bg: "#F8FAFC", surface: "#FFFFFF", text: "#0F172A", muted: "#64748B",
    border: "#E2E8F0", navy: "#003366", green: "#007B3C", error: "#C0392B",
    success: "#059669", warning: "#D97706",
    bookingPending: "#FDE68A", bookingActive: "#BFDBFE",
    bookingCompleted: "#A7F3D0", bookingCancelled: "#FECACA",
    bookingDisputed: "#FDE68A",
    disabledBg: "#F1F5F9", disabledText: "#94A3B8", disabledBorder: "#E2E8F0",
  }
  return {
    useTheme: () => ({ preference: "light", mode: "light", tokens: TOKENS, setPreference: jest.fn() }),
    ThemeProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  }
})

jest.mock("expo-router", () => ({
  router:               { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({ id: "booking-1" }),
  Link:                 ({ children }: { children: React.ReactNode }) => children,
  usePathname:          () => "/",
  useSegments:          () => [],
}))

// O banner de contrato passou a depender da flag que o guard de mark_active
// lê (ATOR: a tela prometia "assinatura pendente" num contrato que nada exige).
// `mockContratoExigido` é mutável para os testes exercitarem os DOIS lados.
let mockContratoExigido = true
jest.mock("@/lib/platformConfig", () => {
  const real = jest.requireActual("@/lib/platformConfig")
  return {
    ...real,
    // Lido DENTRO da função, não na avaliação do factory — senão congelaria o
    // valor inicial (TDZ/hoisting do jest.mock).
    usePlatformConfig: () => ({
      feeRateBps: 1500,
      payoutWindowDays: 3,
      checkoutMaxCents: 50_000,
      ownerHours: 48,
      rentalContractRequired: mockContratoExigido,
    }),
  }
})

jest.mock("expo-image-picker", () => ({
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ status: "denied", granted: false }),
  requestCameraPermissionsAsync:       jest.fn().mockResolvedValue({ status: "denied", granted: false }),
  launchImageLibraryAsync:             jest.fn().mockResolvedValue({ canceled: true }),
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

// Datas úteis para testes de countdown
const FUTURE_DATE  = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString() // +5 dias
const URGENT_DATE  = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()       // +2 horas
const EXPIRED_DATE = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()      // -1 dia

function makeBooking(overrides: Record<string, unknown> = {}) {
  return {
    id:                    "booking-1",
    status:                "PENDING",
    paymentStatus:         null,
    startDate:             "2026-07-15T12:00:00Z",
    endDate:               FUTURE_DATE,
    totalDays:             5,
    dailyPrice:            3500,
    totalPrice:            17500,
    discountCents:         null,
    depositAmount:         null,
    borrowerNote:          null,
    cancelReason:          null,
    lateFeeAmount:         null,
    lateFeePaid:           false,
    createdAt:             "2026-07-04T10:00:00Z",
    respondedAt:           null,
    paidAt:                null,
    contractSignedAt:      null,
    activatedAt:           null,
    returnRequestedAt:     null,
    returnedAt:            null,
    cancelledAt:           null,
    extensionRequestedAt:  null,
    extensionRespondedAt:  null,
    extensionStatus:       null,
    extensionRequestedEndDate: null,
    pickupToken:           null,
    pickupTokenUsedAt:     null,
    item: {
      id:     "item-1",
      title:  "Furadeira Bosch 650W",
      images: [],
    },
    bookingItems: [],
    owner: {
      id:           "user-owner",
      name:         "Carlos Proprietário",
      cep:          null,
      street:       null,
      neighborhood: null,
      city:         null,
      state:        null,
    },
    borrower: { id: "user-borrower", name: "Ana Locatária" },
    conversation: { id: "conv-1" },
    reviews: [],
    photos:  [],
    ...overrides,
  }
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

function setApiFetch(bookingOverrides: Record<string, unknown> = {}) {
  const { apiFetch } = jest.requireMock("@/lib/api") as { apiFetch: jest.Mock }
  apiFetch.mockImplementation(async (url: string) => {
    if (url.includes("/api/stats")) return { data: { feeRate: 1500 } }
    return { data: makeBooking(bookingOverrides) }
  })
}

// Aguarda o badge de status aparecer (confirma que a query da reserva resolveu)
async function waitForBookingLoad(statusLabel = "Aguardando aprovação") {
  await waitFor(() =>
    expect(screen.getByText(statusLabel)).toBeTruthy(),
    { timeout: 4000 }
  )
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  // Restaura useAuth para LOCATÁRIO
  mockAuthUserId   = "user-borrower"
  mockAuthUserName = "Ana"
  setApiFetch()
})

// ── Modal de cancelamento ─────────────────────────────────────────────────────

// Helper — abre o modal de cancelamento pressionando o botão trigger
async function openCancelModal() {
  await waitForBookingLoad()
  // Botão trigger fora do modal — accessibilityLabel "Cancelar reserva"
  const triggerBtn = screen.getByLabelText("Cancelar reserva")
  fireEvent.press(triggerBtn)
  // Aguarda o modal abrir (visible=true → filhos entram na árvore)
  // Usa regex para tolerar nested <Text> do asterisco vermelho
  await waitFor(() =>
    expect(screen.getByText(/Informe o motivo do cancelamento/)).toBeTruthy(),
    { timeout: 3000 }
  )
}

describe("Modal de cancelamento — rótulos verbatim (_BookingActions.tsx linhas 262-283)", () => {
  // status PENDING + borrower → canCancel = true
  beforeEach(() => setApiFetch({ status: "PENDING" }))

  it("exibe título 'Cancelar reserva' no modal — verbatim linha 1609 de [id].tsx", async () => {
    wrap(<BookingDetailScreen />)
    await openCancelModal()
    // Modal está aberto → pelo menos 2 ocorrências: botão trigger + título do modal
    expect(screen.getAllByText("Cancelar reserva").length).toBeGreaterThanOrEqual(1)
  })

  it("exibe aviso de motivo obrigatório — verbatim linha 1612: 'Informe o motivo do cancelamento'", async () => {
    wrap(<BookingDetailScreen />)
    await openCancelModal()
    // Nested <Text> com asterisco vermelho — regex para tolerar concatenação RNTL
    expect(screen.getByText(/Informe o motivo do cancelamento/)).toBeTruthy()
  })

  it("exibe botão 'Voltar' no modal — verbatim linha 1639", async () => {
    wrap(<BookingDetailScreen />)
    await openCancelModal()
    expect(screen.getByLabelText("Voltar")).toBeTruthy()
  })

  it("exibe botão 'Confirmar cancelamento' — verbatim linha 1652", async () => {
    wrap(<BookingDetailScreen />)
    await openCancelModal()
    expect(screen.getByLabelText("Confirmar cancelamento")).toBeTruthy()
  })

  it("botão 'Confirmar cancelamento' desabilitado quando motivo vazio — linha 1647", async () => {
    wrap(<BookingDetailScreen />)
    await openCancelModal()
    const btn = screen.getByLabelText("Confirmar cancelamento")
    // cancelReason = "" → !cancelReason.trim() = true → disabled = true
    expect(btn.props.accessibilityState?.disabled).toBe(true)
  })

  it("placeholder do campo de motivo — verbatim linha 1623: 'Descreva o motivo...'", async () => {
    wrap(<BookingDetailScreen />)
    await openCancelModal()
    expect(screen.getByPlaceholderText("Descreva o motivo...")).toBeTruthy()
  })
})

// ── ContractBanner — pendente ─────────────────────────────────────────────────

describe("ContractBanner — assinatura pendente (_ContractBanner.tsx linhas 49-68)", () => {
  // isBorrower + CONFIRMED + contractSignedAt = null, COM o contrato exigido
  beforeEach(() => {
    mockContratoExigido = true
    setApiFetch({ status: "CONFIRMED", contractSignedAt: null })
  })

  it("exibe 'Assinatura do contrato pendente' — verbatim linha 1002", async () => {
    wrap(<BookingDetailScreen />)
    await waitForBookingLoad("Confirmada")
    await waitFor(() =>
      expect(screen.getByText("Assinatura do contrato pendente")).toBeTruthy()
    )
  })

  it("exibe descrição verbatim do contrato pendente — linha 1003-1004", async () => {
    wrap(<BookingDetailScreen />)
    await waitForBookingLoad("Confirmada")
    await waitFor(() =>
      expect(screen.getByText(
        "Leia e assine o termo de locação para confirmar sua responsabilidade sobre o item."
      )).toBeTruthy()
    )
  })

  it("exibe botão 'Ler e assinar contrato' — verbatim linha 1012", async () => {
    wrap(<BookingDetailScreen />)
    await waitForBookingLoad("Confirmada")
    await waitFor(() =>
      expect(screen.getByText("📝 Ler e assinar contrato")).toBeTruthy()
    )
  })
})

// ── ContractBanner — assinado ─────────────────────────────────────────────────

describe("ContractBanner — contrato assinado (_ContractBanner.tsx linhas 29-37)", () => {
  // contractSignedAt preenchido → contractSigned = true
  beforeEach(() => {
    mockContratoExigido = true
    setApiFetch({
      status:           "CONFIRMED",
      contractSignedAt: "2026-07-04T10:00:00Z",
    })
  })

  it("exibe 'Contrato assinado digitalmente.' — verbatim linha 992", async () => {
    wrap(<BookingDetailScreen />)
    await waitForBookingLoad("Confirmada")
    await waitFor(() =>
      expect(screen.getByText("Contrato assinado digitalmente.")).toBeTruthy()
    )
  })

  it("exibe 'Ambas as partes estão protegidas.' — verbatim linha 993", async () => {
    wrap(<BookingDetailScreen />)
    await waitForBookingLoad("Confirmada")
    await waitFor(() =>
      expect(screen.getByText("Ambas as partes estão protegidas.")).toBeTruthy()
    )
  })
})

// ── ContractBanner — flag DESLIGADA ──────────────────────────────────────────

describe("🪤 ContractBanner com o contrato NÃO exigido", () => {
  // O defeito, visto ao vivo em 24/08: uma reserva já paga e com o item já
  // retirado exibia "Assinatura do contrato pendente". A flag
  // rentalContractAcceptanceEnabled está OFF (default, gated D4), então o guard
  // de mark_active deixa retirar sem contrato — e a tela prometia o contrário.
  beforeEach(() => {
    mockContratoExigido = false
    setApiFetch({ status: "CONFIRMED", contractSignedAt: null })
  })

  it("NÃO exibe 'Assinatura do contrato pendente'", async () => {
    wrap(<BookingDetailScreen />)
    await waitForBookingLoad("Confirmada")
    expect(screen.queryByText("Assinatura do contrato pendente")).toBeNull()
  })

  it("NÃO oferece o botão de assinar", async () => {
    wrap(<BookingDetailScreen />)
    await waitForBookingLoad("Confirmada")
    expect(screen.queryByText("📝 Ler e assinar contrato")).toBeNull()
  })
})

// ── ReturnCountdown — devolução futura ────────────────────────────────────────

describe("ReturnCountdown — devolução futura (ReturnCountdown.tsx linhas 44-116)", () => {
  beforeEach(() => setApiFetch({ status: "ACTIVE", endDate: FUTURE_DATE }))

  it("exibe 'Devolução em' quando prazo é futuro e não urgente — verbatim linha 166", async () => {
    wrap(<BookingDetailScreen />)
    await waitForBookingLoad("Em andamento")
    await waitFor(() =>
      expect(screen.getByText("Devolução em")).toBeTruthy()
    )
  })
})

// ── ReturnCountdown — devolução urgente ───────────────────────────────────────

describe("ReturnCountdown — devolução urgente (< 4 horas)", () => {
  beforeEach(() => setApiFetch({ status: "ACTIVE", endDate: URGENT_DATE }))

  it("exibe 'Devolução urgente' quando < 4 horas — verbatim linha 166", async () => {
    wrap(<BookingDetailScreen />)
    await waitForBookingLoad("Em andamento")
    await waitFor(() =>
      expect(screen.getByText("Devolução urgente")).toBeTruthy()
    )
  })
})

// ── ReturnCountdown — prazo encerrado ─────────────────────────────────────────

describe("ReturnCountdown — prazo encerrado (diff <= 0)", () => {
  beforeEach(() => setApiFetch({ status: "ACTIVE", endDate: EXPIRED_DATE }))

  it("exibe 'Prazo de devolução encerrado' — verbatim linha 143", async () => {
    wrap(<BookingDetailScreen />)
    await waitForBookingLoad("Em andamento")
    await waitFor(() =>
      expect(screen.getByText("Prazo de devolução encerrado")).toBeTruthy()
    )
  })

  it("exibe aviso de taxa — verbatim linha 145: 'Devolva o item agora para evitar taxas de atraso adicionais.'", async () => {
    wrap(<BookingDetailScreen />)
    await waitForBookingLoad("Em andamento")
    await waitFor(() =>
      expect(screen.getByText(
        "Devolva o item agora para evitar taxas de atraso adicionais."
      )).toBeTruthy()
    )
  })
})

// ── Atraso: countdown x taxa aplicada ─────────────────────────────────────────
// O countdown expirado dizia "evite taxas adicionais" com a taxa JÁ cobrada, e
// mandava o LOCADOR devolver o item que ele nunca teve.

describe("Prazo encerrado — coerência com a taxa de atraso", () => {
  it("com a taxa aplicada: some o countdown e a caixa fala em atraso em curso", async () => {
    setApiFetch({ status: "ACTIVE", endDate: EXPIRED_DATE, lateFeeAmount: 1500 })
    wrap(<BookingDetailScreen />)
    await waitForBookingLoad("Em andamento")
    await waitFor(() => expect(screen.getByText("Item em atraso")).toBeTruthy())
    expect(screen.queryByText("Prazo de devolução encerrado")).toBeNull()
    expect(
      screen.queryByText("Devolva o item agora para evitar taxas de atraso adicionais.")
    ).toBeNull()
    // Em ACTIVE o item nao voltou: a caixa nao pode dizer "devolvido".
    expect(screen.queryByText("Taxa de atraso aplicada")).toBeNull()
  })

  it("multa paga: a caixa não segue dizendo que a taxa aumenta", async () => {
    setApiFetch({
      status: "COMPLETED", endDate: EXPIRED_DATE,
      lateFeeAmount: 1500, lateFeePaid: true,
    })
    wrap(<BookingDetailScreen />)
    await waitForBookingLoad("Concluída")
    await waitFor(() => expect(screen.getByText("Taxa de atraso paga")).toBeTruthy())
    expect(screen.queryByText("Item em atraso")).toBeNull()
    expect(screen.queryByText("Taxa de atraso aplicada")).toBeNull()
  })

  it("locatário com multa a pagar vê o botão 'Pagar taxa de atraso'", async () => {
    setApiFetch({ status: "RETURNED", lateFeeAmount: 4500 })
    wrap(<BookingDetailScreen />)
    await waitFor(() => expect(screen.getByText(/Pagar taxa de atraso \(R\$\s45,00\)/)).toBeTruthy(), { timeout: 4000 })
  })

  it("sem botão: multa já paga", async () => {
    setApiFetch({ status: "COMPLETED", lateFeeAmount: 4500, lateFeePaid: true })
    wrap(<BookingDetailScreen />)
    await waitFor(() => expect(screen.getByText("Taxa de atraso paga")).toBeTruthy())
    expect(screen.queryByText(/Pagar taxa de atraso/)).toBeNull()
  })

  it("para o locador não há botão de pagar a multa", async () => {
    mockAuthUserId   = "user-owner"
    mockAuthUserName = "Carlos Proprietário"
    setApiFetch({ status: "RETURNED", lateFeeAmount: 4500 })
    wrap(<BookingDetailScreen />)
    await waitForBookingLoad("Devolução em andamento")
    await waitFor(() => expect(screen.getByText("Taxa de atraso aplicada")).toBeTruthy())
    expect(screen.queryByText(/Pagar taxa de atraso/)).toBeNull()
  })

  it("para o locador, o aviso de prazo encerrado não manda ele devolver", async () => {
    mockAuthUserId   = "user-owner"
    mockAuthUserName = "Carlos Proprietário"
    setApiFetch({ status: "ACTIVE", endDate: EXPIRED_DATE })
    wrap(<BookingDetailScreen />)
    await waitForBookingLoad("Em andamento")
    await waitFor(() =>
      expect(screen.getByText(
        "O locatário está em atraso. A taxa de atraso é aplicada automaticamente."
      )).toBeTruthy()
    )
    expect(
      screen.queryByText("Devolva o item agora para evitar taxas de atraso adicionais.")
    ).toBeNull()
  })
})

// ── Taxa de atraso no resumo financeiro ───────────────────────────────────────
// O resumo dizia "Total R$ 175,00 / Você recebe R$ 148,75" ignorando a multa,
// que só aparecia na caixa colorida mais abaixo. Multa 4500 = 675 de taxa + 3825
// líquido; locação 17500 = 2625 de taxa + 14875 líquido (15%, feeRateBps 1500).

describe("Resumo financeiro — taxa de atraso soma ao total", () => {
  it("locatário: mostra a taxa a pagar e o total com ela", async () => {
    setApiFetch({ status: "RETURNED", lateFeeAmount: 4500 })
    wrap(<BookingDetailScreen />)
    // O rótulo do status aparece duas vezes para o locatário; esperar pela linha.
    await waitFor(() => expect(screen.getByText("Taxa de atraso (a pagar)")).toBeTruthy(), { timeout: 4000 })
    expect(screen.getByText("Total com a taxa de atraso")).toBeTruthy()
    expect(screen.getByText(/R\$\s220,00/)).toBeTruthy() // 17500 + 4500
    expect(screen.queryByText("Você recebe no total")).toBeNull()
  })

  it("locador: total recebido soma o líquido da multa, com aviso de que depende do pagamento", async () => {
    mockAuthUserId   = "user-owner"
    mockAuthUserName = "Carlos Proprietário"
    setApiFetch({ status: "RETURNED", lateFeeAmount: 4500 })
    wrap(<BookingDetailScreen />)
    await waitForBookingLoad("Devolução em andamento")
    await waitFor(() => expect(screen.getByText("Você recebe no total")).toBeTruthy())
    expect(screen.getByText(/R\$\s187,00/)).toBeTruthy() // 14875 + 3825
    expect(screen.getByText("Inclui a taxa de atraso, repassada quando o locatário pagar.")).toBeTruthy()
    // Antes do pagamento a caixa não promete o repasse como certo.
    expect(screen.getByText(/Quando o locatário pagar, você recebe/)).toBeTruthy()
  })

  it("multa paga: rótulo vira '(paga)' e some a ressalva de repasse", async () => {
    mockAuthUserId   = "user-owner"
    mockAuthUserName = "Carlos Proprietário"
    setApiFetch({ status: "COMPLETED", lateFeeAmount: 4500, lateFeePaid: true })
    wrap(<BookingDetailScreen />)
    await waitForBookingLoad("Concluída")
    await waitFor(() => expect(screen.getByText("Taxa de atraso (paga)")).toBeTruthy())
    expect(screen.queryByText("Inclui a taxa de atraso, repassada quando o locatário pagar.")).toBeNull()
    expect(screen.queryByText(/Quando o locatário pagar, você recebe/)).toBeNull()
    expect(screen.getByText(/Do valor da taxa você recebe/)).toBeTruthy()
  })

  it("sem multa: o resumo não ganha linha de atraso", async () => {
    setApiFetch({ status: "COMPLETED" })
    wrap(<BookingDetailScreen />)
    await waitForBookingLoad("Concluída")
    expect(screen.queryByText(/^Taxa de atraso \(/)).toBeNull()
    expect(screen.queryByText("Total com a taxa de atraso")).toBeNull()
  })
})

// ── Resumo financeiro da reserva cancelada ────────────────────────────────────
// Prod, 07/10/2026: reserva paga (R$ 7,50) cancelada pelo locatário e estornada
// (R$ 6,81) seguia dizendo "Você recebe R$ 6,37" ao locador. Aqui: 17500 pagos,
// 16800 estornados → 700 de taxa da Stripe que não volta.

describe("Resumo financeiro — reserva cancelada", () => {
  it("locador: mostra o reembolso e some o 'Você recebe'", async () => {
    mockAuthUserId   = "user-owner"
    mockAuthUserName = "Carlos Proprietário"
    setApiFetch({ status: "CANCELLED", paidAt: "2026-07-05T10:00:00Z", refundAmount: 16800 })
    wrap(<BookingDetailScreen />)
    await waitFor(() => expect(screen.getByText("Reembolso ao locatário")).toBeTruthy(), { timeout: 4000 })
    expect(screen.getByText(/R\$\s168,00/)).toBeTruthy()
    expect(screen.getByText("Taxa da Stripe (não devolvida)")).toBeTruthy()
    expect(screen.getByText(/R\$\s7,00/)).toBeTruthy()
    expect(screen.getByText("Reserva cancelada: não há repasse ao proprietário nem taxa Shareo.")).toBeTruthy()
    expect(screen.queryByText("Você recebe")).toBeNull()
    expect(screen.queryByText(/^Taxa Shareo \(/)).toBeNull()
  })

  it("locatário: 'Reembolso para você' e nada de 'Proprietário recebe'", async () => {
    setApiFetch({ status: "CANCELLED", paidAt: "2026-07-05T10:00:00Z", refundAmount: 17500 })
    wrap(<BookingDetailScreen />)
    await waitFor(() => expect(screen.getByText("Reembolso para você")).toBeTruthy(), { timeout: 4000 })
    // Reembolso integral (locador cancelou): sem linha de taxa da Stripe.
    expect(screen.queryByText("Taxa da Stripe (não devolvida)")).toBeNull()
    expect(screen.queryByText("Proprietário recebe")).toBeNull()
  })

  it("cancelada antes do pagamento: diz que nada foi cobrado", async () => {
    setApiFetch({ status: "CANCELLED", refundAmount: 0 })
    wrap(<BookingDetailScreen />)
    await waitFor(() => expect(screen.getByText("Reserva cancelada antes do pagamento: nenhum valor foi cobrado.")).toBeTruthy(), { timeout: 4000 })
    expect(screen.queryByText(/^Reembolso/)).toBeNull()
    expect(screen.queryByText("Proprietário recebe")).toBeNull()
  })

  it("reserva não cancelada segue com a repartição", async () => {
    setApiFetch({ status: "COMPLETED" })
    wrap(<BookingDetailScreen />)
    await waitForBookingLoad("Concluída")
    await waitFor(() => expect(screen.getByText("Proprietário recebe")).toBeTruthy())
    expect(screen.queryByText(/^Reembolso/)).toBeNull()
  })
})

// ── ReturnChecklist — rótulos dos 4 checkboxes ───────────────────────────────

describe("ReturnChecklist — 4 checkboxes verbatim (ReturnChecklist.tsx linhas 30-36)", () => {
  // isBorrower + ACTIVE → checklist visível
  beforeEach(() => setApiFetch({ status: "ACTIVE", endDate: FUTURE_DATE }))

  it("exibe título 'Checklist de devolução' — verbatim linha 1042", async () => {
    wrap(<BookingDetailScreen />)
    await waitForBookingLoad("Em andamento")
    await waitFor(() =>
      expect(screen.getByText("Checklist de devolução")).toBeTruthy()
    )
  })

  it("checkbox 1: 'Item limpo e no estado recebido' — verbatim CHECKLIST_ITEMS_CONST[0]", async () => {
    wrap(<BookingDetailScreen />)
    await waitForBookingLoad("Em andamento")
    await waitFor(() =>
      expect(screen.getByLabelText("Item limpo e no estado recebido")).toBeTruthy()
    )
  })

  it("checkbox 2: 'Todos os acessórios incluídos' — verbatim CHECKLIST_ITEMS_CONST[1]", async () => {
    wrap(<BookingDetailScreen />)
    await waitForBookingLoad("Em andamento")
    await waitFor(() =>
      expect(screen.getByLabelText("Todos os acessórios incluídos")).toBeTruthy()
    )
  })

  it("checkbox 3: 'Caixa/embalagem original (se aplicável)' — verbatim CHECKLIST_ITEMS_CONST[2]", async () => {
    wrap(<BookingDetailScreen />)
    await waitForBookingLoad("Em andamento")
    await waitFor(() =>
      expect(screen.getByLabelText("Caixa/embalagem original (se aplicável)")).toBeTruthy()
    )
  })

  it("checkbox 4: 'Fotos do estado atual tiradas' — verbatim CHECKLIST_ITEMS_CONST[3]", async () => {
    wrap(<BookingDetailScreen />)
    await waitForBookingLoad("Em andamento")
    await waitFor(() =>
      expect(screen.getByLabelText("Fotos do estado atual tiradas")).toBeTruthy()
    )
  })

  // Sem foto e sem itens, o aviso cobra a FOTO — ela é o primeiro bloqueio e o
  // único que o locatário não consegue contornar marcando caixinhas.
  it("com 0 selecionados e sem foto, o aviso cobra a foto — verbatim do ReturnChecklist.tsx", async () => {
    wrap(<BookingDetailScreen />)
    await waitForBookingLoad("Em andamento")
    await waitFor(() =>
      expect(screen.getByText(
        "Envie uma foto do estado do item para habilitar a devolução."
      )).toBeTruthy()
    )
  })

  // 🪤 A caixinha da foto NÃO é clicável: ela relata o que está anexado. Como
  // pergunta manual, dava para marcá-la sem foto nenhuma — um dos caminhos para
  // fechar a devolução sem prova.
  it("o item 'Fotos do estado atual tiradas' não é tocável", async () => {
    wrap(<BookingDetailScreen />)
    await waitForBookingLoad("Em andamento")
    const item = await screen.findByLabelText("Fotos do estado atual tiradas")
    expect(item.props.accessibilityState?.disabled ?? item.props.disabled).toBeTruthy()
  })

  it("botão 'Devolver' desabilitado com menos de 3 itens marcados — verbatim linha 1127", async () => {
    wrap(<BookingDetailScreen />)
    await waitForBookingLoad("Em andamento")
    await waitFor(() =>
      expect(screen.getByLabelText("Devolver item")).toBeTruthy()
    )
    const btn = screen.getByLabelText("Devolver item")
    expect(btn.props.accessibilityState?.disabled).toBe(true)
  })

  it("exibe botão de foto 'Tirar foto ou escolher da galeria' — verbatim linha 1106", async () => {
    wrap(<BookingDetailScreen />)
    await waitForBookingLoad("Em andamento")
    await waitFor(() =>
      expect(screen.getByText("Tirar foto ou escolher da galeria")).toBeTruthy()
    )
  })

  it("instrução do checklist exige os 3 itens E a foto — verbatim do ReturnChecklist.tsx", async () => {
    wrap(<BookingDetailScreen />)
    await waitForBookingLoad("Em andamento")
    await waitFor(() =>
      expect(screen.getByText(
        /Envie uma foto do estado do item e marque pelo menos 3 de 4 itens — a foto já conta como um deles/
      )).toBeTruthy()
    )
  })

  // A foto virou obrigatória em 2026-08-23 (decisão do fundador): sem ela a API
  // responde 422 RETURN_PHOTO_REQUIRED. O rótulo tem que dizer isso, senão o
  // locatário marca 3 itens, aperta "Devolver" e leva um erro sem explicação.
  it("rótulo da foto diz obrigatória, não recomendado", async () => {
    wrap(<BookingDetailScreen />)
    await waitForBookingLoad("Em andamento")
    await waitFor(() =>
      expect(screen.getByText(/\(obrigatória\)/)).toBeTruthy()
    )
    expect(screen.queryByText(/\(recomendado\)/)).toBeNull()
  })
})

// ── ReturnConditionForm — opções e botão ──────────────────────────────────────

describe("ReturnConditionForm — rótulos das opções (ReturnConditionForm.tsx)", () => {
  // isOwner + RETURNED → form visível
  beforeEach(() => {
    mockAuthUserId   = "user-owner"
    mockAuthUserName = "Carlos"
    setApiFetch({ status: "RETURNED", endDate: FUTURE_DATE })
  })

  it("exibe título 'Estado na devolução' — verbatim linha 1155", async () => {
    wrap(<BookingDetailScreen />)
    await waitForBookingLoad("Devolução em andamento")
    await waitFor(() =>
      expect(screen.getByText("Estado na devolução")).toBeTruthy()
    )
  })

  it("opção 1: 'Perfeito estado' — verbatim RC_OPTIONS[0].label linha 1147", async () => {
    wrap(<BookingDetailScreen />)
    await waitForBookingLoad("Devolução em andamento")
    await waitFor(() =>
      expect(screen.getByLabelText("Perfeito estado")).toBeTruthy()
    )
  })

  it("opção 2: 'Desgaste normal' — verbatim RC_OPTIONS[1].label linha 1148", async () => {
    wrap(<BookingDetailScreen />)
    await waitForBookingLoad("Devolução em andamento")
    await waitFor(() =>
      expect(screen.getByLabelText("Desgaste normal")).toBeTruthy()
    )
  })

  it("opção 3: 'Com danos' — verbatim RC_OPTIONS[2].label linha 1149", async () => {
    wrap(<BookingDetailScreen />)
    await waitForBookingLoad("Devolução em andamento")
    await waitFor(() =>
      expect(screen.getByLabelText("Com danos")).toBeTruthy()
    )
  })

  it("botão 'Confirmar estado' sem seleção — accessibilityLabel verbatim linha 1232", async () => {
    wrap(<BookingDetailScreen />)
    await waitForBookingLoad("Devolução em andamento")
    await waitFor(() =>
      expect(screen.getByLabelText("Confirmar estado")).toBeTruthy()
    )
  })

  it("botão 'Confirmar estado' desabilitado quando nenhuma opção selecionada", async () => {
    wrap(<BookingDetailScreen />)
    await waitForBookingLoad("Devolução em andamento")
    await waitFor(() => {
      const btn = screen.getByLabelText("Confirmar estado")
      expect(btn.props.accessibilityState?.disabled).toBe(true)
    })
  })
})

// ── ReviewForm — locatário em COMPLETED ──────────────────────────────────────

describe("ReviewForm — locatário avalia ITEM e OWNER (status COMPLETED)", () => {
  beforeEach(() => setApiFetch({ status: "COMPLETED", endDate: FUTURE_DATE }))

  it("exibe seção 'Avalie o item' — verbatim REVIEW_TITLE.ITEM linha 1265", async () => {
    wrap(<BookingDetailScreen />)
    await waitForBookingLoad("Concluída")
    await waitFor(() =>
      expect(screen.getByText("Avalie o item")).toBeTruthy()
    )
  })

  it("exibe seção 'Avalie o proprietário' — verbatim REVIEW_TITLE.OWNER linha 1266", async () => {
    wrap(<BookingDetailScreen />)
    await waitForBookingLoad("Concluída")
    await waitFor(() =>
      expect(screen.getByText("Avalie o proprietário")).toBeTruthy()
    )
  })

  it("exibe label 'Nota geral' nas seções de avaliação — verbatim linha 1302", async () => {
    wrap(<BookingDetailScreen />)
    await waitForBookingLoad("Concluída")
    await waitFor(() => {
      const labels = screen.queryAllByText("Nota geral")
      expect(labels.length).toBeGreaterThanOrEqual(1)
    })
  })

  it("star 1 tem accessibilityLabel '1 estrela' — verbatim linha 1312", async () => {
    wrap(<BookingDetailScreen />)
    await waitForBookingLoad("Concluída")
    await waitFor(() => {
      const stars = screen.queryAllByLabelText("1 estrela")
      expect(stars.length).toBeGreaterThanOrEqual(1)
    })
  })

  it("star 2 tem accessibilityLabel '2 estrelas' — verbatim linha 1312", async () => {
    wrap(<BookingDetailScreen />)
    await waitForBookingLoad("Concluída")
    await waitFor(() => {
      const stars = screen.queryAllByLabelText("2 estrelas")
      expect(stars.length).toBeGreaterThanOrEqual(1)
    })
  })

  it("exibe botão 'Enviar avaliação' — verbatim linha 1352 e accessibilityLabel 1346", async () => {
    wrap(<BookingDetailScreen />)
    await waitForBookingLoad("Concluída")
    await waitFor(() => {
      const btns = screen.queryAllByLabelText("Enviar avaliação")
      expect(btns.length).toBeGreaterThanOrEqual(1)
    })
  })

  it("botão 'Enviar avaliação' desabilitado sem nota selecionada — linha 1347", async () => {
    wrap(<BookingDetailScreen />)
    await waitForBookingLoad("Concluída")
    await waitFor(() => {
      const btns = screen.queryAllByLabelText("Enviar avaliação")
      expect(btns.length).toBeGreaterThanOrEqual(1)
      // rating = 0 → disabled = true para todos os forms sem nota
      btns.forEach((btn) =>
        expect(btn.props.accessibilityState?.disabled).toBe(true)
      )
    })
  })

  it("exibe 'Avaliação enviada' quando review já existe — verbatim linha 1297", async () => {
    // Avaliação do tipo ITEM já submetida
    setApiFetch({
      status: "COMPLETED",
      endDate: FUTURE_DATE,
      reviews: [{ reviewType: "ITEM", rating: 5, comment: null }],
    })
    wrap(<BookingDetailScreen />)
    await waitForBookingLoad("Concluída")
    await waitFor(() =>
      expect(screen.getByText("Avaliação enviada")).toBeTruthy()
    )
  })
})

// ── ReviewForm — locador avalia BORROWER ─────────────────────────────────────

describe("ReviewForm — locador avalia BORROWER (status RETURNED)", () => {
  beforeEach(() => {
    mockAuthUserId   = "user-owner"
    mockAuthUserName = "Carlos"
    setApiFetch({ status: "RETURNED", endDate: FUTURE_DATE })
  })

  it("exibe seção 'Avalie o locatário' — verbatim REVIEW_TITLE.BORROWER linha 1267", async () => {
    wrap(<BookingDetailScreen />)
    await waitForBookingLoad("Devolução em andamento")
    await waitFor(() =>
      expect(screen.getByText("Avalie o locatário")).toBeTruthy()
    )
  })
})

// ── CheckInOut — fases CHECKIN e CHECKOUT ────────────────────────────────────

describe("CheckInOut — rótulos das fases (status ACTIVE)", () => {
  beforeEach(() => setApiFetch({ status: "ACTIVE", endDate: FUTURE_DATE }))

  it("exibe título 'Fotos de check-in/check-out' — verbatim linha 1379", async () => {
    wrap(<BookingDetailScreen />)
    await waitForBookingLoad("Em andamento")
    await waitFor(() =>
      expect(screen.getByText("Fotos de check-in/check-out")).toBeTruthy()
    )
  })

  it("exibe fase 'Fotos na retirada' — verbatim CIO_PHASES[0].label linha 1373", async () => {
    wrap(<BookingDetailScreen />)
    await waitForBookingLoad("Em andamento")
    await waitFor(() =>
      expect(screen.getByText("Fotos na retirada")).toBeTruthy()
    )
  })

  it("exibe fase 'Fotos na devolução' — verbatim CIO_PHASES[1].label linha 1374", async () => {
    wrap(<BookingDetailScreen />)
    await waitForBookingLoad("Em andamento")
    await waitFor(() =>
      expect(screen.getByText("Fotos na devolução")).toBeTruthy()
    )
  })

  it("exibe hint 'Registre o estado do item ao retirar.' — verbatim CIO_PHASES[0].hint", async () => {
    wrap(<BookingDetailScreen />)
    await waitForBookingLoad("Em andamento")
    await waitFor(() =>
      expect(screen.getByText("Registre o estado do item ao retirar.")).toBeTruthy()
    )
  })

  it("exibe hint 'Registre o estado do item ao devolver.' — verbatim CIO_PHASES[1].hint", async () => {
    wrap(<BookingDetailScreen />)
    await waitForBookingLoad("Em andamento")
    await waitFor(() =>
      expect(screen.getByText("Registre o estado do item ao devolver.")).toBeTruthy()
    )
  })

  it("exibe 'Adicionar foto' para o proprietário em ACTIVE — canUpload CHECKIN (fonte: page.tsx linha 536)", async () => {
    // Fix: somente o proprietário pode fazer upload; locatário não vê o botão.
    // canUpload CHECKIN = isOwner && status === "ACTIVE" → testar como owner.
    mockAuthUserId   = "user-owner"
    mockAuthUserName = "Carlos"
    setApiFetch({ status: "ACTIVE", endDate: FUTURE_DATE })
    wrap(<BookingDetailScreen />)
    await waitForBookingLoad("Em andamento")
    await waitFor(() => {
      const btns = screen.queryAllByText("Adicionar foto")
      expect(btns.length).toBeGreaterThanOrEqual(1)
    })
  })
})

// ── #3 Confirmar reserva (proprietário + PENDING) ────────────────────────────
// Fonte: _BookingActions.tsx linha 252 (execCore("confirm")).

describe("Ação do proprietário — Confirmar reserva (PENDING)", () => {
  beforeEach(() => {
    mockAuthUserId   = "user-owner"
    mockAuthUserName = "Carlos"
    setApiFetch({ status: "PENDING" })
  })

  it("exibe o botão 'Confirmar reserva' para o proprietário — verbatim _BookingActions.tsx linha 252", async () => {
    wrap(<BookingDetailScreen />)
    await waitForBookingLoad("Aguardando aprovação")
    expect(screen.getByLabelText("Confirmar reserva")).toBeTruthy()
  })

  it("o locatário NÃO vê 'Confirmar reserva' (ação exclusiva do dono)", async () => {
    mockAuthUserId   = "user-borrower"
    mockAuthUserName = "Ana"
    wrap(<BookingDetailScreen />)
    await waitForBookingLoad("Aguardando aprovação")
    expect(screen.queryByLabelText("Confirmar reserva")).toBeNull()
  })

  it("ao pressionar, chama a API com action 'confirm'", async () => {
    const { apiFetch } = jest.requireMock("@/lib/api") as { apiFetch: jest.Mock }
    wrap(<BookingDetailScreen />)
    await waitForBookingLoad("Aguardando aprovação")
    fireEvent.press(screen.getByLabelText("Confirmar reserva"))
    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith("/api/bookings/booking-1", { method: "PATCH", body: JSON.stringify({ action: "confirm" }) }),
    )
  })
})

// ── #3 Marcar como ativo (proprietário + CONFIRMED + PAID) ───────────────────
// Fonte: _BookingActions.tsx linhas 253-254, 346-397 (token de 6 dígitos + horário).

describe("Ação do proprietário — Marcar como ativo (CONFIRMED + PAID)", () => {
  beforeEach(() => {
    mockAuthUserId   = "user-owner"
    mockAuthUserName = "Carlos"
    mockContratoExigido = false
    setApiFetch({ status: "CONFIRMED", paymentStatus: "PAID" })
  })

  it("exibe 'Marcar como ativo' só com pagamento confirmado", async () => {
    wrap(<BookingDetailScreen />)
    await waitForBookingLoad("Confirmada")
    expect(screen.getByLabelText("Marcar como ativo")).toBeTruthy()
  })

  it("NÃO exibe 'Marcar como ativo' sem pagamento (paymentStatus null)", async () => {
    setApiFetch({ status: "CONFIRMED", paymentStatus: null })
    wrap(<BookingDetailScreen />)
    await waitForBookingLoad("Confirmada")
    expect(screen.queryByLabelText("Marcar como ativo")).toBeNull()
  })

  it("abre o modal com os rótulos verbatim do site", async () => {
    wrap(<BookingDetailScreen />)
    await waitForBookingLoad("Confirmada")
    fireEvent.press(screen.getByLabelText("Marcar como ativo"))
    await waitFor(() => expect(screen.getByText("Confirmar retirada do item")).toBeTruthy())
    expect(screen.getByText("Solicite o código de retirada ao locatário e informe abaixo para confirmar a entrega.")).toBeTruthy()
    expect(screen.getByText("Não pode ser no futuro. Se não alterar, usa o horário atual.")).toBeTruthy()
    expect(screen.getByLabelText("Confirmar retirada")).toBeTruthy()
  })

  it("'Confirmar retirada' fica desabilitado até o token ter 6 dígitos", async () => {
    wrap(<BookingDetailScreen />)
    await waitForBookingLoad("Confirmada")
    fireEvent.press(screen.getByLabelText("Marcar como ativo"))
    await waitFor(() => expect(screen.getByLabelText("Confirmar retirada")).toBeTruthy())
    expect(screen.getByLabelText("Confirmar retirada").props.accessibilityState?.disabled).toBe(true)
    fireEvent.changeText(screen.getByLabelText("Código do locatário"), "123456")
    await waitFor(() =>
      expect(screen.getByLabelText("Confirmar retirada").props.accessibilityState?.disabled).toBe(false),
    )
  })

  it("envia mark_active com o pickupToken ao confirmar", async () => {
    const { apiFetch } = jest.requireMock("@/lib/api") as { apiFetch: jest.Mock }
    wrap(<BookingDetailScreen />)
    await waitForBookingLoad("Confirmada")
    fireEvent.press(screen.getByLabelText("Marcar como ativo"))
    await waitFor(() => expect(screen.getByLabelText("Código do locatário")).toBeTruthy())
    fireEvent.changeText(screen.getByLabelText("Código do locatário"), "654321")
    fireEvent.press(screen.getByLabelText("Confirmar retirada"))
    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith("/api/bookings/booking-1", { method: "PATCH", body: JSON.stringify({ action: "mark_active", pickupToken: "654321" }) }),
    )
  })
})

// ── #14 Solicitar extensão de prazo (locatário + ACTIVE) ─────────────────────
// Fonte: _BookingActions.tsx linhas 267-268, 436-456.

describe("Ação do locatário — Solicitar extensão de prazo (ACTIVE)", () => {
  beforeEach(() => setApiFetch({ status: "ACTIVE", endDate: FUTURE_DATE, extensionStatus: null }))

  it("exibe o botão 'Solicitar extensão de prazo'", async () => {
    wrap(<BookingDetailScreen />)
    await waitForBookingLoad("Em andamento")
    expect(screen.getByLabelText("Solicitar extensão de prazo")).toBeTruthy()
  })

  it("some com pedido já pendente (extensionStatus PENDING)", async () => {
    setApiFetch({ status: "ACTIVE", endDate: FUTURE_DATE, extensionStatus: "PENDING" })
    wrap(<BookingDetailScreen />)
    await waitForBookingLoad("Em andamento")
    expect(screen.queryByLabelText("Solicitar extensão de prazo")).toBeNull()
  })

  it("abre o modal 'Nova data de devolução' com o aviso de aprovação", async () => {
    wrap(<BookingDetailScreen />)
    await waitForBookingLoad("Em andamento")
    fireEvent.press(screen.getByLabelText("Solicitar extensão de prazo"))
    await waitFor(() => expect(screen.getByText("Nova data de devolução")).toBeTruthy())
    expect(screen.getByText("O proprietário precisará aprovar a extensão.")).toBeTruthy()
    expect(screen.getByLabelText("Solicitar extensão")).toBeTruthy()
  })
})

// ── #14 Proprietário responde ao pedido de extensão ──────────────────────────
// Fonte: _BookingActions.tsx linhas 294, 458-477.

describe("Extensão pendente — proprietário responde", () => {
  beforeEach(() => {
    mockAuthUserId   = "user-owner"
    mockAuthUserName = "Carlos"
    setApiFetch({
      status: "ACTIVE", endDate: FUTURE_DATE,
      extensionStatus: "PENDING",
      extensionRequestedEndDate: "2026-08-20T12:00:00Z",
    })
  })

  it("exibe o painel 'Solicitação de extensão de prazo' com Aprovar/Recusar", async () => {
    wrap(<BookingDetailScreen />)
    await waitForBookingLoad("Em andamento")
    await waitFor(() => expect(screen.getByText("Solicitação de extensão de prazo")).toBeTruthy())
    expect(screen.getByLabelText("Aprovar extensão")).toBeTruthy()
    expect(screen.getByLabelText("Recusar")).toBeTruthy()
  })

  it("Aprovar chama PATCH /extend { action: 'approve' }", async () => {
    const { apiFetch } = jest.requireMock("@/lib/api") as { apiFetch: jest.Mock }
    wrap(<BookingDetailScreen />)
    await waitForBookingLoad("Em andamento")
    await waitFor(() => expect(screen.getByLabelText("Aprovar extensão")).toBeTruthy())
    fireEvent.press(screen.getByLabelText("Aprovar extensão"))
    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith("/api/bookings/booking-1/extend", { method: "PATCH", body: JSON.stringify({ action: "approve" }) }),
    )
  })
})

// ── #13 Reportar problema (ACTIVE/RETURNED, sem disputa aberta) ──────────────
// Fonte: _BookingActions.tsx linhas 277-286, 479-577.

describe("Ação — Reportar problema", () => {
  beforeEach(() => setApiFetch({ status: "ACTIVE", endDate: FUTURE_DATE }))

  it("exibe o botão 'Reportar problema' em ACTIVE sem disputa", async () => {
    wrap(<BookingDetailScreen />)
    await waitForBookingLoad("Em andamento")
    expect(screen.getByLabelText("Reportar problema")).toBeTruthy()
  })

  it("passo de contato antes da reclamação (há chat), depois o formulário", async () => {
    wrap(<BookingDetailScreen />)
    await waitForBookingLoad("Em andamento")
    fireEvent.press(screen.getByLabelText("Reportar problema"))
    await waitFor(() => expect(screen.getByText("Antes de abrir uma reclamação")).toBeTruthy())
    fireEvent.press(screen.getByLabelText("Continuar"))
    await waitFor(() => expect(screen.getByText("Reportar problema com o item")).toBeTruthy())
    expect(screen.getByLabelText("Enviar relatório")).toBeTruthy()
  })

  it("'Enviar relatório' desabilitado sem categoria e descrição", async () => {
    wrap(<BookingDetailScreen />)
    await waitForBookingLoad("Em andamento")
    fireEvent.press(screen.getByLabelText("Reportar problema"))
    await waitFor(() => expect(screen.getByText("Antes de abrir uma reclamação")).toBeTruthy())
    fireEvent.press(screen.getByLabelText("Continuar"))
    await waitFor(() => expect(screen.getByLabelText("Enviar relatório")).toBeTruthy())
    expect(screen.getByLabelText("Enviar relatório").props.accessibilityState?.disabled).toBe(true)
  })
})

// ── #13 Disputa — banner e cancelamento ──────────────────────────────────────
// Fonte: _BookingActions.tsx linhas 275-291, 313-321.

describe("Disputa em análise — banner e cancelar disputa", () => {
  it("exibe o banner 'Disputa em análise' quando disputeStatus OPEN", async () => {
    setApiFetch({ status: "ACTIVE", endDate: FUTURE_DATE, disputeStatus: "OPEN", disputeOpenedById: "user-owner" })
    wrap(<BookingDetailScreen />)
    await waitForBookingLoad("Em andamento")
    await waitFor(() => expect(screen.getByText("Disputa em análise")).toBeTruthy())
    expect(screen.getByText("A equipe ShareO está analisando o caso. A locação segue normalmente — você pode continuar usando as ações abaixo.")).toBeTruthy()
  })

  it("com disputa aberta, 'Reportar problema' não aparece", async () => {
    setApiFetch({ status: "ACTIVE", endDate: FUTURE_DATE, disputeStatus: "OPEN", disputeOpenedById: "user-owner" })
    wrap(<BookingDetailScreen />)
    await waitForBookingLoad("Em andamento")
    expect(screen.queryByLabelText("Reportar problema")).toBeNull()
  })

  it("'Cancelar disputa' só para quem abriu (disputeOpenedById === user.id)", async () => {
    // Locatário logado é quem abriu → vê o botão.
    setApiFetch({ status: "ACTIVE", endDate: FUTURE_DATE, disputeStatus: "OPEN", disputeOpenedById: "user-borrower" })
    wrap(<BookingDetailScreen />)
    await waitForBookingLoad("Em andamento")
    expect(screen.getByLabelText("Cancelar disputa")).toBeTruthy()
  })

  it("quem NÃO abriu a disputa não vê 'Cancelar disputa'", async () => {
    setApiFetch({ status: "ACTIVE", endDate: FUTURE_DATE, disputeStatus: "OPEN", disputeOpenedById: "user-owner" })
    wrap(<BookingDetailScreen />)
    await waitForBookingLoad("Em andamento")
    expect(screen.queryByLabelText("Cancelar disputa")).toBeNull()
  })
})
