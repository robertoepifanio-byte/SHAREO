/**
 * P3-75 — Cron de reengajamento via Resend.
 *
 * Roda diariamente às 10h UTC (07h BRT — ver vercel.json). Seis geradores:
 *   1d       → lembrete de avaliação da locação concluída
 *   evento   → preço do favorito caiu >=10%
 *   evento   → favorito voltou ao catálogo
 *   3d       → "ainda interessado?", uma única vez por item favoritado
 *   7d       → sugestão de itens similares
 *   mensal   → digest dos favoritos ativos (o único sem evento por trás)
 *
 * Este arquivo só monta consultas e copy. As três garantias que faltavam — não
 * reenviar, teto de 1 e-mail por usuário a cada 7 dias e respeito ao
 * descadastro — vivem em `lib/engagement-email.ts`, e valem para qualquer
 * gerador que use `sendEngagementEmail`, inclusive os que ainda não existem.
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
import { ctaButton, testAccountEmailFilter } from "@/lib/email"
import {
  sendEngagementEmail,
  runEngagementBatch,
  bookingDedupeKey,
  monthlyDedupeKey,
  nudgeDedupeKey,
  priceDropDedupeKey,
  backInStockDedupeKey,
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
 * Quem pode receber e-mail de reengajamento.
 *
 * Repete no `where` o que `sendEngagementEmail` já barraria no `INSERT` do
 * claim — de propósito. Sem isso, as vagas do lote são gastas com gente que
 * seria recusada de qualquer forma, e quem tinha direito fica para o dia
 * seguinte. A garantia continua sendo a do banco; isto é só economia de lote.
 */
const ELIGIBLE_USER = {
  engagementEmailsOptOut: false,
  // Endereço nunca confirmado é a maior fonte de hard bounce, e bounce pesa
  // mais nas regras de bulk sender do Gmail que a ausência de List-Unsubscribe.
  emailVerified: { not: null },
} as const

/**
 * Exclui itens de contas de teste — as fixtures E2E e as ~164 contas do robô de
 * validação diária, que publicam itens no mesmo banco do staging.
 *
 * 🪤 NÃO resolve item de teste criado por gente de verdade. Um usuário real que
 * publica um anúncio chamado "item teste" continua entrando no digest, porque
 * não existe no schema nada que distinga anúncio sério de rascunho de teste.
 * Isso é dado, não código.
 */
const NOT_TEST_OWNER = { owner: { NOT: testAccountEmailFilter() } }

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

/**
 * Corpo dos e-mails que falam de UM item: saudação, uma frase, e o botão.
 *
 * Os três gatilhos de evento só diferem na frase do meio. Sem isto, cada
 * gatilho novo recopia a saudação e o CTA — e foi copiando `<a>` de texto puro
 * que os e-mails do cron ficaram com alvo de toque abaixo dos 44px do design
 * system, enquanto os 15 templates transacionais usam `ctaButton`.
 */
function itemEmailBody(name: string | null, item: { id: string }, sentence: string): string {
  return `
    <p>Olá, ${firstName(name)}!</p>
    <p>${sentence}</p>
    ${ctaButton(itemUrl(item), "Ver o anúncio")}
  `
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
        bodyHtml: `
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
        bodyHtml: `
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
 * próprio `where` os três casos que `sendEngagementEmail` recusaria de qualquer
 * forma: quem já recebeu o digest do mês, quem está bloqueado pelo teto da
 * semana e quem se descadastrou. Sem esses filtros as 200 vagas do lote seriam
 * gastas com gente inelegível, e quem tinha direito ficaria para o dia seguinte.
 */
async function sendFavoriteDigest(): Promise<EngagementTally> {
  const dedupeKey = monthlyDedupeKey()
  const cappedSince = new Date(Date.now() - ENGAGEMENT_CAP_DAYS * 24 * 60 * 60 * 1000)

  const users = await prisma.user.findMany({
    where: {
      favorites: { some: { item: { status: "AVAILABLE", ...NOT_TEST_OWNER } } },
      ...ELIGIBLE_USER,
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
        where:   { item: { status: "AVAILABLE", ...NOT_TEST_OWNER } },
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
        bodyHtml: `
          <p>Olá, ${firstName(u.name)}!</p>
          <p>${copy.lead}</p>
          <ul>${rows}</ul>
          <p><a href="${APP_URL}/favoritos">Ver meus favoritos →</a></p>
        `,
      },
    )
  })
}

// ─── Gatilhos de evento ──────────────────────────────────────────────────────
//
// Os três geradores abaixo são a diferença entre um e-mail que responde a algo
// que aconteceu e um que só marca o calendário. O e-mail antigo dizia "está
// disponível!" sobre um fato que nunca mudava — por isso cansava na segunda
// leitura, mesmo que a cadência fosse boa.

