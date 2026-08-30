// Testes RNTL — PerfilPublicoScreen (apps/mobile/app/perfil/[id]/index.tsx)
// Fonte verificada: app/perfil/[id]/page.tsx
//
// Verifica:
//   - estado de carregamento
//   - rótulos verbatim do site-fonte (texto exato)
//   - seções: cabeçalho, estatísticas, conquistas, avaliações
//   - estado de erro / não encontrado

import React from "react"
import { render, screen, waitFor, act } from "@testing-library/react-native"
import { SafeAreaProvider }              from "react-native-safe-area-context"

// ── Mock: expo-router ─────────────────────────────────────────────────────────
const mockBack = jest.fn()
const mockPush = jest.fn()
jest.mock("expo-router", () => ({
  router:               { back: mockBack, push: mockPush },
  useLocalSearchParams: () => ({ id: "user-pub-001" }),
}))

// ── Mock: react-native-safe-area-context ─────────────────────────────────────
jest.mock("react-native-safe-area-context", () => {
  const React = require("react")
  const { View } = require("react-native")
  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement(View, null, children),
    SafeAreaView:     ({ children }: { children: React.ReactNode }) =>
      React.createElement(View, null, children),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
    useSafeAreaFrame:  () => ({ x: 0, y: 0, width: 375, height: 812 }),
  }
})

// ── Mock: react-native-svg ────────────────────────────────────────────────────
jest.mock("react-native-svg", () => {
  const React    = require("react")
  const { View } = require("react-native")
  const Fake     = ({ children }: { children?: React.ReactNode }) =>
    React.createElement(View, null, children)
  return {
    __esModule: true,
    default:    Fake,
    Svg:        Fake,
    Path:       Fake,
    Polyline:   Fake,
    Circle:     Fake,
    Line:       Fake,
    Rect:       Fake,
    Ellipse:    Fake,
  }
})

// ── Mock: expo-image ──────────────────────────────────────────────────────────
jest.mock("expo-image", () => {
  const React    = require("react")
  const { View } = require("react-native")
  return { Image: (props: { accessibilityLabel?: string }) =>
    React.createElement(View, { accessibilityLabel: props.accessibilityLabel }) }
})

// ── Mock: @/lib/api ───────────────────────────────────────────────────────────
const mockApiFetch = jest.fn()
jest.mock("@/lib/api", () => ({
  apiFetch:  (...args: unknown[]) => mockApiFetch(...args),
  API_URL:   "https://staging.shareo.com.br",
  getTokens: jest.fn().mockResolvedValue({ accessToken: "tok", refreshToken: "tok_r" }),
}))

// ── Mock: @/lib/auth ──────────────────────────────────────────────────────────
jest.mock("@/lib/auth", () => ({
  useAuth: jest.fn((selector: (s: object) => unknown) =>
    selector({ user: null, logout: jest.fn(), loading: false })
  ),
}))

// ── Mock: @/lib/theme ─────────────────────────────────────────────────────────
jest.mock("@/lib/theme", () => {
  const React = require("react")
  const LIGHT = {
    bg:               "#F8FAFC",
    surface:          "#FFFFFF",
    text:             "#0F172A",
    muted:            "#64748B",
    border:           "#E2E8F0",
    navy:             "#003366",
    green:            "#007B3C",
    error:            "#C0392B",
    warning:          "#F59E0B",
    success:          "#007B3C",
    accent:           "#59C686",
    bookingPending:   "#F59E0B",
    bookingActive:    "#007B3C",
    bookingCompleted: "#64748B",
    bookingCancelled: "#E74C3C",
    bookingDisputed:  "#C05800",
    disabledBg:       "#E2E8F0",
    disabledText:     "#94A3B8",
    disabledBorder:   "#CBD5E1",
  }
  return {
    useTheme:      () => ({ preference: "light", mode: "light", tokens: LIGHT, setPreference: jest.fn() }),
    ThemeProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  }
}, { virtual: true })

// ── Mock: @tanstack/react-query ───────────────────────────────────────────────
// Controlado por `mockUseQuery` para simular loading/success/error
const mockUseQuery = jest.fn()
jest.mock("@tanstack/react-query", () => ({
  useQuery:      (...args: unknown[]) => mockUseQuery(...args),
  useMutation:   () => ({ mutate: jest.fn(), isPending: false }),
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}))

// ── Importações pós-mock ──────────────────────────────────────────────────────
import PerfilPublicoScreen from "@/app/perfil/[id]/index"

// ── Dados de teste ────────────────────────────────────────────────────────────

