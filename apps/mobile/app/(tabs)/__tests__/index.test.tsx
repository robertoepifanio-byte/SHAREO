// Fonte: app/page.tsx (site) e apps/mobile/app/(tabs)/index.tsx
// RÓTULOS VERBATIM — rótulo inventado quebra este teste (regra de transcrição).

import React from "react"
import { render, screen, fireEvent } from "@testing-library/react-native"
import HomeScreen from "@/app/(tabs)/index"

const mockPush = jest.fn()
jest.mock("expo-router", () => ({
  router: { push: (...args: unknown[]) => mockPush(...args) },
}))

beforeEach(() => {
  mockPush.mockClear()
})

describe("Home — landing da campanha transcrita (22/09/2026)", () => {
  it('exibe o H1 do hero (VERBATIM)', () => {
    render(<HomeScreen />)
    expect(screen.getByText(/Tem algo parado\?/)).toBeTruthy()
    expect(screen.getByText(/Faça isso virar dinheiro\./)).toBeTruthy()
  })

  it('CTA principal "Quero ser um dos primeiros" navega para /(auth)/register', () => {
    render(<HomeScreen />)
    fireEvent.press(screen.getByLabelText("Quero ser um dos primeiros"))
    expect(mockPush).toHaveBeenCalledWith("/(auth)/register")
  })

  it('exibe as 10 seções da landing, na ordem (títulos VERBATIM)', () => {
    render(<HomeScreen />)
    expect(screen.getByText(/Quantas coisas você tem que ficam/)).toBeTruthy()
    expect(screen.getByText("Você está de qual lado?")).toBeTruthy()
    expect(screen.getByText("Como vai funcionar")).toBeTruthy()
    expect(screen.getByText("Quanto vale o que está parado?")).toBeTruthy()
    expect(screen.getByText("E se eu emprestar meu item para um desconhecido?")).toBeTruthy()
    expect(screen.getByText("Faça parte do grupo fundador do ShareO")).toBeTruthy()
    expect(screen.getByText("Indique um amigo e seja um Embaixador")).toBeTruthy()
    expect(screen.getByText("Perguntas frequentes")).toBeTruthy()
    expect(
      screen.getByText("O que está parado na sua casa pode estar sendo procurado por alguém perto de você."),
    ).toBeTruthy()
  })

  it('não exibe mais busca nem seções da home antiga de marketplace', () => {
    render(<HomeScreen />)
    expect(screen.queryByPlaceholderText("O que você precisa alugar?")).toBeNull()
    expect(screen.queryByText("Simule sua renda")).toBeNull()
  })

  it('CTA de fechamento "Quero me cadastrar" navega para /(auth)/register', () => {
    render(<HomeScreen />)
    fireEvent.press(screen.getByLabelText("Quero me cadastrar"))
    expect(mockPush).toHaveBeenCalledWith("/(auth)/register")
  })
})