/**
 * D+3 do favorito, uma única vez: "ainda interessado?".
 *
 * Não avisa nada de novo sobre o item — o evento aqui é o tempo passar sem a
 * pessoa voltar. Por isso é UMA vez por item, nunca repete: um segundo lembrete
 * já não teria evento nenhum por trás, e vira a repetição que este trabalho
 * existe para eliminar.
 */
async function sendFavoriteNudges(): Promise<EngagementTally> {
  const favorites = await prisma.favorite.findMany({
    where: {
      // 🪤 Janela de 3 A 7 dias, não de um dia só. Com um dia, bastava o teto
      // semanal bloquear naquela data e o nudge daquele favorito nunca mais
      // saía — no dia seguinte ele já estava fora da janela. A chave
      // `nudge:<itemId>` é quem garante "uma vez só", não o tamanho da janela.
      createdAt: { gte: daysAgo(7), lte: daysAgoEnd(3) },
      item:      { status: "AVAILABLE", ...NOT_TEST_OWNER },
      user:      ELIGIBLE_USER,
    },
    select: {
      userId: true,
      user:   { select: { email: true, name: true } },
      item:   { select: { id: true, title: true, pricePerDay: true } },
    },
    take: BATCH,
  })

  if (favorites.length === 0) return { sent: 0, skipped: 0, errors: 0 }

  // Quem já alugou o item não pode receber "ainda interessado?". UMA consulta
  // para o lote inteiro, não uma por candidato.
  //
  // 🪤 `OR` de pares exatos, e não `in` de cada lado: dois `in` formam produto
  // cartesiano e trazem todo o histórico de reserva dos 200 locatários do lote
  // — sem `take`, numa lambda com ~3 conexões de pool. O resultado seria
  // correto (os pares vêm de reservas reais), mas o volume não tem teto.
  //
  // Reserva CANCELADA não silencia: quem tentou alugar e não conseguiu é
  // justamente quem ainda pode estar interessado.
  const booked = await prisma.booking.findMany({
    where: {
      OR:     favorites.map((f) => ({ borrowerId: f.userId, itemId: f.item.id })),
      status: { not: "CANCELLED" },
    },
    select: { borrowerId: true, itemId: true },
  })
  const alreadyBooked = new Set(booked.map((b) => `${b.borrowerId}|${b.itemId}`))

  return runEngagementBatch(favorites, async (f) => {
    if (!f.user.email) return "skipped"
    if (alreadyBooked.has(`${f.userId}|${f.item.id}`)) return "skipped"

    return sendEngagementEmail(
      { userId: f.userId, kind: "FAVORITE_NUDGE", dedupeKey: nudgeDedupeKey(f.item.id) },
      {
        to:      f.user.email,
        subject: `Ainda de olho no ${f.item.title}?`,
        bodyHtml: itemEmailBody(
          f.user.name,
          f.item,
          `Você salvou <strong>${f.item.title}</strong> há alguns dias. Ele segue disponível por ${formatPrice(f.item.pricePerDay)}/dia.`,
        ),
      },
    )
  })
}

/**
 * Preço caiu 10% ou mais desde a última referência.
 *
 * 🪤 A referência é CATRACA: `favorites.priceReference` avança para o preço
 * novo a cada aviso enviado. Com referência fixa no preço original, o gatilho
 * dispara em ALTA — um item que cai de R$60 para R$40 e depois SOBE para R$50
 * ainda satisfaz `50 <= 60 * 0.9` e manda um segundo e-mail dizendo "17% mais
 * barato", logo depois de ter dito 33%. Simulado com um dono oscilando o preço:
 * 5 e-mails onde cabem 2, e três deles anunciando queda sobre um aumento.
 *
 * 🪤 SQL cru porque a comparação é entre DUAS COLUNAS de tabelas diferentes
 * (`items.pricePerDay` contra `favorites.priceReference`), e o Prisma não
 * expressa isso no `where`. A alternativa seria trazer todos os favoritos com
 * preço registrado e filtrar em JS — carga sem teto para achar as poucas linhas
 * que interessam.
 */
