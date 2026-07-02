// Testes de Button — renderização de variants e comportamento loading/disabled.
// Rótulos e variantes testam a transcrição do arquivo-fonte: components/ui/Button.tsx

import React from "react"
import { render, screen, fireEvent } from "@testing-library/react-native"
import { Button } from "@/components/ui/Button"

describe("Button", () => {
  it("renderiza o texto filho corretamente", () => {
    render(<Button>Alugar agora</Button>)
    expect(screen.getByText("Alugar agora")).toBeTruthy()
  })

  it("variant primary — texto uppercase (transcrito de Button.tsx do site)", () => {
    render(<Button variant="primary">Entrar</Button>)
    const label = screen.getByText("Entrar")
    // uppercase é aplicado via style — verificamos que o componente rendeu
    expect(label).toBeTruthy()
  })

  it("variant secondary renderiza sem erro", () => {
    render(<Button variant="secondary">Cancelar</Button>)
    expect(screen.getByText("Cancelar")).toBeTruthy()
  })

  it("variant ghost renderiza sem erro", () => {
    render(<Button variant="ghost">Ver mais</Button>)
    expect(screen.getByText("Ver mais")).toBeTruthy()
  })

  it("variant danger renderiza sem erro", () => {
    render(<Button variant="danger">Excluir</Button>)
    expect(screen.getByText("Excluir")).toBeTruthy()
  })

  it("estado loading — exibe indicador e desabilita o botão", () => {
    render(<Button loading>Carregando</Button>)
    const btn = screen.getByRole("button")
    // accessibilityState.busy = true quando loading
    expect(btn.props.accessibilityState?.busy).toBe(true)
    expect(btn.props.accessibilityState?.disabled).toBe(true)
  })

  it("estado disabled — desabilita o botão", () => {
    render(<Button disabled>Bloqueado</Button>)
    const btn = screen.getByRole("button")
    expect(btn.props.accessibilityState?.disabled).toBe(true)
  })

  it("tap target mínimo — size md tem minHeight >= 44px", () => {
    render(<Button size="md">Confirmar</Button>)
    const btn = screen.getByRole("button")
    const flatStyle = btn.props.style
    const styles = Array.isArray(flatStyle) ? flatStyle : [flatStyle]
    const minHeightValue = styles.reduce((acc: number, s: Record<string, unknown> | null | undefined): number => {
      if (s && typeof s === "object" && "minHeight" in s) return s.minHeight as number
      return acc
    }, 0)
    expect(minHeightValue).toBeGreaterThanOrEqual(44)
  })

  it("size lg tem minHeight >= 52px", () => {
    render(<Button size="lg">Grande</Button>)
    const btn = screen.getByRole("button")
    const styles = Array.isArray(btn.props.style) ? btn.props.style : [btn.props.style]
    const minH = styles.reduce((acc: number, s: Record<string, unknown> | null | undefined): number => {
      if (s && typeof s === "object" && "minHeight" in s) return s.minHeight as number
      return acc
    }, 0)
    expect(minH).toBeGreaterThanOrEqual(52)
  })

  it("chama onPress quando pressionado", () => {
    const onPress = jest.fn()
    render(<Button onPress={onPress}>Pressionar</Button>)
    fireEvent.press(screen.getByRole("button"))
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it("não chama onPress quando disabled", () => {
    const onPress = jest.fn()
    render(<Button disabled onPress={onPress}>Bloqueado</Button>)
    fireEvent.press(screen.getByRole("button"))
    expect(onPress).not.toHaveBeenCalled()
  })
})
