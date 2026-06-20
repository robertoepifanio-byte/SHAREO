import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hashDocument } from "@/lib/crypto"
import { UpgradePjSchema } from "@/lib/validations/auth"
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit"
import {
  verifyCnpjAtReceita,
  buildPjUpdateData,
  PjVerificationError,
  type PjVerificationResult,
} from "@/lib/pjVerification"

function clientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown"
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Autenticação necessária." } },
        { status: 401 },
      )
    }

    const rl = await checkRateLimit(`upgrade-pj:${session.user.id}`, RATE_LIMITS.upgradePj.limit, RATE_LIMITS.upgradePj.windowMs, req)
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    // M4: só contas PF com cadastro completo (CPF verificado) podem virar PJ.
    const current = await prisma.user.findUnique({
      where:  { id: session.user.id },
      select: { userType: true, profileCompletedAt: true },
    })

    if (!current) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Usuário não encontrado." } },
        { status: 404 },
      )
    }

    if (current.userType === "PJ") {
      return NextResponse.json(
        { error: { code: "ALREADY_PJ", message: "Conta já é Pessoa Jurídica." } },
        { status: 409 },
      )
    }

    if (!current.profileCompletedAt) {
      return NextResponse.json(
        { error: { code: "PROFILE_INCOMPLETE", message: "Conclua seu cadastro pessoal (CPF e endereço) antes de virar PJ." } },
        { status: 403 },
      )
    }

    const body   = await req.json()
    const parsed = UpgradePjSchema.safeParse(body)

    if (!parsed.success) {
      const msg = parsed.error.errors.map((e) => e.message).join("; ")
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: msg } },
        { status: 400 },
      )
    }

    const { cnpj, responsavelLegal } = parsed.data

    // Unicidade do CNPJ.
    const cnpjHash = hashDocument(cnpj)
    const exists = await prisma.user.findUnique({ where: { cnpjHash }, select: { id: true } })
    if (exists) {
      return NextResponse.json(
        { error: { code: "CNPJ_ALREADY_EXISTS", message: "CNPJ já cadastrado em outra conta." } },
        { status: 409 },
      )
    }

    // Anti-abuso do fail-open: no máximo 1 tentativa de upgrade por CNPJ a cada 24h.
    const rlCnpj = await checkRateLimit(`upgrade-pj-cnpj:${cnpjHash}`, RATE_LIMITS.upgradePjCnpj.limit, RATE_LIMITS.upgradePjCnpj.windowMs, req)
    if (!rlCnpj.allowed) return rateLimitResponse(rlCnpj.resetAt)

    const input = { cnpj, responsavelLegal, declaracaoIp: clientIp(req) }

    // M1 — consulta a Receita. Fail-open controlado: indisponibilidade não bloqueia.
    let verification: PjVerificationResult | null = null
    try {
      verification = await verifyCnpjAtReceita(cnpj)
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
        // VERIFICATION_UNAVAILABLE → fail-open: segue com verification = null (revisão).
      } else {
        throw e
      }
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data:  buildPjUpdateData(input, verification),
    })

    return NextResponse.json({
      data: {
        message: verification
          ? "Conta atualizada para Pessoa Jurídica."
          : "Conta atualizada para Pessoa Jurídica. Estamos confirmando seu CNPJ na Receita — você será avisado em até 24h.",
        razaoSocial: verification?.razaoSocial ?? null,
        pendingReview: !verification,
      },
    })
  } catch (e: unknown) {
    console.error("[POST /api/users/me/upgrade-pj]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno." } },
      { status: 500 },
    )
  }
}
