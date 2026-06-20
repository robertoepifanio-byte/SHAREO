import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasAdminRole } from "@/lib/auth/admin-guards"
import { InviteCityButton } from "./_InviteCityButton"

export const metadata: Metadata = { title: "Admin — Interessados / Pilotos" }

type CityRow = {
  city:      string | null
  state:     string | null
  total:     number
  pending:   number
  invited:   number
  converted: number
  owners:    number   // intent = proprietario
  renters:   number   // intent = locatario
  referred:  number   // usuários nesta cidade que vieram por indicação
}

const keyOf = (city: string | null, state: string | null) => `${state ?? ""}|${(city ?? "").toLowerCase()}`

export default async function AdminFundadoresPage() {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard")
  if (!hasAdminRole(session, "ADMIN_SUPERADMIN", "ADMIN_OPERACIONAL")) redirect("/admin")

  const [leads, referredUsers, bySource, byCampaign] = await Promise.all([
    prisma.founderLead.findMany({
      where:  { deletedAt: null },
      select: { city: true, state: true, status: true, intent: true },
    }),
    // Indicados (usuários que vieram por link de indicação) agrupados por cidade/estado
    prisma.user.groupBy({
      by:      ["state", "city"],
      where:   { referredById: { not: null }, deletedAt: null },
      _count:  { _all: true },
    }),
    // Atribuição: leads por canal (enum source)
    prisma.founderLead.groupBy({
      by:      ["source"],
      where:   { deletedAt: null },
      _count:  { _all: true },
    }),
    // Atribuição: leads por campanha (utm_campaign) — só os que têm campanha
    prisma.founderLead.groupBy({
      by:      ["utmCampaign"],
      where:   { deletedAt: null, utmCampaign: { not: null } },
      _count:  { _all: true },
    }),
  ])

  const SOURCE_LABELS: Record<string, string> = {
    ORGANIC:     "Orgânico",
    VIP_LANDING: "Landing VIP",
    REFERRAL:    "Indicação",
    GOOGLE_ADS:  "Google Ads",
    META_ADS:    "Meta Ads",
  }
  const channelRows  = [...bySource].sort((a, b) => b._count._all - a._count._all)
  const campaignRows = [...byCampaign].sort((a, b) => b._count._all - a._count._all)

  const referredByCity = new Map<string, number>()
  for (const r of referredUsers) {
    referredByCity.set(keyOf(r.city, r.state), r._count._all)
  }

  // Agrega leads por cidade/estado
  const rows = new Map<string, CityRow>()
  for (const l of leads) {
    const k = keyOf(l.city, l.state)
    const row = rows.get(k) ?? {
      city: l.city, state: l.state,
      total: 0, pending: 0, invited: 0, converted: 0, owners: 0, renters: 0,
      referred: referredByCity.get(k) ?? 0,
    }
    row.total += 1
    if (l.status === "PENDING")   row.pending   += 1
    if (l.status === "INVITED")   row.invited   += 1
    if (l.status === "CONVERTED") row.converted += 1
    if (l.intent === "proprietario") row.owners  += 1
    else if (l.intent === "locatario") row.renters += 1
    rows.set(k, row)
  }

  // Ordena: cidades com nome primeiro (por total desc), "Sem cidade" por último
  const ranked = [...rows.values()].sort((a, b) => {
    if (!a.city && b.city) return 1
    if (a.city && !b.city) return -1
    return b.total - a.total
  })

  const totalLeads     = leads.length
  const totalPending   = leads.filter((l) => l.status === "PENDING").length
  const totalInvited   = leads.filter((l) => l.status === "INVITED").length
  const totalConverted = leads.filter((l) => l.status === "CONVERTED").length

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-primary">Interessados / Pilotos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Lista da pré-divulgação agrupada por cidade. Use o ranking para escolher a(s)
          cidade(s)-piloto e convide todos os interessados PENDING de uma cidade de uma vez.
        </p>
      </div>

      {/* Métricas */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Interessados",  value: totalLeads,     color: "text-primary" },
          { label: "Aguardando",    value: totalPending,   color: totalPending > 0 ? "text-orange-link" : "text-primary" },
          { label: "Convidados",    value: totalInvited,   color: "text-primary" },
          { label: "Cadastrados",   value: totalConverted, color: "text-success" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-surface p-4">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="mt-0.5 text-sm font-medium text-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Atribuição por canal / campanha */}
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Por canal</h2>
          <ul className="space-y-1.5 text-sm">
            {channelRows.map((c) => (
              <li key={c.source} className="flex items-center justify-between">
                <span className="text-muted-foreground">{SOURCE_LABELS[c.source] ?? c.source}</span>
                <span className="font-semibold text-foreground">{c._count._all}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Por campanha (UTM)</h2>
          {campaignRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma campanha rastreada ainda.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {campaignRows.map((c) => (
                <li key={c.utmCampaign} className="flex items-center justify-between">
                  <span className="truncate text-muted-foreground" title={c.utmCampaign ?? ""}>{c.utmCampaign}</span>
                  <span className="ml-2 shrink-0 font-semibold text-foreground">{c._count._all}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {ranked.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-10 text-center text-sm text-muted-foreground">
          Nenhum interessado cadastrado ainda.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-semibold">Cidade</th>
                <th className="px-3 py-3 text-center font-semibold">Total</th>
                <th className="px-3 py-3 text-center font-semibold">Anunciar / Alugar</th>
                <th className="px-3 py-3 text-center font-semibold">Aguard.</th>
                <th className="px-3 py-3 text-center font-semibold">Convid.</th>
                <th className="px-3 py-3 text-center font-semibold">Cadastr.</th>
                <th className="px-3 py-3 text-center font-semibold" title="Usuários que entraram por link de indicação">Indicados</th>
                <th className="px-4 py-3 text-right font-semibold">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {ranked.map((r) => (
                <tr key={keyOf(r.city, r.state)} className="hover:bg-background/50">
                  <td className="px-4 py-3">
                    <span className="font-medium text-foreground">{r.city ?? "Sem cidade"}</span>
                    {r.state && <span className="ml-1 text-xs text-muted-foreground">{r.state}</span>}
                  </td>
                  <td className="px-3 py-3 text-center font-semibold text-foreground">{r.total}</td>
                  <td className="px-3 py-3 text-center text-muted-foreground">{r.owners} / {r.renters}</td>
                  <td className="px-3 py-3 text-center">{r.pending > 0 ? <span className="font-semibold text-orange-link">{r.pending}</span> : "0"}</td>
                  <td className="px-3 py-3 text-center text-muted-foreground">{r.invited}</td>
                  <td className="px-3 py-3 text-center">{r.converted > 0 ? <span className="font-semibold text-success">{r.converted}</span> : "0"}</td>
                  <td className="px-3 py-3 text-center text-muted-foreground">{r.referred}</td>
                  <td className="px-4 py-3 text-right">
                    {r.city
                      ? <InviteCityButton city={r.city} state={r.state} pending={r.pending} />
                      : <span className="text-xs text-muted-foreground">sem cidade</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        &quot;Convidar&quot; envia, para cada interessado PENDING da cidade, um e-mail com link
        para definir a senha e acessar o piloto (cadastro simples — CPF/endereço só ao
        Anunciar/Alugar). Comissões de indicação seguem bloqueadas até o sign-off D4.
      </p>
    </div>
  )
}
