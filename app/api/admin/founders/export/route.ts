/**
 * GET /api/admin/founders/export
 *
 * Exporta o recorte atual do painel de interessados da campanha de pré-lançamento.
 * Aceita os mesmos filtros da página (`period`, `uf`, `cidade`), para que o CSV
 * baixado corresponda exatamente ao que o fundador está vendo na tela.
 *
 * Dois modos:
 *   (padrão)  agregado por UF/cidade/bairro — sem PII, é o que serve para decidir
 *             a cidade-piloto e o que circula em planilha compartilhada.
 *   ?raw=1    nível-lead (inclui e-mail e nome) — restrito a SUPERADMIN e
 *             registrado em auditoria, porque é exportação de dado pessoal.
 */
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminApi } from "@/lib/auth/require-admin"
import { hasAdminRole } from "@/lib/auth/admin-guards"
import { auditLog } from "@/lib/audit"
import { toCsv, CSV_BOM } from "@/lib/csv"
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit"

export const runtime = "nodejs"

const MAX_RAW_ROWS = 50_000

export async function GET(req: NextRequest) {
  const { session, error } = await requireAdminApi("ADMIN_SUPERADMIN", "ADMIN_OPERACIONAL")
  if (error) return error

  const adminId = session.user.id

  const rl = await checkRateLimit(
    `founders-export:${adminId}`,
    RATE_LIMITS.foundersExport.limit,
    RATE_LIMITS.foundersExport.windowMs,
    req,
  )
  if (!rl.allowed) return rateLimitResponse(rl.resetAt)

  const sp     = req.nextUrl.searchParams
  const uf     = sp.get("uf")?.trim().toUpperCase().slice(0, 2) || null
  const cidade = sp.get("cidade")?.trim().toLowerCase() || null
  const raw    = sp.get("raw") === "1"
  const days   = Number(sp.get("period"))
  const since  = Number.isFinite(days) && days > 0
    ? new Date(Date.now() - Math.min(days, 90) * 864e5)
    : null

  const where = {
    deletedAt: null,
    ...(since  && { createdAt: { gte: since } }),
    ...(uf     && { state: uf }),
    ...(cidade && { cityNorm: cidade }),
  }

  const stamp    = new Date().toISOString().slice(0, 10)
  const scope    = [uf, cidade].filter(Boolean).join("-") || "brasil"
  const filename = `shareo-interessados-${raw ? "leads" : "agregado"}-${scope}-${stamp}.csv`

  try {
    let rows: Record<string, unknown>[]

    if (raw) {
      // Exportação de dado pessoal — só superadmin, e fica registrada.
      if (!hasAdminRole(session, "ADMIN_SUPERADMIN")) {
        return NextResponse.json(
          { error: { code: "FORBIDDEN", message: "Exportação nível-lead exige superadmin." } },
          { status: 403 },
        )
      }

      const leads = await prisma.founderLead.findMany({
        where,
        orderBy: { queuePosition: "asc" },
        take:    MAX_RAW_ROWS,
        select: {
          queuePosition: true, email: true, name: true, phone: true, intent: true, status: true,
          state: true, city: true, neighborhood: true, cep: true,
          source: true, utmCampaign: true, utmContent: true,
          addressSource: true, consentVersion: true, createdAt: true,
        },
      })

      auditLog(adminId, "EXPORT_FOUNDER_LEADS", "FounderLead", scope, {
        raw: true, uf, cidade, rows: leads.length,
      })

      rows = leads.map((l) => ({
        posicao:    l.queuePosition,
        email:      l.email,
        nome:       l.name ?? "",
        telefone:   l.phone ?? "",
        // Determina se este lead pode receber contato por WhatsApp: quem entrou
        // antes de "marketing-v1.0" aceitou um texto que falava só de e-mail.
        // Sai na planilha para quem for disparar não precisar adivinhar.
        pode_whatsapp: l.phone && l.consentVersion.startsWith("marketing-") ? "sim" : "nao",
        versao_consentimento: l.consentVersion,
        intencao:   l.intent,
        status:     l.status,
        uf:         l.state ?? "",
        cidade:     l.city ?? "",
        bairro:     l.neighborhood ?? "",
        cep:        l.cep ?? "",
        canal:      l.source,
        campanha:   l.utmCampaign ?? "",
        criativo:   l.utmContent ?? "",
        origem_end: l.addressSource ?? "",
        criado_em:  l.createdAt.toISOString(),
      }))
    } else {
      // Agregado: uma linha por UF/cidade/bairro, com o cruzamento de intenção e
      // estágio. Sem PII — é o dado que embasa a escolha da cidade-piloto.
      const groups = await prisma.founderLead.groupBy({
        by:     ["state", "cityNorm", "neighborhoodNorm", "intent", "status"],
        where,
        _count: { _all: true },
        _max:   { city: true, neighborhood: true },
      })

      const acc = new Map<string, Record<string, unknown>>()
      for (const g of groups) {
        const k = `${g.state ?? ""}|${g.cityNorm ?? ""}|${g.neighborhoodNorm ?? ""}`
        const r = acc.get(k) ?? {
          uf: g.state ?? "", cidade: g._max.city ?? "", bairro: g._max.neighborhood ?? "",
          total: 0, anunciar: 0, alugar: 0, ambos: 0,
          aguardando: 0, convidados: 0, cadastrados: 0, descadastrados: 0,
        }
        const n = g._count._all
        r.total = (r.total as number) + n
        if (g.intent === "proprietario") r.anunciar = (r.anunciar as number) + n
        else if (g.intent === "locatario") r.alugar = (r.alugar as number) + n
        else if (g.intent === "ambos") r.ambos = (r.ambos as number) + n
        if (g.status === "PENDING")      r.aguardando     = (r.aguardando as number) + n
        if (g.status === "INVITED")      r.convidados     = (r.convidados as number) + n
        if (g.status === "CONVERTED")    r.cadastrados    = (r.cadastrados as number) + n
        if (g.status === "UNSUBSCRIBED") r.descadastrados = (r.descadastrados as number) + n
        acc.set(k, r)
      }

      rows = [...acc.values()].sort((a, b) => (b.total as number) - (a.total as number))
    }

    // BOM: sem ele o Excel pt-BR abre em ANSI e "São Paulo" vira "SÃ£o Paulo".
    const body = CSV_BOM + toCsv(rows)

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type":        "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control":       "no-store",
      },
    })
  } catch (e) {
    console.error("[GET /api/admin/founders/export]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Falha ao gerar o CSV." } },
      { status: 500 },
    )
  }
}
