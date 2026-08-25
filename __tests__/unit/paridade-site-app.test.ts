/**
 * Paridade de TEXTO entre os componentes do site e seus espelhos no app.
 *
 * Por que existe: a regra do fundador (apps/mobile/CLAUDE.md) manda o app
 * TRANSCREVER o site. Mas 21 componentes têm o mesmo nome dos dois lados e nada
 * comparava um com o outro — a divergência só aparecia quando alguém abria a
 * tela no celular. Em 24/08/2026 dois pares divergiram no mesmo dia: a Central
 * de Ajuda (uma frase que deixou de ser verdade) e o formulário de captação
 * (campos faltando e a versão errada de consentimento LGPD).
 *
 * O que este teste garante: todo texto VISÍVEL do componente do site aparece no
 * arquivo do app. Não compara estilo — o site usa Tailwind e o app StyleSheet,
 * são linguagens diferentes para a mesma tela. Texto é o que o usuário lê, é o
 * que a regra de transcrição exige verbatim, e é o que de fato divergiu.
 *
 * 🪤 Este teste NÃO prova paridade completa, e vale saber onde ele é cego:
 *   - compara PRESENÇA no arquivo, não posição. Texto na ordem errada passa.
 *   - a busca é por substring no arquivo inteiro, então um rótulo trocado na
 *     tela ainda passa se a mesma palavra sobrar num `accessibilityLabel`.
 *     Verificado por mutação: trocar o rótulo "Anunciar" do BottomNav NÃO
 *     reprova, porque a palavra continua no rótulo de acessibilidade.
 *   - texto que o app tem A MAIS não é apontado.
 * Ele fecha a porta por onde já passamos duas vezes — texto do site que sumiu
 * do app —, não todas as portas.
 *
 * Quando quebrar: ou o app ficou para trás (transcreva a mudança), ou a
 * divergência é deliberada (acrescente à DIVERGENCIAS_CONHECIDAS com o motivo).
 * Um `ignorar` sem motivo escrito é o começo do próximo defeito silencioso.
 */
import fs from "node:fs"
import path from "node:path"

const RAIZ = path.resolve(__dirname, "../..")
const ler = (p: string) => fs.readFileSync(path.join(RAIZ, p), "utf8")

/** Colapsa espaços: a mesma frase quebrada em duas linhas de JSX tem de casar. */
const normalizar = (t: string) => t.replace(/\s+/g, " ").trim()

/**
 * Divergências deliberadas, por par. Cada entrada precisa de motivo — sem ele,
 * a lista vira o esconderijo do bug seguinte.
 */
const DIVERGENCIAS_CONHECIDAS: Record<string, { texto: string; motivo: string }[]> = {
  "components/layout/MobileMenu.tsx": [
    { texto: "Painel Admin", motivo: "O admin é cookie-only e não existe no app — ver feedback-auth-cookie-only-mobile-401." },
    { texto: "Tema", motivo: "O app troca tema pelo ThemeToggle no cabeçalho, não por item de menu." },
  ],
  "components/layout/AppHeader.tsx": [
    { texto: "Use Mais. Possua Menos.", motivo: "PENDENTE (tarefa: fechar as 6 divergências de texto site-app): o cabeçalho do app não traz o slogan sob o logo. Divergência real, ainda não transcrita." },
    { texto: "Entrar", motivo: "PENDENTE (tarefa: fechar as 6 divergências de texto site-app): o site mostra 'Entrar' no cabeçalho deslogado; o app leva ao login por outro caminho." },
  ],
  "components/items/ItemCard.tsx": [
    { texto: "Mais alugado", motivo: "PENDENTE (tarefa: fechar as 6 divergências de texto site-app): selo de destaque do site, ausente no card do app." },
    { texto: "Editar", motivo: "PENDENTE (tarefa: fechar as 6 divergências de texto site-app): atalho de edição do dono no card, ausente no app." },
  ],
  // O breadcrumb "Início › X" do site não se transcreve: no app o caminho de
  // volta é o botão do cabeçalho. Convenção já estabelecida antes destas telas
  // — `app/comunidade/page.tsx` tem o breadcrumb e `apps/mobile/app/comunidade.tsx` não.
  "app/politicas/page.tsx": [
    { texto: "Início", motivo: "Breadcrumb do site; no app o retorno é o botão voltar do cabeçalho (mesma convenção de comunidade/sobre)." },
  ],
  "app/suporte/page.tsx": [
    { texto: "Início", motivo: "Breadcrumb do site; no app o retorno é o botão voltar do cabeçalho (mesma convenção de comunidade/sobre)." },
  ],
  "components/home/SimuladorRenda.tsx": [
    { texto: "Renda Mensal Estimada", motivo: "PENDENTE (tarefa: fechar as 6 divergências de texto site-app): rótulo do resultado; o app usa outra composição de tela." },
    { texto: "Cadastrar meu item agora", motivo: "PENDENTE (tarefa: fechar as 6 divergências de texto site-app): CTA do resultado, ausente no app." },
  ],
}

