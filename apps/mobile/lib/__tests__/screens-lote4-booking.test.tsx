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
  // isBorrower + CONFIRMED + contractSignedAt = null
  beforeEach(() => setApiFetch({ status: "CONFIRMED", contractSignedAt: null }))

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
  beforeEach(() => setApiFetch({
    status:           "CONFIRMED",
    contractSignedAt: "2026-07-04T10:00:00Z",
  }))

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

  it("exibe aviso 'Marque pelo menos 3 itens para habilitar a devolução.' com 0 selecionados — verbatim linha 1132", async () => {
    wrap(<BookingDetailScreen />)
    await waitForBookingLoad("Em andamento")
    await waitFor(() =>
      expect(screen.getByText(
        "Marque pelo menos 3 itens para habilitar a devolução."
      )).toBeTruthy()
    )
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
        /Marque pelo menos 3 de 4 itens e envie uma foto do estado do item para iniciar a devolução/
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
