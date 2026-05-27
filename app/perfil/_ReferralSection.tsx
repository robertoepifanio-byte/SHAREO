"use client"

import { useState } from "react"
import type { ReferralStats } from "@/lib/referral"

const fmt = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100)

interface Props {
  stats: ReferralStats
}

export function ReferralSection({ stats: initialStats }: Props) {
  const [stats,     setStats]    = useState(initialStats)
  const [codeInput, setCodeInput] = useState("")
  const [copied,    setCopied]   = useState(false)
  const [loading,   setLoading]  = useState(false)
  const [error,     setError]    = useState("")
  const [success,   setSuccess]  = useState("")

  async function generateCode() {
    setLoading(true)
    setError("")
    try {
      const res  = await fetch("/api/referral", { method: "POST" })
      const json = await res.json()
      if (!res.ok) { setError("Não foi possível gerar o código."); return }
      setStats((s) => ({ ...s, code: json.data.code }))
    } finally {
      setLoading(false)
    }
  }

  async function applyCode() {
    if (!codeInput.trim()) return
    setLoading(true)
    setError("")
    setSuccess("")
    try {
      const res  = await fetch("/api/referral/apply", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ code: codeInput.trim() }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error?.message ?? "Código inválido.")
        return
      }
      setSuccess("Código aplicado! Você ganhou R$15,00 de crédito. 🎉")
      setCodeInput("")
      // Refresh stats
      const r2 = await fetch("/api/referral")
      const j2 = await r2.json()
      if (r2.ok) setStats(j2.data)
    } finally {
      setLoading(false)
    }
  }

  function copyLink() {
    const text = stats.code ? `${window.location.origin}/cadastro?ref=${stats.code}` : ""
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <section className="rounded-lg border border-border bg-surface p-6 space-y-5">
      <div className="flex items-center gap-2">
        <span className="text-xl" aria-hidden="true">🎁</span>
        <h2 className="text-lg font-bold text-primary">Programa de Indicação</h2>
      </div>

      <div className="rounded-lg border border-brand/20 bg-brand/5 px-4 py-3 text-sm text-muted-foreground">
        <strong className="text-foreground">Como funciona:</strong> Compartilhe seu link. Quando alguém criar uma conta
        usando ele, <strong>você e o novo usuário ganham R$15,00 de crédito</strong> cada um para usar no próximo aluguel.
        Créditos válidos por 90 dias.
      </div>

      {/* Saldo disponível */}
      {stats.availableBalance > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-success/30 bg-success/10 px-4 py-3">
          <span className="text-2xl font-extrabold text-success">{fmt(stats.availableBalance)}</span>
          <div>
            <p className="text-sm font-semibold text-success">Crédito disponível</p>
            <p className="text-xs text-muted-foreground">Será descontado automaticamente no próximo aluguel</p>
          </div>
        </div>
      )}

      {/* Estatísticas */}
      <div className="flex gap-4 text-center">
        <div className="flex-1 rounded-lg border border-border bg-background px-3 py-2.5">
          <p className="text-2xl font-extrabold text-foreground">{stats.totalReferrals}</p>
          <p className="text-xs text-muted-foreground">Pessoas indicadas</p>
        </div>
        <div className="flex-1 rounded-lg border border-border bg-background px-3 py-2.5">
          <p className="text-2xl font-extrabold text-foreground">{fmt(stats.credits.length * 1500)}</p>
          <p className="text-xs text-muted-foreground">Total ganho</p>
        </div>
      </div>

      {/* Meu código de indicação */}
      <div>
        <p className="mb-2 text-sm font-semibold text-foreground">Meu link de indicação</p>
        {stats.code ? (
          <div className="flex gap-2">
            <div className="flex flex-1 items-center rounded-lg border border-border bg-background px-3 text-sm text-muted-foreground overflow-hidden">
              <span className="truncate">{window.location.origin}/cadastro?ref=<strong className="text-foreground">{stats.code}</strong></span>
            </div>
            <button
              onClick={copyLink}
              className="shrink-0 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
            >
              {copied ? "✅ Copiado!" : "Copiar"}
            </button>
          </div>
        ) : (
          <button
            onClick={generateCode}
            disabled={loading}
            className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? "Gerando…" : "Gerar meu código de indicação"}
          </button>
        )}
      </div>

      {/* Aplicar código de outra pessoa */}
      {!stats.hasBeenReferred && (
        <div>
          <p className="mb-2 text-sm font-semibold text-foreground">Tem um código de indicação?</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              placeholder="Ex: JOAO-X4K2"
              maxLength={12}
              className="h-10 flex-1 rounded-lg border border-input bg-background px-3 text-sm font-mono uppercase text-foreground outline-none focus:border-brand transition-colors placeholder:normal-case placeholder:text-muted-foreground"
            />
            <button
              onClick={applyCode}
              disabled={loading || !codeInput.trim()}
              className="shrink-0 rounded-lg border border-brand px-4 py-2 text-sm font-semibold text-brand hover:bg-brand hover:text-white transition-colors disabled:opacity-50"
            >
              {loading ? "…" : "Aplicar"}
            </button>
          </div>
          {error   && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
          {success && <p className="mt-1.5 text-xs text-success">{success}</p>}
        </div>
      )}
      {stats.hasBeenReferred && (
        <p className="text-xs text-muted-foreground">✅ Você já usou um código de indicação.</p>
      )}

      {/* Histórico de créditos */}
      {stats.credits.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-semibold text-foreground">Histórico</p>
          <div className="flex flex-col gap-1.5">
            {stats.credits.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-xs">
                <span className="text-muted-foreground">{c.reason}</span>
                <span className={`font-semibold ${c.usedAt ? "text-muted-foreground line-through" : "text-success"}`}>
                  +{fmt(c.amountCents)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
