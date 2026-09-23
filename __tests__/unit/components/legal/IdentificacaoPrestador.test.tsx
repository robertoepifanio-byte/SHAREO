/**
 * Identificação do prestador nos documentos legais (ver `LEGAL_ENTITY`).
 *
 * Três garantias distintas, porque falham de formas diferentes:
 *   1. o componente renderiza os dados certos;
 *   2. as 5 telas legais REALMENTE o usam — apagar o bloco de uma delas passaria
 *      verde se só o componente fosse testado, e é a tela que cumpre a obrigação;
 *   3. o espelho do app não divergiu do site — divergência aqui é silenciosa e
 *      só aparece quando alguém abre a tela no celular.
 *
 * 🪤 As páginas não são renderizáveis em jest: /termos e /politicas são Server
 * Components async que batem no banco, e /privacidade importa AppHeader (sessão).
 * Daí a verificação por fonte. O E2E não substitui — não está nos required checks.
 */
import { render, screen } from "@testing-library/react"
import fs from "node:fs"
import path from "node:path"
import { IdentificacaoPrestador } from "@/components/legal/IdentificacaoPrestador"
import { DPO_NOME } from "@shareo/legal"
import { LEGAL_ENTITY, CONSENT_VERSION, DPO_EMAIL, PJ_DECLARATION_TEXT, MARKETING_CONSENT_VERSION, MARKETING_CONSENT_TEXT, POLICY_UPDATED_AT, POLITICAS_UPDATED_AT } from "@/lib/legal-config"

const RAIZ = path.resolve(__dirname, "../../../..")
const lerFonte = (arquivo: string) => fs.readFileSync(path.join(RAIZ, arquivo), "utf8")

/** JSX comentado não conta como uso — comentar o bloco é o modo de falha provável. */
const semComentarios = (fonte: string) =>
  fonte.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\/.*$/gm, "")

describe("IdentificacaoPrestador", () => {
  it("exibe razão social e CNPJ", () => {
    render(<IdentificacaoPrestador />)

    expect(screen.getByText(LEGAL_ENTITY.razaoSocial)).toBeInTheDocument()
    expect(screen.getByText(new RegExp(LEGAL_ENTITY.cnpj.replace(/[./]/g, "\\$&")))).toBeInTheDocument()
    expect(screen.getByText("A plataforma ShareO é operada por:")).toBeInTheDocument()
  })

  it("publica o endereço da sede — sem ele a obrigação não se cumpre", () => {
    render(<IdentificacaoPrestador />)

    // Com o valor REAL da constante, não mockado: alguém devolver `enderecoSede`
    // para null derruba este teste, que é o ponto. O Decreto 7.962/2013, art. 2º, I
    // exige o endereço, e a página passaria a exibir só razão social e CNPJ.
    expect(LEGAL_ENTITY.enderecoSede).not.toBeNull()
    expect(screen.getByText(LEGAL_ENTITY.enderecoSede!)).toBeInTheDocument()
  })

  it("na Política de Privacidade, identifica a empresa como CONTROLADORA (LGPD art. 9º, I)", () => {
    render(<IdentificacaoPrestador papel="controlador" />)

    expect(
      screen.getByText("O controlador dos dados pessoais tratados nesta plataforma é:"),
    ).toBeInTheDocument()
    expect(screen.getByText(LEGAL_ENTITY.razaoSocial)).toBeInTheDocument()
  })
})

describe("endereço da sede", () => {
  // Os dois estados são exercitados de verdade, sem ramo condicional no teste:
  // o módulo é remockado para cada caso. Sem isso, o caso "preenchido" seria
  // código morto até o go-live e o caso "vazio" seria uma asserção vácua.
  const renderizarCom = (enderecoSede: string | null) => {
    jest.resetModules()
    // 🪤 O mock é do módulo INTERNO do pacote, não do índice nem de
    // @/lib/legal-config. LEGAL_ENTITY passou a morar em @shareo/legal, e o
    // componente o lê de `./entidade` direto — mockar o índice (ou a
    // reexportação da raiz) não intercepta esse import e o teste passaria a
    // renderizar o endereço real, provando nada.
    jest.doMock(path.join(RAIZ, "packages/legal/src/entidade.ts"), () => ({
      LEGAL_ENTITY: { ...LEGAL_ENTITY, enderecoSede },
    }))
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { IdentificacaoPrestador: Componente } = require("@/components/legal/IdentificacaoPrestador")
    return render(<Componente />)
  }

  afterEach(() => jest.dontMock(path.join(RAIZ, "packages/legal/src/entidade.ts")))

  it("renderiza o endereço quando ele existe", () => {
    renderizarCom("Rua Exemplo, 100 — Pinheiros, São Paulo/SP, CEP 05000-000")

    expect(screen.getByText(/Rua Exemplo, 100/)).toBeInTheDocument()
  })

  it("omite a linha quando o endereço ainda não foi confirmado", () => {
    const { container } = renderizarCom(null)

    // Num documento legal, endereço inventado ou parcial é pior que ausente.
    expect(container.textContent).not.toMatch(/Rua|CEP/i)
    // Não-vácuo: o resto do bloco continua lá.
    expect(screen.getByText(LEGAL_ENTITY.razaoSocial)).toBeInTheDocument()
  })
})

