/**
 * Testes do formulário de captação de leads da campanha.
 * Fonte: apps/campanha/components/FounderCaptureForm.tsx
 *
 * REGRA CRÍTICA: fetch é SEMPRE mockado. Nunca bater na API real.
 * Cada lead criado é permanente — ocupa posição na fila e dispara e-mail via Resend.
 *
 * Coberturas obrigatórias (P0):
 *   (a) 409 com queuePosition → mensagem de duplicado com a posição numérica
 *   (b) 409 com body malformado → fallback ?? 0 não renderiza texto vazio
 *   (c) role="alert" só existe no estado error-duplicate, nunca no success
 *   (d) 201 → success com posição + link WhatsApp contendo o referralCode
 */

import React from "react"
import { render, screen, fireEvent, act } from "@testing-library/react"
import { FounderCaptureForm } from "@/components/FounderCaptureForm"

// ─── Mocks ───────────────────────────────────────────────────────────────────

// readAttribution toca window.location.search e sessionStorage — fixar para
// isolar o formulário do ambiente de teste.
jest.mock("@/lib/founders-attribution", () => ({
  readAttribution: jest.fn(() => ({ source: "VIP_LANDING" as const })),
}))

// trackEvent verifica window.gtag — não existe no jsdom.
jest.mock("@/components/analytics/GoogleAnalytics", () => ({
  trackEvent: jest.fn(),
}))

// fetchAddressByCep bate no ViaCEP — nunca deve rodar nos testes unitários.
jest.mock("@/lib/forms/address", () => ({
  fetchAddressByCep: jest.fn().mockResolvedValue(null),
}))

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Preenche os campos obrigatórios e submete o formulário.
 *
 * O formulário exige: e-mail + cidade + UF (2 chars) + consentimento LGPD.
 * `startExpanded` abre o form diretamente; para cidade/UF clicamos no
 * link "Prefiro informar cidade e estado" que revela os campos manuais.
 *
 * Notas de seleção:
 *   - Email: placeholder único "Seu melhor e-mail *" evita ambiguidade com
 *     o texto de consentimento LGPD que também contém "e-mail".
 *   - Checkbox LGPD: nome via texto do label wrapping ("Concordo…"); os
 *     botões de intenção também usam role="checkbox" (intent toggle).
 */
async function fillAndSubmit() {
  // Revela campos de cidade/UF (só visível quando showManual=false e city="")
  fireEvent.click(screen.getByRole("button", { name: /prefiro informar/i }))

  // Placeholder é único — evita colisão com o label de consentimento que também
  // contém a palavra "e-mail".
  fireEvent.change(screen.getByPlaceholderText(/seu melhor e-mail/i), {
    target: { value: "teste@example.com" },
  })
  fireEvent.change(screen.getByLabelText(/cidade/i), {
    target: { value: "Recife" },
  })
  fireEvent.change(screen.getByLabelText(/^uf \*/i), {
    target: { value: "PE" },
  })

  // O checkbox de consentimento LGPD está dentro de um <label> cujo texto
  // começa com "Concordo…" — distinto dos botões role="checkbox" de intenção.
  fireEvent.click(screen.getByRole("checkbox", { name: /concordo/i }))

  // Intenção passou a ser obrigatória: nenhuma opção vem pré-marcada, e o
  // botão de envio fica `disabled` até haver uma. Sem este clique, TODOS os
  // testes deste arquivo param no submit.
  fireEvent.click(screen.getByRole("checkbox", { name: /quero anunciar/i }))

  // Submete dentro de act para que os setState assíncronos do handleSubmit
  // (chamados após a resolução do fetch mockado) não gerem o aviso
  // "not wrapped in act" no output do teste.
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /garantir/i }))
  })
}

// ─── Testes ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks()
  // Garantir que fetch nunca vaze para a rede — cada caso define seu próprio mock.
  global.fetch = jest.fn()
})

afterEach(() => {
  // Restaurar fetch real (caso algum teste futuro precise de fetch nativo).
  jest.restoreAllMocks()
})

