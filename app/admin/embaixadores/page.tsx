import type { Metadata } from "next"
import { hasAdminRole } from "@/lib/auth/admin-guards"
import { requireAdminPage } from "@/lib/auth/require-admin"
import { prisma } from "@/lib/prisma"
import { getAmbassadorAdminStats, getTierLabel } from "@/lib/ambassador"
import { AmbassadorConfigForm } from "./_AmbassadorConfigForm"
import { formatPrice } from "@/utils/format"
import { StatCard } from "@/components/ui/StatCard"

export const metadata: Metadata = { title: "Admin — Embaixadores" }

const PERIODS = [
  { label: "Últimos 7 dias",  days: 7 },
  { label: "Últimos 30 dias", days: 30 },
  { label: "Últimos 90 dias", days: 90 },
]

export default async function AdminEmbaixadoresPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  const session = await requireAdminPage("ADMIN_SUPERADMIN", "ADMIN_FINANCEIRO")

  const isSuperAdmin = hasAdminRole(session, "ADMIN_SUPERADMIN")

  const params = await searchParams
  const days   = Math.max(7, Math.min(90, Number(params.period ?? "30")))
  const since  = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const [stats, configs, topAmbassadors] = await Promise.all([
    getAmbassadorAdminStats(since),
    prisma.platformConfig.findMany({
      where: {
        key: {
          in: [
            "ambassadorBronzeRate",
            "ambassadorSilverRate",
            "ambassadorGoldRate",
            "ambassadorPayoutEnabled",
          ],
        },
      },
    }),
    prisma.ambassadorProfile.findMany({
      orderBy: { totalCommissionPendingCents: "desc" },
      take:    10,
      select: {
        id:                          true,
        currentTier:                 true,
        activeReferralsCnt:          true,
        totalCommissionPendingCents: true,
        totalCommissionPaidCents:    true,
        user: { select: { name: true, email: true } },
      },
    }),
  ])

  const configMap = Object.fromEntries(configs.map((c) => [c.key, c.value]))
  const payoutEnabled = configMap["ambassadorPayoutEnabled"] === "true"

  const TIER_ORDER = ["BRONZE", "SILVER", "GOLD"] as const

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-xl font-bold text-primary">Programa Embaixadores</h1>
        {payoutEnabled ? (
          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800 border border-green-200">
            Payout ativo
          </span>
        ) : (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 border border-amber-200">
            Payout bloqueado (D4)
          </span>
        )}
      </div>

      {/* Filtro de período */}
      <div className="flex gap-2 flex-wrap">
        {PERIODS.map((p) => (
          <a
            key={p.days}
            href={`?period=${p.days}`}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
              days === p.days
                ? "border-brand bg-brand text-white"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {p.label}
          </a>
        ))}
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total embaixadores"    value={stats.totalAmbassadors} />
        <StatCard label="Indicados cadastrados" value={stats.totalReferralsRegistered} />
        <StatCard label="Indicados ativos"      value={stats.totalReferralsActive} />
        <StatCard label="Conversão"             value={`${stats.conversionRate}%`} />
        <StatCard label="Comissões geradas"   value={formatPrice(stats.totalCommissionsGeneratedCents)} />
        <StatCard label="Comissões pagas"     value={formatPrice(stats.totalCommissionsPaidCents)} />
        <StatCard label="Comissões bloqueadas" value={formatPrice(stats.totalCommissionsBlockedCents)} />
        <StatCard label="Custo (% GMV)"       value="—" sub="calculado em breve" />
      </div>

      {/* Embaixadores por tier */}
      <div className="rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-4 font-semibold text-foreground">Distribuição por nível</h2>
        <div className="flex gap-4 flex-wrap">
          {TIER_ORDER.map((tier) => {
            const entry = stats.byTier.find((b) => b.tier === tier)
            return (
              <div key={tier} className="flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-3">
                <span className="text-lg">{tier === "GOLD" ? "🥇" : tier === "SILVER" ? "🥈" : "🥉"}</span>
                <div>
                  <p className="text-xl font-extrabold text-foreground">{entry?.count ?? 0}</p>
                  <p className="text-xs text-muted-foreground">{getTierLabel(tier)}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Top embaixadores */}
      {topAmbassadors.length > 0 && (
        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="mb-4 font-semibold text-foreground">Top embaixadores</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Nome</th>
                  <th className="pb-2 pr-4 font-medium">Nível</th>
                  <th className="pb-2 pr-4 font-medium">Ativos</th>
                  <th className="pb-2 pr-4 font-medium">Pendente</th>
                  <th className="pb-2 font-medium">Pago</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {topAmbassadors.map((a) => (
                  <tr key={a.id}>
                    <td className="py-2 pr-4">
                      <p className="font-medium text-foreground">{a.user.name}</p>
                      <p className="text-xs text-muted-foreground">{a.user.email}</p>
                    </td>
                    <td className="py-2 pr-4 text-muted-foreground">{getTierLabel(a.currentTier)}</td>
                    <td className="py-2 pr-4 text-foreground">{a.activeReferralsCnt}</td>
                    <td className="py-2 pr-4 font-medium text-foreground">{formatPrice(a.totalCommissionPendingCents)}</td>
                    <td className="py-2 text-foreground">{formatPrice(a.totalCommissionPaidCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Configurações — só SUPERADMIN */}
      {isSuperAdmin && (
        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="mb-4 font-semibold text-foreground">Configurações do programa</h2>
          {/* Defaults espelham getTierCommissionRateBp() — que é quem de fato
              calcula. Ver o aviso em lib/ambassador.ts: estas chaves de
              PlatformConfig não são lidas por nenhum cálculo. */}
          <AmbassadorConfigForm
            bronzeRate={Number(configMap["ambassadorBronzeRate"] ?? "200")}
            silverRate={Number(configMap["ambassadorSilverRate"] ?? "300")}
            goldRate={Number(configMap["ambassadorGoldRate"] ?? "500")}
            payoutEnabled={payoutEnabled}
          />
        </div>
      )}
    </div>
  )
}
