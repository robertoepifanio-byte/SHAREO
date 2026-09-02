/**
 * CTA da lista de reservas: pago não manda mais para o pagamento.
 *
 * 🪤 Relato do Raimundo em 02/09/2026, rodando o roteiro de teste: com a
 * reserva já paga e confirmada, o botão verde continuava "💳 Ver pagamento" e
 * levava a uma tela sem nada a fazer. A causa não era o rótulo — era a
 * CONSULTA: a lista não selecionava `paymentStatus`, e `status` continua
 * CONFIRMED depois do pagamento, até a retirada (mark_active). O CTA não tinha
 * como saber a diferença.
 *
 * O que o locatário precisa nesse momento é o código de 6 dígitos que o
 * proprietário vai pedir na entrega (`pickupToken`, exibido em /reservas/[id]).
 *
 * Verificação por FONTE: a página é Server Component e a lógica do CTA vive num
 * IIFE dentro do JSX, sem export — mesmo padrão de ajuda-extensao-espelho.
 */
import fs   from "node:fs"
import path from "node:path"

const RAIZ = path.resolve(__dirname, "../../..")
const ler  = (arquivo: string) => fs.readFileSync(path.join(RAIZ, arquivo), "utf8")

const LISTA_SITE = "app/reservas/page.tsx"
const LISTA_APP  = "apps/mobile/app/(tabs)/reservas.tsx"
const API        = "app/api/bookings/route.ts"

describe("CTA da lista de reservas", () => {
  it.each([LISTA_SITE, LISTA_APP])("%s não oferece 'Ver pagamento' para reserva paga", (arquivo) => {
    // 🪤 Comentários fora: este arquivo cita "Ver pagamento" ao explicar o
    // defeito, e a primeira versão do teste reprovou o próprio comentário.
    // Mesma armadilha de casar com a MENÇÃO em vez do código.
    const linhas = ler(arquivo)
      .split("\n")
      .map((l) => (/^\s*(\/\/|\*|\/\*)/.test(l) ? "" : l))
    const ondeAparece = linhas
      .map((l, i) => (l.includes("Ver pagamento") ? i : -1))
      .filter((i) => i >= 0)
    expect(ondeAparece.length).toBeGreaterThan(0)

    // O guard pode estar na própria linha (app) ou na condição imediatamente
    // acima (site, onde o rótulo fica no corpo do `else if`).
    for (const i of ondeAparece) {
      const vizinhanca = linhas.slice(Math.max(0, i - 2), i + 1).join("\n")
      expect(vizinhanca).toMatch(/paymentStatus\s*!==\s*"PAID"/)
    }
  })

  it.each([LISTA_SITE, LISTA_APP])("%s leva o locatário ao código de retirada depois de pago", (arquivo) => {
    expect(ler(arquivo)).toContain("Ver código de retirada")
  })

  it("a consulta do site traz paymentStatus", () => {
    // Sem o campo na consulta, o guard acima seria `undefined !== "PAID"` —
    // sempre verdadeiro, e o defeito voltaria calado.
    expect(ler(LISTA_SITE)).toMatch(/paymentStatus:\s*true/)
  })

  it("a API que o app consome devolve paymentStatus", () => {
    expect(ler(API)).toMatch(/paymentStatus:\s*true/)
  })

  it("o código de retirada realmente existe na tela de destino", () => {
    // O CTA promete um código; se a tela deixar de exibi-lo, a promessa cai.
    expect(ler("app/reservas/[id]/page.tsx")).toContain("Código de retirada")
    expect(ler("app/reservas/[id]/page.tsx")).toMatch(/pickupToken:\s*true/)
  })
})
