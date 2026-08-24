// Fonte: components/home/FounderCaptureForm.tsx (site) — transcrição verificada.
/**
 * Formulário de captação de fundadores no app.
 *
 * Por que este teste existe: em 24/08/2026 a comparação lado a lado com o site
 * mostrou que o app tinha um formulário DIFERENTE — sem WhatsApp, sem CEP, e com
 * um texto de consentimento próprio. Ninguém foi avisado porque nada comparava
 * as duas telas. A regra do fundador (apps/mobile/CLAUDE.md) manda os testes
 * fixarem os rótulos exatos justamente para isso.
 *
 * 🪤 O componente começa RECOLHIDO. Sem `startExpanded`, todas as asserções de
 * campo passariam por vacuidade — não haveria campo nenhum na árvore.
 */
import React from "react"
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react-native"
import { FounderCaptureForm } from "../../components/home/FounderCaptureForm"

const VIACEP_OK = {
  logradouro: "Rua Pais Leme",
  bairro:     "Pinheiros",
  localidade: "São Paulo",
  uf:         "SP",
}

function mockViaCep(resposta: unknown, { falhar = false } = {}) {
  global.fetch = jest.fn().mockImplementation(() =>
    falhar
      ? Promise.reject(new Error("sem rede"))
      : Promise.resolve({ ok: true, json: async () => resposta }),
  ) as unknown as typeof fetch
}

afterEach(() => {
  jest.clearAllMocks()
})

describe("campos transcritos do site", () => {
  beforeEach(() => mockViaCep({ erro: true }))

  it.each([
    "Seu nome (opcional)",
    "Seu melhor e-mail *",
    "WhatsApp (opcional)",
    "00000-000",
  ])("mostra o campo com placeholder %s", (placeholder) => {
    render(<FounderCaptureForm startExpanded />)

    expect(screen.getByPlaceholderText(placeholder)).toBeTruthy()
  })

  it("mostra as dicas e o rótulo visível do CEP", () => {
    render(<FounderCaptureForm startExpanded />)

    expect(screen.getByText("CEP")).toBeTruthy()
    expect(
      screen.getByText("Se quiser, avisamos você por aqui também quando abrirmos na sua cidade."),
    ).toBeTruthy()
    // 🪤 A dica do CEP é UM nó de texto, mesmo ocupando duas linhas na tela —
    // buscar meia frase nunca casa (ver feedback-rntl-text-multilinha-e-cleanup).
    expect(
      screen.getByText(
        "Usamos só para saber seu bairro e escolher as primeiras cidades. Não pedimos número nem complemento.",
      ),
    ).toBeTruthy()
  })

  it("oferece a saída para quem não quer digitar CEP", () => {
    render(<FounderCaptureForm startExpanded />)

    expect(screen.getByText("Prefiro informar cidade e estado")).toBeTruthy()
    // Cidade/UF NÃO aparecem antes de pedir: são o fallback, não o caminho principal.
    expect(screen.queryByPlaceholderText("Sua cidade")).toBeNull()

    fireEvent.press(screen.getByText("Prefiro informar cidade e estado"))

    expect(screen.getByPlaceholderText("Sua cidade")).toBeTruthy()
    expect(screen.getByPlaceholderText("UF")).toBeTruthy()
    expect(screen.getByPlaceholderText("Seu bairro")).toBeTruthy()
  })
})

describe("consulta de CEP", () => {
  it("preenche cidade e bairro quando o ViaCEP responde", async () => {
    mockViaCep(VIACEP_OK)
    render(<FounderCaptureForm startExpanded />)

    fireEvent.changeText(screen.getByPlaceholderText("00000-000"), "05424150")

    await waitFor(() => expect(screen.getByText("Pinheiros")).toBeTruthy())
    expect(screen.getByText("São Paulo")).toBeTruthy()
    expect(screen.getByText("Não é aqui? Corrigir")).toBeTruthy()
    // Resolvido pelo CEP: o preenchimento manual fica fora do caminho.
    expect(screen.queryByPlaceholderText("Sua cidade")).toBeNull()
  })

  it("abre o preenchimento manual quando o CEP não existe", async () => {
    mockViaCep({ erro: true })
    render(<FounderCaptureForm startExpanded />)

    fireEvent.changeText(screen.getByPlaceholderText("00000-000"), "99999999")

    await waitFor(() =>
      expect(screen.getByText("CEP não encontrado. Confira os campos abaixo.")).toBeTruthy(),
    )
    expect(screen.getByPlaceholderText("Sua cidade")).toBeTruthy()
  })

  it("abre o preenchimento manual quando o ViaCEP está fora do ar", async () => {
    // O caminho que mantém a conversão de pé: sem rede, o cadastro continua.
    mockViaCep(null, { falhar: true })
    render(<FounderCaptureForm startExpanded />)

    fireEvent.changeText(screen.getByPlaceholderText("00000-000"), "05424150")

    await waitFor(() =>
      expect(
        screen.getByText("Não conseguimos consultar o CEP agora. Preencha os campos abaixo."),
      ).toBeTruthy(),
    )
    expect(screen.getByPlaceholderText("Sua cidade")).toBeTruthy()
  })

  it("pede o bairro quando o município tem CEP único", async () => {
    // ViaCEP devolve bairro vazio nesses municípios; o bairro nunca bloqueia o envio.
    mockViaCep({ ...VIACEP_OK, bairro: "" })
    render(<FounderCaptureForm startExpanded />)

    fireEvent.changeText(screen.getByPlaceholderText("00000-000"), "78890000")

    await waitFor(() => expect(screen.getByPlaceholderText("Seu bairro")).toBeTruthy())
  })
})

describe("envio", () => {
  it("manda telefone em E.164, CEP só com dígitos e a origem do endereço", async () => {
    mockViaCep(VIACEP_OK)
    render(<FounderCaptureForm startExpanded />)

    fireEvent.changeText(screen.getByPlaceholderText("Seu melhor e-mail *"), "joana@exemplo.com")
    fireEvent.changeText(screen.getByPlaceholderText("WhatsApp (opcional)"), "84999990000")
    fireEvent.changeText(screen.getByPlaceholderText("00000-000"), "05424150")

    await waitFor(() => expect(screen.getByText("Pinheiros")).toBeTruthy())

    // A partir daqui o fetch responde como a API de leads.
    global.fetch = jest.fn().mockResolvedValue({
      ok: true, status: 200, json: async () => ({ data: { queuePosition: 7 } }),
    }) as unknown as typeof fetch

    fireEvent.press(screen.getByText("Concordo em receber comunicações", { exact: false }))
    await act(async () => {
      fireEvent.press(screen.getByLabelText("Garantir minha vaga"))
    })

    const [, init] = (global.fetch as jest.Mock).mock.calls[0]
    const enviado = JSON.parse(init.body)

    expect(enviado.phone).toBe("+5584999990000")
    expect(enviado.cep).toBe("05424150")
    expect(enviado.neighborhood).toBe("Pinheiros")
    expect(enviado.addressSource).toBe("CEP")
    expect(enviado.consentVersion).toBe("marketing-v1.0")
  })
})
