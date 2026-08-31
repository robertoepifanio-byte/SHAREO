import { isTestRecipient } from "@/lib/email"

/**
 * O guard existe para a suíte automatizada não gastar cota real da Resend.
 *
 * Cada caso abaixo é um endereço que EXISTE no repositório hoje. A versão
 * anterior casava por sufixo da string (`endsWith("@shareo.test")`) e cobria só
 * o primeiro bloco — os outros dois enviavam de verdade, todo dia, até a cota
 * estourar e segurar o e-mail de boas-vindas da campanha.
 */
describe("isTestRecipient", () => {
  describe("reconhece os domínios de teste em uso", () => {
    it.each([
      ["@shareo.test — já era coberto",            "locatario@shareo.test"],
      ["@shareo-test.com — fixtures do E2E",       "proprietario.fixture@shareo-test.com"],
      ["subdomínio — robô de validação diária",    "sim-042@daily-sim.shareo.test"],
      ["maiúsculas não escapam",                   "Fixture@Shareo-Test.COM"],
    ])("%s", (_caso, address) => {
      expect(isTestRecipient(address)).toBe(true)
    })
  })

  describe("não captura destinatário real", () => {
    it.each([
      ["gmail",                                    "roberto.epifanio@gmail.com"],
      ["domínio da própria plataforma",            "alguem@shareo.com.br"],
      // Trava contra a regressão inversa: um domínio que apenas TERMINA com o
      // texto do domínio de teste não é subdomínio dele. Sem o ponto separador,
      // "evilshareo.test" passaria — e um terceiro poderia registrar esse nome
      // para que e-mails reais fossem silenciosamente descartados.
      ["nome coladinho não é subdomínio",          "atacante@evilshareo.test"],
      ["sem arroba",                               "invalido"],
    ])("%s", (_caso, address) => {
      expect(isTestRecipient(address)).toBe(false)
    })
  })

  describe("lista de destinatários", () => {
    it("pula só quando TODOS são de teste", () => {
      expect(isTestRecipient(["a@shareo.test", "b@shareo-test.com"])).toBe(true)
    })

    it("envia de verdade se UM for real — não silenciar e-mail de gente", () => {
      expect(isTestRecipient(["a@shareo.test", "roberto@gmail.com"])).toBe(false)
    })

    it("lista vazia não é destino de teste", () => {
      expect(isTestRecipient([])).toBe(false)
    })
  })
})
