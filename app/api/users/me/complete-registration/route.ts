import type { NextRequest } from "next/server"
import { NextResponse, after } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hashDocument, encryptDocument } from "@/lib/crypto"
import { CompleteRegistrationSchema } from "@/lib/validations/auth"
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit"
import { geocodeUserLocation } from "@/lib/geocodeUser"

// Cadastro progressivo — conclui o cadastro completo (documento + endereço) exigido ao
// Anunciar/Alugar. Marca profileCompletedAt, liberando os gates (lib/registration.ts).
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Autenticação necessária." } },
        { status: 401 },
      )
    }
    const userId = session.user.id

    const rl = await checkRateLimit(`complete-reg:${userId}`, RATE_LIMITS.upgradePj.limit, RATE_LIMITS.upgradePj.windowMs)
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const body   = await req.json()
    const parsed = CompleteRegistrationSchema.safeParse(body)
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
    const d = parsed.data

    const current = await prisma.user.findUnique({
      where:  { id: userId },
      select: { profileCompletedAt: true, ageDeclaredAt: true },
    })
    if (!current) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Usuário não encontrado." } },
        { status: 404 },
      )
    }

    // Unicidade do documento — exclui a própria conta (permite reenvio).
    if (d.userType === "PF" && d.cpf) {
      const cpfHash = hashDocument(d.cpf)
      const clash = await prisma.user.findFirst({
        where:  { cpfHash, id: { not: userId } },
        select: { id: true },
      })
      if (clash) {
        return NextResponse.json(
          { error: { code: "CPF_ALREADY_EXISTS", message: "CPF já cadastrado em outra conta." } },
          { status: 409 },
        )
      }
    }
    if (d.userType === "PJ" && d.cnpj) {
      const cnpjHash = hashDocument(d.cnpj)
      const clash = await prisma.user.findFirst({
        where:  { cnpjHash, id: { not: userId } },
        select: { id: true },
      })
      if (clash) {
        return NextResponse.json(
          { error: { code: "CNPJ_ALREADY_EXISTS", message: "CNPJ já cadastrado em outra conta." } },
          { status: 409 },
        )
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        userType:      d.userType,
        // grava o documento do tipo escolhido; limpa o outro para manter consistência
        cpfHash:       d.userType === "PF" && d.cpf  ? hashDocument(d.cpf)     : null,
        cpfEncrypted:  d.userType === "PF" && d.cpf  ? encryptDocument(d.cpf)  : null,
        cnpjHash:      d.userType === "PJ" && d.cnpj ? hashDocument(d.cnpj)    : null,
        cnpjEncrypted: d.userType === "PJ" && d.cnpj ? encryptDocument(d.cnpj) : null,
        phone:         d.phone || null,
        cep:           d.zipCode || null,
        street:        d.street || null,
        neighborhood:  d.neighborhood || null,
        city:          d.city,
        state:         d.state,
        profileCompletedAt: current.profileCompletedAt ?? new Date(),
        ageDeclaredAt:      current.ageDeclaredAt ?? new Date(),
      },
      select: { id: true, userType: true, city: true, state: true, street: true, neighborhood: true, profileCompletedAt: true },
    })

    // Geocodifica com o endereço completo — não bloqueia a resposta.
    after(() =>
      geocodeUserLocation(userId, {
        street:       updated.street,
        neighborhood: updated.neighborhood,
        city:         updated.city!,
        state:        updated.state!,
      }).catch((e) => console.error("[complete-registration] geocode", e instanceof Error ? e.message : e))
    )

    return NextResponse.json({ data: updated })
  } catch (e: unknown) {
    console.error("[PATCH /api/users/me/complete-registration]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno. Tente novamente." } },
      { status: 500 },
    )
  }
}
