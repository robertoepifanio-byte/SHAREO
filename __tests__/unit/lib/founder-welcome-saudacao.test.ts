import { founderWelcomeHtml } from "@/lib/email"

/**
 * O campo Nome é OPCIONAL no formulário da campanha, então lead sem nome é o
 * caso comum, não a exceção.
 *
 * Antes, a rota preenchia a lacuna com `email.split("@")[0]` e o e-mail saía
 * com "Você está na lista, joao.silva92!" ou "Você está na lista, contato!".
 * Observado ao vivo em 31/08/2026, quando o navegador preencheu o e-mail
 * automaticamente e a saudação virou "Você está na lista, Curso!".
 */
describe("founderWelcomeHtml — saudação", () => {
  const url = "https://www.shareo.com.br/api/founders/unsubscribe?email=a&token=b"

  it("usa o nome quando o lead informou", () => {
    expect(founderWelcomeHtml("Roberto", 1, url)).toContain("Você está na lista, Roberto!")
  })

  it("OMITE o nome quando não há — não inventa", () => {
    const html = founderWelcomeHtml("", 4, url)
    expect(html).toContain("Você está na lista!")
    expect(html).not.toContain("lista, !")
  })

  it("mantém a posição na fila nos dois casos", () => {
    expect(founderWelcomeHtml("", 4, url)).toContain("#4")
    expect(founderWelcomeHtml("Ana", 7, url)).toContain("#7")
  })

  it("sempre inclui o link de descadastro (RFC 8058, exigência do Gmail)", () => {
    expect(founderWelcomeHtml("", 1, url)).toContain(url)
  })
})