const PROFILE_COMPLETO = {
  id:               "user-pub-001",
  name:             "Maria Oliveira",
  bio:              "Aluguel de ferramentas para fins de semana.",
  city:             "São Paulo",
  state:            "SP",
  neighborhood:     "Vila Madalena",
  avatarUrl:        null,
  userType:         "PF" as const,
  isVerified:       true,
  createdAt:        "2026-01-15T00:00:00.000Z",
  reputationPoints: 30,
  itemCount:        3,
  totalDeals:       7,
  avgRating:        4.8,
  reviewCount:      6,
  responseBadge:    { label: "Responde em ~1h", avgHours: 1.2 },
  borrowerBadge:    { key: "bronze", label: "Bronze", emoji: "🥉", color: "text-amber-700" },
  nextBadge:        {
    badge:    { key: "silver", label: "Prata", emoji: "🥈", color: "text-slate-400", minBookings: 10 },
    progress: 20,
  },
  activeReviewer:     true,
  activeReviewerBadge: { key: "active-reviewer", label: "Avaliador Ativo", emoji: "⭐", color: "text-orange-link" },
  items: [
    {
      id:           "item-001",
      title:        "Furadeira Bosch 500W",
      pricePerDay:  5000,
      city:         "São Paulo",
      state:        "SP",
      neighborhood: "Vila Madalena",
      category:     { name: "Ferramentas", slug: "ferramentas" },
      owner:        { name: "Maria Oliveira", isVerified: true },
      images:       [{ url: "https://storage.exemplo.com/foto.jpg" }],
      _count:       { reviews: 3, favorites: 1 },
    },
  ],
  reviewsReceived: [
    {
      rating:          5,
      comment:         "Ótima proprietária, item em perfeito estado!",
      reviewType:      "OWNER",
      sentiment:       "POSITIVE",
      itemAsDescribed: true,
      punctuality:     true,
      communication:   true,
      conservation:    null,
      photoUrl:        null,
      createdAt:       "2026-08-10T00:00:00.000Z",
      reviewer:        { name: "João Silva" },
    },
  ],
}

const PROFILE_NOVO = {
  ...PROFILE_COMPLETO,
  reputationPoints: 0,
  itemCount:        0,
  totalDeals:       0,
  avgRating:        null,
  reviewCount:      0,
  responseBadge:    null,
  borrowerBadge:    null,
  nextBadge:        {
    badge:    { key: "bronze", label: "Bronze", emoji: "🥉", color: "text-amber-700", minBookings: 3 },
    progress: 0,
  },
  activeReviewer:      false,
  activeReviewerBadge: null,
  items:           [],
  reviewsReceived: [],
}

// ── Utilitários ──────────────────────────────────────────────────────────────

function wrap(ui: React.ReactElement) {
  return render(
    <SafeAreaProvider>
      {ui}
    </SafeAreaProvider>
  )
}

// ── Testes ───────────────────────────────────────────────────────────────────

describe("PerfilPublicoScreen — estado de carregamento", () => {
  beforeEach(() => {
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: true, isError: false })
  })

  it("exibe botão 'Voltar para anúncios' durante carregamento", () => {
    wrap(<PerfilPublicoScreen />)
    // Rótulo verbatim — fonte: site linha 127 "← Voltar para anúncios"
    expect(screen.getByText("Voltar para anúncios")).toBeTruthy()
  })
})

