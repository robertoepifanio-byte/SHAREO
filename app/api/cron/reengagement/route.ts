/**
 * P3-75 — Cron de reengajamento via Resend.
 *
 * Roda diariamente às 10h UTC (07h BRT — ver vercel.json). Três e-mails:
 *   1d       → lembrete de avaliação da locação concluída
 *   7d       → sugestão de itens similares
 *   mensal   → digest dos favoritos ativos
 *
 * Este arquivo só monta consultas e copy. As duas garantias que faltavam — não
 * reenviar e teto de 1 e-mail por usuário a cada 7 dias — vivem em
 * `lib/engagement-email.ts`, e valem para qualquer gerador que use
 * `sendEngagementEmail`, inclusive os que ainda não existem.
 *
 * 🪤 Os geradores rodam EM SEQUÊNCIA, via a lista `GENERATORS`. Com teto
 * compartilhado, paralelo faria os três consultarem o estado antes de qualquer
 * um gravar. A lista existe para que acrescentar um quarto gerador seja
 * acrescentar um item — e não lembrar de uma regra. A ordem é a de prioridade:
 * o lembrete de avaliação nasce de uma transação real e vale mais que o digest,
 * então gasta a cota primeiro.
 */

import { NextResponse } from "next/server"
import { assertCronAuth } from "@/lib/auth/cron-guard"
import { prisma } from "@/lib/prisma"
import { APP_URL } from "@/lib/app-url"
import { formatPrice } from "@/utils/format"
import {
  sendEngagementEmail,
  runEngagementBatch,
  bookingDedupeKey,
  monthlyDedupeKey,
  ENGAGEMENT_CAP_DAYS,
  type EngagementTally,
} from "@/lib/engagement-email"

export const dynamic = "force-dynamic"

// Três geradores em sequência, cada um com seu lote e suas chamadas ao Resend,
// não cabem no default da plataforma. Mesmo valor dos crons irmãos.
export const maxDuration = 60

/** Quantos destinatários um único tipo atende por execução. */
const BATCH = 200

/** Itens listados no digest — o resto fica atrás do link "ver todos". */
const DIGEST_MAX_ITEMS = 8

/**
 * Janelas de dia em UTC.
 *
 * 🪤 Usavam `setHours` (hora LOCAL). Na Vercel o processo roda em UTC, então o
 * resultado era o mesmo por acidente — mas o repositório já foi mordido 4× por
 * data ancorada em fuso implícito, e o cron irmão `reminders` usa `setUTCHours`.
 * Fuso explícito no servidor, sempre.
 */
function daysAgo(n: number) {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - n)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

function daysAgoEnd(n: number) {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - n)
  d.setUTCHours(23, 59, 59, 999)
  return d
}

/** Locação concluída no dia `n` — o gatilho dos dois primeiros geradores. */
function completedOn(n: number) {
  return { status: "COMPLETED" as const, updatedAt: { gte: daysAgo(n), lte: daysAgoEnd(n) } }
}

function firstName(name: string | null): string {
  return name?.trim().split(" ")[0] ?? ""
}

/**
 * 🪤 Link pelo ID, nunca pelo slug. `app/itens/[id]/page.tsx` consulta
 * `where: { id }` e não resolve slug em lugar nenhum — o `slug ?? id` que
 * estava aqui gerava 404 para todo item que tivesse slug. O e-mail de itens
 * similares mandava esses links desde sempre.
 */
function itemUrl(item: { id: string }): string {
  return `${APP_URL}/itens/${item.id}`
}

// ─── Email 1d: lembrete de avaliação ────────────────────────────────────────

async function sendReviewReminders(): Promise<EngagementTally> {
  const bookings = await prisma.booking.findMany({
    where:  completedOn(1),
    select: {
      id:         true,
      borrowerId: true,
      borrower:   { select: { email: true, name: true } },
      item:       { select: { title: true } },
    },
    take: BATCH,
  })

  return runEngagementBatch(bookings, async (b) => {
    if (!b.borrower.email) return "skipped"

    return sendEngagementEmail(
      { userId: b.borrowerId, kind: "REVIEW_REMINDER", dedupeKey: bookingDedupeKey(b.id) },
      {
        to:      b.borrower.email,
        subject: `Como foi alugar "${b.item.title}"? Deixe sua avaliação`,
        html: `
          <p>Olá, ${firstName(b.borrower.name)}!</p>
          <p>Sua locação de <strong>${b.item.title}</strong> foi concluída.</p>
          <p>Avaliações ajudam a comunidade — leva menos de 1 minuto!</p>
          <p><a href="${APP_URL}/reservas/${b.id}">Avaliar agora →</a></p>
          <p>Obrigado por usar o ShareO!</p>
        `,
      },
    )
  })
}

// ─── Email 7d: sugestão de itens similares ───────────────────────────────────

