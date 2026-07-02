// Testes de ThemeToggle — 3 estados, rótulos exatos.
// Fonte: components/layout/ThemeToggle.tsx (variant="menu") do site.

import React from "react"
import { render, screen, fireEvent } from "@testing-library/react-native"
import { ThemeToggle } from "@/components/ui/ThemeToggle"

describe("ThemeToggle", () => {
  it('renderiza os 3 rótulos exatos: "Claro", "Sistema", "Escuro"', () => {
    render(<ThemeToggle value="system" onChange={jest.fn()} />)
    expect(screen.getByText("Claro")).toBeTruthy()
    expect(screen.getByText("Sistema")).toBeTruthy()
    expect(screen.getByText("Escuro")).toBeTruthy()
  })

  it("renderiza exatamente 3 botões", () => {
    render(<ThemeToggle value="system" onChange={jest.fn()} />)
    const radios = screen.getAllByRole("radio")
    expect(radios).toHaveLength(3)
  })

  it('estado "light" — opção "Claro" está marcada', () => {
    render(<ThemeToggle value="light" onChange={jest.fn()} />)
    const claro = screen.getByLabelText("Claro")
    expect(claro.props.accessibilityState?.checked).toBe(true)
  })

  it('estado "system" — opção "Sistema" está marcada', () => {
    render(<ThemeToggle value="system" onChange={jest.fn()} />)
    const sistema = screen.getByLabelText("Sistema")
    expect(sistema.props.accessibilityState?.checked).toBe(true)
  })

  it('estado "dark" — opção "Escuro" está marcada', () => {
    render(<ThemeToggle value="dark" onChange={jest.fn()} />)
    const escuro = screen.getByLabelText("Escuro")
    expect(escuro.props.accessibilityState?.checked).toBe(true)
  })

  it('quando "light" ativo, "Sistema" e "Escuro" estão desmarcados', () => {
    render(<ThemeToggle value="light" onChange={jest.fn()} />)
    expect(screen.getByLabelText("Sistema").props.accessibilityState?.checked).toBe(false)
    expect(screen.getByLabelText("Escuro").props.accessibilityState?.checked).toBe(false)
  })

  it('pressionar "Escuro" chama onChange com "dark"', () => {
    const onChange = jest.fn()
    render(<ThemeToggle value="light" onChange={onChange} />)
    fireEvent.press(screen.getByLabelText("Escuro"))
    expect(onChange).toHaveBeenCalledWith("dark")
  })

  it('pressionar "Sistema" chama onChange com "system"', () => {
    const onChange = jest.fn()
    render(<ThemeToggle value="light" onChange={onChange} />)
    fireEvent.press(screen.getByLabelText("Sistema"))
    expect(onChange).toHaveBeenCalledWith("system")
  })

  it('pressionar "Claro" chama onChange com "light"', () => {
    const onChange = jest.fn()
    render(<ThemeToggle value="dark" onChange={onChange} />)
    fireEvent.press(screen.getByLabelText("Claro"))
    expect(onChange).toHaveBeenCalledWith("light")
  })

  it("tap target mínimo — cada opção tem height >= 44px", () => {
    render(<ThemeToggle value="system" onChange={jest.fn()} />)
    const radios = screen.getAllByRole("radio")
    radios.forEach((radio) => {
      const styles = Array.isArray(radio.props.style)
        ? radio.props.style
        : [radio.props.style]
      const h = styles.reduce((acc, s) => {
        if (s && typeof s === "object" && "height" in s) return s.height
        return acc
      }, 0)
      expect(h).toBeGreaterThanOrEqual(44)
    })
  })
})
