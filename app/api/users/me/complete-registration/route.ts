import type { NextRequest } from "next/server"
import { NextResponse, after } from "next/server"
import type { Prisma } from "@prisma/client"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hashDocument, encryptDocument } from "@/lib/crypto"
import { safeServerError } from "@/lib/logger"
import { CompleteRegistrationSchema } from "@/lib/validations/auth"
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit"
import { geocodeUserLocation } from "@/lib/geocodeUser"
import {
  verifyCnpjAtReceita,
  buildPjUpdateData,
  PjVerificationError,
  type PjVerificationResult,
} from "@/lib/pjVerification"

function clientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown"
}

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
      // KYB leve (M4): o CPF do responsável legal também precisa ser único.
      if (d.cpfResponsavel) {
        const cpfHash = hashDocument(d.cpfResponsavel)
        const cpfClash = await prisma.user.findFirst({
          where:  { cpfHash, id: { not: userId } },
          select: { id: true },
        })
        if (cpfClash) {
          return NextResponse.json(
            { error: { code: "CPF_ALREADY_EXISTS", message: "CPF do responsável legal já cadastrado em outra conta." } },
            { status: 409 },
          )
        }
      }
    }

    const commonData = {
      phone:        d.phone || null,
      cep:          d.zipCode || null,
      street:       d.street || null,
      neighborhood: d.neighborhood || null,
      city:         d.city,
      state:        d.state,
      profileCompletedAt: current.profileCompletedAt ?? new Date(),
      ageDeclaredAt:      current.ageDeclaredAt ?? new Date(),
    }

    let data: Prisma.UserUpdateInput
    if (d.userType === "PJ") {
      // M1 — consulta a Receita (fail-open controlado: indisponibilidade não bloqueia).
      let verification: PjVerificationResult | null = null
      try {
        verification = await verifyCnpjAtReceita(d.cnpj!)
      } catch (e) {
        if (e instanceof PjVerificationError) {
          if (e.code === "CNPJ_INACTIVE") {
            return NextResponse.json(
              { error: { code: "CNPJ_INACTIVE", message: "Este CNPJ não está ativo na Receita Federal." } },
              { status: 422 },
            )
          }
          if (e.code === "CNPJ_NOT_FOUND") {
            return NextResponse.json(
              { error: { code: "CNPJ_NOT_FOUND", message: "CNPJ não encontrado na Receita Federal." } },
              { status: 422 },
            )
          }
          // VERIFICATION_UNAVAILABLE → segue com verification = null (revisão).
        } else {
          throw e
        }
      }
      // M4: o CPF do responsável legal vira o cpfHash/cpfEncrypted da conta PJ.
      data = {
        ...buildPjUpdateData(
          { cnpj: d.cnpj!, responsavelLegal: d.responsavelLegal!, declaracaoIp: clientIp(req) },
          verification,
        ),
        cpfHash:      hashDocument(d.cpfResponsavel!),
        cpfEncrypted: encryptDocument(d.cpfResponsavel!),
        ...commonData,
      }
    } else {
      data = {
        userType:      "PF",
        cpfHash:       d.cpf ? hashDocument(d.cpf)    : null,
        cpfEncrypted:  d.cpf ? encryptDocument(d.cpf) : null,
        cnpjHash:      null,
        cnpjEncrypted: null,
        ...commonData,
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data,
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
    // safeServerError mascara CPF/CNPJ que podem aparecer em mensagens de erro
    safeServerError("[PATCH /api/users/me/complete-registration]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno. Tente novamente." } },
      { status: 500 },
    )
  }
}
