// Fonte: components/home/FounderCaptureForm.tsx (site) e apps/mobile/components/home/FounderCaptureForm.tsx
// Cobre o achado do Thiago (13/09): e-mail duplicado precisa aparecer junto do
// campo de e-mail, com o formulário inteiro continuando visível — não mais
// trocando a tela toda por um aviso solto.

import React from "react"
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react-native"
import { FounderCaptureForm } from "@/components/home/FounderCaptureForm"

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
}))

beforeEach(() => {
  jest.clearAllMocks()
  global.fetch = jest.fn()
})

afterEach(() => {
  jest.restoreAllMocks()
})

/** Preenche o mínimo (e-mail + cidade/UF + intenção + consentimento) e envia. */
async function fillAndSubmit() {
  fireEvent.changeText(screen.getByLabelText("E-mail"), "teste@example.com")
  fireEvent.press(screen.getByText("Prefiro informar cidade e estado"))
  fireEvent.changeText(screen.getByLabelText("Cidade"), "Recife")
  fireEvent.changeText(screen.getByLabelText("Estado (UF)"), "PE")
  fireEvent.press(screen.getByLabelText("Quero anunciar"))
  fireEvent.press(screen.getByLabelText("Concordo em receber comunicações sobre o lançamento"))
  await act(async () => {
    fireEvent.press(screen.getByLabelText("Garantir minha vaga"))
  })
}

describe("FounderCaptureForm mobile — e-mail duplicado (paridade com o site)", () => {
  it("409 mostra o aviso junto do campo de e-mail, sem esconder o formulário", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      status: 409,
      ok: false,
      json: async () => ({ error: { code: "LEAD_ALREADY_EXISTS" } }),
    })

    render(<FounderCaptureForm startExpanded />)
    await fillAndSubmit()

    await waitFor(() => {
      expect(screen.getByText("Este e-mail já estava na lista.")).toBeTruthy()
    })
    expect(
      screen.getByText(/Não criamos um cadastro novo\./),
    ).toBeTruthy()

    // O formulário continua no ar — campo de e-mail e botão de envio ainda
    // existem na árvore, diferente da versão antiga que trocava tudo por um
    // aviso solto.
    expect(screen.getByLabelText("E-mail")).toBeTruthy()
    expect(screen.getByLabelText("Garantir minha vaga")).toBeTruthy()
  })
})
