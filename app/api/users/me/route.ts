import type { NextRequest } from "next/server"
import { NextResponse, after } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveUserId } from "@/lib/resolveUserId"
import { UpdateProfileSchema } from "@/lib/validations/users"
import { geocodeUserLocation } from "@/lib/geocodeUser"
import { createAdminClient } from "@/lib/supabase/admin"
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
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Autenticação necessária." } },
        { status: 401 },
      )
    }

    const userId = session.user.id

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

      // Texto livre escrito pelo usuário em avaliações
      prisma.review.updateMany({
        where: { reviewerId: userId },
        data:  { comment: null },
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

    // Best-effort: remover os documentos privados de identidade do Storage.
    // Não bloqueia a resposta; falha de Storage não deve impedir a exclusão.
    after(async () => {
      try {
        const supabase = createAdminClient()
        const { data: files } = await supabase.storage.from("id-docs").list(userId)
        if (files && files.length > 0) {
          await supabase.storage
            .from("id-docs")
            .remove(files.map((f) => `${userId}/${f.name}`))
        }
      } catch (e) {
        console.warn("[DELETE /api/users/me] limpeza id-docs falhou:", e instanceof Error ? e.message : e)
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

    const user = await prisma.user.findUnique({
      where:  { id: userId },
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
        avatarUrl:    true,
        userType:     true,
        isVerified:   true,
        createdAt:    true,
      },
    })

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

    return NextResponse.json({ data: user })
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
    const session = await auth()
    if (!session) {
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
      where: { id: session.user.id },
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
          geocodeUserLocation(session.user.id, {
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
      userId: session.user.id,
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
