import type { NextRequest } from "next/server"
import { NextResponse, after } from "next/server"
import { z } from "zod"
import { revalidateTag } from "next/cache"
import { prisma } from "@/lib/prisma"
import { assignWave } from "@/lib/founders"
import { sendFounderWelcomeEmail } from "@/lib/email"

const Schema = z.object({
  email:            z.string().email({ message: "E-mail inválido" }),
  name:             z.string().min(2).max(100).optional(),
  intent:           z.enum(["proprietario", "locatario", "ambos"]).default("proprietario"),
  marketingConsent: z.literal(true, { errorMap: () => ({ message: "Consentimento obrigatório" }) }),
  consentVersion:   z.string().default("v1.0"),
  source:           z.string().default("VIP_LANDING"),
})

export async function POST(req: NextRequest) {
  try {
    const body   = await req.json().catch(() => null)
    const parsed = Schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", details: parsed.error.flatten().fieldErrors } },
        { status: 400 },
      )
    }

    const { email, name, intent, consentVersion } = parsed.data
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
           ?? req.headers.get("x-real-ip")
           ?? "unknown"
    const ua = (req.headers.get("user-agent") ?? "").slice(0, 500)

    // Deduplicação por e-mail
    const existing = await prisma.founderLead.findUnique({
      where:  { email: email.toLowerCase() },
      select: { queuePosition: true, deletedAt: true },
    })
    if (existing && !existing.deletedAt) {
      return NextResponse.json(
        {
          error: {
            code:    "LEAD_ALREADY_EXISTS",
            message: "Este e-mail já está na lista.",
            data:    { queuePosition: existing.queuePosition },
          },
        },
        { status: 409 },
      )
    }

    // queuePosition é atribuído atomicamente pelo DB via autoincrement
    const lead = await prisma.founderLead.create({
      data: {
        email:              email.toLowerCase(),
        name:               name ?? null,
        intent,
        marketingConsentAt: new Date(),
        consentVersion,
        consentIp:          ip,
        consentUserAgent:   ua,
        status:             "PENDING",
        source:             "VIP_LANDING",
      },
      select: { id: true, queuePosition: true },
    })

    // wave é determinístico pela posição — atualizar de forma não-crítica
    const wave = assignWave(lead.queuePosition)
    after(() => prisma.founderLead.update({ where: { id: lead.id }, data: { wave } }).catch(() => {}))

    revalidateTag("founders")

    const displayName = name?.trim() || email.split("@")[0]
    after(() => sendFounderWelcomeEmail(email.toLowerCase(), displayName, lead.queuePosition).catch(() => {}))

    return NextResponse.json(
      { data: { leadId: lead.id, queuePosition: lead.queuePosition, wave } },
      { status: 201 },
    )
  } catch (e) {
    console.error("[POST /api/founders/leads]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno." } },
      { status: 500 },
    )
  }
}
