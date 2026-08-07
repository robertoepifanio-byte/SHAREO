import type { Metadata } from "next"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { requireAdminPage } from "@/lib/auth/require-admin"
import { InviteCityButton } from "./_InviteCityButton"
import { StatCard } from "@/components/ui/StatCard"

export const metadata: Metadata = { title: "Admin — Interessados / Pilotos" }

/**
 * Painel da campanha de pré-lançamento — decide a(s) cidade(s)-piloto.
 *
 * Navegação em 3 níveis (drill-down por querystring), porque três dimensões numa
 * tabela só ficam ilegíveis:
 *   sem filtro        → ranking de UF          · linha leva a ?uf=SP
 *   ?uf=SP            → cidades daquela UF     · linha leva a ?uf=SP&cidade=sao%20paulo
 *   ?uf=SP&cidade=…   → bairros daquela cidade
 *
 * Agregação roda no BANCO (groupBy). A versão anterior fazia findMany de todos os
 * leads e somava em JS — aceitável com dezenas de linhas, inviável numa campanha
 * nacional com dezenas de milhares.
 */

type SearchParams = Promise<{
  period?: string
  uf?:     string
  cidade?: string
}>

type Row = {
  key:       string | null   // state | cityNorm | neighborhoodNorm
  label:     string
  total:     number
  owners:    number
  renters:   number
  both:      number
  pending:   number
  invited:   number
  converted: number
  new7d:     number
}

const PERIODS = [
  // "Tudo" é o padrão: escolher cidade-piloto é decisão sobre estoque ACUMULADO
  // de interessados, não sobre a janela dos últimos 30 dias. O sinal de momento
  // vem da coluna "novos 7d", que não esconde o total.
  { key: "all", label: "Tudo",    days: null },
  { key: "90",  label: "90 dias", days: 90 },
  { key: "30",  label: "30 dias", days: 30 },
  { key: "7",   label: "7 dias",  days: 7 },
] as const

const SOURCE_LABELS: Record<string, string> = {
  ORGANIC:     "Orgânico",
  VIP_LANDING: "Landing VIP",
  REFERRAL:    "Indicação",
  GOOGLE_ADS:  "Google Ads",
  META_ADS:    "Meta Ads",
}

type RawGroup = {
  key:    string | null   // chave normalizada do nível (state | cityNorm | neighborhoodNorm)
  label:  string | null   // grafia real para exibição, quando existir
  intent: string
  status: string
  count:  number
}

/** Soma as tuplas (chave × intent × status) numa linha por chave. */
function pivot(groups: RawGroup[], fallbackLabel: string, new7dByKey: Map<string, number>): Row[] {
  const rows = new Map<string, Row>()

  for (const g of groups) {
    const id  = g.key ?? " null"
    const row = rows.get(id) ?? {
      key:   g.key,
      label: g.label ?? g.key ?? fallbackLabel,
      total: 0, owners: 0, renters: 0, both: 0,
      pending: 0, invited: 0, converted: 0,
      new7d: new7dByKey.get(id) ?? 0,
    }

    const n = g.count
    row.total += n
    if (g.intent === "proprietario") row.owners  += n
    else if (g.intent === "locatario") row.renters += n
    // "ambos" é um valor real do enum de intent (quem marca as duas opções no
    // formulário). A versão anterior usava if/else-if e não o contava em coluna
    // nenhuma — os números por intenção não fechavam com o total.
    else if (g.intent === "ambos") row.both += n

    if (g.status === "PENDING")   row.pending   += n
    if (g.status === "INVITED")   row.invited   += n
    if (g.status === "CONVERTED") row.converted += n
    // UNSUBSCRIBED conta no total (a pessoa demonstrou interesse) mas não entra
    // em nenhuma coluna de estágio — não é convidável.

    // A grafia real pode aparecer em qualquer tupla do grupo.
    if (g.label) row.label = g.label

    rows.set(id, row)
  }

  return [...rows.values()].sort((a, b) => {
    if (!a.key && b.key) return 1   // "sem informação" sempre por último
    if (a.key && !b.key) return -1
    return b.total - a.total
  })
}

