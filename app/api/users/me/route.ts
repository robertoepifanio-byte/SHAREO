import type { NextRequest } from "next/server"
import { NextResponse, after } from "next/server"
import * as Sentry from "@sentry/nextjs"
import { prisma } from "@/lib/prisma"
import { resolveUserId } from "@/lib/resolveUserId"
import { UpdateProfileSchema } from "@/lib/validations/users"
import { geocodeUserLocation } from "@/lib/geocodeUser"
import { createAdminClient } from "@/lib/supabase/admin"
import { apagarArquivosDoUsuario, apagarPathsExplicitos } from "@/lib/supabase/purge-user-storage"
import { itemImagesPrefixo, storagePathFromUrl } from "@/lib/supabase/user-storage-paths"
import { invalidateUserSessions } from "@/lib/redis-admin-blocklist"
import { logAccess, extractClientIp } from "@/lib/access-log"

// Janela de retenção fiscal: 5 anos a partir da data da transação (ADR-017 / CTN art.173)
const FISCAL_RETENTION_YEARS = 5

/**
 * Verifica se o usuário possui registros financeiros dentro da janela de retenção
 * fiscal de 5 anos (PlatformTransaction ou Payout criados após a data de corte).
 * ADR-017: esses registros não podem sofrer hard delete — apenas anonimização de PII.
 */
async function hasRecentFiscalRecords(userId: string): Promise<boolean> {
  const cutoff = new Date()
  cutoff.setFullYear(cutoff.getFullYear() - FISCAL_RETENTION_YEARS)

  // PlatformTransaction vinculada a reservas do usuário (como locatário ou locador)
  const txCount = await prisma.platformTransaction.count({
    where: {
      createdAt: { gte: cutoff },
      booking: {
        OR: [{ borrowerId: userId }, { ownerId: userId }],
      },
    },
  })
  if (txCount > 0) return true

  // Payout vinculado à conta de pagamento do usuário
  const payoutCount = await prisma.payout.count({
    where: {
      createdAt: { gte: cutoff },
      ownerPaymentAccount: { userId },
    },
  })
  return payoutCount > 0
}