/** Cheira a código (genérico de TS, ternário, atribuição), não a texto de tela. */
function pareceCodigo(t: string): boolean {
  return (
    /\b(return|const|let|case|function|useState|useEffect|await|import|export|typeof)\b/.test(t) ||
    /=>|;|\{|\}|\$\{/.test(t) ||
    // Fragmento de ternário JSX — NÃO é redundante com a linha acima: o pedaço
    // capturado entre `>` e `<` pode não conter chave nenhuma. Sem esta linha,
    // `") : query.trim() && !result ? ("` e `"active ? ("` viram "texto".
    /\?\s*\(|\)\s*:/.test(t) ||
    t.includes('"') ||
    t.includes("=")
  )
}

/** Textos visíveis: nós de texto JSX, placeholders e literais em {"..."}. */
function extrairTextos(fonte: string): string[] {
  const limpo = fonte
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")

  const achados = new Set<string>()
  for (const m of limpo.matchAll(/>([^<>{}]+)</g)) {
    const t = normalizar(m[1])
    if (t.length >= 4 && /[a-zà-ú]/i.test(t) && !pareceCodigo(t)) achados.add(t)
  }
  for (const m of limpo.matchAll(/placeholder="([^"]+)"/g)) {
    const t = normalizar(m[1])
    if (t.length >= 2) achados.add(t)
  }
  for (const m of limpo.matchAll(/\{"([^"]{4,}?)"\}/g)) {
    const t = normalizar(m[1])
    if (/[a-zà-ú]/i.test(t) && !pareceCodigo(t)) achados.add(t)
  }
  return [...achados]
}

function listarTsx(dir: string): string[] {
  const out: string[] = []
  for (const e of fs.readdirSync(path.join(RAIZ, dir), { withFileTypes: true })) {
    const rel = `${dir}/${e.name}`
    if (e.isDirectory()) {
      if (e.name === "__tests__") continue
      out.push(...listarTsx(rel))
    } else if (e.name.endsWith(".tsx")) out.push(rel)
  }
  return out
}

/**
 * Telas: o casamento por nome NÃO funciona aqui — o site usa
 * `app/politicas/page.tsx` e o app, `apps/mobile/app/politicas.tsx`. Por isso o
 * mapa é explícito. Sem ele, ~2.600 linhas de texto transcrito (incluindo o
 * texto jurídico das Políticas) ficariam fora de qualquer rede.
 */
const MAPA_TELAS: [string, string][] = [
  ["app/politicas/page.tsx", "apps/mobile/app/politicas.tsx"],
  ["app/suporte/page.tsx", "apps/mobile/app/suporte.tsx"],
]

/** Pares descobertos por nome de arquivo — nada de lista manual a manter. */
function descobrirPares(): [string, string][] {
  const porNome = new Map(listarTsx("apps/mobile/components").map((p) => [path.basename(p), p]))
  return listarTsx("components")
    .map((s) => [s, porNome.get(path.basename(s))] as [string, string | undefined])
    .filter((par): par is [string, string] => Boolean(par[1]))
}

const PARES = [...descobrirPares(), ...MAPA_TELAS]

describe("paridade de texto site ↔ app", () => {
  it("encontra os pares por nome de arquivo", () => {
    // Não-vácuo: se a descoberta quebrar, todo o resto passaria sem testar nada.
    expect(PARES.length).toBeGreaterThanOrEqual(20)
  })

  it.each(PARES)("%s está transcrito em %s", (site, app) => {
    const conhecidas = new Set((DIVERGENCIAS_CONHECIDAS[site] ?? []).map((d) => d.texto))
    const fonteApp = normalizar(ler(app))

    const faltando = extrairTextos(ler(site))
      .filter((t) => !conhecidas.has(t))
      .filter((t) => !fonteApp.includes(t))

    expect(faltando).toEqual([])
  })

  it("toda divergência conhecida tem motivo escrito", () => {
    const semMotivo = Object.entries(DIVERGENCIAS_CONHECIDAS).flatMap(([arquivo, ds]) =>
      ds.filter((d) => d.motivo.trim().length < 20).map((d) => `${arquivo}: ${d.texto}`),
    )
    expect(semMotivo).toEqual([])
  })

  it("nenhuma divergência conhecida já foi resolvida sem sair da lista", () => {
    // Uma exceção que não é mais necessária esconde a próxima de verdade.
    const obsoletas: string[] = []
    for (const [site, ds] of Object.entries(DIVERGENCIAS_CONHECIDAS)) {
      const par = PARES.find(([s]) => s === site)
      if (!par) { obsoletas.push(`${site}: par não existe mais`); continue }
      const fonteApp = normalizar(ler(par[1]))
      for (const d of ds) {
        if (fonteApp.includes(d.texto)) obsoletas.push(`${site}: "${d.texto}" já está no app`)
      }
    }
    expect(obsoletas).toEqual([])
  })
})
