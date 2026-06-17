import crypto from "crypto"
import { prisma } from "@/lib/prisma"
import { generateUserSlug } from "@/lib/slugify"
import { sendFounderInviteEmail } from "@/lib/email"

// Convite-piloto: a partir de um FounderLead, cria a conta mínima do interessado e envia o
// link para definir a senha no 1º acesso. Reaproveita o PasswordResetToken como token de
// convite (validade maior). O cadastro fica incompleto (profileCompletedAt = null) — CPF e
// endereço só são exigidos ao Anunciar/Alugar (cadastro progressivo).

const INVITE_TOKEN_TTL_MS = 14 * 24 * 60 * 60 * 1000 // 14 dias

export type InviteResult =
  | { ok: true; userId: string; queuePosition: number }
  | { ok: false; code: "LEAD_NOT_FOUND" | "ALREADY_INVITED" | "EMAIL_IN_USE" | "UNSUBSCRIBED" }

export async function inviteFounderLead(leadId: string): Promise<InviteResult> {
  const lead = await prisma.founderLead.findUnique({
    where:  { id: leadId },
    select: {
      id: true, email: true, name: true, status: true, wave: true,
      city: true, state: true, queuePosition: true, deletedAt: true,
    },
  })

  if (!lead || lead.deletedAt) return { ok: false, code: "LEAD_NOT_FOUND" }
  if (lead.status === "UNSUBSCRIBED") return { ok: false, code: "UNSUBSCRIBED" }
  if (lead.status === "INVITED" || lead.status === "CONVERTED") {
    return { ok: false, code: "ALREADY_INVITED" }
  }

  const email = lead.email.toLowerCase()
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  if (existing) return { ok: false, code: "EMAIL_IN_USE" }

  const displayName = lead.name?.trim() || email.split("@")[0]
  const token       = crypto.randomBytes(32).toString("hex")
  const expiresAt   = new Date(Date.now() + INVITE_TOKEN_TTL_MS)

  // Cria usuário mínimo (sem senha utilizável) + token de convite + atualiza o lead.
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        name:         displayName,
        email,
        passwordHash: null, // definida pelo próprio usuário no 1º acesso
        city:         lead.city,
        state:        lead.state,
        isFounder:    true,
        founderWave:  lead.wave,
        founderJoinedAt: new Date(),
        signupSource: "VIP_LANDING",
        // profileCompletedAt = null → cadastro completo exigido só ao Anunciar/Alugar
      },
      select: { id: true, name: true },
    })

    await tx.user.update({
      where: { id: created.id },
      data:  { slug: generateUserSlug(created.name, created.id) },
    })

    await tx.passwordResetToken.create({ data: { email, token, expiresAt } })

    await tx.founderLead.update({
      where: { id: lead.id },
      data:  { status: "INVITED", invitedAt: new Date(), convertedUserId: created.id },
    })

    return created
  })

  await sendFounderInviteEmail(email, displayName, token)

  return { ok: true, userId: user.id, queuePosition: lead.queuePosition }
}