describe("telas legais", () => {
  it.each([
    // O texto dos três documentos web mora em @shareo/legal desde 09/2026 — é
    // o mesmo componente que o marketplace e a landing da campanha renderizam,
    // então é lá que a obrigação de identificar a PJ tem de estar cravada.
    "packages/legal/src/TermosConteudo.tsx",
    "packages/legal/src/PrivacidadeConteudo.tsx",
    "packages/legal/src/PoliticasConteudo.tsx",
    // O app transcreve o site (apps/mobile/CLAUDE.md) — a obrigação legal não
    // some porque o usuário abriu pelo celular.
    "apps/mobile/app/termos.tsx",
    "apps/mobile/app/privacidade.tsx",
  ])("%s renderiza o bloco de identificação", (arquivo) => {
    expect(semComentarios(lerFonte(arquivo))).toMatch(/<IdentificacaoPrestador\b/)
  })

  /**
   * 🪤 O teste acima prova que o COMPONENTE contém o bloco — afirmação que
   * continua verdadeira mesmo se alguém apagar `<TermosConteudo />` da página e
   * publicar /termos em branco. Desde que o texto saiu para @shareo/legal, a
   * composição virou o elo frágil: nenhuma das seis páginas é renderizável em
   * jest (Server Components async, banco, sessão), então ela também se verifica
   * por fonte.
   */
  it.each([
    ["app/termos/page.tsx", "TermosConteudo"],
    ["app/privacidade/page.tsx", "PrivacidadeConteudo"],
    ["app/politicas/page.tsx", "PoliticasConteudo"],
    ["apps/campanha/app/termos/page.tsx", "TermosConteudo"],
    ["apps/campanha/app/privacidade/page.tsx", "PrivacidadeConteudo"],
    ["apps/campanha/app/politicas/page.tsx", "PoliticasConteudo"],
  ])("%s compõe <%s />", (arquivo, componente) => {
    expect(semComentarios(lerFonte(arquivo))).toMatch(new RegExp(`<${componente}\\b`))
  })
})

describe("espelho do app", () => {
  // 🪤 A comparação é feita contra a FONTE do espelho, então o texto longo mora
  // lá numa linha só. Quebrá-lo em concatenação reprovaria por causa das aspas
  // e do `+`, não por divergência real.
  const espelho = lerFonte("apps/mobile/lib/legalConfig.ts")

  it.each([
    ["razão social", LEGAL_ENTITY.razaoSocial],
    ["CNPJ", LEGAL_ENTITY.cnpj],
    ["e-mail de contato", LEGAL_ENTITY.emailContato],
    ["endereço da sede", LEGAL_ENTITY.enderecoSede],
    ["versão dos Termos", CONSENT_VERSION],
    ["canal do DPO", DPO_EMAIL],
    ["nome do DPO", DPO_NOME],
    // Declaração sob as penas da lei (ADR-024) — registrada com data e IP.
    // Divergir do site aqui é gravar prova de um texto que ninguém assinou.
    ["declaração de vínculo PJ", PJ_DECLARATION_TEXT],
    // O app gravava CONSENT_VERSION ("v1.1") no lead sob um texto próprio, que
    // divergia do site — o lead ficava arquivado sob um texto que ninguém viu.
    ["versão do consentimento de marketing", MARKETING_CONSENT_VERSION],
    ["texto do consentimento de marketing", MARKETING_CONSENT_TEXT],
    // Carimbo de data que o app copia: bump de um lado sem o outro faz o titular
    // ler "atualizado em" de uma versão que não é a que está na tela.
    ["data da Política de Privacidade", POLICY_UPDATED_AT],
    ["data das Políticas", POLITICAS_UPDATED_AT],
  ])("mantém o mesmo %s do site", (_rotulo, valor) => {
    expect(espelho).toContain(valor)
  })

  // Espelhar a constante não adianta se a tela seguir com o literal ao lado —
  // era exatamente o estado anterior: o espelho existia e as telas o ignoravam.
  it("o formulário de captação usa as constantes de marketing", () => {
    const form = semComentarios(lerFonte("apps/mobile/components/home/FounderCaptureForm.tsx"))
    expect(form).toMatch(/consentVersion:\s*MARKETING_CONSENT_VERSION/)
    expect(form).toContain("{MARKETING_CONSENT_TEXT}")
  })

  it("o cadastro usa a versão dos Termos do espelho", () => {
    const register = semComentarios(lerFonte("apps/mobile/app/(auth)/register.tsx"))
    expect(register).toMatch(/consentVersion:\s*CONSENT_VERSION/)
  })

  // 🪤 Em `it` separado de propósito: junto das asserções acima ele nunca
  // rodaria — a primeira falha aborta o teste, e era a primeira que pegava a
  // regressão. Aqui ele cobre o literal reaparecendo em QUALQUER ponto do arquivo.
  it.each([
    "apps/mobile/components/home/FounderCaptureForm.tsx",
    "apps/mobile/app/(auth)/register.tsx",
  ])("%s não traz a versão cravada de volta", (arquivo) => {
    expect(semComentarios(lerFonte(arquivo))).not.toMatch(/"v1\.1"/)
  })
})

// 🪤 O nome do Encarregado esteve solto em dois componentes e divergiu do RIPD sem
// nada ficar vermelho. A suíte da campanha (que confere o render) não roda no CI,
// então a trava mora aqui: as telas leem a constante, e a constante é o nome do RIPD.
describe("nome do Encarregado (DPO)", () => {
  it.each([
    "packages/legal/src/PoliticasConteudo.tsx",
    "apps/mobile/app/politicas.tsx",
  ])("%s exibe DPO_NOME, não um nome digitado", (arquivo) => {
    expect(semComentarios(lerFonte(arquivo))).toMatch(/\{DPO_NOME\}/)
  })

  it("é o Encarregado registrado no RIPD", () => {
    expect(lerFonte("docs/juridico/rascunho-ripd.md")).toContain(DPO_NOME)
  })
})
