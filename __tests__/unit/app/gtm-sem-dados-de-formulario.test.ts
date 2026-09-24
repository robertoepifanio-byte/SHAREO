/**
 * Trava: nenhum valor digitado em formulário sai da landing (`apps/campanha`)
 * para o `dataLayer` / `gtag` / helpers de analytics.
 *
 * A Política (§5.2, `@shareo/legal`, 23/09/2026) promete que nenhuma etiqueta do
 * GTM lê o que a pessoa digita; até aqui só o console do GTM a sustentava.
 * `analytics-declaracao.test.ts` trava o GA4; este trava o que o CÓDIGO empurra.
 * Roda na raiz (o CI não roda `apps/campanha`), por isso lê FONTE.
 *
 * Como: TABELA fechada {evento → {param → expressão exata}} para todo `trackEvent`
 * (default-deny) + fronteira: só `components/analytics/` toca `dataLayer`/`gtag`/
 * hosts do Google, e os imports são default-deny.
 *
 * NÃO garante:
 *  - o CONSOLE do GTM: gatilho de envio de formulário, variáveis de "Elemento de
 *    formulário" ou Enhanced Conversions (lê e-mail/telefone do DOM) não passam
 *    por linha deste repo;
 *  - ofuscação (`eval`, `window["data"+"Layer"]`) nem código carregado em runtime;
 *  - o CONTEÚDO de uma expressão pinada: `res.status`/`code` são aceitos por texto;
 *  - campo repassado por prop a um helper novo fora de `components/analytics/`:
 *    só a fronteira (nome do helper) o pega.
 *
 * @jest-environment node
 */
import fs from "node:fs"
import path from "node:path"
import ts from "typescript"

const RAIZ = path.resolve(__dirname, "../../..")
const ANALYTICS = "apps/campanha/components/analytics/"
const FORMULARIO = "apps/campanha/components/FounderCaptureForm.tsx"

// À mão de propósito (não derivar de package.json): pacote novo tem de ser LIDO
// por alguém antes de entrar no bundle da landing.
const PACOTES = [
  { raiz: "apps/campanha", pastas: ["app", "components", "lib"], externos: ["react", "next", "next-themes", "lucide-react", "@shareo/legal"] },
  { raiz: "packages/legal", pastas: ["src"], externos: ["react"] },
]

/** Único espelho do que sai: evento → param → texto EXATO da expressão no call site. */
const TABELA: Record<string, Record<string, string>> = {
  founder_invite_click: {},
  founder_lead_error: { http_status: "res.status", error_code: 'code ?? "(sem código)"' },
  founder_lead_submit: {
    // `uf` é o ÚNICO valor de campo enviado: geografia grossa (27 valores), escolha
    // consciente do desenho do evento. Se o jurídico quiser zero, apagar aqui e no call site.
    uf: "uf.trim().toUpperCase()",
    lead_source: "attribution.source",
    utm_campaign: 'attribution.utmCampaign ?? campaign ?? "(nenhuma)"',
    has_phone: "!!phoneE164", // booleano: SE preencheu, nunca o número
    cep_used: 'cepState === "ok"', // booleano do estado da consulta, não o CEP
  },
}
const REVISE = "revise se o valor pode conter dado digitado; se puder, não envie ao Google — só então atualize TABELA"

