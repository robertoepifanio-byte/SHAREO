/**
 * GET|POST /api/engagement/unsubscribe?email=…&token=…
 *
 * Descadastro dos e-mails de reengajamento (digest de favoritos, lembrete de
 * avaliação, sugestão de similares).
 *
 * Por que existe:
 *   (a) LGPD art. 18 — revogar tem que ser tão fácil quanto consentir. Esses
 *       e-mails são comunicação opcional, não execução do contrato;
 *   (b) regras de bulk sender de Gmail/Yahoo — exigem List-Unsubscribe com
 *       one-click. Sem isso o provedor tende a marcar como spam, e o remetente
 *       é o MESMO da confirmação de reserva e do reset de senha
 *       (noreply@shareo.com.br): a reputação queimada derruba os dois.
 *
 * O protocolo (GET confirma, POST aplica, HTML autocontido, idempotência) vive
 * em `lib/unsubscribe-route.ts`, compartilhado com a rota de Fundadores. Aqui
 * fica só o efeito no banco e a copy.
 *
 * 🪤 NÃO desliga e-mail transacional. Quem se descadastra aqui continua
 * recebendo confirmação de reserva, cobrança e reset de senha — desligar isso
 * quebraria a locação de quem só queria menos propaganda.
 */
import { prisma } from "@/lib/prisma"
import { engagementUnsubscribe } from "@/lib/engagement-unsubscribe"
import { makeUnsubscribeHandlers } from "@/lib/unsubscribe-route"

export const runtime = "nodejs"

export const { GET, POST } = makeUnsubscribeHandlers({
  label: "/api/engagement/unsubscribe",
  link:  engagementUnsubscribe,

  async apply(email) {
    // 🪤 `mode: "insensitive"` não é zelo: o cadastro (`app/api/auth/register`)
    // grava o e-mail VERBATIM, sem normalizar, enquanto o token é assinado
    // sobre a forma minúscula. Com match exato, quem se cadastrou como
    // `Roberto@Gmail.com` receberia a página "pronto, descadastrado" enquanto o
    // `UPDATE` casava zero linhas e os e-mails continuavam chegando. Opt-out
    // que mente é pior que opt-out ausente.
    //
    // `updateMany` e não `update`: com token válido, e-mail que não existe mais
    // na base responde sucesso em vez de estourar P2025 — e não revela se a
    // conta existe.
    await prisma.user.updateMany({
      where: { email: { equals: email, mode: "insensitive" }, engagementEmailsOptOut: false },
      data:  { engagementEmailsOptOut: true },
    })
  },

  copy: {
    confirmTitle: "Desligar estes avisos?",
    confirmBody:
      'Você deixará de receber o resumo de favoritos, sugestões de itens e lembretes de avaliação. <strong>Avisos sobre suas reservas continuam chegando</strong> — confirmação, devolução e pagamento fazem parte da locação.',
    confirmButton: "Sim, desligar",
    successTitle: "Pronto — avisos desligados",
    successBody:
      'Não enviaremos mais o resumo de favoritos, sugestões de itens nem lembretes de avaliação. <strong>Avisos sobre suas reservas continuam chegando</strong> — confirmação, devolução e pagamento fazem parte da locação. Mudou de ideia? É só religar em <a href="/perfil/notificacoes" style="color:#007B3C">Meu Perfil → Notificações</a>.',
    invalidBody:
      'Este link de descadastro não é válido ou expirou. Você também pode desligar estes avisos em <a href="/perfil/notificacoes" style="color:#007B3C">Meu Perfil → Notificações</a>.',
  },
})