async function sendSimilarItemSuggestions(): Promise<EngagementTally> {
  const bookings = await prisma.booking.findMany({
    where:  completedOn(7),
    select: {
      id:         true,
      borrowerId: true,
      borrower:   { select: { email: true, name: true } },
      item:       { select: { title: true, categoryId: true, city: true } },
    },
    take: BATCH,
  })

  return runEngagementBatch(bookings, async (b) => {
    if (!b.borrower.email) return "skipped"

    const similar = await prisma.item.findMany({
      where:   { categoryId: b.item.categoryId, city: b.item.city, status: "AVAILABLE" },
      take:    3,
      select:  { id: true, title: true, pricePerDay: true },
      orderBy: { viewCount: "desc" },
    })

    if (similar.length === 0) return "skipped"

    const itemLinks = similar
      .map((i) => `<li><a href="${itemUrl(i)}">${i.title} — ${formatPrice(i.pricePerDay)}/dia</a></li>`)
      .join("")

    return sendEngagementEmail(
      { userId: b.borrowerId, kind: "SIMILAR_ITEMS", dedupeKey: bookingDedupeKey(b.id) },
      {
        to:      b.borrower.email,
        subject: `Você pode gostar: itens similares ao "${b.item.title}"`,
        html: `
          <p>Olá, ${firstName(b.borrower.name)}!</p>
          <p>Com base na sua última locação, selecionamos alguns itens em <strong>${b.item.city}</strong>:</p>
          <ul>${itemLinks}</ul>
          <p><a href="${APP_URL}/itens">Ver mais →</a></p>
        `,
      },
    )
  })
}

// ─── Digest mensal dos favoritos ─────────────────────────────────────────────

/**
 * Substitui o antigo "item favoritado disponível", que saía POR ITEM: quem
 * tinha 12 favoritos recebia 12 e-mails no mesmo minuto. Agora é UM e-mail por
 * pessoa, com todos os favoritos ainda disponíveis.
 *
 * A seleção parte do usuário — e não dos favoritos — para poder excluir no
 * próprio `where` quem já recebeu o digest do mês E quem está bloqueado pelo
 * teto da semana. Sem os dois filtros, as 200 vagas do lote seriam gastas com
 * gente que `sendEngagementEmail` vai recusar de qualquer forma, e quem tinha
 * direito ficaria para o dia seguinte.
 */
async function sendFavoriteDigest(): Promise<EngagementTally> {
  const dedupeKey = monthlyDedupeKey()
  const cappedSince = new Date(Date.now() - ENGAGEMENT_CAP_DAYS * 24 * 60 * 60 * 1000)

  const users = await prisma.user.findMany({
    where: {
      favorites: { some: { item: { status: "AVAILABLE" } } },
      AND: [
        { engagementEmails: { none: { kind: "FAVORITE_DIGEST", dedupeKey } } },
        { engagementEmails: { none: { sentAt: { gte: cappedSince } } } },
      ],
    },
    select: {
      id:    true,
      email: true,
      name:  true,
      favorites: {
        where:   { item: { status: "AVAILABLE" } },
        orderBy: { createdAt: "desc" },
        take:    DIGEST_MAX_ITEMS,
        select:  { item: { select: { id: true, title: true, pricePerDay: true } } },
      },
    },
    take: BATCH,
  })

  return runEngagementBatch(users, async (u) => {
    if (!u.email || u.favorites.length === 0) return "skipped"

    const rows = u.favorites
      .map((f) => `<li><a href="${itemUrl(f.item)}">${f.item.title}</a> — ${formatPrice(f.item.pricePerDay)}/dia</li>`)
      .join("")

    // Uma decisão de plural, não três espalhadas pelo template.
    const copy =
      u.favorites.length > 1
        ? {
            subject: `Seus ${u.favorites.length} favoritos continuam disponíveis`,
            lead:    "Os itens que você salvou seguem disponíveis para alugar:",
          }
        : {
            subject: "Seu favorito continua disponível",
            lead:    "O item que você salvou segue disponível para alugar:",
          }

    return sendEngagementEmail(
      { userId: u.id, kind: "FAVORITE_DIGEST", dedupeKey },
      {
        to:      u.email,
        subject: copy.subject,
        html: `
          <p>Olá, ${firstName(u.name)}!</p>
          <p>${copy.lead}</p>
          <ul>${rows}</ul>
          <p><a href="${APP_URL}/favoritos">Ver meus favoritos →</a></p>
        `,
      },
    )
  })
}

// ─── Handler ─────────────────────────────────────────────────────────────────

const GENERATORS = [
  { name: "review", run: sendReviewReminders },
  { name: "similar", run: sendSimilarItemSuggestions },
  { name: "digest", run: sendFavoriteDigest },
] as const

export async function GET(req: Request) {
  // 🪤 Esta rota era a ÚNICA das 15 de cron a autenticar por QUERY STRING
  // (`?secret=`), com comparação `!==` simples. Três problemas somados:
  //
  // 1. O Vercel Cron autentica por header `Authorization: Bearer`, e a
  //    `vercel.json` chama este caminho SEM query string — ou seja, toda
  //    execução agendada respondia 401. O job nunca rodou.
  // 2. Segredo em URL vai para log (access log da Vercel, histórico, referrer).
  //    E é o MESMO `CRON_SECRET` das outras 14 rotas: vazando aqui, cai junto o
  //    cron de repasse, o de expurgo e o de cobrança.
  // 3. `!==` compara em tempo variável; `assertCronAuth` usa `timingSafeEqual`.
  const denied = assertCronAuth(req)
  if (denied) return denied

  try {
    const report: Record<string, EngagementTally> = {}
    for (const g of GENERATORS) report[g.name] = await g.run()

    return NextResponse.json({ ok: true, report })
  } catch (e) {
    console.error("[cron/reengagement]", e instanceof Error ? e.message : e)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
