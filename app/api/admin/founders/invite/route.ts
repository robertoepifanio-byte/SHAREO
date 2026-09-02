/**
 * POST /api/admin/founders/invite
 * Convida leads do programa de fundadores para o piloto (cria conta mínima + envia link
 * para definir senha no 1º acesso). Domínio Operacional (+Superadmin).
 *
 * Body: { leadIds?: string[] }  — convida os ids informados; ou
 *       { wave?, state?: "RN", city?: "Natal", cityNorm?: "natal",
 *         neighborhoodNorm?: "boa viagem", limit?: number } — convida leads PENDING
 *       por região/cidade/bairro/onda (para abrir a(s) cidade(s)-piloto).
 *
 * Sobre `cityNorm` vs `city`: o painel agrupa cidades pela chave normalizada
 * (acento dobrado), então uma linha do ranking pode reunir "São Paulo" e
 * "sao paulo". Filtrar por `city` texto convidaria só uma das grafias e deixaria
 * o resto do grupo para trás, em silêncio. `cityNorm` é o filtro correto; `city`
 * segue aceito por compatibilidade com chamadas antigas.
 */
import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { hasAdminRole } from "@/lib/auth/admin-guards"
import { prisma } from "@/lib/prisma"
import { inviteFounderLead } from "@/lib/founderInvite"
import { normalizePlace } from "@/lib/geo/normalize-place"

export const runtime = "nodejs"

const Schema = z.object({
  leadIds:          z.array(z.string()).max(200).optional(),
  wave:             z.enum(["WAVE_1", "WAVE_2", "WAVE_3"]).optional(),
  state:            z.string().length(2).optional(),
  city:             z.string().min(1).max(120).optional(),
  cityNorm:         z.string().min(1).max(120).optional(),
  neighborhoodNorm: z.string().min(1).max(120).optional(),
  limit:            z.number().int().min(1).max(200).optional(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  // 403, não 401: quem chegou aqui autenticado e sem permissão não resolve
  // nada fazendo login de novo. Mesma regra de lib/auth/require-admin.ts.
  if (!hasAdminRole(session, "ADMIN_SUPERADMIN", "ADMIN_OPERACIONAL")) {
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "Acesso restrito." } }, { status: 403 })
  }

  const body   = await req.json().catch(() => ({}))
  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", details: parsed.error.flatten().fieldErrors } },
      { status: 400 },
    )
  }
  const { leadIds, wave, state, city, cityNorm, neighborhoodNorm, limit } = parsed.data

  // `cityNorm` explícito tem precedência; se só veio `city` (chamada antiga),
  // normaliza aqui para casar com a mesma chave gravada em write time.
  const cityKey = cityNorm ?? normalizePlace(city)

  // Resolve a lista de leads a convidar
  let ids: string[]
  if (leadIds && leadIds.length > 0) {
    ids = leadIds
  } else {
    const leads = await prisma.founderLead.findMany({
      where: {
        status:    "PENDING",
        deletedAt: null,
        ...(wave    && { wave }),
        ...(state   && { state: state.toUpperCase() }),
        ...(cityKey && { cityNorm: cityKey }),
        ...(neighborhoodNorm && { neighborhoodNorm }),
      },
      orderBy: { queuePosition: "asc" },
      take:    limit ?? 50,
      select:  { id: true },
    })
    ids = leads.map((l) => l.id)
  }

  const results: { leadId: string; ok: boolean; code?: string }[] = []
  let invited = 0
  for (const id of ids) {
    try {
      const r = await inviteFounderLead(id)
      results.push({ leadId: id, ok: r.ok, code: r.ok ? undefined : r.code })
      if (r.ok) invited++
    } catch (e) {
      console.error("[admin/founders/invite]", id, e instanceof Error ? e.message : e)
      results.push({ leadId: id, ok: false, code: "ERROR" })
    }
  }

  return NextResponse.json({ data: { requested: ids.length, invited, results } })
}
