// Testes de ScreenHeader — rótulos exatos, acessibilidade e slot direito.
// Rótulos são a trava anti-invenção: "Voltar" é o padrão; variações explícitas
// como "Voltar para Anunciar" (anunciar/dicas.tsx) precisam de backLabel.

import React from "react"
import { Text } from "react-native"
import { render, screen, fireEvent } from "@testing-library/react-native"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { ScreenHeader, getScreenHeaderHeight } from "@/components/layout/ScreenHeader"

// expo-router já está mockado em jest.setup.js (router.back = jest.fn())
// SafeAreaProvider necessário pois ScreenHeader usa useSafeAreaInsets()

function renderHeader(props: Parameters<typeof ScreenHeader>[0]) {
  return render(
    <SafeAreaProvider>
      <ScreenHeader {...props} />
    </SafeAreaProvider>
  )
}

describe("ScreenHeader", () => {
  describe("título", () => {
    it('renderiza o título passado via prop', () => {
      renderHeader({ title: "Termos de Uso" })
      expect(screen.getByText("Termos de Uso")).toBeTruthy()
    })

    it('renderiza título com caracteres especiais (Política de Privacidade)', () => {
      renderHeader({ title: "Política de Privacidade" })
      expect(screen.getByText("Política de Privacidade")).toBeTruthy()
    })
  })

  describe("botão voltar", () => {
    it('renderiza o caractere ‹ como ícone de volta', () => {
      renderHeader({ title: "Teste" })
      expect(screen.getByText("‹")).toBeTruthy()
    })

    it('accessibilityLabel padrão é "Voltar"', () => {
      renderHeader({ title: "Teste" })
      expect(screen.getByRole("button", { name: "Voltar" })).toBeTruthy()
    })

    it('accessibilityLabel customizável via backLabel (ex: anunciar/dicas)', () => {
      renderHeader({ title: "Dicas para Anfitriões", backLabel: "Voltar para Anunciar" })
      expect(screen.getByRole("button", { name: "Voltar para Anunciar" })).toBeTruthy()
      expect(screen.queryByRole("button", { name: "Voltar" })).toBeNull()
    })

    it('chama router.back() por padrão ao pressionar voltar', () => {
      const { router } = require("expo-router")
      renderHeader({ title: "Teste" })
      fireEvent.press(screen.getByRole("button", { name: "Voltar" }))
      expect(router.back).toHaveBeenCalled()
    })

    it('chama onBack customizado quando fornecido', () => {
      const onBack = jest.fn()
      renderHeader({ title: "Teste", onBack })
      fireEvent.press(screen.getByRole("button", { name: "Voltar" }))
      expect(onBack).toHaveBeenCalledTimes(1)
    })

    it('onBack customizado NÃO chama router.back()', () => {
      const { router } = require("expo-router")
      router.back.mockClear()
      const onBack = jest.fn()
      renderHeader({ title: "Teste", onBack })
      fireEvent.press(screen.getByRole("button", { name: "Voltar" }))
      expect(router.back).not.toHaveBeenCalled()
    })
  })

  describe("slot direito", () => {
    it('não renderiza slot direito quando right não é passado', () => {
      renderHeader({ title: "Teste" })
      expect(screen.queryByTestId("header-right")).toBeNull()
      // Garante que não há filhos extras além do backBtn e do título
    })

    it('renderiza conteúdo do slot right quando passado', () => {
      renderHeader({
        title:  "Meus Anúncios",
        right: <Text testID="novo-btn">Novo anúncio</Text>,
      })
      expect(screen.getByTestId("novo-btn")).toBeTruthy()
      expect(screen.getByText("Novo anúncio")).toBeTruthy()
    })
  })

  describe("getScreenHeaderHeight", () => {
    it('fontScale=1: altura = insetsTop + 65 (8 + 44 + 12 + 1)', () => {
      // max(44, ceil(18 × 1 × 1.4)=25) = 44
      expect(getScreenHeaderHeight(0, 1)).toBe(65)
      expect(getScreenHeaderHeight(44, 1)).toBe(109) // insets.top típico iOS
    })

    it('fontScale=2: conteúdo expande além do minHeight', () => {
      // ceil(18 × 2 × 1.4) = 51 > 44
      expect(getScreenHeaderHeight(0, 2)).toBe(72) // 0 + 8 + 51 + 12 + 1
    })

    it('fontScale=1.5: conteúdo ainda é controlado pelo minHeight=44', () => {
      // ceil(18 × 1.5 × 1.4) = ceil(37.8) = 38 < 44 → minHeight vence
      expect(getScreenHeaderHeight(0, 1.5)).toBe(65)
    })

    it('resultado é sempre inteiro (sem meio-pixel)', () => {
      const h = getScreenHeaderHeight(47, 1.3)
      expect(Number.isInteger(h)).toBe(true)
    })
  })
})
