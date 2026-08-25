// Fonte: components/layout/AppHeader.tsx (site) e apps/mobile/components/layout/AppHeader.tsx
// RÓTULOS VERBATIM — alteração no componente sem atualizar aqui quebra o CI.

import React from "react"
import { render, screen } from "@testing-library/react-native"
import { AppHeader } from "@/components/layout/AppHeader"

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
}))

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}))

describe("AppHeader — paridade de rótulos com o site", () => {
  it('exibe "Entrar" (VERBATIM) quando isLoggedIn=false', () => {
    render(
      <AppHeader menuOpen={false} onToggleMenu={jest.fn()} isLoggedIn={false} />,
    )
    expect(screen.getByText("Entrar")).toBeTruthy()
  })

  it('não exibe "Entrar" quando isLoggedIn=true (padrão)', () => {
    render(
      <AppHeader menuOpen={false} onToggleMenu={jest.fn()} isLoggedIn={true} />,
    )
    expect(screen.queryByText("Entrar")).toBeNull()
  })

  it('accessibilityLabel do botão "Entrar" está correto (VERBATIM)', () => {
    render(
      <AppHeader menuOpen={false} onToggleMenu={jest.fn()} isLoggedIn={false} />,
    )
    expect(screen.getByLabelText("Entrar")).toBeTruthy()
  })
})
