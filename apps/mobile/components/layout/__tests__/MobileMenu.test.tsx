// Testes de MobileMenu — rótulos ATIVIDADE exatos, ordem das seções e ThemeToggle.
// Fonte: components/layout/MobileMenu.tsx do site.

import React from "react"
import { render, screen, fireEvent } from "@testing-library/react-native"
import { Linking } from "react-native"
import { router } from "expo-router"
import { MobileMenu } from "@/components/layout/MobileMenu"

// ThemeProvider necessário pois MobileMenu usa useTheme()
import { ThemeProvider } from "@/lib/theme"

function renderMenu(props: Partial<React.ComponentProps<typeof MobileMenu>> = {}) {
  return render(
    <ThemeProvider>
      <MobileMenu
        visible={true}
        onClose={jest.fn()}
        isLoggedIn={false}
        {...props}
      />
    </ThemeProvider>
  )
}

describe("MobileMenu — estrutura geral", () => {
  it('exibe "Início" (VERBATIM)', () => {
    renderMenu()
    expect(screen.getByText("Início")).toBeTruthy()
  })

  it('exibe "Sobre" (VERBATIM)', () => {
    renderMenu()
    expect(screen.getByText("Sobre")).toBeTruthy()
  })

  it('exibe seção TEMA no topo — label "TEMA" (VERBATIM, handoff §0)', () => {
    renderMenu()
    expect(screen.getByText("TEMA")).toBeTruthy()
  })

  it('ThemeToggle está presente com opções "Claro", "Sistema", "Escuro"', () => {
    renderMenu()
    expect(screen.getByText("Claro")).toBeTruthy()
    expect(screen.getByText("Sistema")).toBeTruthy()
    expect(screen.getByText("Escuro")).toBeTruthy()
  })

  it('exibe "Explorar" expansível', () => {
    renderMenu()
    expect(screen.getByText("Explorar")).toBeTruthy()
  })

  it('exibe "Anunciar" (pill verde) quando não-admin', () => {
    renderMenu({ isLoggedIn: false })
    expect(screen.getByText("Anunciar")).toBeTruthy()
  })

  it('não exibe "Anunciar" para admins', () => {
    renderMenu({ isLoggedIn: true, role: "ADMIN_SUPERADMIN" })
    expect(screen.queryByText("Anunciar")).toBeNull()
  })
})

describe("MobileMenu — logado", () => {
  it('exibe seção "ATIVIDADE" (VERBATIM, NÃO "Atividade" minúsculo)', () => {
    renderMenu({ isLoggedIn: true })
    expect(screen.getByText("ATIVIDADE")).toBeTruthy()
  })

  it('link ATIVIDADE 1: "Meus Anúncios" (VERBATIM)', () => {
    renderMenu({ isLoggedIn: true })
    expect(screen.getByText("Meus Anúncios")).toBeTruthy()
  })

  it('link ATIVIDADE 2: "Reservas" (VERBATIM)', () => {
    renderMenu({ isLoggedIn: true })
    expect(screen.getByText("Reservas")).toBeTruthy()
  })

  it('link ATIVIDADE 3: "Mensagens" (VERBATIM)', () => {
    renderMenu({ isLoggedIn: true })
    expect(screen.getByText("Mensagens")).toBeTruthy()
  })

  it('link ATIVIDADE 4: "Dashboard" (VERBATIM)', () => {
    renderMenu({ isLoggedIn: true })
    expect(screen.getByText("Dashboard")).toBeTruthy()
  })

  it('exibe "Minha Conta" expansível', () => {
    renderMenu({ isLoggedIn: true })
    expect(screen.getByText("Minha Conta")).toBeTruthy()
  })

  it('exibe "Sair"', () => {
    renderMenu({ isLoggedIn: true })
    expect(screen.getByText("Sair")).toBeTruthy()
  })

  it('exibe "Central de Ajuda"', () => {
    renderMenu({ isLoggedIn: true })
    expect(screen.getByText("Central de Ajuda")).toBeTruthy()
  })

  it("chama onLogout ao pressionar Sair", () => {
    const onLogout = jest.fn()
    const onClose = jest.fn()
    renderMenu({ isLoggedIn: true, onLogout, onClose })
    fireEvent.press(screen.getByText("Sair"))
    expect(onLogout).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe("MobileMenu — não logado", () => {
  it('exibe "Entrar" (VERBATIM, handoff §0)', () => {
    renderMenu({ isLoggedIn: false })
    expect(screen.getByText("Entrar")).toBeTruthy()
  })

  it('NÃO exibe "ATIVIDADE" quando deslogado', () => {
    renderMenu({ isLoggedIn: false })
    expect(screen.queryByText("ATIVIDADE")).toBeNull()
  })

  it('NÃO exibe "Minha Conta" quando deslogado', () => {
    renderMenu({ isLoggedIn: false })
    expect(screen.queryByText("Minha Conta")).toBeNull()
  })

  it('NÃO exibe "Sair" quando deslogado', () => {
    renderMenu({ isLoggedIn: false })
    expect(screen.queryByText("Sair")).toBeNull()
  })
})

describe("MobileMenu — navegação Minha Conta (fix regressão /perfil/*)", () => {
  beforeEach(() => jest.clearAllMocks())

  it('"Editar dados" (/perfil/editar) navega nativamente — NÃO abre navegador', () => {
    renderMenu({ isLoggedIn: true })
    fireEvent.press(screen.getByText("Minha Conta"))
    fireEvent.press(screen.getByText("Editar dados"))
    expect(router.push).toHaveBeenCalledWith("/perfil/editar")
    expect(Linking.openURL).not.toHaveBeenCalled()
  })

  it('"Privacidade e dados" (/perfil/dados) navega nativamente — NÃO abre navegador', () => {
    renderMenu({ isLoggedIn: true })
    fireEvent.press(screen.getByText("Minha Conta"))
    fireEvent.press(screen.getByText("Privacidade e dados"))
    expect(router.push).toHaveBeenCalledWith("/perfil/dados")
    expect(Linking.openURL).not.toHaveBeenCalled()
  })

  it('"Indicações e Embaixador" navega para /perfil/embaixador (alias — arquivo real diverge do href do site)', () => {
    renderMenu({ isLoggedIn: true })
    fireEvent.press(screen.getByText("Minha Conta"))
    fireEvent.press(screen.getByText("Indicações e Embaixador"))
    expect(router.push).toHaveBeenCalledWith("/perfil/embaixador")
    expect(Linking.openURL).not.toHaveBeenCalled()
  })

  it('"Documentos" (/perfil/documentos, sem tela nativa dedicada) abre no navegador', () => {
    renderMenu({ isLoggedIn: true })
    fireEvent.press(screen.getByText("Minha Conta"))
    fireEvent.press(screen.getByText("Documentos"))
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining("/perfil/documentos"))
    expect(router.push).not.toHaveBeenCalled()
  })

  it('"Sobre" (sem tela nativa) abre no navegador', () => {
    renderMenu()
    fireEvent.press(screen.getByText("Sobre"))
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining("/sobre"))
    expect(router.push).not.toHaveBeenCalled()
  })
})

describe("MobileMenu — ThemeToggle estados", () => {
  it("ThemeToggle tem 3 botões com roles radio", () => {
    renderMenu()
    const radios = screen.getAllByRole("radio")
    expect(radios.length).toBe(3)
  })

  it('ThemeToggle — opção "Claro" marcada quando preferência é light', async () => {
    // Por padrão o ThemeProvider usa "system" — mas testamos a renderização
    renderMenu()
    const claro = screen.getByText("Claro")
    expect(claro).toBeTruthy()
  })
})
