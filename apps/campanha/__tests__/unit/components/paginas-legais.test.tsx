import React from "react"
import { render, screen } from "@testing-library/react"
import {
  LEGAL_ENTITY,
  POLICY_UPDATED_AT,
  POLITICAS_UPDATED_AT,
  PoliticasConteudo,
  PrivacidadeConteudo,
  TermosConteudo,
} from "@shareo/legal"

/**
 * Os três documentos legais vêm de @shareo/legal e são renderizados por DOIS
 * apps: o marketplace e esta landing. O que este teste protege não é a redação
 * — é a fiação.
 *
 * O modo de falhar aqui é silencioso: se alguém renomear uma prop, o número
 * some do documento e a página continua renderizando normalmente. Termos
 * publicados sem a taxa, ou sem o teto por transação, são um problema de CDC
 * que nenhum erro de build acusa.
 */
const VALORES = {
  feePct: "15",
  feeLabel: "15%",
  payoutLabel: "3 dias",
  maxPorTransacao: "R$ 500,00",
  maxLabel: "R$ 500",
}

describe("Termos de Uso", () => {
  it("interpola taxa, janela de repasse e teto por transação", () => {
    render(
      <TermosConteudo
        atualizadoEm={POLICY_UPDATED_AT}
        feePct={VALORES.feePct}
        payoutLabel={VALORES.payoutLabel}
        maxPorTransacao={VALORES.maxPorTransacao}
      />,
    )

    const clausula = screen.getByText(/Da Intermediação e do Pagamento das Locações/i).parentElement
    expect(clausula?.textContent).toContain(`${VALORES.feePct}%`)
    expect(clausula?.textContent).toContain(VALORES.payoutLabel)
    expect(clausula?.textContent).toContain(VALORES.maxPorTransacao)
  })

  it("identifica a pessoa jurídica (CDC art. 44 / Decreto 7.962 art. 2º, I)", () => {
    render(
      <TermosConteudo
        atualizadoEm={POLICY_UPDATED_AT}
        feePct={VALORES.feePct}
        payoutLabel={VALORES.payoutLabel}
        maxPorTransacao={VALORES.maxPorTransacao}
      />,
    )

    expect(screen.getByText(LEGAL_ENTITY.razaoSocial)).toBeInTheDocument()
    expect(screen.getByText(LEGAL_ENTITY.cnpj)).toBeInTheDocument()
  })
})

describe("Política de Privacidade", () => {
  it("cita a LGPD e identifica o CONTROLADOR (art. 9º, I)", () => {
    render(<PrivacidadeConteudo atualizadoEm={POLICY_UPDATED_AT} />)

    expect(screen.getByText(/13\.709\/2018/)).toBeInTheDocument()
    expect(screen.getByText(/controlador dos dados pessoais/i)).toBeInTheDocument()
    expect(screen.getByText(LEGAL_ENTITY.cnpj)).toBeInTheDocument()
  })
})

describe("Políticas", () => {
  function renderPoliticas(hrefCentralAjuda: string | null) {
    return render(
      <PoliticasConteudo
        atualizadoEm={POLITICAS_UPDATED_AT}
        feeLabel={VALORES.feeLabel}
        maxLabel={VALORES.maxLabel}
        payoutLabel={VALORES.payoutLabel}
        hrefCentralAjuda={hrefCentralAjuda}
      />,
    )
  }

  it("interpola taxa, teto e janela de repasse", () => {
    const { container } = renderPoliticas("/ajuda")
    const texto = container.textContent ?? ""

    expect(texto).toContain(VALORES.feeLabel)
    expect(texto).toContain(VALORES.maxLabel)
    expect(texto).toContain(VALORES.payoutLabel)
  })

  /**
   * A campanha não tem /ajuda. A frase precisa continuar inteira — o que não
   * pode acontecer é o texto sumir junto com o link.
   */
  it("sem Central de Ajuda, mantém a frase e não cria link quebrado", () => {
    const { container } = renderPoliticas(null)

    expect(screen.getByText(/central de ajuda/i)).toBeInTheDocument()
    expect(container.querySelector('a[href="/ajuda"]')).toBeNull()
  })

  it("com Central de Ajuda, o link aponta para ela", () => {
    const { container } = renderPoliticas("/ajuda")
    expect(container.querySelector('a[href="/ajuda"]')).not.toBeNull()
  })
})
