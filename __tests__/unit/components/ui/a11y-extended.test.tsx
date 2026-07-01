/**
 * Testes de acessibilidade (jest-axe / WCAG 2.1 AA) para componentes UI
 * ainda não cobertos em accessibility.test.tsx.
 *
 * Componentes cobertos:
 *  - Select     (components/ui/Select.tsx)
 *  - Textarea   (components/ui/Textarea.tsx)
 *  - RatingStars (components/ui/RatingStars.tsx)
 *  - Avatar     (components/ui/Avatar.tsx)
 *  - StatCard   (components/ui/StatCard.tsx)
 *  - Skeleton   (components/ui/Skeleton.tsx)
 *
 * Nota: jest-axe ^9.0.0 está instalado e toHaveNoViolations está registrado
 * globalmente em jest.setup.ts.
 */

import React from "react"
import { render, screen } from "@testing-library/react"
import { axe } from "jest-axe"
import { Select } from "@/components/ui/Select"
import { Textarea } from "@/components/ui/Textarea"
import { RatingStars } from "@/components/ui/RatingStars"
import { Avatar } from "@/components/ui/Avatar"
import { StatCard } from "@/components/ui/StatCard"
import { Skeleton } from "@/components/ui/Skeleton"

// Mock de next/image para evitar dependências de loader no ambiente de teste
jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img {...props} />
  ),
}))

// ---------------------------------------------------------------------------
// Select
// ---------------------------------------------------------------------------

