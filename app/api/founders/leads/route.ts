import type { NextRequest } from "next/server"
import { NextResponse, after } from "next/server"
import { z } from "zod"
import { revalidateTag } from "next/cache"
import { prisma } from "@/lib/prisma"
import { assignWave, generateReferralCode } from "@/lib/founders"
import { sendFounderWelcomeEmail } from "@/lib/email"
import { MARKETING_CONSENT_VERSION } from "@/lib/legal-config"
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit"
import { normalizePlace } from "@/lib/geo/normalize-place"

const SOURCE_VALUES = ["ORGANIC", "VIP_LANDING", "REFERRAL", "GOOGLE_ADS", "META_ADS"] as const
type SourceValue = (typeof SOURCE_VALUES)[number]

const Schema = z.object({
  email:            z.string().email({ message: "E-mail inválido" }),
  name:             z.string().min(2).max(100).optional(),
  intent:           z.enum(["proprietario", "locatario", "ambos"]).default("proprietario"),
  marketingConsent: z.literal(true, { errorMap: () => ({ message: "Consentimento obrigatório" }) }),
  consentVersion:   z.string().default(MARKETING_CONSENT_VERSION),
  // OPCIONAL: telefone é o campo de maior atrito numa captação, e exigi-lo
  // custaria inscrições. Mesmo formato E.164 de User.phone, para não criar um
  // segundo padrão de telefone no banco.
  phone:            z.string().regex(/^\+55\d{10,11}$/, "Telefone inválido").optional(),
  source:           z.enum(SOURCE_VALUES).default("VIP_LANDING"),
  // Obrigatórios: a cidade/UF definem onde os Pilotos serão implantados.
  // Continuam exigidos mesmo com a captura por CEP — o formulário sempre os
  // resolve (via ViaCEP ou preenchimento manual) antes de habilitar o envio.
  city:             z.string().min(2, "Cidade obrigatória").max(100),
  state:            z.string().length(2, "UF obrigatória (2 letras)"),
  // Granularidade de bairro (campanha nacional) — opcionais de propósito:
  // municípios de CEP único devolvem bairro vazio no ViaCEP, e o fallback
  // manual não deve travar a conversão.
  cep:              z.string().regex(/^\d{8}$/, "CEP deve ter 8 dígitos").optional(),
  neighborhood:     z.string().max(120).optional(),
  addressSource:    z.enum(["CEP", "MANUAL"]).optional(),
  // Atribuição de campanha (opcional) — lidos da URL pelo formulário.
  utmSource:        z.string().max(200).optional(),
  utmMedium:        z.string().max(200).optional(),
  utmCampaign:      z.string().max(200).optional(),
  utmContent:       z.string().max(200).optional(),
  utmTerm:          z.string().max(200).optional(),
  referrerUrl:      z.string().max(500).optional(),
  // Código de quem indicou (o `ref` da URL). Aceita só o alfabeto do gerador —
  // é dado de terceiro vindo de link público, então não entra cru no banco.
  referredByCode:   z.string().regex(/^[23456789A-HJ-NP-Z]{8}$/).optional(),
})