export default async function AdminFundadoresPage(
  { searchParams }: { searchParams: SearchParams },
) {
  await requireAdminPage("ADMIN_SUPERADMIN", "ADMIN_OPERACIONAL")

  const sp     = await searchParams
  const uf     = sp.uf?.trim().toUpperCase().slice(0, 2) || null
  const cidade = sp.cidade?.trim().toLowerCase() || null
  const period = PERIODS.find((p) => p.key === sp.period) ?? PERIODS[0]

  // Bairro só é agrupado com UF **e** cidade definidos: agrupar bairro do Brasil
  // inteiro seriam dezenas de milhares de grupos numa única página.
  const level: 1 | 2 | 3 = cidade && uf ? 3 : uf ? 2 : 1

  const since   = period.days ? new Date(Date.now() - period.days * 864e5) : null
  const weekAgo = new Date(Date.now() - 7 * 864e5)

  const baseWhere = {
    deletedAt: null,
    ...(since  && { createdAt: { gte: since } }),
    ...(uf     && { state: uf }),
    ...(cidade && { cityNorm: cidade }),
  }

  const countArgs = { _count: { _all: true } } as const
  const week      = { ...baseWhere, createdAt: { gte: weekAgo } }

  // ── Agregação principal + "novos 7d" + atribuição ────────────────────────────
  // Cada nível tem seu próprio par de queries, com o resultado convertido na hora
  // para RawGroup. Um `by` dinâmico obrigaria a casts genéricos, e numa rota de
  // agregação é exatamente onde mora o erro difícil: coluna trocada aparece como
  // zero na tela, não como exceção.
  const [bySource, byCampaign] = await Promise.all([
    prisma.founderLead.groupBy({ by: ["source"], where: baseWhere, ...countArgs }),
    prisma.founderLead.groupBy({
      by: ["utmCampaign"],
      where: { ...baseWhere, utmCampaign: { not: null } },
      ...countArgs,
    }),
  ])

  let raw: RawGroup[]
  let new7dRaw: { key: string | null; count: number }[]
  let fallbackLabel: string
  let cidadeLabelFromData: string | null = null

  if (level === 1) {
    const [g, w] = await Promise.all([
      prisma.founderLead.groupBy({ by: ["state", "intent", "status"], where: baseWhere, ...countArgs }),
      prisma.founderLead.groupBy({ by: ["state"], where: week, ...countArgs }),
    ])
    raw           = g.map((r) => ({ key: r.state, label: r.state, intent: r.intent, status: r.status, count: r._count._all }))
    new7dRaw      = w.map((r) => ({ key: r.state, count: r._count._all }))
    fallbackLabel = "Sem UF"
  } else if (level === 2) {
    const [g, w] = await Promise.all([
      prisma.founderLead.groupBy({ by: ["cityNorm", "intent", "status"], where: baseWhere, _max: { city: true }, ...countArgs }),
      prisma.founderLead.groupBy({ by: ["cityNorm"], where: week, ...countArgs }),
    ])
    // Agrupa pela chave dobrada, exibe a grafia real ("sao paulo" agrupa, "São Paulo" aparece).
    raw           = g.map((r) => ({ key: r.cityNorm, label: r._max.city, intent: r.intent, status: r.status, count: r._count._all }))
    new7dRaw      = w.map((r) => ({ key: r.cityNorm, count: r._count._all }))
    fallbackLabel = "Sem cidade"
  } else {
    const [g, w] = await Promise.all([
      prisma.founderLead.groupBy({ by: ["neighborhoodNorm", "intent", "status"], where: baseWhere, _max: { neighborhood: true, city: true }, ...countArgs }),
      prisma.founderLead.groupBy({ by: ["neighborhoodNorm"], where: week, ...countArgs }),
    ])
    raw                 = g.map((r) => ({ key: r.neighborhoodNorm, label: r._max.neighborhood, intent: r.intent, status: r.status, count: r._count._all }))
    new7dRaw            = w.map((r) => ({ key: r.neighborhoodNorm, count: r._count._all }))
    fallbackLabel       = "Sem bairro"
    cidadeLabelFromData = g.find((r) => r._max.city)?._max.city ?? null
  }

  const new7dByKey = new Map(new7dRaw.map((r) => [r.key ?? " null", r.count]))
  const rows       = pivot(raw, fallbackLabel, new7dByKey)

  const totals = rows.reduce(
    (a, r) => ({
      total:     a.total     + r.total,
      pending:   a.pending   + r.pending,
      invited:   a.invited   + r.invited,
      converted: a.converted + r.converted,
      new7d:     a.new7d     + r.new7d,
    }),
    { total: 0, pending: 0, invited: 0, converted: 0, new7d: 0 },
  )

  const channelRows  = [...bySource].sort((a, b) => b._count._all - a._count._all)
  const campaignRows = [...byCampaign].sort((a, b) => b._count._all - a._count._all)

  // Rótulo da cidade corrente (nível 3) — a chave que vem na URL é a normalizada,
  // então buscamos a grafia real nos próprios dados agregados.
  const cidadeLabel = level === 3 ? (cidadeLabelFromData ?? cidade) : null

  const qs = (next: Record<string, string | null>) => {
    const p = new URLSearchParams()
    if (period.key !== "all") p.set("period", period.key)
    if (uf)     p.set("uf", uf)
    if (cidade) p.set("cidade", cidade)
    for (const [k, v] of Object.entries(next)) {
      if (v === null) p.delete(k)
      else p.set(k, v)
    }
    const s = p.toString()
    return s ? `?${s}` : ""
  }

  const colLabel = level === 1 ? "Estado" : level === 2 ? "Cidade" : "Bairro"

  const exportHref = `/api/admin/founders/export${qs({})}`

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-primary">Interessados / Pilotos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Lista da pré-divulgação. Clique numa linha para abrir o nível seguinte
            (estado → cidade → bairro) e escolher a(s) cidade(s)-piloto.
          </p>
        </div>
        <a
          href={exportHref}
          className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-background"
        >
          ↓ Exportar CSV
        </a>
      </div>

      {/* Trilha de navegação */}
      <nav aria-label="Trilha" className="mb-4 flex flex-wrap items-center gap-1.5 text-sm">
        {level === 1 ? (
          <span className="font-semibold text-foreground">Brasil</span>
        ) : (
          <Link href={`/admin/fundadores${qs({ uf: null, cidade: null })}`} className="text-brand hover:underline">
            Brasil
          </Link>
        )}
        {uf && (
          <>
            <span aria-hidden="true" className="text-muted-foreground">›</span>
            {level === 2 ? (
              <span className="font-semibold text-foreground">{uf}</span>
            ) : (
              <Link href={`/admin/fundadores${qs({ cidade: null })}`} className="text-brand hover:underline">
                {uf}
              </Link>
            )}
          </>
        )}
        {level === 3 && (
          <>
            <span aria-hidden="true" className="text-muted-foreground">›</span>
            <span className="font-semibold text-foreground">{cidadeLabel}</span>
          </>
        )}
      </nav>

      {/* Filtro de período */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Período
        </span>
        {PERIODS.map((p) => (
          <Link
            key={p.key}
            href={`/admin/fundadores${qs({ period: p.key === "all" ? null : p.key })}`}
            className={[
              "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
              p.key === period.key
                ? "bg-primary text-white"
                : "border border-border text-muted-foreground hover:bg-background",
            ].join(" ")}
          >
            {p.label}
          </Link>
        ))}
      </div>

      {/* Métricas do recorte atual */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard label="Interessados" value={totals.total}     accent="primary" />
        <StatCard label="Novos (7d)"   value={totals.new7d}     accent={totals.new7d > 0 ? "success" : "primary"} />
        <StatCard label="Aguardando"   value={totals.pending}   accent={totals.pending > 0 ? "warning" : "primary"} />
        <StatCard label="Convidados"   value={totals.invited}   accent="primary" />
        <StatCard label="Cadastrados"  value={totals.converted} accent="success" />
      </div>

      {/* Atribuição por canal / campanha */}
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Por canal</h2>
          {channelRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem dados neste recorte.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {channelRows.map((c) => (
                <li key={c.source} className="flex items-center justify-between">
                  <span className="text-muted-foreground">{SOURCE_LABELS[c.source] ?? c.source}</span>
                  <span className="font-semibold text-foreground">{c._count._all}</span>
                </li>
              ))}
            </ul>
          )}
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

      {rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-10 text-center text-sm text-muted-foreground">
          Nenhum interessado neste recorte.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-semibold">{colLabel}</th>
                <th className="px-3 py-3 text-center font-semibold">Total</th>
                <th className="px-3 py-3 text-center font-semibold" title="Novos nos últimos 7 dias">Novos 7d</th>
                <th className="px-3 py-3 text-center font-semibold" title="Quero anunciar / Quero alugar / Ambos">
                  Anunciar / Alugar / Ambos
                </th>
                <th className="px-3 py-3 text-center font-semibold">Aguard.</th>
                <th className="px-3 py-3 text-center font-semibold">Convid.</th>
                <th className="px-3 py-3 text-center font-semibold">Cadastr.</th>
                <th className="px-4 py-3 text-right font-semibold">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => {
                const drillHref =
                  level === 1 && r.key ? `/admin/fundadores${qs({ uf: r.key })}`
                  : level === 2 && r.key ? `/admin/fundadores${qs({ cidade: r.key })}`
                  : null

                return (
                  <tr key={r.key ?? "sem"} className="hover:bg-background/50">
                    <td className="px-4 py-3">
                      {drillHref ? (
                        <Link href={drillHref} className="font-medium text-brand hover:underline">
                          {r.label}
                        </Link>
                      ) : (
                        <span className="font-medium text-foreground">{r.label}</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center font-semibold text-foreground">{r.total}</td>
                    <td className="px-3 py-3 text-center">
                      {r.new7d > 0 ? <span className="font-semibold text-success">+{r.new7d}</span> : "0"}
                    </td>
                    <td className="px-3 py-3 text-center text-muted-foreground">
                      {r.owners} / {r.renters} / {r.both}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {r.pending > 0 ? <span className="font-semibold text-orange-link">{r.pending}</span> : "0"}
                    </td>
                    <td className="px-3 py-3 text-center text-muted-foreground">{r.invited}</td>
                    <td className="px-3 py-3 text-center">
                      {r.converted > 0 ? <span className="font-semibold text-success">{r.converted}</span> : "0"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {/* Convite só a partir do nível de cidade: disparar por UF
                          inteira convidaria um estado de uma vez sem querer. */}
                      {level === 2 && r.key ? (
                        <InviteCityButton city={r.label} cityNorm={r.key} state={uf} pending={r.pending} />
                      ) : level === 3 && r.key ? (
                        <InviteCityButton
                          city={`${r.label} (${cidadeLabel})`}
                          cityNorm={cidade}
                          neighborhoodNorm={r.key}
                          state={uf}
                          pending={r.pending}
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {level === 1 ? "abrir estado" : "—"}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        &quot;Convidar&quot; envia, para cada interessado PENDING do recorte, um e-mail com link
        para definir a senha e acessar o piloto (cadastro simples — CPF/endereço só ao
        Anunciar/Alugar). O filtro usa a chave normalizada, então grafias diferentes da
        mesma cidade entram juntas. Comissões de indicação seguem bloqueadas até o sign-off D4.
      </p>
    </div>
  )
}
