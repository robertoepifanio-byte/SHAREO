/**
 * Descadastro da lista de interessados (campanha de pré-lançamento).
 *
 * A mecânica vive em `lib/unsubscribe-token.ts`, compartilhada com o
 * descadastro dos e-mails de reengajamento. Aqui fica só o que é específico
 * desta lista: o propósito e o caminho da rota.
 *
 * 🪤 `PURPOSE` faz parte do token. Mudar essa string invalida todos os links de
 * descadastro já enviados pela campanha, que está no ar desde 01/09/2026.
 */
import { makeUnsubscribeLink } from "@/lib/unsubscribe-token"

export const foundersUnsubscribe = makeUnsubscribeLink(
  "founder-unsubscribe-v1",
  "/api/founders/unsubscribe",
)

// Nomes preservados: são os que `lib/email.ts` e a rota já importam.
export const unsubscribeToken       = foundersUnsubscribe.token
export const verifyUnsubscribeToken = foundersUnsubscribe.verify
export const unsubscribeUrl         = foundersUnsubscribe.url
