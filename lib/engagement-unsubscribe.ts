/**
 * Descadastro dos e-mails de reengajamento (digest de favoritos, lembrete de
 * avaliação, sugestão de similares).
 *
 * Lista separada da campanha de Fundadores de propósito: bases legais e
 * conteúdos diferentes, e um token não vale na outra.
 *
 * 🪤 `PURPOSE` faz parte do token: mudar essa string invalida os links já
 * enviados.
 */
import { makeUnsubscribeLink } from "@/lib/unsubscribe-token"

export const engagementUnsubscribe = makeUnsubscribeLink(
  "engagement-unsubscribe-v1",
  "/api/engagement/unsubscribe",
)

export const engagementUnsubscribeToken  = engagementUnsubscribe.token
export const verifyEngagementUnsubscribeToken = engagementUnsubscribe.verify
export const engagementUnsubscribeUrl    = engagementUnsubscribe.url
