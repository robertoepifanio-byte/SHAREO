/**
 * Central de Ajuda: o site e o app dizem a MESMA coisa, exceto onde a
 * diferença é declarada aqui.
 *
 * 🪤 Por que existe: as duas cópias têm 68 FAQs cada, escritas à mão, e a
 * trava anterior (`ajuda-extensao-espelho.test.ts`) cobria UMA delas. Desde que
 * o arquivo do app nasceu (09/07/2026), três commits editaram a Ajuda só no
 * site — inclusive a migração para o Stripe Connect, que deixou o app
 * descrevendo o PSP anterior. Ninguém foi avisado nas três vezes.
 *
 * A duplicação é DELIBERADA (o app não importa do pacote web, e o CLAUDE.md
 * manda transcrever), então o remédio é comparar, não extrair — mesmo
 * princípio do arquivo irmão, agora valendo para as 68.
 *
 * Divergência legítima existe: o app não tem todos os botões do site. Ela vai
 * na allowlist abaixo, COM MOTIVO. Uma allowlist que cresce sem justificativa é
 * o mesmo que não ter teste.
 */
import fs   from "node:fs"
import path from "node:path"

const RAIZ = path.resolve(__dirname, "../../..")
const SITE = "app/ajuda/page.tsx"
const APP  = "apps/mobile/app/ajuda.tsx"

/**
 * Perguntas cuja resposta pode divergir entre site e app, e por quê.
 * Chave = texto da pergunta no SITE.
 */
const DIVERGENCIA_PERMITIDA: Record<string, string> = {
  "Abri uma disputa e me entendi com a outra parte. Posso desistir?":
    "O app não tem o botão 'Cancelar disputa' (grep cancel_dispute em apps/mobile = 0). " +
    "A resposta do app aponta para o site em vez de prometer um botão inexistente.",
  "Preciso falar com a outra parte antes de abrir uma disputa?":
    "O painel 'report_contact' que oferece o link do chat só existe no site " +
    "(app/reservas/[id]/_BookingActions.tsx). O app recomenda o chat sem citar o painel.",
  "Tenho um problema urgente com uma reserva em andamento. O que faço?":
    "A abertura de disputa pelo locatário existe só no site; no app apenas o " +
    "locador abre, pelo check-out com dano.",
}

/**
 * Perguntas cujo TEXTO diverge entre as cópias — dívida conhecida, não
 * autorizada. Ficam aqui para o teste não reprovar hoje, mas a lista é para
 * ESVAZIAR, não para crescer.
 */
const TITULO_DIVERGENTE_CONHECIDO = [
  // Site diz "taxa por atraso", app diz "multa por atraso". Mesma FAQ, dois nomes.
  "Como funciona a taxa por atraso na devolução?",
]

type Faq = { q: string; a: string }

/**
 * Extrai os pares {q, a} da FONTE. Não dá para renderizar: `buildSections(v)`
 * não é exportado e a página é Server Component — mesmo motivo do arquivo
 * irmão. Tolera comentários entre `q:` e `a:`, que existem no app.
 */
function lerFaqs(arquivo: string): Faq[] {
  const fonte = fs.readFileSync(path.join(RAIZ, arquivo), "utf8")
  const faqs: Faq[] = []
  const reQ = /\bq:\s*(["`])((?:\\.|(?!\1)[\s\S])*?)\1/g

  for (let m = reQ.exec(fonte); m; m = reQ.exec(fonte)) {
    const depois = fonte.slice(m.index + m[0].length)
    const mA = depois.match(/\ba:\s*(["`])((?:\\.|(?!\1)[\s\S])*?)\1/)
    if (mA) faqs.push({ q: m[2], a: mA[2] })
  }
  return faqs
}

const doSite = lerFaqs(SITE)
const doApp  = lerFaqs(APP)

describe("Central de Ajuda — site e app espelhados", () => {
  it("a leitura encontrou as FAQs dos dois arquivos", () => {
    // Âncora: um regex quebrado devolveria zero e todo o resto passaria vazio.
    expect(doSite.length).toBeGreaterThanOrEqual(60)
    expect(doApp.length).toBeGreaterThanOrEqual(60)
  })

  it("🪤 nenhuma FAQ existe só no site", () => {
    const soNoSite = doSite
      .map((f) => f.q)
      .filter((q) => !doApp.some((f) => f.q === q))
      .filter((q) => !TITULO_DIVERGENTE_CONHECIDO.includes(q))
    expect(soNoSite).toEqual([])
  })

  it("🪤 nenhuma FAQ existe só no app", () => {
    const titulosDoSite = new Set(doSite.map((f) => f.q))
    const soNoApp = doApp
      .map((f) => f.q)
      .filter((q) => !titulosDoSite.has(q))
      // O par com título divergente aparece dos dois lados com nomes diferentes.
      .filter((q) => !/atraso na devolução/.test(q))
    expect(soNoApp).toEqual([])
  })

  it("🪤 respostas iguais, exceto as divergências declaradas", () => {
    const divergem = doSite
      .filter((f) => !(f.q in DIVERGENCIA_PERMITIDA))
      .filter((f) => {
        const noApp = doApp.find((g) => g.q === f.q)
        return noApp !== undefined && noApp.a !== f.a
      })
      .map((f) => f.q)
    expect(divergem).toEqual([])
  })

  it("toda divergência permitida tem motivo escrito e ainda existe", () => {
    // Allowlist que sobrevive à remoção da FAQ vira mentira silenciosa.
    for (const [pergunta, motivo] of Object.entries(DIVERGENCIA_PERMITIDA)) {
      expect(motivo.length).toBeGreaterThan(40)
      expect(doSite.map((f) => f.q)).toContain(pergunta)
    }
  })

  it("🪤 nenhuma cópia cita canal ou botão que não existe no produto", () => {
    // Os nomes abaixo foram publicados por meses sem contrapartida no código —
    // é o defeito que a revisão jurídica de 01/09/2026 mandou eliminar.
    const inexistentes = [/Atendimento emergencial/i, /Solicitar intervenção/i, /canal prioritário/i]
    for (const [arquivo, faqs] of [[SITE, doSite], [APP, doApp]] as const) {
      const texto = faqs.map((f) => `${f.q} ${f.a}`).join("\n")
      for (const padrao of inexistentes) {
        expect(`${arquivo}: ${padrao} → ${padrao.test(texto)}`).toBe(`${arquivo}: ${padrao} → false`)
      }
    }
  })
})