describe("FounderCaptureForm — e-mail duplicado (P0)", () => {
  /**
   * (a) 409 com queuePosition válido → mostra a posição da fila.
   *
   * O bug original: o formulário mostrava as MESMAS cores de sucesso e o
   * usuário acreditava ter criado um segundo cadastro. Agora o 409 mostra
   * role="alert" com o número da posição — nenhuma conta nova é criada.
   */
  it("(a) 409 com queuePosition → exibe a posição na mensagem de duplicado", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      status: 409,
      ok: false,
      json: async () => ({
        error: { data: { queuePosition: 42 } },
      }),
    })

    render(<FounderCaptureForm startExpanded />)
    await fillAndSubmit()

    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent("Este e-mail já estava na lista.")
    expect(alert).toHaveTextContent("42")
    expect(alert).toHaveTextContent("Nº 42")
  })

  /**
   * (b) 409 com body malformado (sem queuePosition) → ?? 0 → texto de fallback.
   *
   * Garante que o fallback `?? 0` não renderize texto vazio ("Nº 0" não
   * aparece; o texto alternativo "Você será avisado" é exibido).
   */
  it("(b) 409 com body malformado → fallback ?? 0 exibe texto não-vazio", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      status: 409,
      ok: false,
      json: async () => ({ erro: "inesperado" }), // sem error.data.queuePosition
    })

    render(<FounderCaptureForm startExpanded />)
    await fillAndSubmit()

    const alert = await screen.findByRole("alert")
    // Com position === 0, o formulário exibe o texto de fallback (não a posição).
    expect(alert).toHaveTextContent("Este e-mail já estava na lista.")
    expect(alert).toHaveTextContent("Não criamos um cadastro novo.")
    // Não deve renderizar "Nº 0" (texto sem sentido para o usuário).
    expect(alert).not.toHaveTextContent("Nº 0")
  })

  /**
   * (c) Presença de role="alert" distingue duplicado de sucesso.
   *
   * Sucesso deve ser celebração — sem alarme. Duplicado é aviso, diferente
   * visualmente e semanticamente do sucesso.
   */
  it("(c) success NÃO tem role=alert; error-duplicate TEM role=alert", async () => {
    // --- Sucesso
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      status: 201,
      ok: true,
      json: async () => ({
        data: { queuePosition: 7, referralCode: "ABCD1234" },
      }),
    })

    const { unmount } = render(<FounderCaptureForm startExpanded />)
    await fillAndSubmit()

    // Aguarda o estado de sucesso renderizar
    await screen.findByText(/você é o #7°/i)
    expect(screen.queryByRole("alert")).toBeNull()
    unmount()

    // --- Duplicado
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      status: 409,
      ok: false,
      json: async () => ({ error: { data: { queuePosition: 7 } } }),
    })

    render(<FounderCaptureForm startExpanded />)
    await fillAndSubmit()

    const alert = await screen.findByRole("alert")
    expect(alert).toBeInTheDocument()
  })

  /**
   * (d) 201 → estado de sucesso com posição e link de WhatsApp com referralCode.
   *
   * O link de convite precisa conter o referralCode para que o painel de
   * indicações atribua corretamente os leads vindos de boca a boca.
   */
  it("(d) 201 → sucesso exibe posição e link WhatsApp com referralCode", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      status: 201,
      ok: true,
      json: async () => ({
        data: { queuePosition: 15, referralCode: "TESTCODE" },
      }),
    })

    render(<FounderCaptureForm startExpanded />)
    await fillAndSubmit()

    // Posição na fila
    await screen.findByText(/você é o #15°/i)

    // Link de WhatsApp presente
    const waLink = screen.getByRole("link", { name: /convidar amigos/i })
    expect(waLink).toBeInTheDocument()

    // O href contém o referralCode como parâmetro `ref`
    const href = waLink.getAttribute("href") ?? ""
    expect(href).toContain("wa.me")
    // O código é parte da URL de convite que vai dentro do texto do WhatsApp
    expect(href).toContain("TESTCODE")

    // Estado de sucesso não tem role="alert"
    expect(screen.queryByRole("alert")).toBeNull()
  })
})