export async function POST(req: NextRequest) {
  try {
    // SEC-ALTO-05: rota pública — rate limit por IP (anti-spam de leads + custo Resend)
    const rlIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
             ?? req.headers.get("x-real-ip") ?? "unknown"
    const rl = await checkRateLimit(
      `founders-lead:${rlIp}`,
      RATE_LIMITS.foundersLead.limit,
      RATE_LIMITS.foundersLead.windowMs,
      req,
    )
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const body   = await req.json().catch(() => null)
    const parsed = Schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", details: parsed.error.flatten().fieldErrors } },
        { status: 400 },
      )
    }

    const { email, name, phone, intent, consentVersion, source, city, state,
            cep, neighborhood, addressSource, referredByCode,
            utmSource, utmMedium, utmCampaign, utmContent, utmTerm, referrerUrl } = parsed.data
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
           ?? req.headers.get("x-real-ip")
           ?? "unknown"
    const ua = (req.headers.get("user-agent") ?? "").slice(0, 500)

    const emailLower = email.toLowerCase()

    // Campos de localização compartilhados entre create e reativação.
    // `*Norm` é a chave de agrupamento do painel (ver lib/geo/normalize-place.ts);
    // `city`/`neighborhood` guardam a grafia original, usada para exibição.
    const placeData = {
      city:             city.trim(),
      state:            state.trim().toUpperCase(),
      cep:              cep ?? null,
      neighborhood:     neighborhood?.trim() || null,
      cityNorm:         normalizePlace(city),
      neighborhoodNorm: normalizePlace(neighborhood),
      addressSource:    addressSource ?? null,
    }

    const attributionData = {
      source:      source as SourceValue,
      // Só grava se veio; numa reativação sem `ref` preserva quem indicou da
      // primeira vez, em vez de apagar a atribuição por omissão.
      ...(referredByCode ? { referredByCode } : {}),
      utmSource:   utmSource   ?? null,
      utmMedium:   utmMedium   ?? null,
      utmCampaign: utmCampaign ?? null,
      utmContent:  utmContent  ?? null,
      utmTerm:     utmTerm     ?? null,
      referrerUrl: referrerUrl ?? null,
    }

    const consentData = {
      marketingConsentAt: new Date(),
      consentVersion,
      consentIp:          ip,
      consentUserAgent:   ua,
    }

    // Só grava o telefone se ele veio. Numa reativação sem telefone, preserva o
    // que já existia em vez de apagar o dado por omissão.
    const phoneData = phone ? { phone } : {}

    // Deduplicação por e-mail
    const existing = await prisma.founderLead.findUnique({
      where:  { email: emailLower },
      select: { id: true, queuePosition: true, deletedAt: true, status: true, wave: true, referralCode: true },
    })

    if (existing && !existing.deletedAt && existing.status !== "UNSUBSCRIBED") {
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

    // REATIVAÇÃO — lead soft-deleted ou descadastrado que voltou.
    // Antes deste bloco o código caía direto no create() e estourava a constraint
    // UNIQUE de e-mail, devolvendo 500 para quem só queria se reinscrever.
    // A posição na fila é PRESERVADA: quem entrou primeiro não perde o lugar por
    // ter saído e voltado.
    if (existing) {
      const lead = await prisma.founderLead.update({
        where: { id: existing.id },
        data: {
          name:      name ?? null,
          intent,
          status:    "PENDING",
          deletedAt: null,
          // Leads criados antes da migração de indicação não têm código. Atribui
          // um agora, para que a tela de sucesso possa oferecer o convite.
          ...(existing.referralCode ? {} : { referralCode: generateReferralCode() }),
          ...phoneData,
          ...placeData,
          ...attributionData,
          ...consentData,
        },
        select: { id: true, queuePosition: true, wave: true, referralCode: true },
      })

      after(() =>
        prisma.founderAuditLog
          .create({ data: { leadId: lead.id, action: "LEAD_CREATED", metadata: { reactivated: true } } })
          .catch(() => {}),
      )
      revalidateTag("founders")

      // O boas-vindas só era disparado no caminho de criação. Quem se
      // descadastrava e voltava não recebia nada, ficava sem confirmação e
      // concluía que o envio tinha falhado — logo depois de reconquistarmos a
      // pessoa, que é o pior momento para o silêncio.
      const reactivatedName = name?.trim() || email.split("@")[0]
      after(() => sendFounderWelcomeEmail(emailLower, reactivatedName, lead.queuePosition).catch(() => {}))

      return NextResponse.json(
        {
          data: {
            leadId:        lead.id,
            queuePosition: lead.queuePosition,
            wave:          lead.wave,
            referralCode:  lead.referralCode,
          },
        },
        { status: 201 },
      )
    }

    // queuePosition é atribuído atomicamente pelo DB via autoincrement.
    //
    // O retry cobre a colisão de referralCode (coluna UNIQUE). Com 31^8 ≈ 8,5e11
    // combinações ela é improvável a ponto de nunca acontecer — mas se acontecer
    // sem retry o lead se perde com 500, e perder captação de campanha paga por
    // sorteio é inaceitável. Duas tentativas bastam: a chance de duas seguidas
    // é o quadrado de improvável.
    let lead: { id: string; queuePosition: number; referralCode: string | null } | null = null
    for (let attempt = 0; attempt < 2 && !lead; attempt++) {
      try {
        lead = await prisma.founderLead.create({
          data: {
            email:  emailLower,
            name:   name ?? null,
            phone:  phone ?? null,
            intent,
            status: "PENDING",
            referralCode: generateReferralCode(),
            ...placeData,
            ...attributionData,
            ...consentData,
          },
          select: { id: true, queuePosition: true, referralCode: true },
        })
      } catch (err) {
        // P2002 = violação de UNIQUE. Só vale retentar se foi o código; se foi o
        // e-mail, é corrida com outra aba e o certo é deixar estourar para o
        // catch externo (o findUnique acima já cobre o caso normal).
        const target = (err as { code?: string; meta?: { target?: string[] } })
        const isCodeCollision =
          target.code === "P2002" && (target.meta?.target ?? []).some((t) => t.includes("referral_code"))
        if (!isCodeCollision || attempt === 1) throw err
      }
    }
    if (!lead) throw new Error("Falha ao criar lead após retry de referralCode")

    // wave é determinístico pela posição — atualizar de forma não-crítica
    const wave = assignWave(lead.queuePosition)
    after(() => prisma.founderLead.update({ where: { id: lead.id }, data: { wave } }).catch(() => {}))

    // Trilha de auditoria do programa de fundadores. A ação "LEAD_CREATED" já era
    // documentada no modelo mas nada a escrevia.
    after(() =>
      prisma.founderAuditLog
        .create({ data: { leadId: lead.id, action: "LEAD_CREATED", metadata: { source, city: placeData.city, state: placeData.state } } })
        .catch(() => {}),
    )

    revalidateTag("founders")

    const displayName = name?.trim() || email.split("@")[0]
    after(() => sendFounderWelcomeEmail(emailLower, displayName, lead.queuePosition).catch(() => {}))

    return NextResponse.json(
      {
        data: {
          leadId:        lead.id,
          queuePosition: lead.queuePosition,
          wave,
          // O formulário monta o link de convite com isto. Sem devolver o código
          // aqui, o compartilhamento não teria como ser atribuído.
          referralCode:  lead.referralCode,
        },
      },
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