// LGPD art. 18 — direito ao esquecimento
export async function DELETE(req: NextRequest) {
  try {
    const userId = await resolveUserId(req)
    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Autenticação necessária." } },
        { status: 401 },
      )
    }

    // Bloquear exclusão se houver locação em andamento (ACTIVE)
    const activeBooking = await prisma.booking.findFirst({
      where: {
        status: "ACTIVE",
        OR: [{ borrowerId: userId }, { ownerId: userId }],
      },
      select: { id: true },
    })

    if (activeBooking) {
      return NextResponse.json(
        {
          error: {
            code: "ACTIVE_BOOKING",
            message:
              "Você possui uma locação em andamento. Aguarde a devolução antes de excluir a conta.",
          },
        },
        { status: 409 },
      )
    }

    // ADR-017 / CTN art. 173: verificar janela de retenção fiscal de 5 anos.
    // Se houver registros financeiros recentes, anonimizar PII mas RETER os registros.
    // O titular é informado da limitação legal (art. 18 §3º LGPD).
    const hasFiscalBlock = await hasRecentFiscalRecords(userId)

    // SEC-MAJ-06 (LGPD art. 18): scrub atômico de TODA a PII do usuário.
    // Dados de transações concluídas (valores, datas, splits) são mantidos por
    // obrigação fiscal (art. 9 LGPD c/c art. 37 Código Comercial), mas o texto
    // livre e os identificadores pessoais são anonimizados.
    await prisma.$transaction([
      // Cancelar reservas pendentes / confirmadas do usuário
      prisma.booking.updateMany({
        where: {
          status: { in: ["PENDING", "CONFIRMED"] },
          OR: [{ borrowerId: userId }, { ownerId: userId }],
        },
        data: { status: "CANCELLED" },
      }),

      // Anonimizar o registro do usuário (PII direta + documentos de identidade)
      prisma.user.update({
        where: { id: userId },
        data: {
          name:                 "Usuário removido",
          email:                `removed-${userId}@shareo.invalid`,
          passwordHash:         null,
          phone:                null,
          bio:                  null,
          avatarUrl:            null,
          city:                 null,
          state:                null,
          neighborhood:         null,
          latitude:             null,
          longitude:            null,
          cpfHash:              null,
          cpfEncrypted:         null,
          cnpjHash:             null,
          cnpjEncrypted:        null,
          // Verificação de identidade — remove referências aos documentos
          idDocumentUrl:        null,
          idSelfieUrl:          null,
          idRejectionReason:    null,
          idVerificationStatus: "UNVERIFIED",
          isActive:             false,
          deletedAt:            new Date(),
        },
      }),

      // Texto livre e foto das avaliações escritas pelo usuário. A foto (booking-photos,
      // `uploads/<userId>`) é apagada do Storage logo abaixo: sem zerar `photoUrl`, a
      // avaliação — que continua pública — passaria a exibir uma imagem quebrada.
      prisma.review.updateMany({
        where: { reviewerId: userId },
        data:  { comment: null, photoUrl: null },
      }),

      // Mensagens privadas enviadas pelo usuário (content é obrigatório → placeholder + soft-delete)
      prisma.message.updateMany({
        where: { senderId: userId },
        data:  { content: "[mensagem removida]", deletedAt: new Date() },
      }),

      // Observações de reserva (texto livre)
      prisma.booking.updateMany({
        where: { borrowerId: userId },
        data:  { borrowerNote: null },
      }),
      prisma.booking.updateMany({
        where: { ownerId: userId },
        data:  { ownerNote: null },
      }),

      // Dados de pagamento (chave PIX é PII financeira) — mantém o registro
      // para integridade do histórico de payouts, mas remove os identificadores.
      prisma.ownerPaymentAccount.updateMany({
        where: { userId },
        data:  { pixKey: "REMOVIDO", holderName: "Removido", bankName: null },
      }),
    ])

    // SEC-CRIT-04: invalida sessões web e tokens Bearer do titular imediatamente
    // (epoch no Redis — o middleware rejeita qualquer token com loginAt anterior a agora).
    // Falha do Upstash não aborta a exclusão (a conta já foi anonimizada e o token
    // expira naturalmente em até 15 min), mas fica no log.
    await invalidateUserSessions(userId).catch((e) =>
      console.error("[DELETE /api/users/me] invalidateUserSessions falhou:", e instanceof Error ? e.message : e),
    )

    // Remove do Storage TODOS os arquivos do titular (decisão do fundador 25/09/2026):
    //   • id-docs         id-verification/<userId>/…  documento e selfie do KYC
    //   • item-images     uploads/<userId>/…          avatar; + <itemId>/… para cada anúncio
    //   • booking-photos  uploads/<userId>/…          fotos de avaliação e de relatar problema;
    //                     bookings/<id>/<fase>/…      apenas as fotos que o titular carregou
    //                                                 (BookingPhoto.uploadedBy == userId) — as da
    //                                                 outra parte são preservadas.
    // Não bloqueia a resposta: a conta já foi anonimizada e falha de Storage não a
    // desfaz. NÃO silenciosa: falhas vão para log + Sentry para intervenção manual.
    after(async () => {
      try {
        // Busca anúncios e fotos de reserva do titular ANTES de usá-los,
        // pois ownerId/uploadedBy ainda estão no banco (só deletedAt foi preenchido).
        const [itens, bookingPhotos] = await Promise.all([
          prisma.item.findMany({ where: { ownerId: userId }, select: { id: true } }),
          prisma.bookingPhoto.findMany({ where: { uploadedBy: userId }, select: { url: true } }),
        ])

        const alvosExtras = itens.map((item) => ({
          bucket:  "item-images" as const,
          prefixo: itemImagesPrefixo(item.id),
        }))

        const bookingPaths = bookingPhotos
          .map((p) => storagePathFromUrl(p.url, "booking-photos"))
          .filter((p): p is string => p !== null)

        const adminClient = createAdminClient()

        // Prefixos chaveados por userId + pastas de anúncios (r1) e caminhos
        // explícitos de fotos de check-in/out (r2) são independentes: paralelo.
        const [r1, r2] = await Promise.all([
          apagarArquivosDoUsuario(adminClient, userId, alvosExtras),
          apagarPathsExplicitos(adminClient, "booking-photos", bookingPaths),
        ])

        const todasFalhas   = [...r1.falhas, ...r2.falhas]
        const totalApagados = r1.apagados + r2.apagados

        if (todasFalhas.length === 0) {
          // Sucesso também deixa rastro: evidência para conferir a limpeza em staging.
          // eslint-disable-next-line no-console
          console.info("[DELETE /api/users/me] arquivos do usuário removidos do Storage:", JSON.stringify({ userId, apagados: totalApagados }))
        } else {
          console.error(
            "[DELETE /api/users/me] arquivos do Storage NÃO removidos (LGPD art. 18):",
            JSON.stringify({ userId, apagados: totalApagados, falhas: todasFalhas }),
          )
          // Alerta para operadores — dois canais:
          // 1. Sentry (observabilidade): falha visível com userId (não-PII).
          Sentry.captureException(
            new Error("[LGPD] limpeza de Storage falhou na exclusão de conta"),
            { extra: { userId, apagados: totalApagados, falhas: todasFalhas }, tags: { lgpd: "purge-failure" } },
          )
          // 2. Notificação in-app para todos os ADMIN_SUPERADMIN (mesmo padrão
          //    do webhook Stripe para disputas — nenhum PII, apenas userId e contagem).
          prisma.user.findMany({
            where:  { role: "ADMIN", adminRole: "ADMIN_SUPERADMIN" },
            select: { id: true },
          }).then((admins) => {
            if (admins.length === 0) return
            return prisma.notification.createMany({
              data: admins.map((admin) => ({
                userId: admin.id,
                type:   "BOOKING_CANCELLED" as never, // reuse — body esclarece o contexto
                title:  "[LGPD] Falha na limpeza do Storage",
                body:   `${todasFalhas.length} arquivo(s) não removido(s) na exclusão de conta. Intervenção manual necessária.`,
                data:   { userId, apagados: totalApagados, falhas: todasFalhas.length },
              })),
            })
          }).catch((e) =>
            console.error("[DELETE /api/users/me] notificação de admins falhou:", e instanceof Error ? e.message : e),
          )
        }
      } catch (e) {
        const erro = e instanceof Error ? e.message : String(e)
        console.error(
          "[DELETE /api/users/me] limpeza do Storage nem começou:",
          JSON.stringify({ userId, erro }),
        )
        Sentry.captureException(e, { extra: { userId }, tags: { lgpd: "purge-failure" } })
        // Notifica admins mesmo quando o Storage nem chegou a ser chamado.
        prisma.user.findMany({
          where:  { role: "ADMIN", adminRole: "ADMIN_SUPERADMIN" },
          select: { id: true },
        }).then((admins) => {
          if (admins.length === 0) return
          return prisma.notification.createMany({
            data: admins.map((admin) => ({
              userId: admin.id,
              type:   "BOOKING_CANCELLED" as never,
              title:  "[LGPD] Falha na limpeza do Storage",
              body:   `Limpeza do Storage não iniciou na exclusão de conta. Intervenção manual necessária.`,
              data:   { userId, erro },
            })),
          })
        }).catch((e2) =>
          console.error("[DELETE /api/users/me] notificação de admins (catch externo) falhou:", e2 instanceof Error ? e2.message : e2),
        )
      }
    })

    // MCI art.15 — log de acesso (fire-and-forget; flag accessLogsEnabled default OFF)
    logAccess({
      ip:     extractClientIp(req),
      userId,
      path:   "/api/users/me",
      method: "DELETE",
      status: 200,
      requestId: req.headers.get("x-vercel-id"),
    })

    // ADR-017: informar ao titular sobre registros retidos por obrigação fiscal.
    const message = hasFiscalBlock
      ? "Conta excluída. Seus dados de identificação foram removidos. " +
        "Registros financeiros dos últimos 5 anos foram preservados de forma anonimizada " +
        "conforme exigência fiscal (CTN art. 173). Serão expurgados automaticamente após o prazo."
      : "Conta excluída com sucesso."

    return NextResponse.json({ data: { message, fiscalRetentionApplied: hasFiscalBlock } })
  } catch (e: unknown) {
    console.error("[DELETE /api/users/me]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno." } },
      { status: 500 },
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const userId = await resolveUserId(req)
    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Autenticação necessária." } },
        { status: 401 },
      )
    }

    // Fonte: app/perfil/page.tsx linhas 40-81 — mesmos agregados do perfil
    // web (stats + últimas 5 avaliações recebidas), pra permitir paridade
    // no app mobile sem duplicar a query em dois shapes diferentes.
    const [user, reviewStats] = await Promise.all([
      prisma.user.findUnique({
        // deletedAt: null — mesma defesa do withUser: Redis fail-open não deve
        // permitir que conta excluída leia o próprio perfil anonimizado.
        where:  { id: userId, deletedAt: null },
        select: {
          id:           true,
          name:         true,
          email:        true,
          bio:          true,
          phone:        true,
          city:         true,
          state:        true,
          neighborhood: true,
          street:       true,
          avatarUrl:     true,
          userType:      true,
          isVerified:    true,
          emailVerified: true,
          createdAt:     true,
          _count: {
            select: {
              items:              { where: { status: { in: ["AVAILABLE", "PAUSED", "DRAFT"] }, deletedAt: null } },
              bookingsAsBorrower: { where: { status: { in: ["RETURNED", "COMPLETED"] } } },
              bookingsAsOwner:    { where: { status: { in: ["RETURNED", "COMPLETED"] } } },
            },
          },
          reviewsReceived: {
            select: {
              rating:     true,
              comment:    true,
              reviewType: true,
              reviewer:   { select: { name: true, avatarUrl: true } },
              createdAt:  true,
            },
            orderBy: { createdAt: "desc" },
            take:    5,
          },
        },
      }),
      prisma.review.aggregate({
        where:  { revieweeId: userId },
        _avg:   { rating: true },
        _count: { _all: true },
      }),
    ])

    if (!user) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Usuário não encontrado." } },
        { status: 404 },
      )
    }

    // MCI art.15 — log de acesso (fire-and-forget; flag accessLogsEnabled default OFF)
    logAccess({
      ip:     extractClientIp(req),
      userId,
      path:   "/api/users/me",
      method: "GET",
      status: 200,
      requestId: req.headers.get("x-vercel-id"),
    })

    return NextResponse.json({
      data: {
        ...user,
        avgRating:   reviewStats._avg.rating,
        reviewCount: reviewStats._count._all,
      },
    })
  } catch (e) {
    console.error("[GET /api/users/me]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno." } },
      { status: 500 },
    )
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = await resolveUserId(req)
    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Autenticação necessária." } },
        { status: 401 },
      )
    }

    const body   = await req.json()
    const parsed = UpdateProfileSchema.safeParse(body)

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

    const d       = parsed.data
    const updated = await prisma.user.update({
      // deletedAt: null — se o Redis estava fora na exclusão, Prisma lança P2025
      // (record not found) → catch → 500, prevenindo escrita sobre dados anonimizados.
      where: { id: userId, deletedAt: null },
      data:  {
        ...(d.name         !== undefined && { name:         d.name }),
        ...(d.bio          !== undefined && { bio:          d.bio }),
        ...(d.phone        !== undefined && { phone:        d.phone }),
        ...(d.cep          !== undefined && { cep:          d.cep }),
        ...(d.street       !== undefined && { street:       d.street }),
        ...(d.neighborhood !== undefined && { neighborhood: d.neighborhood }),
        ...(d.city         !== undefined && { city:         d.city }),
        ...(d.state        !== undefined && { state:        d.state }),
        ...(d.avatarUrl    !== undefined && { avatarUrl:    d.avatarUrl }),
        ...(d.slug         !== undefined && { slug:         d.slug }),
      },
      select: {
        id:           true,
        name:         true,
        bio:          true,
        phone:        true,
        cep:          true,
        street:       true,
        city:         true,
        state:        true,
        neighborhood: true,
        avatarUrl:    true,
        updatedAt:    true,
      },
    })

    // Geocodificar endereço completo do perfil — NÃO bloqueia a resposta.
    // S14-M-19: after() mantém a lambda viva até concluir (antes era await, ~3-5s no PATCH).
    const addressChanged = d.city !== undefined || d.state !== undefined
                        || d.street !== undefined || d.neighborhood !== undefined
    if (addressChanged) {
      const city  = d.city  ?? updated.city
      const state = d.state ?? updated.state
      if (city && state) {
        after(() =>
          geocodeUserLocation(userId, {
            street:       d.street       ?? updated.street,
            neighborhood: d.neighborhood ?? updated.neighborhood,
            city,
            state,
          }).catch((e) => console.error("[geocodeUserLocation]", e instanceof Error ? e.message : e))
        )
      }
    }

    // MCI art.15 — log de acesso (fire-and-forget; flag accessLogsEnabled default OFF)
    logAccess({
      ip:     extractClientIp(req),
      userId,
      path:   "/api/users/me",
      method: "PATCH",
      status: 200,
      requestId: req.headers.get("x-vercel-id"),
    })

    return NextResponse.json({ data: updated })
  } catch (e) {
    console.error("[PATCH /api/users/me]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno." } },
      { status: 500 },
    )
  }
}