describe("FounderCaptureForm — erro de rede", () => {
  it("fetch lança → exibe mensagem de erro de conexão com role=alert", async () => {
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Network error"))

    render(<FounderCaptureForm startExpanded />)
    await fillAndSubmit()

    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent(/erro de conexão/i)
  })
})

/**
 * Contrato da intenção ("Quero anunciar" / "Quero alugar").
 *
 * Esta é a cópia que está no ar em shareo.com.br, atrás da mídia paga — e o
 * campo `intent` é o que alimenta o ranking de cidade-piloto. Antes,
 * "anunciar" vinha pré-marcado E `resolveIntent` devolvia "proprietario" para
 * conjunto vazio: quem nunca tocasse nos botões era contado como anunciante.
 */
describe("FounderCaptureForm — intenção", () => {
  const anunciar = () => screen.getByRole("checkbox", { name: /quero anunciar/i })
  const alugar   = () => screen.getByRole("checkbox", { name: /quero alugar/i })

  it("não nasce com nenhuma opção pré-selecionada", () => {
    render(<FounderCaptureForm startExpanded />)
    expect(anunciar()).toHaveAttribute("aria-checked", "false")
    expect(alugar()).toHaveAttribute("aria-checked", "false")
  })

  it("permite desmarcar a última opção", () => {
    render(<FounderCaptureForm startExpanded />)
    fireEvent.click(anunciar())
    expect(anunciar()).toHaveAttribute("aria-checked", "true")
    fireEvent.click(anunciar())
    expect(anunciar()).toHaveAttribute("aria-checked", "false")
  })

  it("não envia — nem chama a API — enquanto não houver intenção", async () => {
    render(<FounderCaptureForm startExpanded />)

    fireEvent.click(screen.getByRole("button", { name: /prefiro informar/i }))
    fireEvent.change(screen.getByPlaceholderText(/seu melhor e-mail/i), {
      target: { value: "teste@example.com" },
    })
    fireEvent.change(screen.getByLabelText(/cidade/i), { target: { value: "Recife" } })
    fireEvent.change(screen.getByLabelText(/^uf \*/i), { target: { value: "PE" } })
    fireEvent.click(screen.getByRole("checkbox", { name: /concordo/i }))

    const enviar = screen.getByRole("button", { name: /garantir/i })
    expect(enviar).toBeDisabled()

    await act(async () => { fireEvent.click(enviar) })
    // O que importa não é o botão estar cinza, é o lead não nascer sem intenção.
    expect(global.fetch).not.toHaveBeenCalled()

    fireEvent.click(anunciar())
    expect(enviar).toBeEnabled()
  })

  /** Preenche o mínimo e submete, marcando exatamente as intenções pedidas. */
  async function enviarCom(escolhas: Array<"anunciar" | "alugar">) {
    fireEvent.click(screen.getByRole("button", { name: /prefiro informar/i }))
    fireEvent.change(screen.getByPlaceholderText(/seu melhor e-mail/i), {
      target: { value: "teste@example.com" },
    })
    fireEvent.change(screen.getByLabelText(/cidade/i), { target: { value: "Recife" } })
    fireEvent.change(screen.getByLabelText(/^uf \*/i), { target: { value: "PE" } })
    fireEvent.click(screen.getByRole("checkbox", { name: /concordo/i }))
    for (const e of escolhas) fireEvent.click(e === "anunciar" ? anunciar() : alugar())
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /garantir/i }))
    })
    return JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)
  }

  it.each([
    [["anunciar"] as const,           "proprietario"],
    [["alugar"] as const,             "locatario"],
    [["anunciar", "alugar"] as const, "ambos"],
  ])("marcar %s envia intent %s", async (escolhas, esperado) => {
    render(<FounderCaptureForm startExpanded />)
    const body = await enviarCom([...escolhas])
    expect(body.intent).toBe(esperado)
  })
})
