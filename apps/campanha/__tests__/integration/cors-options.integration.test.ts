/**
 * @jest-environment node
 *
 * Teste de integração de rede — CORS via preflight HTTP real.
 *
 * # Por que este arquivo não está no gate de CI
 *
 * Este teste bate em `OPTIONS /api/founders/leads` num servidor em execução.
 * Exige rede e um deploy de staging (ou dev local) disponível. Rodar em CI
 * sem servidor levaria a falsos negativos intermitentes dependendo de latência
 * e disponibilidade do Vercel.
 *
 * # Por que não é um spec Playwright
 *
 * Playwright é para jornadas de usuário num browser real — carregar página,
 * clicar, preencher. Um preflight OPTIONS é uma chamada HTTP nua: não envolve
 * interface, não precisa de renderer e não se beneficia da abstração de página
 * do Playwright. Um teste Jest com `fetch` nativo é mais simples, mais rápido
 * e mais legível para este caso.
 *
 * # Comportamento coberto (complementa os testes unitários de lib/cors-campanha.ts)
 *
 * Os testes unitários em __tests__/unit/lib/cors-campanha.test.ts já cobrem
 * a lógica de `origemPermitida`, `corsHeaders`, `comCors` e `respostaPreflight`
 * em isolamento. Este arquivo valida que o handler HTTP de rota (`OPTIONS` em
 * app/api/founders/leads/route.ts) está de fato chamando `respostaPreflight`
 * e devolvendo os cabeçalhos corretos no wire.
 *
 * # Como executar
 *
 *   # Contra o staging
 *   INTEGRATION_TEST_URL=https://shareo-rouge.vercel.app \
 *   CAMPANHA_ORIGIN=https://shareo-campanha.vercel.app \
 *   jest --testPathPattern integration --config apps/campanha/jest.config.ts
 *
 *   # Contra dev local (precisa de CAMPANHA_ORIGINS no .env.local)
 *   INTEGRATION_TEST_URL=http://localhost:3000 \
 *   CAMPANHA_ORIGIN=http://localhost:3007 \
 *   jest --testPathPattern integration --config apps/campanha/jest.config.ts
 */

const BASE_URL = process.env.INTEGRATION_TEST_URL
const ORIGIN_OK = process.env.CAMPANHA_ORIGIN ?? "https://shareo-campanha.vercel.app"
const TARGET = `${BASE_URL}/api/founders/leads`

/**
 * Pula o suite inteiro quando o servidor não está configurado.
 * Isso garante que `jest --testPathPattern integration` não quebre
 * em máquinas sem a env var.
 */
const describeIfLive = BASE_URL ? describe : describe.skip

describeIfLive("CORS preflight — OPTIONS /api/founders/leads (integração de rede)", () => {
  const timeout = 15_000

  it(
    "origem permitida → 204 com Access-Control-Allow-Origin e Vary: Origin",
    async () => {
      const res = await fetch(TARGET, {
        method: "OPTIONS",
        headers: { Origin: ORIGIN_OK, "Access-Control-Request-Method": "POST" },
      })

      expect(res.status).toBe(204)
      expect(res.headers.get("Access-Control-Allow-Origin")).toBe(ORIGIN_OK)
      expect(res.headers.get("Vary")).toContain("Origin")
      expect(res.headers.get("Access-Control-Allow-Methods")).toContain("POST")
    },
    timeout,
  )

  it(
    "origem não listada → 403 sem Access-Control-Allow-Origin",
    async () => {
      const res = await fetch(TARGET, {
        method: "OPTIONS",
        headers: {
          Origin: "https://evil.example.com",
          "Access-Control-Request-Method": "POST",
        },
      })

      expect(res.status).toBe(403)
      expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull()
    },
    timeout,
  )

  it(
    "sem header Origin → 403 sem Access-Control-Allow-Origin",
    async () => {
      const res = await fetch(TARGET, {
        method: "OPTIONS",
        headers: { "Access-Control-Request-Method": "POST" },
      })

      // Sem Origin, origemPermitida(null) → null → 403.
      expect(res.status).toBe(403)
      expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull()
    },
    timeout,
  )
})
