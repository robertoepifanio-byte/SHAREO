"use client"

import { useState } from "react"
import { copyToClipboard } from "@/lib/copy-to-clipboard"
import type { AmbassadorStats } from "@/lib/ambassador"
import { getTierLabel, tierProgress } from "@/lib/ambassador"
import type { AmbassadorTier } from "@prisma/client"

const fmt = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100)

const TIER_COLORS: Record<AmbassadorTier, string> = {
  BRONZE: "text-amber-700 bg-amber-50 border-amber-200",
  SILVER: "text-slate-600 bg-slate-50 border-slate-200",
  GOLD:   "text-yellow-700 bg-yellow-50 border-yellow-200",
}

const TIER_ICONS: Record<AmbassadorTier, string> = {
  BRONZE: "🥉",
  SILVER: "🥈",
  GOLD:   "🥇",
}

const TIER_RATES: Record<AmbassadorTier, number> = { BRONZE: 3, SILVER: 5, GOLD: 7 }

interface Props {
  stats:        AmbassadorStats
  hasConsented: boolean
}

export function AmbassadorSection({ stats: initialStats, hasConsented: initialConsented }: Props) {
  const [stats,       setStats]       = useState(initialStats)
  const [consented,   setConsented]   = useState(initialConsented)
  const [showConsent, setShowConsent] = useState(!initialConsented)
  const [copied,      setCopied]      = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState("")

  const currentTier  = stats.profile?.currentTier ?? null
  const progress     = tierProgress(stats.activeReferrals)
  const shareLink    = stats.referralCode
    ? `${typeof window !== "undefined" ? window.location.origin : "https://shareo.com.br"}/cadastro?ref=${stats.referralCode}`
    : null

  async function handleConsent() {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/ambassador/consent", { method: "POST" })
      if (!res.ok) { setError("Não foi possível registrar seu consentimento. Tente novamente."); return }
      setConsented(true)
      setShowConsent(false)
      const r2 = await fetch("/api/referral")
      if (r2.ok) { const j = await r2.json(); setStats(j.data) }
    } finally {
      setLoading(false)
    }
  }

  async function generateCode() {
    setLoading(true)
    try {
      const res = await fetch("/api/referral", { method: "POST" })
      if (!res.ok) return
      const r2 = await fetch("/api/referral")
      if (r2.ok) { const j = await r2.json(); setStats(j.data) }
    } finally {
      setLoading(false)
    }
  }

  async function copyLink() {
    if (!shareLink) return
    if (await copyToClipboard(shareLink)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  function shareWhatsApp() {
    if (!shareLink) return
    const text = encodeURIComponent(`${shareLink} clique nesse link e faça o seu cadastro.`)
    window.open(`https://wa.me/?text=${text}`, "_blank")
  }

  return (
    <section className="space-y-5">
      {/* Cabeçalho tier */}
      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-bold text-primary">Programa Embaixadores</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Ganhe uma parte da nossa taxa por cada locação dos seus indicados.
            </p>
          </div>
          {currentTier && (
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold ${TIER_COLORS[currentTier]}`}>
              {TIER_ICONS[currentTier]} {getTierLabel(currentTier)}
              <span className="opacity-70">· {TIER_RATES[currentTier]}%</span>
            </span>
          )}
        </div>

        {/* Banner pré-D4 */}
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>Comissões em análise jurídica.</strong>{" "}
          Seus créditos acumulados estão seguros e serão liberados após a conclusão da validação legal.
        </div>
      </div>

      {/* Modal de consentimento LGPD */}
      {showConsent && (
        <div className="rounded-xl border border-brand/30 bg-brand/5 p-5 space-y-3">
          <h3 className="font-semibold text-foreground">Antes de começar</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Ao compartilhar seu link de indicação, você aceita que o ShareO registre a origem do
            cadastro de quem usar seu convite, conforme nossa{" "}
            <a href="/politicas" className="underline text-brand hover:opacity-80">Política de Privacidade</a>.
            A participação é voluntária e pode ser revogada a qualquer momento em Configurações de Conta.
          </p>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <button
            onClick={handleConsent}
            disabled={loading}
            className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? "Registrando…" : "Entendi e aceito"}
          </button>
        </div>
      )}

      {consented && (
        <>
          {/* Métricas */}
          <div className="grid grid-cols-3 gap-3">
            <MetricCard label="Indicados" value={stats.totalReferrals} />
            <MetricCard label="Ativos" value={stats.activeReferrals} note="12 meses" />
            <MetricCard
              label="Comissão acumulada"
              value={fmt(stats.totalPendingCents)}
              mono
            />
          </div>

          {/* Barra de progresso para próximo tier */}
          {progress.nextTier && (
            <div className="rounded-xl border border-border bg-surface p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-foreground">
                  Nível atual: <strong>{currentTier ? getTierLabel(currentTier) : "Sem nível"}</strong>
                </span>
                <span className="text-muted-foreground">
                  Próximo: {getTierLabel(progress.nextTier)} ({TIER_RATES[progress.nextTier]}%)
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-brand transition-all"
                  style={{
                    width: `${Math.min(100, Math.round(
                      (stats.activeReferrals / (stats.activeReferrals + progress.needed)) * 100
                    ))}%`,
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Faltam <strong>{progress.needed}</strong> indicados ativos para o nível{" "}
                {getTierLabel(progress.nextTier)}.
              </p>
            </div>
          )}

          {/* Link de indicação */}
          <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
            <p className="text-sm font-semibold text-foreground">Meu link de indicação</p>

            {stats.referralCode ? (
              <>
                <div className="flex gap-2">
                  <div className="flex flex-1 items-center overflow-hidden rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
                    <span className="truncate">
                      {shareLink}
                    </span>
                  </div>
                  <button
                    onClick={copyLink}
                    className="shrink-0 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                  >
                    {copied ? "✅ Copiado!" : "Copiar"}
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={shareWhatsApp}
                    className="flex items-center gap-1.5 rounded-lg border border-green-500 px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-50 transition-colors"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    WhatsApp
                  </button>
                </div>
              </>
            ) : (
              <button
                onClick={generateCode}
                disabled={loading}
                className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? "Gerando…" : "Gerar meu link de indicação"}
              </button>
            )}
          </div>

          {/* Histórico de comissões */}
          {stats.commissions.length > 0 && (
            <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
              <p className="text-sm font-semibold text-foreground">Histórico de comissões</p>
              <div className="divide-y divide-border">
                {stats.commissions.slice(0, 20).map((c) => (
                  <div key={c.id} className="flex items-center justify-between py-2.5 text-sm">
                    <div>
                      <span className="text-muted-foreground">
                        {new Date(c.createdAt).toLocaleDateString("pt-BR")}
                      </span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        Nível {getTierLabel(c.tierSnapshot)}
                      </span>
                    </div>
                    <span className={`font-semibold ${c.status === "CANCELLED" ? "text-muted-foreground line-through" : "text-brand"}`}>
                      +{fmt(c.amountCents)}
                      {c.status === "PENDING" && (
                        <span className="ml-1 text-xs font-normal text-amber-600">· pendente</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Estado vazio */}
          {stats.totalReferrals === 0 && (
            <div className="rounded-xl border border-border bg-surface p-8 text-center">
              <p className="text-3xl mb-2">🏅</p>
              <p className="font-semibold text-foreground">Você ainda não tem indicados</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Compartilhe seu link e comece a ganhar comissões por cada locação dos seus indicados.
              </p>
            </div>
          )}
        </>
      )}
    </section>
  )
}

function MetricCard({
  label, value, note, mono,
}: {
  label: string
  value: string | number
  note?: string
  mono?: boolean
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3 text-center">
      <p className={`text-lg font-extrabold text-foreground truncate ${mono ? "font-mono text-base" : ""}`}>
        {value}
      </p>
      <p className="text-xs text-muted-foreground leading-tight">
        {label}
        {note && <span className="block opacity-70">{note}</span>}
      </p>
    </div>
  )
}
