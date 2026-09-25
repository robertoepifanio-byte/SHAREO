/** @jest-environment node */
/**
 * Textos públicos sem afirmação falsa nem prova social inventada.
 *
 * Checklist do go-live de 01/10/2026, área "produto e jornada", item 2: as páginas
 * que a mídia paga vai abrir afirmavam o que o código não sustenta (depoimento,
 * base de usuários, verificação para todos, chat de suporte, estatísticas de
 * "dicas", fóruns, eventos, categorias que o seed não cadastra). O porquê de cada
 * frase está no campo `motivo` de PROIBIDOS.
 *
 * Verificação por FONTE, no mesmo padrão de reservas-cta-pagamento.test.ts: as
 * páginas são Server Components e o app é outro pacote. O teste varre o site, o
 * e-mail transacional (`lib/`) E o app (regra de transcrição: o que sai de um lado
 * sai do outro), sem olhar comentários — este arquivo e os fontes citam as frases
 * ao explicar a troca.
 *
 * 🪤 O que ele NÃO prova: só reprova as frases conhecidas. Uma afirmação falsa NOVA,
 * com outras palavras, passa. Ele fecha as portas por onde já passamos; a revisão
 * de texto antes do lançamento continua sendo humana.
 *
 * Quando quebrar: ou uma frase proibida voltou (tire), ou o recurso passou a
 * existir de verdade (ex.: chat de suporte construído) — nesse caso remova a
 * entrada de PROIBIDOS, com o motivo escrito no commit.
 */
import fs   from "node:fs"
import path from "node:path"

const RAIZ = path.resolve(__dirname, "../../..")

const PASTAS = ["app", "components", "lib", "apps/mobile/app", "apps/mobile/components"]

const IGNORADO = /(^|\/)(node_modules|__tests__|\.next)\//

/** Fontes .ts/.tsx, sem testes, dependências nem build. Pasta ausente lança (não vira cobertura silenciosa). */
const listarFontes = (dir: string): string[] =>
  (fs.readdirSync(path.join(RAIZ, dir), { recursive: true }) as string[])
    .map((f) => f.split(path.sep).join("/"))
    .filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f) && !IGNORADO.test(f))
    .map((f) => `${dir}/${f}`)