describe("PerfilPublicoScreen — perfil completo", () => {
  beforeEach(() => {
    mockUseQuery.mockReturnValue({
      data:      { data: PROFILE_COMPLETO },
      isLoading: false,
      isError:   false,
    })
  })

  // ── Cabeçalho ──────────────────────────────────────────────────────────────

  it("exibe nome do usuário verbatim", () => {
    wrap(<PerfilPublicoScreen />)
    expect(screen.getByText("Maria Oliveira")).toBeTruthy()
  })

  it("exibe badge '✓ Verificado' quando isVerified=true", () => {
    wrap(<PerfilPublicoScreen />)
    // Rótulo verbatim — fonte: site linha 148 "✓ Verificado"
    expect(screen.getByText("✓ Verificado")).toBeTruthy()
  })

  it("exibe badge 'Pessoa Física' para userType=PF", () => {
    wrap(<PerfilPublicoScreen />)
    // Rótulo verbatim — fonte: site linha 151 "Pessoa Física"
    expect(screen.getByText("Pessoa Física")).toBeTruthy()
  })

  it("exibe 'Membro desde' com texto (não vazio)", () => {
    wrap(<PerfilPublicoScreen />)
    // A data formatada pode variar por locale, mas o prefixo é verbatim
    const el = screen.getByText(/Membro desde/)
    expect(el).toBeTruthy()
  })

  it("exibe badge de resposta com texto verbatim quando presente", () => {
    wrap(<PerfilPublicoScreen />)
    // Rótulo verbatim — fonte: site linha 159 "⚡ {responseBadge.label}"
    expect(screen.getByText("⚡ Responde em ~1h")).toBeTruthy()
  })

  it("exibe localização com emoji 📍 e bairro/cidade/estado", () => {
    wrap(<PerfilPublicoScreen />)
    expect(screen.getByText("📍 Vila Madalena, São Paulo, SP")).toBeTruthy()
  })

  it("exibe bio quando presente", () => {
    wrap(<PerfilPublicoScreen />)
    expect(screen.getByText("Aluguel de ferramentas para fins de semana.")).toBeTruthy()
  })

  // ── Estatísticas ───────────────────────────────────────────────────────────

  it("exibe '3' no stat card de itens anunciados", () => {
    wrap(<PerfilPublicoScreen />)
    expect(screen.getByText("3")).toBeTruthy()
  })

  it("exibe label 'itens anunciados' (plural) quando itemCount > 1", () => {
    wrap(<PerfilPublicoScreen />)
    // Rótulo verbatim — fonte: site linha 181 "itens anunciados"
    expect(screen.getByText("itens anunciados")).toBeTruthy()
  })

  it("exibe '7' no stat card de aluguéis", () => {
    wrap(<PerfilPublicoScreen />)
    expect(screen.getByText("7")).toBeTruthy()
  })

  it("exibe label 'aluguéis' (plural) quando totalDeals > 1", () => {
    wrap(<PerfilPublicoScreen />)
    // Rótulo verbatim — fonte: site linha 187 "aluguéis"
    expect(screen.getByText("aluguéis")).toBeTruthy()
  })

  it("exibe nota média formatada com 1 decimal", () => {
    wrap(<PerfilPublicoScreen />)
    expect(screen.getByText("4.8")).toBeTruthy()
  })

  it("exibe label '★ nota média' no stat card de avaliações", () => {
    wrap(<PerfilPublicoScreen />)
    // Rótulo verbatim — fonte: site linha 194 "★ nota média"
    expect(screen.getByText("★ nota média")).toBeTruthy()
  })

  // ── Conquistas ─────────────────────────────────────────────────────────────

  it("exibe título 'Conquistas' verbatim", () => {
    wrap(<PerfilPublicoScreen />)
    // Rótulo verbatim — fonte: site linha 208 "Conquistas"
    expect(screen.getByText("Conquistas")).toBeTruthy()
  })

  it("exibe pontos de reputação quando > 0", () => {
    wrap(<PerfilPublicoScreen />)
    // Regex porque o nó <Text> pai tem texto combinado "⭐ 30 pontos de reputação"
    // (número em <Text> aninhado com fontWeight=600). getByText de meia frase nunca
    // casa em nó composto — usar regex contra o conteúdo combinado do pai.
    // Ref: memory feedback-rntl-text-multilinha-e-cleanup.md
    expect(screen.getByText(/pontos de reputação/)).toBeTruthy()
  })

  it("exibe badge de locatário Bronze", () => {
    wrap(<PerfilPublicoScreen />)
    // Rótulo verbatim — fonte: site linha 222 "Locatário {badge.label}"
    expect(screen.getByText("🥉 Locatário Bronze")).toBeTruthy()
  })

  it("exibe badge 'Avaliador Ativo' quando activeReviewer=true", () => {
    wrap(<PerfilPublicoScreen />)
    // Rótulo verbatim — fonte: site linha 226 "{badge.emoji} {badge.label}"
    expect(screen.getByText("⭐ Avaliador Ativo")).toBeTruthy()
  })

  it("exibe label de próximo badge com texto 'Próximo:'", () => {
    wrap(<PerfilPublicoScreen />)
    // Rótulo verbatim — fonte: site linha 235 "Próximo: {emoji} {label} ({min} aluguéis)"
    expect(screen.getByText(/Próximo: 🥈 Prata \(10 aluguéis\)/)).toBeTruthy()
  })

  // ── Seção de itens ─────────────────────────────────────────────────────────

  it("exibe título 'Anúncios de Maria' (primeiro nome verbatim)", () => {
    wrap(<PerfilPublicoScreen />)
    // Rótulo verbatim — fonte: site linha 253 "Anúncios de {nome.split(' ')[0]}"
    expect(screen.getByText("Anúncios de Maria")).toBeTruthy()
  })

  // ── Avaliações ─────────────────────────────────────────────────────────────

  it("exibe título 'Avaliações recebidas' verbatim", () => {
    wrap(<PerfilPublicoScreen />)
    // Rótulo verbatim — fonte: site linha 265 "Avaliações recebidas"
    expect(screen.getByText(/Avaliações recebidas/)).toBeTruthy()
  })

  it("exibe comentário da avaliação", () => {
    wrap(<PerfilPublicoScreen />)
    expect(screen.getByText("Ótima proprietária, item em perfeito estado!")).toBeTruthy()
  })

  it("exibe nome do avaliador com travessão verbatim", () => {
    wrap(<PerfilPublicoScreen />)
    // Rótulo verbatim — fonte: site linha 293 "— {reviewer.name}"
    expect(screen.getByText("— João Silva")).toBeTruthy()
  })

  it("exibe contagem de avaliações quando reviewCount > 5", () => {
    mockUseQuery.mockReturnValueOnce({
      data:      { data: { ...PROFILE_COMPLETO, reviewCount: 12 } },
      isLoading: false,
      isError:   false,
    })
    wrap(<PerfilPublicoScreen />)
    // Rótulo verbatim — fonte: site linhas 268-271 "(últimas 5 de {count})"
    expect(screen.getByText(/últimas 5 de 12/)).toBeTruthy()
  })
})

