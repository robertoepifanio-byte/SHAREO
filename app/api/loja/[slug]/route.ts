// GET /api/loja/[slug]
// Endpoint público da vitrine PJ/PF. Espelha as consultas Prisma de
// app/loja/[slug]/page.tsx com select mínimo, sem dados sensíveis.
// Sem autenticação obrigatória — vitrine é pública.

import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import type { ItemStatus } from "@prisma/client"

export const runtime = "nodejs"

// Status visíveis na vitrine — usado no _count e no findMany. Um só lugar
// para não divergir se um novo status (ex.: FEATURED) precisar entrar aqui.
// Prisma espera array mutável em `in:` — sem `as const`, que gera tupla readonly.
const VISIBLE_ITEM_STATUSES: ItemStatus[] = ["AVAILABLE", "PAUSED", "DRAFT"]

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params

  // ── 1. Dono da vitrine ────────────────────────────────────────────────────
  // Select idêntico ao de getOwner() em page.tsx — sem e-mail, CPF, CNPJ,
  // senha, tokens de redefinição ou qualquer campo não exposto na página web.
  const owner = await prisma.user.findFirst({
    where: {
      OR: [{ slug }, { id: slug }],
      deletedAt: null,
      isActive: true,
    },
    select: {
      id:         true,
      name:       true,
      slug:       true,
      bio:        true,
      avatarUrl:  true,
      city:       true,
      state:      true,
      userType:   true,
      isVerified: true,
      createdAt:  true,
      _count: {
        select: {
          items: { where: { status: { in: VISIBLE_ITEM_STATUSES }, deletedAt: null } },
          reviewsReceived: true,
        },
      },
    },
  })

  if (!owner) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Vitrine não encontrada." } },
      { status: 404 },
    )
  }

  // ── 2. Itens e avaliações em paralelo ────────────────────────────────────
  const [items, reviewStats] = await Promise.all([
    prisma.item.findMany({
      where: {
        ownerId:   owner.id,
        status:    { in: VISIBLE_ITEM_STATUSES },
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
      select: {
        id:           true,
        title:        true,
        pricePerDay:  true,
        condition:    true,
        city:         true,
        state:        true,
        neighborhood: true,
        status:       true,
        images:       { select: { url: true }, orderBy: { order: "asc" }, take: 1 },
        // category.slug: ausente na page.tsx (usa ItemCard do site que não precisa
        // de slug). Acrescentado aqui porque o ItemCard do app exige slug para
        // renderizar o ícone de categoria — campo público, sem dado sensível.
        category:     { select: { name: true, slug: true } },
        owner:        { select: { name: true, isVerified: true } },
        _count:       { select: { reviews: true, favorites: true } },
      },
    }),
    prisma.review.aggregate({
      where:  { revieweeId: owner.id },
      _avg:   { rating: true },
      _count: { _all: true },
    }),
  ])

  return NextResponse.json({
    data: {
      owner,
      items,
      avgRating:   reviewStats._avg.rating,
      reviewCount: reviewStats._count._all,
    },
  })
}
