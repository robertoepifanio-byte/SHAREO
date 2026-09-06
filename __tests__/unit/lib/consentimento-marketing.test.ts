/** @jest-environment node */
/**
 * Invariantes do consentimento de marketing.
 *
 * O texto vive em três cópias — site, `apps/campanha` e `apps/mobile` — porque
 * o mobile precisa dele como constante de compilação e unificar via pacote
 * exigiria mexer em Metro/symlinks do pnpm, num repositório cujo histórico
 * registra "tsc passa, Metro quebra". A duplicação é estrutural; o que dá para
 * fazer é guardá-la.
 *
 * 🪤 A perna mobile↔site JÁ é coberta por
 * `__tests__/unit/components/legal/IdentificacaoPrestador.test.tsx`
 * ("espelho do app"), junto de outras sete constantes. Este arquivo cobre o que
 * falta: a perna da CAMPANHA — que é deploy separado, e portanto o caminho por
 * onde a divergência custa lead de verdade.
 */
import fs from "fs"
import path from "path"

import {
  MARKETING_CONSENT_VERSION,
  MARKETING_CONSENT_TEXT,
  KNOWN_MARKETING_CONSENT_VERSIONS,
} from "@/lib/legal-config"
import * as campanha from "@/apps/campanha/lib/legal-config"

describe("consentimento de marketing — espelho da campanha", () => {
  // 🪤 `apps/campanha` sobe SEPARADO do site, e a rota `app/api/founders/leads`
  // valida `consentVersion` contra a lista de versões conhecidas DO SITE. Uma
  // divergência aqui não dá erro de build: dá 422 em cada lead capturado, com
  // a campanha paga rodando. Por isso a trava.
  it("declara a mesma versão do site", () => {
    expect(campanha.MARKETING_CONSENT_VERSION).toBe(MARKETING_CONSENT_VERSION)
  })

  it("declara o mesmo texto do site", () => {
    expect(campanha.MARKETING_CONSENT_TEXT).toBe(MARKETING_CONSENT_TEXT)
  })
})

describe("trilha de auditoria das versões", () => {
  it("a versão vigente está na lista que a API aceita", () => {
    // Sem isto, o formulário manda uma versão que o zod da rota de leads
    // recusa — e a captação morre com 422 do lado do cliente.
    expect(KNOWN_MARKETING_CONSENT_VERSIONS).toContain(MARKETING_CONSENT_VERSION)
  })

  it("versões antigas continuam aceitas — cliente desatualizado ainda circula", () => {
    // O APK em campo e o cache do app da campanha só atualizam depois; remover
    // uma versão antiga derruba lead de quem ainda não recarregou.
    expect(KNOWN_MARKETING_CONSENT_VERSIONS).toEqual(
      expect.arrayContaining(["v1.1", "marketing-v1.0"]),
    )
  })
})

describe("histórico publicado", () => {
  const historico = fs.readFileSync(
    path.join(process.cwd(), "docs/juridico/historico-consentimento-marketing.md"),
    "utf8",
  )

  // 🪤 Asserção POSITIVA, contra o texto registrado — não negativa contra a
  // formulação anterior. Um `not.toMatch(/um clique/)` deixaria passar
  // "cancelar em um toque" e a regra que motivou o bump (não especificar
  // mecânica de UX) voltaria em silêncio.
  it("o texto vigente está publicado no histórico, palavra por palavra", () => {
    // O que o banco grava é a VERSÃO; o texto de cada uma só existe aqui. Sem
    // este arquivo, responder "o que eu aceitei em marketing-v1.0?" (LGPD
    // art. 9º, VIII) dependeria de reconstituir o git blame.
    expect(historico).toContain(MARKETING_CONSENT_TEXT)
  })

  it("o histórico registra a versão vigente", () => {
    expect(historico).toContain(MARKETING_CONSENT_VERSION)
  })

  it("o texto de cada versão anterior segue publicado", () => {
    // Remover um texto histórico apaga a prova do que aquele lead aceitou.
    for (const versao of KNOWN_MARKETING_CONSENT_VERSIONS) {
      expect(historico).toContain(versao)
    }
  })
})
