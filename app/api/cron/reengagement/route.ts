/**
 * P3-75 — Cron de reengajamento pós-aluguel via Resend.
 *
 * Roda diariamente às 10h (vercel.json).
 * Envia até 3 emails por locação concluída:
 *   1d  → lembrete de avaliação
 *   7d  → sugestão de itens similares
 *   30d → aviso de item favoritado disponível
 */

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM   = "ShareO <noreply@shareo.com.br>"

function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(0, 0, 0, 0)
  return d
}

function daysAgoEnd(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(23, 59, 59, 999)
  return d
}

// ─── Email 1d: lembrete de avaliação ────────────────────────────────────────

async function sendReviewReminders() {
  const bookings = await prisma.booking.findMany({
    where: {
      status:    "COMPLETED",
      updatedAt: { gte: daysAgo(1), lte: daysAgoEnd(1) },
    },
    select: {
      id:       true,
      borrower: { select: { email: true, name: true } },
      item:     { select: { title: true } },
    },
  })

  const results = await Promise.allSettled(
    bookings.map(async (b) => {
      if (!b.borrower.email) return
      await resend.emails.send({
        from:    FROM,
        to:      b.borrower.email,
        subject: `Como foi alugar "${b.item.title}"? Deixe sua avaliação`,
        html: `
          <p>Olá, ${b.borrower.name?.split(" ")[0] ?? ""}!</p>
          <p>Sua locação de <strong>${b.item.title}</strong> foi concluída.</p>
          <p>Avaliações ajudam a comunidade — leva menos de 1 minuto!</p>
          <p><a href="${process.env.NEXTAUTH_URL}/reservas/${b.id}">Avaliar agora →</a></p>
          <p>Obrigado por usar o ShareO!</p>
        `,
      })
    }),
  )

  return results.filter((r) => r.status === "rejected").length
}

// ─── Email 7d: sugestão de itens similares ───────────────────────────────────

async function sendSimilarItemSuggestions() {
  const bookings = await prisma.booking.findMany({
    where: {
      status:    "COMPLETED",
      updatedAt: { gte: daysAgo(7), lte: daysAgoEnd(7) },
    },
    select: {
      borrower: { select: { email: true, name: true } },
      item:     { select: { title: true, categoryId: true, city: true } },
    },
  })

  const results = await Promise.allSettled(
    bookings.map(async (b) => {
      if (!b.borrower.email) return

      const similar = await prisma.item.findMany({
        where:   { categoryId: b.item.categoryId, city: b.item.city, isActive: true },
        take:    3,
        select:  { id: true, title: true, pricePerDay: true, slug: true },
        orderBy: { viewCount: "desc" },
      })

      if (similar.length === 0) return

      const itemLinks = similar
        .map((i) => `<li><a href="${process.env.NEXTAUTH_URL}/itens/${i.slug ?? i.id}">${i.title} — R$ ${(i.pricePerDay / 100).toFixed(2)}/dia</a></li>`)
        .join("")

      await resend.emails.send({
        from:    FROM,
        to:      b.borrower.email,
        subject: `Você pode gostar: itens similares ao "${b.item.title}"`,
        html: `
          <p>Olá, ${b.borrower.name?.split(" ")[0] ?? ""}!</p>
          <p>Com base na sua última locação, selecionamos alguns itens em <strong>${b.item.city}</strong>:</p>
          <ul>${itemLinks}</ul>
          <p><a href="${process.env.NEXTAUTH_URL}/itens">Ver mais →</a></p>
        `,
      })
    }),
  )

  return results.filter((r) => r.status === "rejected").length
}

// ─── Email 30d: item favorito disponível ────────────────────────────────────

async function sendFavoriteAvailableReminders() {
  const cutoff = daysAgo(30)

  const favorites = await prisma.favorite.findMany({
    where: {
      createdAt: { lte: cutoff },
      item:      { isActive: true },
    },
    select: {
      user: { select: { email: true, name: true } },
      item: { select: { id: true, title: true, pricePerDay: true, slug: true } },
    },
    take: 200,
  })

  const results = await Promise.allSettled(
    favorites.map(async (f) => {
      if (!f.user.email) return
      await resend.emails.send({
        from:    FROM,
        to:      f.user.email,
        subject: `"${f.item.title}" que você salvou está disponível!`,
        html: `
          <p>Olá, ${f.user.name?.split(" ")[0] ?? ""}!</p>
          <p>O item <strong>${f.item.title}</strong> que você adicionou aos favoritos está disponível por
             <strong>R$ ${(f.item.pricePerDay / 100).toFixed(2)}/dia</strong>.</p>
          <p><a href="${process.env.NEXTAUTH_URL}/itens/${f.item.slug ?? f.item.id}">Ver item →</a></p>
        `,
      })
    }),
  )

  return results.filter((r) => r.status === "rejected").length
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const secret = new URL(req.url).searchParams.get("secret")
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const [err1d, err7d, err30d] = await Promise.all([
      sendReviewReminders(),
      sendSimilarItemSuggestions(),
      sendFavoriteAvailableReminders(),
    ])

    return NextResponse.json({ ok: true, errors: { "1d": err1d, "7d": err7d, "30d": err30d } })
  } catch (e) {
    console.error("[cron/reengagement]", e instanceof Error ? e.message : e)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