/** Boilerplate do vendor em components/analytics: `.push(`/`gtag(`/`fbq(` por arquivo. */
const CONTAGEM_VENDOR: Record<string, number> = { "GoogleTagManager.tsx": 1, "GoogleAnalytics.tsx": 5, "MetaPixel.tsx": 4 }
const PONTOS = /\.push\(|\bgtag\(|\bfbq\(/g
const LE_DOM = /\.(value|elements|target)\b|getElementById|querySelector|FormData/
const TOCA_GOOGLE =
  /dataLayer|\bgtag\b|\bfbq\b|sendGTMEvent|sendGAEvent|googletagmanager\.com|google-analytics\.com|analytics\.google\.com|googleadservices\.com|googlesyndication\.com|doubleclick\.net|connect\.facebook\.net/i

// ─── Leitura: cada fonte é lida e parseada UMA vez ───────────────────────────

const parse = (nome: string, texto: string) =>
  ts.createSourceFile(nome, texto, ts.ScriptTarget.Latest, true, nome.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS)

const IGNORADO = /(^|[\\/])(node_modules|\.next|__tests__)[\\/]/
const listar = (dirRel: string): string[] =>
  (fs.readdirSync(path.join(RAIZ, dirRel), { recursive: true }) as string[])
    .filter((f) => /\.tsx?$/.test(f) && !/\.d\.ts$/.test(f) && !IGNORADO.test(f))
    .map((f) => `${dirRel}/${f.split(path.sep).join("/")}`)

const FONTES = new Map(
  PACOTES.flatMap((p) => p.pastas.flatMap((d) => listar(`${p.raiz}/${d}`))).map((rel) => {
    const texto = fs.readFileSync(path.join(RAIZ, rel), "utf8")
    return [rel, { texto, sf: parse(rel, texto) }] as const
  }),
)
const fonte = (rel: string) => {
  const f = FONTES.get(rel)
  if (!f) throw new Error(`arquivo não varrido: ${rel}`)
  return f
}

function visitar(no: ts.Node, fn: (n: ts.Node) => void): void {
  fn(no)
  ts.forEachChild(no, (c) => visitar(c, fn))
}
const normalizar = (t: string) => t.replace(/\s+/g, " ").trim()

// ─── Análise dos call sites de trackEvent ────────────────────────────────────

type Chamada = { arquivo: string; linha: number; evento?: string; erros: string[] }

const chaveDe = (p: ts.ObjectLiteralElementLike) =>
  !ts.isSpreadAssignment(p) && (ts.isIdentifier(p.name) || ts.isStringLiteralLike(p.name)) ? p.name.text : undefined

function paramsDe(o: ts.ObjectLiteralExpression, erros: string[]): Record<string, string> {
  const r: Record<string, string> = {}
  for (const p of o.properties) {
    const k = chaveDe(p)
    if (k !== undefined && ts.isPropertyAssignment(p)) r[k] = normalizar(p.initializer.getText())
    else if (k !== undefined && ts.isShorthandPropertyAssignment(p)) r[k] = k
    else erros.push(`spread, método ou chave computada em params: ${normalizar(p.getText())}`)
  }
  return r
}

function chamadasDe(arquivo: string, sf: ts.SourceFile): Chamada[] {
  const out: Chamada[] = []
  visitar(sf, (n) => {
    if (!ts.isCallExpression(n)) return
    const c = n.expression
    if ((ts.isIdentifier(c) ? c.text : ts.isPropertyAccessExpression(c) ? c.name.text : "") !== "trackEvent") return
    const erros: string[] = []
    const chamada: Chamada = { arquivo, linha: sf.getLineAndCharacterOfPosition(n.getStart()).line + 1, erros }
    out.push(chamada)
    const [ev] = n.arguments
    if (n.arguments.length !== 1 || !ts.isObjectLiteralExpression(ev)) {
      erros.push("trackEvent precisa receber UM objeto literal (não dá para provar o que sai)", REVISE)
      return
    }
    let params: Record<string, string> = {}
    for (const p of ev.properties) {
      const k = chaveDe(p)
      if (k === "name" && ts.isPropertyAssignment(p) && ts.isStringLiteralLike(p.initializer)) chamada.evento = p.initializer.text
      else if (k === "params" && ts.isPropertyAssignment(p) && ts.isObjectLiteralExpression(p.initializer)) params = paramsDe(p.initializer, erros)
      else erros.push(`fora do padrão { name: "<literal>", params: { … } }: ${normalizar(p.getText())}`)
    }
    const esperado = chamada.evento === undefined ? undefined : TABELA[chamada.evento]
    if (chamada.evento === undefined) erros.push("o nome do evento não é uma string literal")
    else if (!esperado) erros.push(`evento novo "${chamada.evento}"`)
    else {
      for (const k of Object.keys(params)) {
        if (esperado[k] === undefined) erros.push(`parâmetro novo "${k}: ${params[k]}"`)
        else if (params[k] !== esperado[k]) erros.push(`"${k}" mudou: \`${params[k]}\` (pinado: \`${esperado[k]}\`)`)
      }
      for (const k of Object.keys(esperado)) if (params[k] === undefined) erros.push(`parâmetro removido "${k}"`)
    }
    if (erros.length) erros.push(REVISE)
  })
  return out
}

function importsDe(sf: ts.SourceFile): string[] {
  const specs: string[] = []
  visitar(sf, (n) => {
    if ((ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) && n.moduleSpecifier && ts.isStringLiteralLike(n.moduleSpecifier)) {
      specs.push(n.moduleSpecifier.text)
    }
    if (ts.isCallExpression(n) && n.arguments[0] && ts.isStringLiteralLike(n.arguments[0])) {
      if (n.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(n.expression) && n.expression.text === "require")) {
        specs.push(n.arguments[0].text)
      }
    }
  })
  return specs
}

const CHAMADAS = [...FONTES].flatMap(([rel, f]) => chamadasDe(rel, f.sf))
const DO_VENDOR = [...FONTES].filter(([rel]) => rel.startsWith(ANALYTICS))
const FORA_DO_VENDOR = [...FONTES].filter(([rel]) => !rel.startsWith(ANALYTICS))

// ─── Testes ──────────────────────────────────────────────────────────────────

describe("GTM/gtag: nenhum valor de formulário sai da landing", () => {
  describe("controle positivo — o scanner enxerga o que existe hoje", () => {
    it("varre os arquivos que importam (não uma lista vazia)", () => {
      for (const rel of [FORMULARIO, `${ANALYTICS}GoogleTagManager.tsx`, "packages/legal/src/PoliticasConteudo.tsx"]) fonte(rel)
    })

    it("acha exatamente os eventos da TABELA, todos no formulário", () => {
      expect(CHAMADAS.map((c) => c.evento).sort()).toEqual(Object.keys(TABELA).sort())
      expect([...new Set(CHAMADAS.map((c) => c.arquivo))]).toEqual([FORMULARIO])
    })
  })

  describe("cada trackEvent bate com a TABELA pinada", () => {
    it.each(CHAMADAS.map((c): [string, Chamada] => [`${c.arquivo}:${c.linha} (${c.evento})`, c]))("%s", (_r, c) => {
      expect(c.erros).toEqual([])
    })
  })

  it("trackEvent(event: GA4Event) só encaminha nome e params ao gtag", () => {
    const ga = fonte(`${ANALYTICS}GoogleAnalytics.tsx`).texto
    expect(ga).toContain("export function trackEvent(event: GA4Event) {")
    expect(ga.match(/window\.gtag\(/g)).toHaveLength(1)
    expect(ga).toContain('window.gtag("event", event.name, event.params)')
  })

  describe("components/analytics/ (boilerplate do vendor) não mudou de forma", () => {
    it("mesmos arquivos, com a mesma contagem de pontos de push", () => {
      // Arquivo novo aqui, ou ponto a mais num existente, reprova: leia o que ele empurra.
      const contagem = Object.fromEntries(DO_VENDOR.map(([rel, f]) => [path.posix.basename(rel), (f.texto.match(PONTOS) ?? []).length]))
      expect(contagem).toEqual(CONTAGEM_VENDOR)
    })

    it("o único dataLayer.push real (bootstrap do GTM) tem o payload de sempre", () => {
      const push = fonte(`${ANALYTICS}GoogleTagManager.tsx`).texto.match(/w\[l\]\.push\((\{[^}]*\})\)/)
      expect(normalizar(push?.[1] ?? "")).toBe("{'gtm.start': new Date().getTime(),event:'gtm.js'}")
    })

    it("nenhum deles lê o DOM/formulário", () => {
      expect(DO_VENDOR.filter(([, f]) => LE_DOM.test(f.texto)).map(([rel]) => rel)).toEqual([])
    })
  })

  describe("fronteira: quem toca o dataLayer e o que entra no bundle", () => {
    it("só components/analytics/ cita dataLayer/gtag/fbq/sendGTMEvent ou hosts do Google/Meta", () => {
      expect(TOCA_GOOGLE.test(fonte(`${ANALYTICS}GoogleTagManager.tsx`).texto)).toBe(true) // controle positivo
      expect(FORA_DO_VENDOR.filter(([, f]) => TOCA_GOOGLE.test(f.texto)).map(([rel]) => rel)).toEqual([])
    })

    it("next/script fica confinado a components/analytics/", () => {
      expect(importsDe(fonte(`${ANALYTICS}GoogleTagManager.tsx`).sf)).toContain("next/script") // controle positivo
      expect(FORA_DO_VENDOR.filter(([, f]) => importsDe(f.sf).includes("next/script")).map(([rel]) => rel)).toEqual([])
    })

    it("imports default-deny: nada sai do pacote nem traz dependência fora da lista", () => {
      const todos = [...FONTES].flatMap(([rel, f]) => importsDe(f.sf).map((spec) => ({ rel, spec })))
      expect(todos.some((i) => i.spec === "@shareo/legal")).toBe(true) // controle positivo
      const problemas = todos.flatMap(({ rel, spec }) => {
        const pkg = PACOTES.find((p) => rel.startsWith(`${p.raiz}/`))
        if (!pkg) return [`${rel}: fora de PACOTES`]
        if (spec.startsWith("@/")) return pkg.raiz === "apps/campanha" ? [] : [`${rel}: "@/" só existe na campanha`]
        if (spec.startsWith(".")) {
          return path.posix.normalize(path.posix.join(path.posix.dirname(rel), spec)).startsWith(`${pkg.raiz}/`)
            ? []
            : [`${rel}: "${spec}" sai de ${pkg.raiz}/ (código compartilhado não varrido)`]
        }
        return pkg.externos.some((e) => spec === e || spec.startsWith(`${e}/`))
          ? []
          : [`${rel}: pacote novo "${spec}" — leia o que ele envia a terceiros e só então inclua em PACOTES.externos`]
      })
      expect(problemas).toEqual([])
    })
  })

  // A trava também é código: estes casos são a mutação PERMANENTE das duas regras.
  describe("o analisador morde (fontes sintéticas)", () => {
    const sint = (src: string) => chamadasDe("sint.tsx", parse("sint.tsx", src))
    const SUBMIT = (has: string) =>
      'trackEvent({ name: "founder_lead_submit", params: { uf: uf.trim().toUpperCase(), lead_source: attribution.source, ' +
      `utm_campaign: attribution.utmCampaign ?? campaign ?? "(nenhuma)", has_phone: ${has}, cep_used: cepState === "ok" } })`

    it.each<[string, string]>([
      ["parâmetro extra (email)", 'trackEvent({ name: "founder_invite_click", params: { email } })'],
      ["exceção com a expressão alterada (has_phone sem o !!)", SUBMIT("phoneE164")],
      ["spread em params", 'trackEvent({ name: "founder_invite_click", params: { ...dados } })'],
      ["evento não literal", "trackEvent(ev)"],
      ["evento novo fora da TABELA", 'trackEvent({ name: "outro" })'],
    ])("reprova: %s", (_d, src) => {
      const r = sint(src)
      expect(r).toHaveLength(1) // o ponto foi ENCONTRADO...
      expect(r[0].erros.length).toBeGreaterThan(0) // ...e reprovado
    })

    it("aprova a forma pinada (sem falso positivo)", () => {
      expect(sint(SUBMIT("!!phoneE164"))).toEqual([expect.objectContaining({ evento: "founder_lead_submit", erros: [] })])
    })

    it.each(["window.dataLayer.push({ v: 1 })", 'sendGTMEvent({ event: "x" })', 'window.gtag("event", "x")'])(
      "a fronteira pega ponto novo fora de analytics: %s",
      (src) => expect(TOCA_GOOGLE.test(src)).toBe(true),
    )
  })
})
