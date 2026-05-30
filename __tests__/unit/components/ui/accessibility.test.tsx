/**
 * P2-33 — Testes de acessibilidade (jest-axe / WCAG 2.1 AA) para componentes UI
 *
 * Componentes cobertos neste arquivo:
 *  - Button     (components/ui/Button.tsx)          — existe
 *  - Input      (components/ui/Input.tsx)            — existe
 *  - EmptyState (components/shared/EmptyState.tsx)   — existe
 *
 * Componentes ausentes (pulados):
 *  - ItemCard   — coberto em __tests__/unit/components/items/ItemCard.test.tsx (P2-43)
 *  - SearchBar  — não existe em components/ (glob "components/**\/*earch*" não retornou nada)
 *
 * Nota: jest-axe ^9.0.0 está instalado e toHaveNoViolations está registrado
 * globalmente em jest.setup.ts.
 */

import React from "react"
import { render, screen } from "@testing-library/react"
import { axe } from "jest-axe"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { EmptyState } from "@/components/shared/EmptyState"

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------

describe("Button — acessibilidade", () => {
  it("renderiza um elemento com role button", () => {
    render(<Button>Alugar agora</Button>)
    expect(screen.getByRole("button", { name: /alugar agora/i })).toBeInTheDocument()
  })

  it("botão desabilitado tem atributo disabled", () => {
    render(<Button disabled>Indisponível</Button>)
    expect(screen.getByRole("button")).toBeDisabled()
  })

  it("botão em loading tem aria-busy=true", () => {
    render(<Button loading>Carregando</Button>)
    expect(screen.getByRole("button")).toHaveAttribute("aria-busy", "true")
  })

  it("variante primary não tem violações WCAG", async () => {
    const { container } = render(<Button variant="primary">Confirmar</Button>)
    expect(await axe(container)).toHaveNoViolations()
  })

  it("variante secondary não tem violações WCAG", async () => {
    const { container } = render(<Button variant="secondary">Cancelar</Button>)
    expect(await axe(container)).toHaveNoViolations()
  })

  it("variante destructive não tem violações WCAG", async () => {
    const { container } = render(<Button variant="destructive">Remover item</Button>)
    expect(await axe(container)).toHaveNoViolations()
  })

  it("variante ghost não tem violações WCAG", async () => {
    const { container } = render(<Button variant="ghost">Ver mais</Button>)
    expect(await axe(container)).toHaveNoViolations()
  })

  it("botão disabled não tem violações WCAG", async () => {
    const { container } = render(<Button disabled>Indisponível</Button>)
    expect(await axe(container)).toHaveNoViolations()
  })

  it("botão loading não tem violações WCAG", async () => {
    const { container } = render(<Button loading>Carregando…</Button>)
    expect(await axe(container)).toHaveNoViolations()
  })
})

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

describe("Input — acessibilidade", () => {
  it("renderiza um input acessível com label associado", () => {
    render(<Input label="E-mail" type="email" />)
    const input = screen.getByLabelText(/e-mail/i)
    expect(input).toBeInTheDocument()
  })

  it("label está associado ao input via htmlFor/id", () => {
    render(<Input label="Nome completo" />)
    const input = screen.getByLabelText(/nome completo/i)
    expect(input.tagName).toBe("INPUT")
  })

  it("exibe mensagem de erro quando error está presente", () => {
    render(<Input label="CPF" error="CPF inválido" />)
    expect(screen.getByRole("alert")).toHaveTextContent("CPF inválido")
  })

  it("campo com error tem aria-invalid=true", () => {
    render(<Input label="Telefone" error="Telefone obrigatório" />)
    const input = screen.getByLabelText(/telefone/i)
    expect(input).toHaveAttribute("aria-invalid", "true")
  })

  it("campo sem error tem aria-invalid=false", () => {
    render(<Input label="Cidade" />)
    const input = screen.getByLabelText(/cidade/i)
    expect(input).toHaveAttribute("aria-invalid", "false")
  })

  it("com label e sem erro — não tem violações WCAG", async () => {
    const { container } = render(<Input label="Busca" type="search" />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it("com label e mensagem de erro — não tem violações WCAG", async () => {
    const { container } = render(
      <Input label="E-mail" type="email" error="E-mail inválido" />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it("campo obrigatório (required) — não tem violações WCAG", async () => {
    const { container } = render(<Input label="Senha" type="password" required />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it("com helper text — não tem violações WCAG", async () => {
    const { container } = render(
      <Input label="CEP" helper="Somente números, ex.: 01310-100" />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})

// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------

describe("EmptyState — acessibilidade", () => {
  it("renderiza o título", () => {
    render(<EmptyState title="Nenhum item encontrado" />)
    expect(screen.getByText("Nenhum item encontrado")).toBeInTheDocument()
  })

  it("renderiza descrição quando fornecida", () => {
    render(
      <EmptyState
        title="Nenhum resultado"
        description="Tente ampliar o raio de busca."
      />,
    )
    expect(screen.getByText("Tente ampliar o raio de busca.")).toBeInTheDocument()
  })

  it("renderiza CTA quando action está presente", () => {
    render(
      <EmptyState
        title="Nenhum anúncio"
        action={<button>Criar primeiro anúncio</button>}
      />,
    )
    expect(screen.getByRole("button", { name: /criar primeiro anúncio/i })).toBeInTheDocument()
  })

  it("somente título — não tem violações WCAG", async () => {
    const { container } = render(<EmptyState title="Sem resultados" />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it("título + descrição — não tem violações WCAG", async () => {
    const { container } = render(
      <EmptyState
        title="Sem resultados"
        description="Nenhum item corresponde à sua busca."
      />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it("título + descrição + CTA (botão) — não tem violações WCAG", async () => {
    const { container } = render(
      <EmptyState
        title="Você ainda não tem anúncios"
        description="Comece anunciando um item que você não usa."
        action={<button type="button">Criar anúncio</button>}
      />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it("título + CTA (link) — não tem violações WCAG", async () => {
    const { container } = render(
      <EmptyState
        title="Nenhum favorito salvo"
        action={<a href="/itens">Explorar itens</a>}
      />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})