async function sendPriceDropAlerts(): Promise<EngagementTally> {
  // O SQL cru faz SÓ o que o Prisma não expressa — a comparação entre duas
  // colunas — e devolve pares. A elegibilidade fica na consulta tipada abaixo,
  // reusando `ELIGIBLE_USER`/`NOT_TEST_OWNER`: reescrita em SQL, ela seria a
  // única cópia das regras fora do alcance do compilador, e acrescentar uma
  // quarta regra amanhã exigiria lembrar deste bloco.
  //
  // `ORDER BY` explícito porque `LIMIT` sem ordem devolve linhas arbitrárias:
  // quando houver mais candidatos que o lote, o recorte precisa ser previsível.
  const pairs = await prisma.$queryRaw<{ userId: string; itemId: string }[]>`
    SELECT f."userId", f."itemId"
    FROM "favorites" f
    JOIN "items" i ON i."id" = f."itemId"
    WHERE f."priceReference" IS NOT NULL
      AND i."status" = 'AVAILABLE'
      AND i."pricePerDay" <= f."priceReference" * 0.9
    ORDER BY f."createdAt" ASC
    LIMIT ${BATCH}
  `

  if (pairs.length === 0) return { sent: 0, skipped: 0, errors: 0 }

  const drops = await prisma.favorite.findMany({
    where: {
      OR:   pairs.map((x) => ({ userId: x.userId, itemId: x.itemId })),
      user: ELIGIBLE_USER,
      item: NOT_TEST_OWNER,
    },
    select: {
      userId:         true,
      priceReference: true,
      user:           { select: { email: true, name: true } },
      item:           { select: { id: true, title: true, pricePerDay: true } },
    },
  })

  return runEngagementBatch(drops, async (d) => {
    if (!d.user.email || d.priceReference === null) return "skipped"
    const off = Math.round((1 - d.item.pricePerDay / d.priceReference) * 100)

    const outcome = await sendEngagementEmail(
      {
        userId:    d.userId,
        kind:      "FAVORITE_PRICE_DROP",
        dedupeKey: priceDropDedupeKey(d.item.id, d.item.pricePerDay),
      },
      {
        to:      d.user.email,
        subject: `${d.item.title} está ${off}% mais barato`,
        bodyHtml: itemEmailBody(
          d.user.name,
          d.item,
          `O preço de <strong>${d.item.title}</strong>, que você salvou, caiu de ${formatPrice(d.priceReference)} para <strong>${formatPrice(d.item.pricePerDay)}</strong> por dia.`,
        ),
      },
    )

    // Avança a catraca só quando o e-mail saiu de fato. Se o envio foi pulado
    // (teto, descadastro) ou falhou, a referência fica onde está e a queda
    // continua elegível amanhã.
    if (outcome === "sent") {
      await prisma.favorite.update({
        where: { userId_itemId: { userId: d.userId, itemId: d.item.id } },
        data:  { priceReference: d.item.pricePerDay },
      })
    }

    return outcome
  })
}

/**
 * Item favoritado voltou ao catálogo depois de ter saído.
 *
 * Este é o e-mail que o original TENTAVA ser. A diferença é `availableSince`:
 * antes só dava para saber que o item ESTAVA disponível — verdade permanente,
 * portanto não-notícia — e agora dá para saber que ele VOLTOU.
 */
async function sendBackInStockAlerts(): Promise<EngagementTally> {
  const favorites = await prisma.favorite.findMany({
    where: {
      item: {
        status:         "AVAILABLE",
        availableSince: { gte: daysAgo(1) },
        ...NOT_TEST_OWNER,
      },
      user: ELIGIBLE_USER,
    },
    // `LIMIT` sem ordem devolve linhas arbitrárias: se um dono despausar mais
    // de 200 itens no mesmo dia, o recorte precisa ser previsível — a janela
    // desliza amanhã e o que ficou de fora não volta.
    orderBy: { createdAt: "asc" },
    select: {
      userId:    true,
      createdAt: true,
      user:      { select: { email: true, name: true } },
      item:      { select: { id: true, title: true, pricePerDay: true, availableSince: true } },
    },
    take: BATCH,
  })

  return runEngagementBatch(favorites, async (f) => {
    if (!f.user.email || !f.item.availableSince) return "skipped"
    // Quem favoritou DEPOIS do retorno viu o item já disponível — para essa
    // pessoa não houve volta nenhuma. Comparação em JS porque o Prisma não
    // compara duas colunas no `where`, e o conjunto aqui é pequeno.
    if (f.createdAt >= f.item.availableSince) return "skipped"

    return sendEngagementEmail(
      {
        userId:    f.userId,
        kind:      "FAVORITE_BACK",
        dedupeKey: backInStockDedupeKey(f.item.id, f.item.availableSince),
      },
      {
        to:      f.user.email,
        subject: `${f.item.title} voltou a ficar disponível`,
        bodyHtml: itemEmailBody(
          f.user.name,
          f.item,
          `<strong>${f.item.title}</strong>, que você salvou, estava fora do ar e voltou ao catálogo por ${formatPrice(f.item.pricePerDay)}/dia.`,
        ),
      },
    )
  })
}

// ─── Handler ─────────────────────────────────────────────────────────────────

const GENERATORS = [
  // Ordem = prioridade na disputa pela cota semanal. Evento real vence
  // calendário: o digest mensal é o último a gastar a vaga, porque é o único
  // que não responde a nada que tenha acontecido.
  { name: "review", run: sendReviewReminders },
  { name: "priceDrop", run: sendPriceDropAlerts },
  { name: "backInStock", run: sendBackInStockAlerts },
  { name: "nudge", run: sendFavoriteNudges },
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
