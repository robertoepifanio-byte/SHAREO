/**
 * Porta única dos e-mails de reengajamento.
 *
 * Cobre as garantias que faltavam no cron `/api/cron/reengagement`:
 *
 *   1. NÃO REENVIAR — cada e-mail sai no máximo uma vez por (usuário, tipo,
 *      chave). Antes não havia registro nenhum de envio: o aviso de favorito
 *      consultava "favoritos com mais de 30 dias" e reenviava a cada execução
 *      diária, indefinidamente, um e-mail por item favoritado.
 *   2. TETO GLOBAL — no máximo um e-mail de reengajamento por usuário a cada 7
 *      dias, somando TODOS os tipos. Sem isso os geradores do cron podiam cair
 *      na mesma caixa no mesmo minuto, cada um se achando comedido.
 *   3. DESCADASTRO — quem marcou `engagementEmailsOptOut` não recebe. Cadência
 *      não substitui consentimento: "1 por semana" é volume, não base legal.
 *
 * `sendEngagementEmail` é a ÚNICA forma de enviar respeitando as três. Ela mora
 * aqui, e não na rota, de propósito: o gerador que alguém escrever no ano que
 * vem importa esta função e ganha as garantias de graça. Se o controle vivesse
 * dentro do handler, o próximo remetente precisaria lembrar que ele existe — e
 * é exatamente esse tipo de "lembrar" que produziu o bug original.
 *
 * ⚠️ Só para e-mail de MARKETING/REENGAJAMENTO. Transacional — verificação de
 * conta, reset de senha, confirmação de reserva, cobrança — não passa por aqui:
 * sai sempre, sem teto e sem descadastro.
 */
import crypto from "crypto"
import type { EngagementEmailKind } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { sendMarketingEmail } from "@/lib/email"

/** Janela do teto global: um e-mail de reengajamento a cada 7 dias. */
export const ENGAGEMENT_CAP_DAYS = 7

/**
 * Envios simultâneos por lote — o mesmo teto do cron `reminders`, pelo mesmo
 * motivo: o pool do Prisma numa lambda tem ~3 conexões, e disparar 200 `INSERT`
 * mais 200 chamadas ao Resend de uma vez estoura os dois.
 */
const CONCURRENCY = 10

export type EngagementClaim = {
  userId: string
  kind: EngagementEmailKind
  dedupeKey: string
}

export type EngagementOutcome = "sent" | "skipped"

export type EngagementTally = {
  /** E-mails efetivamente aceitos pelo provedor. */
  sent: number
  /** Recusados pela reserva: já enviados, teto da semana, ou descadastro. */
  skipped: number
  /** Falhas de envio; a reserva foi devolvida e o cron tenta de novo amanhã. */
  errors: number
}

// ─── Chaves de dedupe ────────────────────────────────────────────────────────

/**
 * A chave é o que a restrição UNIQUE compara, então ela não pode ser string
 * solta digitada em cada chamador: quem escrevesse `bookings:123` em vez de
 * `booking:123` criaria uma chave nova, o `INSERT` passaria limpo e o e-mail
 * sairia de novo para todo mundo — sem erro nenhum, que é a assinatura exata do
 * bug que esta tabela existe para impedir. Os construtores abaixo são a única
 * origem de chave válida.
 */
export function bookingDedupeKey(bookingId: string): string {
  return `booking:${bookingId}`
}