/** Comentários fora: o que interessa é o texto que chega na tela. */
function semComentarios(fonte: string): string {
  return fonte
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((l) => (/^\s*\/\//.test(l) ? "" : l))
    .join("\n")
}

const ler = (arquivo: string) => fs.readFileSync(path.join(RAIZ, arquivo), "utf8")

/** arquivo → código sem comentários, lido UMA vez. */
const FONTES = new Map(PASTAS.flatMap(listarFontes).map((arquivo) => [arquivo, semComentarios(ler(arquivo))] as const))

function codigoDe(arquivo: string): string {
  const codigo = FONTES.get(arquivo)
  if (codigo === undefined) throw new Error(`arquivo fora da varredura: ${arquivo}`)
  return codigo
}

/** Frase proibida + por que ela é falsa hoje. */
const PROIBIDOS: { padrao: RegExp; motivo: string }[] = [
  { padrao: /milhares de pessoas/i, motivo: "prova social sem número real (produção não tem base de usuários)" },
  { padrao: /Marcelo S\./, motivo: "depoimento fictício da página /ganhar" },
  { padrao: /testimonial/i, motivo: "bloco de depoimento: não há depoimento real para exibir" },
  { padrao: /7 dias por semana/i, motivo: "o atendimento é de segunda a sexta, das 09h às 17h" },
  { padrao: /Equipe ativa/i, motivo: "promessa de disponibilidade que a operação não cumpre" },
  { padrao: /Chat de Suporte/i, motivo: "não existe chat com a equipe; o chat é entre locatário e proprietário, na reserva" },
  { padrao: /Suporte direto dentro da plataforma/i, motivo: "idem: o suporte é por e-mail" },
  { padrao: /suporte pelo chat/i, motivo: "idem: o e-mail transacional mandava o usuário a um chat de suporte que não existe" },
  { padrao: /passa por verificação de identidade antes de alugar/i, motivo: "só quando o anúncio exige (requireIdVerification)" },
  { padrao: /medeia o caso em até \d+ dias úteis/i, motivo: "prazo de disputa depende de decisão do fundador e contradia a Ajuda (5 dias úteis)" },
  { padrao: /usuários verificados/i, motivo: "a verificação de identidade é opcional; nem todo usuário é verificado" },
  { padrao: /Reembolso integral se você cancelar/i, motivo: "o reembolso é de 100% menos a taxa do pagamento (lib/cancellationPolicy)" },
  { padrao: /Item protegido durante a locação/i, motivo: "a Ajuda diz que o ShareO não contrata seguro; o que existe é a disputa analisada pela equipe" },
  { padrao: /\d+\s*[×x]\s*mais\s+(reservas|visualizações|contatos|rápido)/i, motivo: "estatística de desempenho sem fonte" },
  { padrao: /\d+%\s*mais\s+reservas/i, motivo: "estatística de desempenho sem fonte" },
  { padrao: /aparecem?\s+primeiro\s+na\s+busca/i, motivo: "a busca não ordena por nota" },
  { padrao: /aumenta\s+sua\s+posição\s+nos\s+resultados/i, motivo: "a busca não ordena por tempo de resposta" },
  { padrao: /dicas de quem já (aluga|faz)/i, motivo: "sugere anfitriões com histórico de sucesso; produção tem 0 itens" },
  { padrao: /você recupera o valor do item/i, motivo: "a calculadora é uma simulação (sem taxa, sem ocupação real), não uma garantia de retorno" },
  { padrao: /Fóruns e grupos de discussão/i, motivo: "não existe fórum nem grupo de discussão na plataforma" },
  { padrao: /Eventos e campanhas de consumo/i, motivo: "não há eventos nem campanhas" },
  { padrao: /Espaço para feedback/i, motivo: "não há tela nem rota de feedback; o canal é o e-mail do suporte" },
]

describe("textos públicos sem afirmação falsa", () => {
  it("a varredura encontra as telas conhecidas (não-vácuo)", () => {
    // Se a listagem quebrar, todos os testes abaixo passariam sem olhar nada.
    for (const esperado of [
      "app/suporte/page.tsx",
      "app/ganhar/page.tsx",
      "app/comunidade/page.tsx",
      "components/layout/AppFooter.tsx",
      "lib/email.ts",
      "apps/mobile/app/suporte.tsx",
      "apps/mobile/app/ganhar.tsx",
      "apps/mobile/components/layout/AppFooter.tsx",
    ]) {
      expect({ esperado, varrido: FONTES.has(esperado) }).toEqual({ esperado, varrido: true })
    }
    expect(FONTES.size).toBeGreaterThan(100)
  })

  it.each(PROIBIDOS.map((p) => [String(p.padrao), p] as const))(
    "nenhum texto de tela (site, e-mail ou app) contém %s",
    (_nome, { padrao, motivo }) => {
      const achados = [...FONTES].filter(([, codigo]) => padrao.test(codigo)).map(([arquivo]) => arquivo)
      // O motivo vai na mensagem: quem vê o vermelho precisa saber por que a frase é falsa.
      expect({ motivo, achados }).toEqual({ motivo, achados: [] })
    },
  )
})

describe("o que a página diz no lugar", () => {
  const HORARIO = "de segunda a sexta, das 09h às 17h"

  /** A mensagem de falha cita só o arquivo e o trecho (`toContain` numa string imprimiria o arquivo inteiro). */
  const emTela = (arquivo: string, trecho: string) => ({ arquivo, trecho, achou: codigoDe(arquivo).includes(trecho) })
  const esperaEmTela = (arquivo: string, trecho: string) =>
    expect(emTela(arquivo, trecho)).toEqual({ arquivo, trecho, achou: true })

  it.each([
    "app/suporte/page.tsx",
    "apps/mobile/app/suporte.tsx",
  ])("%s informa o e-mail e o horário reais do atendimento", (arquivo) => {
    esperaEmTela(arquivo, "suporte@shareo.com.br")
    esperaEmTela(arquivo, HORARIO)
  })

  it("o e-mail de reserva cancelada manda para o e-mail do suporte, não para um chat", () => {
    esperaEmTela("lib/email.ts", "suporte@shareo.com.br")
  })

  it.each([
    "app/itens/[id]/page.tsx",
    "app/reservas/sucesso/page.tsx",
    "apps/mobile/app/itens/[id]/index.tsx",
  ])("%s descreve o suporte com o horário real", (arquivo) => {
    esperaEmTela(arquivo, `Suporte ShareO ${HORARIO}`)
  })

  it.each([
    "app/itens/[id]/page.tsx",
    "apps/mobile/app/itens/[id]/index.tsx",
  ])("%s troca 'item protegido' pela disputa que existe", (arquivo) => {
    esperaEmTela(arquivo, "Disputa analisada pela equipe ShareO se algo der errado")
  })

  it.each([
    "app/ganhar/page.tsx",
    "apps/mobile/app/ganhar.tsx",
  ])("%s diz que a verificação de identidade é uma opção do anunciante", (arquivo) => {
    esperaEmTela(arquivo, "você pode exigir que o locatário tenha a identidade verificada")
  })

  it.each([
    "app/anunciar/dicas/page.tsx",
    "apps/mobile/app/anunciar/dicas.tsx",
  ])("%s só promete tempo e taxa de resposta depois das primeiras reservas", (arquivo) => {
    // O selo exige 3 respostas em 90 dias (lib/ownerStats.ts); a taxa só existe com reservas.
    esperaEmTela(arquivo, "Depois das primeiras reservas, seu tempo e sua taxa de resposta aparecem no anúncio")
  })
})

describe("calculadora de ganhos só simula categorias que existem", () => {
  /** Slugs cadastrados pelo seed (o que a produção terá depois do seed de categorias). */
  const slugsDoSeed = [...ler("prisma/seed.ts").matchAll(/\{\s*slug:\s*"([^"]+)",\s*name:\s*"[^"]+",\s*icon:/g)].map((m) => m[1])

  /** Chaves de CATEGORY_DATA: `slug: { name: ...` ou `"slug": { name: ...`. */
  function slugsDaCalculadora(arquivo: string): string[] {
    const bloco = codigoDe(arquivo).match(/CATEGORY_DATA[^=]*=\s*\{([\s\S]*?)\n\}/)
    expect(bloco).not.toBeNull()
    return [...bloco![1].matchAll(/^\s*"?([a-z][a-z-]*)"?\s*:\s*\{\s*name:/gm)].map((m) => m[1])
  }

  it("o seed traz as categorias (não-vácuo)", () => {
    expect(slugsDoSeed.length).toBeGreaterThanOrEqual(6)
  })

  it.each([
    "app/ganhar/_EarningsCalc.tsx",
    "apps/mobile/app/ganhar.tsx",
  ])("%s não simula categoria fora do seed", (arquivo) => {
    const slugs = slugsDaCalculadora(arquivo)
    expect(slugs.length).toBeGreaterThanOrEqual(6)
    const inexistentes = slugs.filter((s) => !slugsDoSeed.includes(s))
    expect(inexistentes).toEqual([])
  })
})
