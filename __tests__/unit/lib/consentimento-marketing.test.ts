/** @jest-environment node */
/**
 * Invariantes do consentimento de marketing que um teste unitário ALCANÇA.
 *
 * 🪤 Leia isto antes de confiar neste arquivo como rede de segurança.
 *
 * Em 06/09/2026 a campanha passou a mandar `marketing-v1.1` para a API de
 * PRODUÇÃO, que não conhecia essa versão: todo lead virou 422 por ~39h, com
 * mídia paga rodando. Nem o invariante antigo (cópias iguais) nem o atual
 * (versão ∈ lista conhecida) teriam reprovado — site e campanha subiram no
 * MESMO commit, então a lista DO REPOSITÓRIO já continha v1.1. Verificado em
 * `git show 3ad27899`.
 *
 * A razão é estrutural: quem decide o 422 é a lista do código DEPLOYADO no host
 * que a campanha chama, e nenhum teste unitário enxerga isso. A guarda que
 * enxerga é `apps/campanha/__tests__/integration/consent-version.integration.test.ts`,
 * que pergunta ao host. Este arquivo cobre o que é verificável offline:
 * coerência interna entre versão declarada, texto exibido e trilha publicada.
 *
 * A perna mobile↔site fica em
 * `__tests__/unit/components/legal/IdentificacaoPrestador.test.tsx`.
 */
import fs from "fs"
import path from "path"

import {
  MARKETING_CONSENT_VERSION,
  MARKETING_CONSENT_TEXT,
  KNOWN_MARKETING_CONSENT_VERSIONS,
} from "@/lib/legal-config"
import * as campanha from "@/apps/campanha/lib/legal-config"

const historico = fs.readFileSync(
  path.join(process.cwd(), "docs/juridico/historico-consentimento-marketing.md"),
  "utf8",
)

/**
 * Recorta a seção de UMA versão do histórico.
 *
 * 🪤 Sem recortar, `historico.toContain(texto)` acha a string sob o cabeçalho
 * de qualquer outra versão — e o arquivo contém todos os textos. Declarar v1.0
 * exibindo o texto de v1.1 passaria verde, que é justamente o "lead arquivado
 * sob um texto que ninguém viu" que estas asserções existem para impedir.
 */
function secaoDoHistorico(versao: string): string {
  const i = historico.indexOf(`## \`${versao}\``)
  if (i < 0) throw new Error(`versão ${versao} não está publicada no histórico`)
  const resto = historico.slice(i + 3)
  const fim = resto.indexOf("\n## ")
  return fim < 0 ? resto : resto.slice(0, fim)
}

describe("campanha — coerência do que ela envia e mostra", () => {
  it("declara uma versão que a lista do repositório conhece", () => {
    // Necessário, não suficiente: a lista que decide o 422 é a da produção.
    expect(KNOWN_MARKETING_CONSENT_VERSIONS).toContain(campanha.MARKETING_CONSENT_VERSION)
  })

  it("exibe o texto REGISTRADO PARA A VERSÃO que declara", () => {
    expect(secaoDoHistorico(campanha.MARKETING_CONSENT_VERSION)).toContain(
      campanha.MARKETING_CONSENT_TEXT,
    )
  })

  it("nunca à frente do site — pode estar atrás de propósito", () => {
    // Estar atrás é um estado legítimo enquanto a produção não deploya. Estar
    // à frente significa mandar versão que nem o repositório conhece.
    const daCampanha = KNOWN_MARKETING_CONSENT_VERSIONS.indexOf(campanha.MARKETING_CONSENT_VERSION)
    const doSite = KNOWN_MARKETING_CONSENT_VERSIONS.indexOf(MARKETING_CONSENT_VERSION)
    expect(daCampanha).toBeLessThanOrEqual(doSite)
  })
})

describe("trilha de auditoria das versões", () => {
  it("a vigente é a ÚLTIMA da lista — é o que torna a ordem um fato, não um comentário", () => {
    // A comparação de "quem é mais nova" acima usa `indexOf`, que só significa
    // algo se o array for cronológico. O docblock diz que é; esta asserção
    // transforma a promessa em teste. Sem ela, inserir uma versão no meio
    // inverte a comparação em silêncio.
    const ultima = KNOWN_MARKETING_CONSENT_VERSIONS[KNOWN_MARKETING_CONSENT_VERSIONS.length - 1]
    expect(ultima).toBe(MARKETING_CONSENT_VERSION)
  })

  it("versões antigas continuam aceitas — cliente desatualizado ainda circula", () => {
    // O APK em campo e a campanha (hoje uma atrás de propósito) só atualizam
    // depois; remover uma versão antiga derruba lead real.
    expect(KNOWN_MARKETING_CONSENT_VERSIONS).toEqual(
      expect.arrayContaining(["v1.1", "marketing-v1.0"]),
    )
  })
})

describe("histórico publicado", () => {
  it("o texto vigente do site está publicado sob a própria versão", () => {
    // O banco grava a VERSÃO; o texto de cada uma só existe no histórico. Sem
    // ele, responder "o que eu aceitei em marketing-v1.0?" (LGPD art. 9º, VIII)
    // dependeria de reconstituir o git blame.
    expect(secaoDoHistorico(MARKETING_CONSENT_VERSION)).toContain(MARKETING_CONSENT_TEXT)
  })

  it("toda versão aceita tem seção publicada", () => {
    // Remover um texto histórico apaga a prova do que aquele lead aceitou.
    for (const versao of KNOWN_MARKETING_CONSENT_VERSIONS) {
      expect(() => secaoDoHistorico(versao)).not.toThrow()
    }
  })

  it("a tabela do histórico reflete a versão que a campanha realmente envia", () => {
    // A tabela é lida por gente para decidir se já dá para religar. Se ela
    // afirmar o estado antigo depois do religamento, manda alguém para o lado
    // errado — e ninguém percebe, porque é documentação.
    // Corta no primeiro cabeçalho de VERSÃO (`## \`marketing-...\``), não no
    // primeiro `## ` qualquer — antes das versões há seções de prosa.
    const preambulo = historico.slice(0, historico.indexOf("\n## `"))
    expect(preambulo).toContain(campanha.MARKETING_CONSENT_VERSION)
  })
})
