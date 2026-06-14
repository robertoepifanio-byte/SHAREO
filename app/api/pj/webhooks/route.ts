import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import crypto from "crypto"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { WEBHOOK_EVENTS } from "@/lib/outboundWebhooks"
import { isUrlSafeForWebhook } from "@/lib/ssrfGuard"
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit"

const MAX_WEBHOOKS_PER_USER = 5

const CreateSchema = z.object({
  url: z
    .string()
    .url("URL inválida")
    .startsWith("https://", "A URL deve usar HTTPS"),
  events: z
    .array(z.enum(WEBHOOK_EVENTS))
    .min(1, "Selecione pelo menos um evento")
    .max(WEBHOOK_EVENTS.length),
})

// GET — lista webhooks do usuário
export async function GET() {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Autenticação necessária." } },
        { status: 401 },
      )
    }

    if (session.user.userType !== "PJ") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Recurso exclusivo para contas PJ." } },
        { status: 403 },
      )
    }

    const webhooks = await prisma.outboundWebhook.findMany({
      where:   { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id:             true,
        url:            true,
        events:         true,
        isActive:       true,
        failureCount:   true,
        lastFiredAt:    true,
        lastStatusCode: true,
        createdAt:      true,
        // secret NÃO é retornado após a criação
      },
    })

    return NextResponse.json({ data: webhooks })
  } catch (e) {
    console.error("[GET /api/pj/webhooks]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno." } },
      { status: 500 },
    )
  }
}

// POST — cria um novo webhook
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Autenticação necessária." } },
        { status: 401 },
      )
    }

    if (session.user.userType !== "PJ") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Recurso exclusivo para contas PJ." } },
        { status: 403 },
      )
    }

    const rl = await checkRateLimit(`pj-webhooks:${session.user.id}`, RATE_LIMITS.pjWebhooks.limit, RATE_LIMITS.pjWebhooks.windowMs)
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const body   = await req.json()
    const parsed = CreateSchema.safeParse(body)

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

    // SSRF guard (S14-SEC-03): rejeita URL interna/privada na criação
    if (!(await isUrlSafeForWebhook(parsed.data.url))) {
      return NextResponse.json(
        { error: { code: "INVALID_URL", message: "URL não permitida (endereço interno/privado bloqueado)." } },
        { status: 400 },
      )
    }

    // Limite de webhooks por usuário
    const count = await prisma.outboundWebhook.count({ where: { userId: session.user.id } })
    if (count >= MAX_WEBHOOKS_PER_USER) {
      return NextResponse.json(
        { error: { code: "LIMIT_REACHED", message: `Máximo de ${MAX_WEBHOOKS_PER_USER} webhooks por conta.` } },
        { status: 409 },
      )
    }

    // Gera o secret — exibido apenas uma vez
    const secret = crypto.randomBytes(32).toString("hex")

    const webhook = await prisma.outboundWebhook.create({
      data: {
        userId: session.user.id,
        url:    parsed.data.url,
        events: parsed.data.events,
        secret,
      },
      select: {
        id:       true,
        url:      true,
        events:   true,
        isActive: true,
        createdAt: true,
        // secret é retornado APENAS na criação
      },
    })

    // Retorna o secret junto com os dados do webhook (apenas nesta resposta)
    return NextResponse.json({ data: { ...webhook, secret } }, { status: 201 })
  } catch (e) {
    console.error("[POST /api/pj/webhooks]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno." } },
      { status: 500 },
    )
  }
}
