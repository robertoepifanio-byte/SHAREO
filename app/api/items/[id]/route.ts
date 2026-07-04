import type { NextRequest } from "next/server"
import { NextResponse, after } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UpdateItemSchema } from "@/lib/validations/items"
import { geocodeItem } from "@/lib/geocodeItem"
import { userPublicSelect } from "@/lib/prisma/selects"
import { getOwnerResponseBadge } from "@/lib/ownerStats"
import { assertOwnerOrAdmin } from "@/lib/auth/ownership"
import { resolveUserId } from "@/lib/resolveUserId"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const { id }     = await params
    // resolveUserId aceita Bearer JWT (mobile) ou session cookie (web) para o
    // isOwner abaixo; isAdmin só é checável via sessão completa (cookie).
    const userId     = await resolveUserId(req)
    const session    = await auth().catch(() => null)
    const isAdmin    = session?.user.role === "ADMIN"

    const item = await prisma.item.findFirst({
      where: { id, deletedAt: null },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        owner: {
          select: { ...userPublicSelect, city: true, state: true, createdAt: true },
        },
        images:  { orderBy: { order: "asc" }, take: 24 },  // bound de payload (ARQ-M-07)
        reviews: {
          where: { reviewType: "ITEM" },
          select: {
            id: true, rating: true, comment: true,
            reviewer: { select: { name: true, avatarUrl: true } },
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        _count: { select: { reviews: true, favorites: true, bookings: true } },
      },
    })

    if (!item) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Anúncio não encontrado." } },
        { status: 404 }
      )
    }

    // Itens não aprovados ou não disponíveis só visíveis para o dono ou admin
    const isOwner = userId === item.owner.id
    if ((!item.isApproved || item.status !== "AVAILABLE") && !isOwner && !isAdmin) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Anúncio não encontrado." } },
        { status: 404 }
      )
    }

    // Incremento de viewCount após a resposta (só conta para itens públicos)
    after(() =>
      prisma.item.update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch((e) => console.error("[viewCount]", e instanceof Error ? e.message : e))
    )

    // Estatísticas do proprietário — fonte: app/itens/[id]/page.tsx linhas
    // 122-139 (mesma lógica exata, replicada aqui pra expor via API pro
    // mobile; a página do site roda isso direto via Server Component, não
    // consome este endpoint).
    //
    // P1-31 / Story B — itens similares e itens do mesmo anunciante:
    // Replicam EXATAMENTE as queries de page.tsx linhas 141-181.
    // `category.slug` incluído p/ o ItemCard do mobile (requer slug p/ ícone).
    const relatedSelect = {
      id: true, title: true, pricePerDay: true, condition: true,
      city: true, state: true, neighborhood: true, status: true,
      images:   { select: { url: true }, orderBy: { order: "asc" as const }, take: 1 },
      category: { select: { name: true, slug: true } },
      owner:    { select: { name: true, isVerified: true } },
      _count:   { select: { reviews: true, favorites: true } },
    } as const

    const [responseBadge, ownerStats, similarItems, ownerItems] = await Promise.all([
      getOwnerResponseBadge(item.ownerId),
      prisma.booking.groupBy({
        by: ["status"],
        where: { ownerId: item.ownerId, deletedAt: null },
        _count: true,
      }).then((rows) => {
        const byStatus   = new Map(rows.map((r) => [r.status, r._count]))
        const totalCount = rows.reduce((s, r) => s + r._count, 0)
        const completed  = byStatus.get("COMPLETED") ?? 0
        const responded  = (["CONFIRMED", "ACTIVE", "RETURNED", "COMPLETED"] as const)
          .reduce((s, k) => s + (byStatus.get(k) ?? 0), 0)
        return {
          completedCount: completed,
          responseRate: totalCount > 0 ? Math.round((responded / totalCount) * 100) : null,
        }
      }),
      // P1-31 — itens similares (mesma categoria + cidade, excluindo o atual)
      // Fonte: page.tsx linhas 141-161
      prisma.item.findMany({
        where: {
          categoryId: item.category.id,
          city:       item.city,
          deletedAt:  null,
          status:     "AVAILABLE",
          isApproved: true,
          id:         { not: item.id },
          owner:      { deletedAt: null },
        },
        select: relatedSelect,
        orderBy: { viewCount: "desc" },
        take: 4,
      }),
      // Story B — outros itens do MESMO anunciante (locação multi-item)
      // Fonte: page.tsx linhas 162-181
      prisma.item.findMany({
        where: {
          ownerId:    item.ownerId,
          deletedAt:  null,
          status:     "AVAILABLE",
          isApproved: true,
          id:         { not: item.id },
        },
        select: relatedSelect,
        orderBy: { viewCount: "desc" },
        take: 4,
      }),
    ])

    // Privacidade (SEC-MIN-06 / MAJ-S14-04): coordenada exata e endereço só p/ dono/admin.
    // Público recebe lat/lng truncadas (~110m) e address omitido.
    // similarItems e ownerItems retornados para todos — mobile decide exibição por isOwner.
    const data = (isOwner || isAdmin)
      ? { ...item, responseBadge, ownerStats, similarItems, ownerItems }
      : {
          ...item,
          address:   null,
          latitude:  Math.round(item.latitude  * 1000) / 1000,
          longitude: Math.round(item.longitude * 1000) / 1000,
          responseBadge, ownerStats, similarItems, ownerItems,
        }
    return NextResponse.json({ data })
  } catch (e) {
    console.error("[GET /api/items/[id]]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno." } },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
  try {
    // Aceita Bearer JWT (mobile) ou session cookie (web) — mesmo padrão de POST /api/items/[id]/images
    const userId = await resolveUserId(req)
    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Autenticação necessária." } },
        { status: 401 }
      )
    }

    const { id } = await params
    const existing = await prisma.item.findFirst({
      where: { id, deletedAt: null },
      select: { ownerId: true },
    })

    if (!existing) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Anúncio não encontrado." } },
        { status: 404 }
      )
    }

    // Dono do item: verificação direta de userId (Bearer ou cookie).
    // Admin web: verifica role via sessão completa (só disponível via cookie —
    // Bearer mobile não carrega role, conforme SEC-CRIT-01).
    const isOwner = existing.ownerId === userId
    if (!isOwner) {
      const session = await auth().catch(() => null)
      const isAdmin = session?.user?.role === "ADMIN"
      if (!isAdmin) {
        return NextResponse.json(
          { error: { code: "FORBIDDEN", message: "Sem permissão." } },
          { status: 403 }
        )
      }
    }

    const body = await req.json()
    const parsed = UpdateItemSchema.safeParse(body)

    if (!parsed.success) {
      const details: Record<string, string[]> = {}
      for (const e of parsed.error.errors) {
        const key = e.path.join(".") || "form"
        details[key] = [...(details[key] ?? []), e.message]
      }
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Dados inválidos.", details } },
        { status: 400 }
      )
    }

    const d = parsed.data
    const updated = await prisma.item.update({
      where: { id },
      data: {
        ...(d.title         !== undefined && { title:         d.title }),
        ...(d.description   !== undefined && { description:   d.description }),
        ...(d.categoryId    !== undefined && { categoryId:    d.categoryId }),
        ...(d.condition     !== undefined && { condition:     d.condition }),
        ...(d.pricePerDay   !== undefined && { pricePerDay:   d.pricePerDay }),
        ...(d.pricePerWeek  !== undefined && { pricePerWeek:  d.pricePerWeek }),
        ...(d.pricePerMonth !== undefined && { pricePerMonth: d.pricePerMonth }),
        ...(d.depositAmount !== undefined        && { depositAmount:        d.depositAmount }),
        ...(d.estimatedRetailPrice !== undefined && { estimatedRetailPrice: d.estimatedRetailPrice }),
        ...(d.address       !== undefined && { address:       d.address }),
        ...(d.city          !== undefined && { city:          d.city }),
        ...(d.state         !== undefined && { state:         d.state }),
        ...(d.neighborhood  !== undefined && { neighborhood:  d.neighborhood }),
        ...(d.latitude      !== undefined && { latitude:      d.latitude }),
        ...(d.longitude     !== undefined && { longitude:     d.longitude }),
        // Retrocompatibilidade: isActive no payload mapeado para status
        ...(d.isActive === false && { status: "PAUSED" as const }),
        ...(d.isActive === true  && { status: "AVAILABLE" as const }),
        ...(d.status   !== undefined && { status: d.status }),
        ...(d.voltage               !== undefined && { voltage:               d.voltage }),
        ...(d.requireIdVerification !== undefined && { requireIdVerification: d.requireIdVerification }),
        ...(d.requirePhone          !== undefined && { requirePhone:          d.requirePhone }),
      },
      select: { id: true, title: true, status: true, updatedAt: true, pricePerDay: true },
    })

    // Regeocodifica em background quando endereço muda
    // after() garante execução mesmo depois da resposta (fire-and-forget puro morre no Vercel)
    if (d.city || d.state || d.neighborhood) {
      after(() =>
        prisma.item.findUnique({ where: { id }, select: { city: true, state: true, neighborhood: true } })
          .then((it) => {
            if (it) return geocodeItem(id, { city: it.city, state: it.state, neighborhood: it.neighborhood })
          })
          .catch((e) => console.error("[geocodeItem PUT]", e instanceof Error ? e.message : e))
      )
    }

    return NextResponse.json({ data: updated })
  } catch (e) {
    console.error("[PUT /api/items/[id]]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno." } },
      { status: 500 }
    )
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Autenticação necessária." } },
        { status: 401 }
      )
    }

    const { id } = await params
    const existing = await prisma.item.findFirst({
      where: { id, deletedAt: null },
      select: { ownerId: true },
    })

    if (!existing) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Anúncio não encontrado." } },
        { status: 404 }
      )
    }

    if (!assertOwnerOrAdmin(existing.ownerId, session)) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Sem permissão." } },
        { status: 403 }
      )
    }

    await prisma.item.update({
      where: { id },
      data: { deletedAt: new Date(), status: "DELETED" },
    })

    return new NextResponse(null, { status: 204 })
  } catch (e) {
    console.error("[DELETE /api/items/[id]]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno." } },
      { status: 500 }
    )
  }
}