/** Um digest por usuário por mês civil (UTC — o servidor não usa hora local). */
export function monthlyDedupeKey(now = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`
}

/**
 * "Ainda interessado?" — uma vez por item favoritado, nunca repete.
 *
 * Prefixo próprio (`nudge:`), como os irmãos `price:` e `back:`. O nome genérico
 * anterior (`itemDedupeKey` → `item:`) convidava o próximo gerador por item a
 * reusar a mesma chave sem perceber que estaria compartilhando identidade.
 */
export function nudgeDedupeKey(itemId: string): string {
  return `nudge:${itemId}`
}

/**
 * Queda de preço: a chave inclui o preço NOVO, então uma segunda queda no mesmo
 * item volta a ser notícia. Sem o preço na chave, o item avisaria uma vez e
 * ficaria mudo para sempre, mesmo caindo de novo pela metade.
 */
export function priceDropDedupeKey(itemId: string, newPriceCents: number): string {
  return `price:${itemId}:${newPriceCents}`
}

/**
 * Volta ao catálogo: a chave inclui a data do retorno, então um item que sai e
 * volta de novo semanas depois avisa outra vez — é evento novo.
 */
export function backInStockDedupeKey(itemId: string, availableSince: Date): string {
  return `back:${itemId}:${availableSince.toISOString().slice(0, 10)}`
}

// ─── Reserva ─────────────────────────────────────────────────────────────────

/**
 * Reserva o direito de enviar, em UMA instrução.
 *
 * Os dois `WHERE NOT EXISTS` aplicam o teto e o descadastro, e o `ON CONFLICT`
 * aplica o dedupe — as três regras dentro do mesmo `INSERT`. A versão anterior
 * fazia `count` e depois `create`: dois round-trips e uma janela entre eles em
 * que dois envios do mesmo lote passavam pela contagem antes de qualquer um
 * gravar.
 *
 * O descadastro entra AQUI, e não numa checagem separada no chamador, pelo
 * mesmo motivo que o teto: é a única forma de um gerador novo não conseguir
 * esquecer dele. Custo zero — a condição entra na instrução que já ia rodar.
 *
 * 🪤 Ainda NÃO é exclusão mútua perfeita: em READ COMMITTED, duas transações
 * simultâneas podem avaliar o `NOT EXISTS` antes de qualquer commit e ambas
 * inserir, com chaves diferentes. A janela caiu de dois round-trips para uma
 * instrução, e o custo do caso raro é um e-mail a mais numa semana — não o laço
 * infinito de antes. Fechar de vez exigiria `SERIALIZABLE` ou lock por usuário,
 * caro demais para um cron diário.
 *
 * O `id` vem daqui porque `@default(cuid())` do Prisma é gerado no cliente e
 * não existe no SQL cru; a coluna é TEXT e não impõe formato.
 */
async function claim(c: EngagementClaim): Promise<boolean> {
  const since = new Date(Date.now() - ENGAGEMENT_CAP_DAYS * 24 * 60 * 60 * 1000)

  const inserted = await prisma.$executeRaw`
    INSERT INTO "engagement_emails" ("id", "userId", "kind", "dedupeKey", "sentAt")
    SELECT ${crypto.randomUUID()}, ${c.userId}, ${c.kind}::"EngagementEmailKind", ${c.dedupeKey}, NOW()
    WHERE NOT EXISTS (
      SELECT 1 FROM "engagement_emails"
      WHERE "userId" = ${c.userId} AND "sentAt" >= ${since}
    )
    AND NOT EXISTS (
      SELECT 1 FROM "users"
      WHERE "id" = ${c.userId} AND "engagementEmailsOptOut" = true
    )
    ON CONFLICT ("userId", "kind", "dedupeKey") DO NOTHING
  `

  return inserted === 1
}

/**
 * Devolve a reserva quando o envio falhou, para o cron tentar de novo amanhã.
 *
 * Sem isso, uma indisponibilidade momentânea do provedor queimaria o e-mail
 * daquela pessoa para sempre — a chave de dedupe é estável, então a segunda
 * tentativa bateria na restrição UNIQUE e seria lida como "já enviado".
 *
 * Silencioso por escolha: se a remoção falhar, alguém deixa de receber um
 * e-mail de reengajamento. Não vale derrubar a execução, que ainda tem outros
 * destinatários para atender.
 */
async function release(c: EngagementClaim): Promise<void> {
  await prisma.engagementEmail
    .delete({
      where: { userId_kind_dedupeKey: { userId: c.userId, kind: c.kind, dedupeKey: c.dedupeKey } },
    })
    .catch(() => {})
}

// ─── Envio ───────────────────────────────────────────────────────────────────

/**
 * Reserva → envia → devolve a reserva se o envio falhou.
 *
 * Reserva ANTES de enviar, de propósito: se a chamada ao provedor estourar no
 * meio, o pior caso é um e-mail a menos. A ordem inversa tem como pior caso o
 * e-mail duplicado — o problema que esta tabela existe para impedir.
 *
 * Lança quando o provedor falha, para o chamador contabilizar como erro.
 */
export async function sendEngagementEmail(
  c: EngagementClaim,
  payload: { to: string; subject: string; bodyHtml: string },
): Promise<EngagementOutcome> {
  if (!(await claim(c))) return "skipped"

  // 🪤 O `try` cobre EXCEÇÃO, não só o `{ error }` devolvido. `sendMarketingEmail`
  // monta a URL de descadastro antes de enviar, e isso LANÇA quando AUTH_SECRET
  // está ausente — que já aconteceu por 25 dias em produção. Sem o catch, a
  // reserva ficaria gravada sem envio nenhum e, como a chave de dedupe é
  // estável, aquele e-mail estaria perdido para sempre: o lembrete de avaliação
  // daquela locação nunca mais sairia.
  let error: { message: string } | null
  try {
    ;({ error } = await sendMarketingEmail(payload))
  } catch (e) {
    await release(c)
    throw e
  }

  if (error) {
    await release(c)
    throw new Error(error.message)
  }
  return "sent"
}

/**
 * Percorre os candidatos em lotes e contabiliza os três desfechos.
 *
 * Devolver `skipped` separado de `sent` não é preciosismo: o bug original
 * sobreviveu meses porque o cron respondia `{ ok: true }` tanto no dia em que
 * funcionava quanto no dia em que reenviava tudo. Com `sent: 0, skipped: 300`
 * dá para ver que o teto engoliu a execução inteira; com uma contagem só de
 * falhas, esse dia fica indistinguível de um dia perfeito.
 */
export async function runEngagementBatch<T>(
  rows: T[],
  send: (row: T) => Promise<EngagementOutcome>,
): Promise<EngagementTally> {
  const tally: EngagementTally = { sent: 0, skipped: 0, errors: 0 }

  for (let i = 0; i < rows.length; i += CONCURRENCY) {
    const results = await Promise.allSettled(rows.slice(i, i + CONCURRENCY).map(send))
    for (const r of results) {
      if (r.status === "rejected") tally.errors += 1
      else if (r.value === "sent") tally.sent += 1
      else tally.skipped += 1
    }
  }

  return tally
}
