/**
 * Central de Ajuda: a regra da extensão de prazo, no site e no espelho do app.
 *
 * Por que existe: a Ajuda foi alinhada ao código em 20/08/2026 e quatro dias
 * depois o ATOR-03 mudou o comportamento — a extensão deixou de valer na
 * aprovação e passou a valer só depois de paga. A resposta do FAQ continuou
 * prometendo que "o pagamento é processado na hora", nos DOIS arquivos, e
 * ninguém foi avisado: quem pegou foi leitura manual.
 *
 * O app já tinha trava (`apps/mobile/lib/__tests__/screens-ajuda-pagamento.test.tsx`).
 * O site não tinha nenhuma — e o par site↔app não tinha quem garantisse que as
 * duas cópias continuassem iguais. As duas lacunas são o que este arquivo fecha.
 *
 * 🪤 Verificação por FONTE, não por render: `app/ajuda/page.tsx` monta o texto
 * em `buildSections(v)`, que não é exportado, e a página é Server Component.
 * Mesmo motivo — e mesmo padrão — de `IdentificacaoPrestador.test.tsx`.
 *
 * 🪤 A duplicação entre os dois arquivos é DELIBERADA: o app não importa do
 * pacote web (o `@/*` do apps/mobile/tsconfig.json resolve só dentro de
 * apps/mobile) e a regra de transcrição literal do CLAUDE.md manda copiar.
 * Logo o remédio contra deriva é comparar, não extrair.
 */
import fs from "node:fs"
import path from "node:path"

const RAIZ = path.resolve(__dirname, "../../..")
const lerFonte = (arquivo: string) => fs.readFileSync(path.join(RAIZ, arquivo), "utf8")

const SITE = "app/ajuda/page.tsx"
const APP = "apps/mobile/app/ajuda.tsx"

/**
 * A resposta do FAQ da extensão, extraída da fonte.
 *
 * Ancorada na pergunta e não em número de linha: a Ajuda é editada com
 * frequência e um índice fixo apodrece na primeira inserção acima dela.
 */
function respostaDaExtensao(arquivo: string): string {
  const fonte = lerFonte(arquivo)
  const marca = "Posso pedir para estender o prazo de um aluguel que já está em andamento?"
  const i = fonte.indexOf(marca)
  if (i === -1) throw new Error(`pergunta da extensão não encontrada em ${arquivo}`)
  // A resposta é a string literal que abre logo depois da pergunta.
  const trecho = fonte.slice(i + marca.length)
  const m = trecho.match(/a:\s*"([^"]+)"/)
  if (!m) throw new Error(`resposta da extensão não encontrada em ${arquivo}`)
  return m[1]
}

describe("Ajuda — regra da extensão de prazo", () => {
  it.each([SITE, APP])("%s não promete que a extensão é cobrada na hora", (arquivo) => {
    expect(respostaDaExtensao(arquivo)).not.toMatch(/processado na hora|cobrado na hora/i)
  })

  it.each([SITE, APP])("%s diz que o prazo só muda depois do pagamento", (arquivo) => {
    expect(respostaDaExtensao(arquivo)).toMatch(/só muda depois que esse pagamento é confirmado/)
  })

  it("site e app dizem exatamente a mesma coisa", () => {
    // Deriva entre as cópias é silenciosa: quem edita o site não abre o app, e
    // o usuário do app lê a versão velha sem que nada acuse.
    expect(respostaDaExtensao(APP)).toBe(respostaDaExtensao(SITE))
  })
})
