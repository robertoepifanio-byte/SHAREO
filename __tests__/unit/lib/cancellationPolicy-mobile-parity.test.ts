/**
 * Paridade entre lib/cancellationPolicy.ts (web) e apps/mobile/lib/cancellationPolicy.ts.
 *
 * getCancellationPolicyLines() é dado puro (sem JSX), copiado verbatim para o
 * app por não dar pra importar direto de fora de apps/mobile (bundler do
 * Expo). Sem este teste, uma mudança de texto num lado só chega ao outro se
 * alguém lembrar de grepar — achado da revisão /simplify de 25/08/2026.
 */
import { getCancellationPolicyLines as web } from "@/lib/cancellationPolicy"
import { getCancellationPolicyLines as mobile } from "../../../apps/mobile/lib/cancellationPolicy"

it("as duas cópias de getCancellationPolicyLines() são idênticas", () => {
  expect(mobile()).toEqual(web())
})
