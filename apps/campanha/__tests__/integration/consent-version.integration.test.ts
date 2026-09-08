/**
 * @jest-environment node
 *
 * A API aceita a versão de consentimento que esta campanha envia?
 *
 * # Por que existe
 *
 * Em 06/09/2026 a campanha passou a mandar `marketing-v1.1`. A API que ela usa
 * — a PRODUÇÃO, e não o staging — não conhecia essa versão, porque o deploy de
 * produção é pulado pelo workflow (gated por D4). Resultado: **todo lead
 * capturado virou 422 UNKNOWN_CONSENT_VERSION por ~39h, com mídia paga
 * rodando**, e o visitante via só "Erro de conexão".
 *
 * 🪤 Nenhum teste unitário pega isso, e é importante entender por quê. O teste
 * de `__tests__/unit/lib/consentimento-marketing.test.ts` afirma que a versão
 * da campanha está em `KNOWN_MARKETING_CONSENT_VERSIONS` — a lista DO
 * REPOSITÓRIO. No commit que causou o incidente, site e campanha subiram
 * juntos, então a lista do repositório já continha v1.1 e aquele teste teria
 * ficado VERDE. Quem decide o 422 é a lista do código DEPLOYADO no host que a
 * campanha chama, e isso só se descobre perguntando ao host.
 *
 * # Por que a sonda não cria lead
 *
 * `app/api/founders/leads/route.ts` roda `Schema.safeParse` antes de qualquer
 * chamada ao Prisma, e trata `consentVersion` inválida com retorno próprio
 * (422 UNKNOWN_CONSENT_VERSION) ANTES dos demais erros de campo. Mandando um
 * corpo deliberadamente inválido junto da versão real, o resultado discrimina:
 *
 *   422 UNKNOWN_CONSENT_VERSION → a API NÃO aceita a versão. Leads morrendo.
 *   400 VALIDATION_ERROR        → a API aceita; reprovou pelos campos falsos.
 *
 * Nos dois casos nada é gravado.
 *
 * # Como executar
 *
 * 🪤 O `--testPathIgnorePatterns` é obrigatório. O `jest.config.ts` da campanha
 * ignora esta pasta, então o comando documentado no teste irmão de CORS
 * (`--testPathPattern integration` sozinho) encontra ZERO testes e sai com
 * "No tests found" — verificado em 08/09/2026.
 *
 *   # Contra a produção — o alvo REAL da campanha
 *   INTEGRATION_TEST_URL=https://shareo-prod.vercel.app npx jest \
 *     --config apps/campanha/jest.config.ts \
 *     --testPathIgnorePatterns "/node_modules/" \
 *     --testPathPattern consent-version
 *
 *   # Contra o staging: trocar por https://shareo-rouge.vercel.app
 *
 * Rodar isto ANTES de subir a versão da campanha, e de novo depois — é o passo
 * que fecha o runbook de `apps/campanha/lib/legal-config.ts`.
 */

import { MARKETING_CONSENT_VERSION } from "../../lib/legal-config"

const BASE_URL = process.env.INTEGRATION_TEST_URL
const TARGET = `${BASE_URL}/api/founders/leads`

/** Pula o suite quando o alvo não foi configurado. */
const describeIfLive = BASE_URL ? describe : describe.skip

describeIfLive("versão de consentimento aceita pela API (integração de rede)", () => {
  it(
    `a API aceita "${MARKETING_CONSENT_VERSION}", a versão que esta campanha envia`,
    async () => {
      const res = await fetch(TARGET, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        // Corpo inválido de propósito: `email` quebra o schema, então a rota
        // reprova de qualquer jeito e nada é gravado. O que interessa é QUAL
        // erro ela escolhe — o de versão vem antes dos de campo.
        body: JSON.stringify({
          email:          "nao-e-um-email",
          consentVersion: MARKETING_CONSENT_VERSION,
        }),
      })

      const code = await res
        .json()
        .then((j) => (j as { error?: { code?: string } })?.error?.code)
        .catch(() => undefined)

      // A falha aqui significa: a campanha está mandando uma versão que este
      // host recusa. Todo lead capturado agora está sendo perdido.
      expect({ status: res.status, code }).not.toEqual(
        expect.objectContaining({ code: "UNKNOWN_CONSENT_VERSION" }),
      )
      expect(res.status).not.toBe(422)
    },
    15_000,
  )
})