describe("Select — acessibilidade", () => {
  it("renderiza select acessível com label associado", () => {
    render(
      <Select label="Categoria">
        <option value="ferramentas">Ferramentas</option>
      </Select>,
    )
    expect(screen.getByLabelText(/categoria/i)).toBeInTheDocument()
  })

  it("label está associado ao select via htmlFor/id", () => {
    render(
      <Select label="Estado">
        <option value="SP">São Paulo</option>
      </Select>,
    )
    const select = screen.getByLabelText(/estado/i)
    expect(select.tagName).toBe("SELECT")
  })

  it("exibe mensagem de erro quando error está presente", () => {
    render(
      <Select label="Condição" error="Selecione uma condição">
        <option value="">--</option>
      </Select>,
    )
    expect(screen.getByRole("alert")).toHaveTextContent("Selecione uma condição")
  })

  it("campo com error tem aria-invalid=true", () => {
    render(
      <Select label="Categoria" error="Campo obrigatório">
        <option value="">--</option>
      </Select>,
    )
    expect(screen.getByLabelText(/categoria/i)).toHaveAttribute("aria-invalid", "true")
  })

  it("campo sem error tem aria-invalid=false", () => {
    render(
      <Select label="Categoria">
        <option value="ferramentas">Ferramentas</option>
      </Select>,
    )
    expect(screen.getByLabelText(/categoria/i)).toHaveAttribute("aria-invalid", "false")
  })

  it("select com label simples — não tem violações WCAG", async () => {
    const { container } = render(
      <Select label="Categoria">
        <option value="ferramentas">Ferramentas</option>
        <option value="eletronicos">Eletrônicos</option>
      </Select>,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it("select com error — não tem violações WCAG", async () => {
    const { container } = render(
      <Select label="Condição" error="Condição inválida">
        <option value="">--</option>
      </Select>,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it("select com placeholder — não tem violações WCAG", async () => {
    const { container } = render(
      <Select label="Estado" placeholder="Selecione um estado">
        <option value="SP">São Paulo</option>
        <option value="RJ">Rio de Janeiro</option>
      </Select>,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it("select obrigatório — não tem violações WCAG", async () => {
    const { container } = render(
      <Select label="Tipo" required>
        <option value="PF">Pessoa Física</option>
        <option value="PJ">Pessoa Jurídica</option>
      </Select>,
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})

// ---------------------------------------------------------------------------
// Textarea
// ---------------------------------------------------------------------------

describe("Textarea — acessibilidade", () => {
  it("renderiza textarea acessível com label associado", () => {
    render(<Textarea label="Descrição" />)
    expect(screen.getByLabelText(/descrição/i)).toBeInTheDocument()
  })

  it("label associado via htmlFor/id", () => {
    render(<Textarea label="Observações" />)
    const textarea = screen.getByLabelText(/observações/i)
    expect(textarea.tagName).toBe("TEXTAREA")
  })

  it("exibe mensagem de erro quando error está presente", () => {
    render(<Textarea label="Descrição" error="Descrição muito curta" />)
    expect(screen.getByRole("alert")).toHaveTextContent("Descrição muito curta")
  })

  it("campo com error tem aria-invalid=true", () => {
    render(<Textarea label="Descrição" error="Erro" />)
    expect(screen.getByLabelText(/descrição/i)).toHaveAttribute("aria-invalid", "true")
  })

  it("textarea com label — não tem violações WCAG", async () => {
    const { container } = render(
      <Textarea label="Descrição do item" placeholder="Descreva o item..." />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it("textarea com error — não tem violações WCAG", async () => {
    const { container } = render(
      <Textarea label="Descrição" error="Mínimo 20 caracteres" />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it("textarea com helper text — não tem violações WCAG", async () => {
    const { container } = render(
      <Textarea label="Mensagem" helper="Máximo 2000 caracteres" />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it("textarea obrigatório — não tem violações WCAG", async () => {
    const { container } = render(<Textarea label="Nota de cancelamento" required />)
    expect(await axe(container)).toHaveNoViolations()
  })
})

// ---------------------------------------------------------------------------
// RatingStars
// ---------------------------------------------------------------------------

describe("RatingStars — acessibilidade", () => {
  it("tem aria-label descritivo com o valor da nota", () => {
    render(<RatingStars rating={4.3} />)
    const el = screen.getByLabelText(/4\.3 estrelas/i)
    expect(el).toBeInTheDocument()
  })

  it("inclui contagem de avaliações no aria-label quando count está presente", () => {
    render(<RatingStars rating={4.0} count={27} />)
    expect(screen.getByLabelText(/27 avalia/i)).toBeInTheDocument()
  })

  it("estrelas visuais têm aria-hidden=true (não duplicam informação)", () => {
    const { container } = render(<RatingStars rating={4.0} />)
    const stars = container.querySelector("[aria-hidden='true']")
    expect(stars).toBeInTheDocument()
  })

  it("nota 5 sem count — não tem violações WCAG", async () => {
    const { container } = render(<RatingStars rating={5} />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it("nota 3.7 com count=15 — não tem violações WCAG", async () => {
    const { container } = render(<RatingStars rating={3.7} count={15} />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it("nota 0 — não tem violações WCAG", async () => {
    const { container } = render(<RatingStars rating={0} />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it("showValue=true — não tem violações WCAG", async () => {
    const { container } = render(<RatingStars rating={4.2} showValue count={8} />)
    expect(await axe(container)).toHaveNoViolations()
  })
})

// ---------------------------------------------------------------------------
// Avatar
// ---------------------------------------------------------------------------

describe("Avatar — acessibilidade", () => {
  it("exibe a inicial do nome quando não há src", () => {
    render(<Avatar name="Maria Silva" />)
    expect(screen.getByText("M")).toBeInTheDocument()
  })

  it("exibe '?' quando name é null", () => {
    render(<Avatar name={null} />)
    expect(screen.getByText("?")).toBeInTheDocument()
  })

  it("exibe '?' quando name é undefined", () => {
    render(<Avatar name={undefined} />)
    expect(screen.getByText("?")).toBeInTheDocument()
  })

  it("exibe imagem quando src está presente", () => {
    render(
      <Avatar
        name="João Lima"
        src="https://storage.supabase.co/avatars/joao.jpg"
      />,
    )
    const img = screen.getByRole("img")
    expect(img).toHaveAttribute("alt", "João Lima")
  })

  it("imagem usa name como alt text", () => {
    render(<Avatar name="Ana Costa" src="https://example.com/ana.jpg" />)
    expect(screen.getByRole("img")).toHaveAttribute("alt", "Ana Costa")
  })

  it("initial (sem src) — não tem violações WCAG", async () => {
    const { container } = render(<Avatar name="Pedro Souza" size={40} />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it("com foto (src presente) — não tem violações WCAG", async () => {
    const { container } = render(
      <Avatar name="Ana Costa" src="https://example.com/foto.jpg" size={40} />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})

// ---------------------------------------------------------------------------
// StatCard
// ---------------------------------------------------------------------------

describe("StatCard — acessibilidade", () => {
  it("renderiza o valor e o label", () => {
    render(<StatCard label="Total de aluguéis" value="42" />)
    expect(screen.getByText("42")).toBeInTheDocument()
    expect(screen.getByText("Total de aluguéis")).toBeInTheDocument()
  })

  it("renderiza o sub-texto quando fornecido", () => {
    render(<StatCard label="Receita" value="R$ 1.200" sub="+15% este mês" />)
    expect(screen.getByText("+15% este mês")).toBeInTheDocument()
  })

  it("accent primary — não tem violações WCAG", async () => {
    const { container } = render(<StatCard label="Aluguéis" value="10" accent="primary" />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it("accent brand — não tem violações WCAG", async () => {
    const { container } = render(<StatCard label="Receita" value="R$ 500" accent="brand" />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it("com sub-texto — não tem violações WCAG", async () => {
    const { container } = render(
      <StatCard label="Avaliação média" value="4.8" sub="Baseado em 23 avaliações" accent="success" />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

describe("Skeleton — acessibilidade", () => {
  it("tem aria-hidden=true (decorativo, não lido pelo leitor de tela)", () => {
    const { container } = render(<Skeleton className="h-4 w-full" />)
    const el = container.firstChild as HTMLElement
    expect(el).toHaveAttribute("aria-hidden", "true")
  })

  it("skeleton padrão — não tem violações WCAG", async () => {
    const { container } = render(<Skeleton className="h-4 w-32" />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it("skeleton em container com aria-busy e role=status — não tem violações WCAG", async () => {
    // role="status" é o padrão correto para regiões de carregamento:
    // permite aria-label e aria-busy sem violação de aria-prohibited-attr.
    const { container } = render(
      <div role="status" aria-busy="true" aria-label="Carregando itens...">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>,
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})
