// Testes de Avatar — foto vs. inicial.
// Fonte: components/ui/Avatar.tsx (foto OU inicial num círculo).

import React from "react"
import { render, screen } from "@testing-library/react-native"
import { Avatar } from "@/components/ui/Avatar"

describe("Avatar", () => {
  it("exibe a inicial quando não há imageUrl", () => {
    render(<Avatar name="Roberto Silva" />)
    // inicial = primeiro caractere maiúsculo
    expect(screen.getByText("R")).toBeTruthy()
  })

  it("inicial de nome com espaço — usa primeiro caractere", () => {
    render(<Avatar name="Ana Costa" />)
    expect(screen.getByText("A")).toBeTruthy()
  })

  it("fallback '?' quando name é null", () => {
    render(<Avatar name={null} />)
    expect(screen.getByText("?")).toBeTruthy()
  })

  it("fallback '?' quando name é string vazia", () => {
    render(<Avatar name="" />)
    expect(screen.getByText("?")).toBeTruthy()
  })

  it("quando imageUrl está presente, não exibe a inicial", () => {
    render(<Avatar name="Maria" imageUrl="https://example.com/foto.jpg" />)
    // A inicial não deve aparecer — o componente exibe a Image
    expect(screen.queryByText("M")).toBeNull()
  })

  it("size sm tem width e height 32px (testID=avatar-32)", () => {
    render(<Avatar name="Test" size="sm" />)
    const circle = screen.getByTestId("avatar-32")
    const styles = Array.isArray(circle.props.style) ? circle.props.style : [circle.props.style]
    const dims = styles.reduce((acc, s) => ({ ...acc, ...(s ?? {}) }), {} as Record<string, number>)
    expect(dims.width).toBe(32)
    expect(dims.height).toBe(32)
  })

  it("size md tem width e height 44px — tap target mínimo (testID=avatar-44)", () => {
    render(<Avatar name="Test" size="md" />)
    const circle = screen.getByTestId("avatar-44")
    const styles = Array.isArray(circle.props.style) ? circle.props.style : [circle.props.style]
    const dims = styles.reduce((acc, s) => ({ ...acc, ...(s ?? {}) }), {} as Record<string, number>)
    expect(dims.width).toBe(44)
    expect(dims.height).toBe(44)
  })

  it("size lg tem width e height 72px (testID=avatar-72)", () => {
    render(<Avatar name="Test" size="lg" />)
    const circle = screen.getByTestId("avatar-72")
    const styles = Array.isArray(circle.props.style) ? circle.props.style : [circle.props.style]
    const dims = styles.reduce((acc, s) => ({ ...acc, ...(s ?? {}) }), {} as Record<string, number>)
    expect(dims.width).toBe(72)
    expect(dims.height).toBe(72)
  })

  it("size xl tem width e height 88px (testID=avatar-88)", () => {
    render(<Avatar name="Test" size="xl" />)
    const circle = screen.getByTestId("avatar-88")
    const styles = Array.isArray(circle.props.style) ? circle.props.style : [circle.props.style]
    const dims = styles.reduce((acc, s) => ({ ...acc, ...(s ?? {}) }), {} as Record<string, number>)
    expect(dims.width).toBe(88)
    expect(dims.height).toBe(88)
  })

  it("accessibilityLabel usa o name fornecido", () => {
    render(<Avatar name="João" />)
    expect(screen.getByLabelText("João")).toBeTruthy()
  })
})
