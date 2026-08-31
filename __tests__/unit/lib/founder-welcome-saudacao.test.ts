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
    const html = founderWelcomeHtml("Roberto", 1, url)
    expect(html).toContain("Olá, Roberto!")
    expect(html).toContain("Você está na lista!")
  })

  it("OMITE o nome quando não há — não inventa", () => {
    const html = founderWelcomeHtml("", 4, url)
    expect(html).toContain("Olá!")
    expect(html).not.toContain("Olá, !")
    // A comemoração é para todo mundo; o que some é o nome, não a mensagem.
    expect(html).toContain("Você está na lista!")
  })

  it("mantém a posição na fila nos dois casos", () => {
    expect(founderWelcomeHtml("", 4, url)).toContain("#4")
    expect(founderWelcomeHtml("Ana", 7, url)).toContain("#7")
  })

  it("sempre inclui o link de descadastro (RFC 8058, exigência do Gmail)", () => {
    expect(founderWelcomeHtml("", 1, url)).toContain(url)
  })
})

/**
 * A promessa do e-mail tem que descrever o rollout REAL, que é por cidade.
 *
 * A redação original ("avisaremos quando abrirmos", "assim que o ShareO abrir")
 * foi escrita antes da estratégia de pilotos e descrevia um lançamento nacional
 * simultâneo. Com abertura cidade a cidade, quem não está na primeira região
 * não conclui "é por etapas" — conclui que foi esquecido. E essa é justamente a
 * pessoa de quem o programa depende para ENCAMINHAR o e-mail.
 */
describe("founderWelcomeHtml — promessa de abertura", () => {
  const url  = "https://www.shareo.com.br/api/founders/unsubscribe?email=a&token=b"
  const html = founderWelcomeHtml("Roberto", 2, url)

  it("diz que a abertura é por cidade", () => {
    expect(html).toContain("por cidade")
    expect(html).toContain("abrirem na sua cidade")
  })

  it("explica o critério da ordem — é o que dá à pessoa motivo para convidar amigos", () => {
    expect(html).toContain("as regiões com mais interessados entram")
  })

  it("não promete abertura única nacional", () => {
    expect(html).not.toContain("quando abrirmos —")
    expect(html).not.toContain("assim que o ShareO")
  })

  it("posiciona o número como ordem de ENTRADA na lista, não de acesso ao produto", () => {
    // A ordem de convite é definida pela cidade escolhida: um #2 nacional pode
    // ser chamado depois de um #300 da cidade-piloto. O número só é honesto se
    // descrever quando a pessoa entrou.
    expect(html).toContain("interessado a entrar na lista")
  })
})
