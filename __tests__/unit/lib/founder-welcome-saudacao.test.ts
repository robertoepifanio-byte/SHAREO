import { founderWelcomeHtml } from "@/lib/email"

/**
 * Asserção sobre e-mail tem de olhar o TEXTO, nao a marcacao: as frases do
 * template tem <strong> no meio, e as cores hex do style (#003366, #007B3C)
 * casam com qualquer padrao que procure "#" seguido de digito.
 */
const semTags = (html: string) => html.replace(/<[^>]+>/g, "")

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
    const html = founderWelcomeHtml("Roberto", url)
    expect(html).toContain("Olá, Roberto!")
    expect(html).toContain("Você está na lista!")
  })

  it("OMITE o nome quando não há — não inventa", () => {
    const html = founderWelcomeHtml("", url)
    expect(html).toContain("Olá!")
    expect(html).not.toContain("Olá, !")
    // A comemoração é para todo mundo; o que some é o nome, não a mensagem.
    expect(html).toContain("Você está na lista!")
  })

  /**
   * Removido em 08/09/2026 (decisao do fundador): o numero sugere uma ordem de
   * atendimento que nao existe — a abertura e por CIDADE, nao por posicao.
   */
  it("nao cita a posicao na fila", () => {
    // O "#N" e o que de fato saiu; "fila"/"posicao" barram a redacao voltar
    // por outra formulacao. Sem o strip, o padrao casaria com as cores hex.
    expect(semTags(founderWelcomeHtml("", url))).not.toMatch(/#\s*\d|fila|posição/i)
  })

  it("sempre inclui o link de descadastro (RFC 8058, exigência do Gmail)", () => {
    expect(founderWelcomeHtml("", url)).toContain(url)
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
  const html = founderWelcomeHtml("Roberto", url)

  it("diz que a abertura é por cidade", () => {
    // Checa o SENTIDO, nao a redacao: que a abertura e faseada e que o aviso e
    // sobre a cidade DA PESSOA. A frase ja mudou tres vezes num dia; fixar o
    // literal so avisaria que o texto mudou, nunca que a promessa mudou.
    const texto = semTags(html)
    expect(texto).toContain("As cidades abrem por etapas")
    expect(texto).toContain("na sua cidade")
  })

  it("explica o critério da ordem — é o que dá à pessoa motivo para convidar amigos", () => {
    expect(html).toContain("as regiões com mais interessados entram")
  })

  it("não publica prazo — SLA em copy vira oferta vinculante (CDC art. 30)", () => {
    // O aviso previo existe como promessa, mas o job que o dispara ainda nao
    // foi construido. Numero em e-mail e pior que em pagina: fica guardado na
    // caixa de entrada como prova do que foi prometido.
    expect(html).not.toMatch(/dois dias|48\s*h|48 horas|\d+\s*dias antes/i)
  })

  it("não promete abertura única nacional", () => {
    expect(html).not.toContain("quando abrirmos —")
    expect(html).not.toContain("assim que o ShareO")
  })
})