describe("PerfilPublicoScreen — perfil mínimo (usuário novo)", () => {
  beforeEach(() => {
    mockUseQuery.mockReturnValue({
      data:      { data: PROFILE_NOVO },
      isLoading: false,
      isError:   false,
    })
  })

  it("exibe '—' quando avgRating é null", () => {
    wrap(<PerfilPublicoScreen />)
    // Rótulo verbatim — fonte: site linha 198 "—"
    expect(screen.getByText("—")).toBeTruthy()
  })

  it("exibe 'sem avaliações' quando avgRating é null", () => {
    wrap(<PerfilPublicoScreen />)
    // Rótulo verbatim — fonte: site linha 199 "sem avaliações"
    expect(screen.getByText("sem avaliações")).toBeTruthy()
  })

  it("exibe 'item anunciado' no singular quando itemCount=1", () => {
    mockUseQuery.mockReturnValueOnce({
      data:      { data: { ...PROFILE_NOVO, itemCount: 1 } },
      isLoading: false,
      isError:   false,
    })
    wrap(<PerfilPublicoScreen />)
    // Rótulo verbatim — fonte: site linha 180 "item anunciado"
    expect(screen.getByText("item anunciado")).toBeTruthy()
  })

  it("exibe 'aluguel' no singular quando totalDeals=1", () => {
    mockUseQuery.mockReturnValueOnce({
      data:      { data: { ...PROFILE_NOVO, totalDeals: 1 } },
      isLoading: false,
      isError:   false,
    })
    wrap(<PerfilPublicoScreen />)
    // Rótulo verbatim — fonte: site linha 186 "aluguel"
    expect(screen.getByText("aluguel")).toBeTruthy()
  })

  it("NÃO exibe 'Pessoa Jurídica' quando userType=PF", () => {
    wrap(<PerfilPublicoScreen />)
    expect(screen.queryByText("Pessoa Jurídica")).toBeNull()
  })
})

describe("PerfilPublicoScreen — userType PJ", () => {
  it("exibe 'Pessoa Jurídica' quando userType=PJ", () => {
    mockUseQuery.mockReturnValue({
      data:      { data: { ...PROFILE_COMPLETO, userType: "PJ" } },
      isLoading: false,
      isError:   false,
    })
    wrap(<PerfilPublicoScreen />)
    // Rótulo verbatim — fonte: site linha 151 "Pessoa Jurídica"
    expect(screen.getByText("Pessoa Jurídica")).toBeTruthy()
  })
})

describe("PerfilPublicoScreen — estado de erro", () => {
  it("exibe 'Perfil não encontrado.' quando isError=true", () => {
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: false, isError: true })
    wrap(<PerfilPublicoScreen />)
    // Rótulo literal usado no estado de erro
    expect(screen.getByText("Perfil não encontrado.")).toBeTruthy()
  })

  it("exibe 'Voltar para anúncios' mesmo no estado de erro", () => {
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: false, isError: true })
    wrap(<PerfilPublicoScreen />)
    expect(screen.getByText("Voltar para anúncios")).toBeTruthy()
  })
})
