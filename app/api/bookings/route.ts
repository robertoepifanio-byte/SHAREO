import type { NextRequest } from "next/server"
import { NextResponse, after } from "next/server"
import { prisma } from "@/lib/prisma"
import { resolveUserId } from "@/lib/resolveUserId"
import { userMiniSelect } from "@/lib/prisma/selects"
import { CreateBookingSchema, ListBookingsQuerySchema } from "@/lib/validations/bookings"
import { dispatchWebhookEvent } from "@/lib/outboundWebhooks"
import { calcBookingTotal } from "@/lib/pricing"
import { validateCoupon } from "@/lib/coupons"
import { findOverlappingItem } from "@/lib/booking-availability"
import { CHECKOUT_MAX_CENTS, getRentalContractConfig } from "@/lib/platform-config"
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit"
import { RENTAL_CONTRACT_VERSION, RENTAL_CONTRACT_TEXT_HASH } from "@/lib/rental-contract"
import { logAccess, extractClientIp } from "@/lib/access-log"

export async function GET(req: NextRequest) {
  try {
    const userId = await resolveUserId(req)
    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Autenticação necessária." } },
        { status: 401 },
      )
    }

    const { searchParams } = req.nextUrl
    const query = ListBookingsQuerySchema.safeParse(Object.fromEntries(searchParams))
    if (!query.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Parâmetros inválidos." } },
        { status: 400 },
      )
    }

    const { role, status, page, limit } = query.data
    const skip   = (page - 1) * limit

    const where = {
      ...(role === "borrower" ? { borrowerId: userId } :
          role === "owner"    ? { ownerId: userId }    :
          { OR: [{ borrowerId: userId }, { ownerId: userId }] }),
      ...(status && { status }),
    }

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        skip,
        take:    limit,
        orderBy: { createdAt: "desc" },
        select: {
          id:         true,
          status:     true,
          disputeStatus: true,
          startDate:  true,
          endDate:    true,
          totalDays:  true,
          totalPrice: true,
          dailyPrice: true,
          createdAt:  true,
          item: {
            select: {
              id:    true,
              title: true,
              city:  true,
              state: true,
              images: { select: { url: true }, orderBy: { order: "asc" }, take: 1 },
            },
          },
          borrower: { select: userMiniSelect },
          owner:    { select: userMiniSelect },
          conversation: { select: { id: true } },
          // Fonte: app/reservas/page.tsx linhas 54-59 — mesmos agregados do
          // site (badge "+N itens" de Story B, CTA "Avaliar" condicional).
          _count: {
            select: {
              bookingItems: true,
              reviews: { where: { reviewerId: userId } },
            },
          },
        },
      }),
      prisma.booking.count({ where }),
    ])

    // MCI art.15 — log de acesso (fire-and-forget; flag accessLogsEnabled default OFF)
    logAccess({
      ip:     extractClientIp(req),
      userId,
      path:   "/api/bookings",
      method: "GET",
      status: 200,
      requestId: req.headers.get("x-vercel-id"),
    })

    return NextResponse.json({
      data: bookings,
      meta: { total, page, limit, hasMore: skip + bookings.length < total },
    })
  } catch (e) {
    console.error("[GET /api/bookings]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno." } },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const borrowerId = await resolveUserId(req)
    if (!borrowerId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Autenticação necessária." } },
        { status: 401 },
      )
    }

    // SEC-ALTO-03: rate limit por usuário (evita rajada de criação de reservas/locks)
    const rl = await checkRateLimit(`booking-create:${borrowerId}`, 20, 60_000, req)
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const userCheck = await prisma.user.findUnique({
      where:  { id: borrowerId },
      select: { emailVerified: true, profileCompletedAt: true },
    })
    if (!userCheck?.emailVerified) {
      return NextResponse.json(
        { error: { code: "EMAIL_NOT_VERIFIED", message: "Confirme seu e-mail antes de realizar uma reserva." } },
        { status: 403 },
      )
    }
    // Cadastro progressivo — alugar exige cadastro completo (CPF + endereço)
    if (!userCheck.profileCompletedAt) {
      return NextResponse.json(
        { error: { code: "REGISTRATION_INCOMPLETE", message: "Complete seu cadastro para alugar." } },
        { status: 403 },
      )
    }

    const body   = await req.json()
    const parsed = CreateBookingSchema.safeParse(body)
    if (!parsed.success) {
      const details: Record<string, string[]> = {}
      for (const e of parsed.error.errors) {
        const key = e.path.join(".") || "form"
        details[key] = [...(details[key] ?? []), e.message]
      }
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Dados inválidos.", details } },
        { status: 400 },
      )
    }

    const { itemId, startDate, endDate, borrowerNote, couponCode,
            contractAccepted, contractAcceptedVersion } = parsed.data

    // ── Guard: aceite do contrato de locação (D4 Jurídico — Questão #6) ─────
    // Verificado após o parse Zod (inputs já sanitizados) e antes de qualquer
    // acesso ao banco — rejeição rápida sem custo de I/O.
    // Default OFF: getRentalContractConfig() retorna { enabled: false } quando a
    // chave rentalContractAcceptanceEnabled não existe em PlatformConfig.
    const contractCfg = await getRentalContractConfig()
    if (contractCfg.enabled) {
      if (!contractAccepted) {
        return NextResponse.json(
          { error: { code: "CONTRACT_NOT_ACCEPTED", message: "É necessário aceitar o Contrato de Locação para prosseguir." } },
          { status: 422 },
        )
      }
      // Versão do contrato enviada pelo cliente deve corresponder à vigente no servidor.
      // Evita aceite de versão desatualizada quando o texto é atualizado.
      if (contractAcceptedVersion && contractAcceptedVersion !== RENTAL_CONTRACT_VERSION) {
        return NextResponse.json(
          { error: { code: "CONTRACT_VERSION_MISMATCH", message: "O contrato foi atualizado. Recarregue a página e aceite a versão mais recente." } },
          { status: 422 },
        )
      }
    }

    // Itens da locação — Story B: vários itens do MESMO dono, no MESMO período.
    // itemId é o item principal; additionalItemIds são os demais (todos do mesmo dono).
    const additionalItemIds = [...new Set(parsed.data.additionalItemIds ?? [])].filter((id) => id !== itemId)
    const allItemIds = [itemId, ...additionalItemIds]

    const [items, borrower] = await Promise.all([
      prisma.item.findMany({
        where:  { id: { in: allItemIds }, status: "AVAILABLE", isApproved: true, deletedAt: null },
        select: {
          id: true, ownerId: true, title: true,
          pricePerDay: true, pricePerWeek: true, pricePerMonth: true, depositAmount: true,
          requireIdVerification: true,
          requirePhone:          true,
        },
      }),
      prisma.user.findUnique({
        where:  { id: borrowerId },
        select: { idVerificationStatus: true, phone: true, name: true },
      }),
    ])

    const itemsById = new Map(items.map((i) => [i.id, i]))
    const item = itemsById.get(itemId) // item principal

    // Todos os itens informados precisam existir e estar disponíveis
    if (!item || items.length !== allItemIds.length) {
      return NextResponse.json(
        { error: { code: "ITEM_UNAVAILABLE", message: "Um ou mais itens não estão disponíveis." } },
        { status: 422 },
      )
    }

    // Escopo Story B: todos os itens da locação são do MESMO proprietário
    if (items.some((i) => i.ownerId !== item.ownerId)) {
      return NextResponse.json(
        { error: { code: "MIXED_OWNERS", message: "Em uma locação só é possível alugar itens do mesmo anunciante. Faça uma locação por anunciante." } },
        { status: 422 },
      )
    }

    if (item.ownerId === borrowerId) {
      return NextResponse.json(
        { error: { code: "CANNOT_BOOK_OWN_ITEM", message: "Você não pode alugar o próprio item." } },
        { status: 403 },
      )
    }

    // Requisitos do proprietário — se QUALQUER item exigir, vale para a locação inteira
    if (items.some((i) => i.requireIdVerification) && borrower?.idVerificationStatus !== "VERIFIED") {
      return NextResponse.json(
        { error: { code: "ID_VERIFICATION_REQUIRED", message: "O proprietário exige identidade verificada para alugar. Acesse seu perfil e envie seus documentos." } },
        { status: 422 },
      )
    }

    if (items.some((i) => i.requirePhone) && !borrower?.phone) {
      return NextResponse.json(
        { error: { code: "PHONE_REQUIRED", message: "O proprietário exige telefone cadastrado para alugar. Acesse seu perfil e adicione um número de telefone." } },
        { status: 422 },
      )
    }

    const totalDays  = Math.ceil(
      (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86_400_000,
    )

    // Preço por item (mesmo período) + total bruto da locação
    const perItem = allItemIds.map((id) => {
      const it = itemsById.get(id)!
      const { totalPrice } = calcBookingTotal(totalDays, it.pricePerDay, it.pricePerWeek, it.pricePerMonth)
      return { itemId: id, dailyPrice: it.pricePerDay, totalPrice }
    })
    const grossPrice    = perItem.reduce((sum, p) => sum + p.totalPrice, 0)
    // Diária combinada da locação (item único = a diária do item; multi-item = soma).
    // É só snapshot de exibição — o split/repasse usa totalPrice; a diária POR ITEM fica em BookingItem.dailyPrice.
    const sumDailyPrice = perItem.reduce((sum, p) => sum + p.dailyPrice, 0)
    const sumDeposit    = items.reduce((sum, i) => sum + (i.depositAmount ?? 0), 0)

    // P3-20: cupom de desconto — absorvido pela taxa da plataforma (proprietário recebe o valor cheio)
    let couponId: string | null = null
    let discountCents = 0
    if (couponCode) {
      const validation = await validateCoupon(couponCode, borrowerId)
      if (!validation.ok) {
        const msg = validation.reason === "USED"    ? "Este cupom já foi utilizado."
                  : validation.reason === "EXPIRED" ? "Este cupom expirou."
                  : "Cupom não encontrado. Confira o código."
        return NextResponse.json(
          { error: { code: "COUPON_INVALID", message: msg } },
          { status: 422 },
        )
      }
      couponId      = validation.couponId
      discountCents = Math.round(grossPrice * validation.percentOff / 100)
    }
    const totalPrice = grossPrice - discountCents

    // Teto R$500 por locação (D2) — espelha o gate do checkout (EXCEEDS_MVP_LIMIT).
    // Sem isto, uma chamada direta criaria reserva > R$500 que depois não pagaria.
    if (totalPrice > CHECKOUT_MAX_CENTS) {
      return NextResponse.json(
        { error: { code: "EXCEEDS_MVP_LIMIT", message: "Locações acima de R$ 500 não estão disponíveis nesta versão. Remova um item ou reduza o período." } },
        { status: 422 },
      )
    }

    // Cria booking + conversation atomicamente (conflict check dentro da transação evita double-booking)
    const booking = await prisma.$transaction(async (tx) => {
      // Disponibilidade de TODOS os itens via booking_items (Story B)
      const conflictItem = await findOverlappingItem(tx, allItemIds, new Date(startDate), new Date(endDate))
      if (conflictItem) throw Object.assign(new Error("DATE_CONFLICT"), { code: "DATE_CONFLICT" })

      const b = await tx.booking.create({
        data: {
          itemId,                      // item principal da locação
          borrowerId,
          ownerId:       item.ownerId,
          startDate:     new Date(startDate),
          endDate:       new Date(endDate),
          totalDays,
          dailyPrice:    sumDailyPrice,
          totalPrice,
          discountCents: discountCents || null,
          depositAmount: sumDeposit || null,
          borrowerNote:  borrowerNote ?? null,
        },
        select: {
          id:            true,
          status:        true,
          disputeStatus: true,
          startDate:     true,
          endDate:       true,
          totalDays:     true,
          dailyPrice:    true,
          totalPrice:    true,
          depositAmount: true,
          borrowerNote:  true,
          createdAt:     true,
          item: {
            select: {
              title:  true,
              images: { select: { url: true }, orderBy: { order: "asc" }, take: 1 },
              owner:  { select: { id: true, name: true, avatarUrl: true } },
            },
          },
        },
      })

      // Story B: registra TODOS os itens da locação em booking_items (fonte de verdade
      // da disponibilidade). Reserva de item único = exatamente 1 BookingItem.
      await tx.bookingItem.createMany({
        data: perItem.map((p) => ({ bookingId: b.id, itemId: p.itemId, dailyPrice: p.dailyPrice, totalPrice: p.totalPrice })),
      })

      // Mantém bookingsCount do item principal sincronizado (NFR-BL4).
      // Replica o comportamento de { bookings: { _count } }: conta via Booking.itemId
      // (só o item principal), sem filtro de status — não é decrementado em cancelamento.
      await tx.item.update({
        where: { id: itemId },
        data:  { bookingsCount: { increment: 1 } },
      })

      // Consome o cupom na mesma transação (corrida: condição usedAt null garante uso único)
      if (couponId) {
        const consumed = await tx.coupon.updateMany({
          where: { id: couponId, usedAt: null },
          data:  { usedAt: new Date(), bookingId: b.id },
        })
        if (consumed.count === 0) throw Object.assign(new Error("COUPON_RACE"), { code: "COUPON_RACE" })
      }

      // Aceite eletrônico do contrato de locação — gravado atomicamente com a reserva.
      // Só executado quando a feature flag está ON e o locatário enviou contractAccepted=true.
      // Registra: versão do texto aceito + hash SHA-256 do conteúdo + IP + userAgent.
      // Também atualiza contractSignedAt no booking (campo existente) para consistência.
      if (contractCfg.enabled && contractAccepted) {
        const ip        = req.headers.get("x-forwarded-for")?.split(",")[0] ?? null
        const userAgent = req.headers.get("user-agent") ?? null
        await tx.contractAcceptance.create({
          data: {
            bookingId:        b.id,
            ipAddress:        ip,
            userAgent:        userAgent,
            contractVersion:  RENTAL_CONTRACT_VERSION,
            contractTextHash: RENTAL_CONTRACT_TEXT_HASH,
          },
        })
        await tx.booking.update({
          where: { id: b.id },
          data:  { contractSignedAt: new Date() },
        })
      }

      const conv = await tx.conversation.create({
        data: {
          bookingId:    b.id,
          participants: {
            create: [
              { userId: borrowerId },
              { userId: item.ownerId },
            ],
          },
        },
        select: { id: true },
      })

      return { ...b, conversationId: conv.id }
    }, { isolationLevel: "Serializable", timeout: 5000 })

    // Webhook de saída para o locador — após a resposta
    after(() =>
      dispatchWebhookEvent(item.ownerId, "booking.created", {
        bookingId:  booking.id,
        itemTitle:  booking.item.title,
        borrower:   booking.item.owner.name,
        startDate:  booking.startDate,
        endDate:    booking.endDate,
        totalPrice: booking.totalPrice,
      })
    )

    // Notificação para o locador — após a resposta
    after(() =>
      prisma.notification.create({
        data: {
          userId: item.ownerId,
          type:   "BOOKING_REQUEST",
          title:  "Nova solicitação de aluguel",
          body:   additionalItemIds.length > 0
            ? `${borrower?.name ?? "Um usuário"} quer alugar "${booking.item.title}" e mais ${additionalItemIds.length} ${additionalItemIds.length === 1 ? "item" : "itens"}`
            : `${borrower?.name ?? "Um usuário"} quer alugar "${booking.item.title}"`,
          data:   { bookingId: booking.id },
        },
      }).catch((e) => console.error("[notification] BOOKING_REQUEST:", e instanceof Error ? e.message : e))
    )

    // MCI art.15 — log de acesso (fire-and-forget; flag accessLogsEnabled default OFF)
    logAccess({
      ip:     extractClientIp(req),
      userId: borrowerId,
      path:   "/api/bookings",
      method: "POST",
      status: 201,
      requestId: req.headers.get("x-vercel-id"),
    })

    return NextResponse.json({ data: booking }, { status: 201 })
  } catch (e) {
    // P2034 = falha de serialização (corrida simultânea sob isolationLevel Serializable) → conflito de datas
    if (
      (e instanceof Error && (e as NodeJS.ErrnoException).code === "DATE_CONFLICT") ||
      (e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "P2034")
    ) {
      return NextResponse.json(
        { error: { code: "DATE_CONFLICT", message: "Item indisponível no período selecionado." } },
        { status: 409 },
      )
    }
    if (e instanceof Error && (e as NodeJS.ErrnoException).code === "COUPON_RACE") {
      return NextResponse.json(
        { error: { code: "COUPON_INVALID", message: "Este cupom já foi utilizado." } },
        { status: 422 },
      )
    }
    console.error("[POST /api/bookings]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno." } },
      { status: 500 },
    )
  }
}
