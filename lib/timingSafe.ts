/**
 * Comparação de strings em tempo constante.
 *
 * Estava definida três vezes com o mesmo corpo: `lib/auth/cron-guard.ts`,
 * `lib/founders-unsubscribe.ts` e o módulo novo de callback do Connect. Não é a
 * repetição de oito linhas que incomoda — é o fail-mode: as duas sutilezas
 * (guarda de tamanho antes do `timingSafeEqual`, que LANÇA em buffers de
 * tamanhos diferentes; e não vazar qual lado é maior) são invisíveis quando
 * estão certas e silenciosas quando alguém esquece uma delas na quarta cópia.
 */
import crypto from "crypto"

export function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  // timingSafeEqual exige buffers de mesmo tamanho; tamanhos diferentes já
  // provam que são distintos — retornar false sem revelar qual é maior.
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}
