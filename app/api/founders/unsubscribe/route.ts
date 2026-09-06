/**
 * GET|POST /api/founders/unsubscribe?email=…&token=…
 *
 * Descadastro da lista de interessados do pré-lançamento.
 *
 * Por que existe: a campanha é NACIONAL e envia e-mail em volume. Isso obriga
 *   (a) LGPD art. 18 — revogação do consentimento tem que ser tão fácil quanto
 *       concedê-la; "mande e-mail para privacidade@" não sustenta isso em volume;
 *   (b) regras de bulk sender de Gmail/Yahoo — exigem List-Unsubscribe com
 *       one-click acima de ~5k destinatários/dia.
 *
 * O protocolo (GET humano / POST one-click, HTML autocontido, idempotência)
 * vive em `lib/unsubscribe-route.ts`, compartilhado com o descadastro dos
 * e-mails de reengajamento. Aqui fica só o efeito no banco e a copy.
 *
 * Sem sessão de propósito: o clique vem do cliente de e-mail, sem cookie. A
 * autenticação é o HMAC do próprio e-mail (ver lib/unsubscribe-token.ts).
 */
import { after } from "next/server"
import { revalidateTag } from "next/cache"
import { prisma } from "@/lib/prisma"
import { foundersUnsubscribe } from "@/lib/founders-unsubscribe"
import { makeUnsubscribeHandlers } from "@/lib/unsubscribe-route"

export const runtime = "nodejs"

export const { GET, POST } = makeUnsubscribeHandlers({
  label: "/api/founders/unsubscribe",
  link:  foundersUnsubscribe,

  async apply(email) {
    const lead = await prisma.founderLead.findUnique({
      where:  { email },
      select: { id: true, status: true },
    })

    // Não vaza se o e-mail existe ou não — token válido sempre responde sucesso.
    if (!lead || lead.status === "UNSUBSCRIBED") return

    await prisma.founderLead.update({
      where: { id: lead.id },
      data:  { status: "UNSUBSCRIBED" },
    })

    after(() =>
      prisma.founderAuditLog
        .create({ data: { leadId: lead.id, action: "UNSUBSCRIBED" } })
        .catch(() => {}),
    )
    revalidateTag("founders")
  },

  copy: {
    successTitle: "Tudo certo — você saiu da lista",
    successBody:
      "Não enviaremos mais e-mails sobre o lançamento do ShareO. Mudou de ideia? É só entrar na lista de novo pelo site.",
    invalidBody:
      'Este link de descadastro não é válido ou expirou. Se quiser sair da lista, responda a qualquer e-mail nosso ou escreva para <a href="mailto:privacidade@shareo.com.br" style="color:#007B3C">privacidade@shareo.com.br</a>.',
  },
})
