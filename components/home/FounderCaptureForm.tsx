"use client"

import { useState, type FormEvent } from "react"

type IntentOption = "proprietario" | "locatario"
type State  = "collapsed" | "expanded" | "loading" | "success" | "error-network" | "error-duplicate"

function resolveIntent(selected: Set<IntentOption>): "proprietario" | "locatario" | "ambos" {
  if (selected.has("proprietario") && selected.has("locatario")) return "ambos"
  if (selected.has("locatario")) return "locatario"
  return "proprietario"
}

export function FounderCaptureForm() {
  const [state, setState]         = useState<State>("collapsed")
  const [selected, setSelected]   = useState<Set<IntentOption>>(new Set(["proprietario"]))
  const [name, setName]           = useState("")
  const [email, setEmail]         = useState("")
  const [lgpdConsent, setLgpdConsent] = useState(false)
  const [position, setPosition]   = useState(0)

  function toggleIntent(opt: IntentOption) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(opt)) {
        if (next.size === 1) return prev // pelo menos uma opção sempre selecionada
        next.delete(opt)
      } else {
        next.add(opt)
      }
      return next
    })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setState("loading")
    try {
      const res = await fetch("/api/founders/leads", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email:            email.trim().toLowerCase(),
          name:             name.trim() || undefined,
          intent:           resolveIntent(selected),
          marketingConsent: lgpdConsent,
          consentVersion:   "v1.1",
          source:           "VIP_LANDING",
        }),
      })

      if (res.status === 409) { setState("error-duplicate"); return }
      if (!res.ok)            { setState("error-network");   return }

      const json = await res.json() as { data: { queuePosition: number } }
      setPosition(json.data.queuePosition)
      setState("success")
    } catch {
      setState("error-network")
    }
  }

  if (state === "success") {
    return (
      <div className="mx-auto flex max-w-[400px] flex-col items-center gap-4 py-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/20">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#59C686" strokeWidth="2" aria-hidden="true">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        </div>
        <div className="text-center">
          <p className="font-display text-xl font-bold text-white">
            Você é o #{position}° na lista!
          </p>
          <p className="mt-1 text-sm text-white/70">
            Avisaremos <strong className="text-white">{email}</strong> quando o Shareo abrir.
          </p>
        </div>
        <a
          href={`https://wa.me/?text=${encodeURIComponent("Entrei na lista de fundadores do Shareo — plataforma de aluguel de itens entre pessoas. Entre também: https://shareo.com.br")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/20"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          Convidar amigos no WhatsApp
        </a>
      </div>
    )
  }

  if (state === "error-duplicate") {
    return (
      <div className="mx-auto max-w-[400px]">
        <div role="alert" className="rounded-lg border border-accent/30 bg-accent/10 px-4 py-3 text-center text-sm text-accent">
          Você já está na lista! Será um dos primeiros a saber quando abrirmos.
        </div>
      </div>
    )
  }

  if (state === "collapsed") {
    return (
      <button
        type="button"
        onClick={() => setState("expanded")}
        className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-brand px-10 py-4 text-base font-semibold uppercase tracking-[0.5px] text-white transition-colors hover:bg-brand-hover xl:w-auto xl:min-w-[260px]"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
        Quero ser avisado no lançamento
      </button>
    )
  }

  // expanded | loading | error-network
  return (
    <form
      onSubmit={handleSubmit}
      aria-label="Formulário de entrada na lista do ShareO"
      className="mx-auto flex max-w-[400px] flex-col gap-3"
    >
      <div role="group" aria-label="Tipo de uso" className="grid grid-cols-2 gap-2">
        {(["proprietario", "locatario"] as const).map((opt) => {
          const isChecked = selected.has(opt)
          return (
            <button
              key={opt}
              type="button"
              role="checkbox"
              aria-checked={isChecked}
              onClick={() => toggleIntent(opt)}
              disabled={state === "loading"}
              className={[
                "min-h-[44px] rounded-lg border px-3 text-sm font-semibold transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-primary",
                isChecked
                  ? "border-accent bg-accent/20 text-white"
                  : "border-white/20 text-white/70 hover:border-white/40 hover:text-white",
                state === "loading" ? "opacity-60" : "",
              ].join(" ")}
            >
              <span className="flex items-center justify-center gap-1.5">
                <span aria-hidden="true" className={isChecked ? "opacity-100" : "opacity-0"}>✓</span>
                {opt === "proprietario" ? "Quero anunciar" : "Quero alugar"}
              </span>
            </button>
          )
        })}
      </div>

      <div>
        <label htmlFor="founder-name" className="sr-only">Nome</label>
        <input
          id="founder-name"
          type="text"
          autoComplete="name"
          placeholder="Seu nome (opcional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={state === "loading"}
          className="h-11 w-full rounded-lg border border-white/20 bg-white/[0.08] px-4 text-sm text-white placeholder:text-white/40 transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-60"
        />
      </div>

      <div>
        <label htmlFor="founder-email" className="sr-only">E-mail</label>
        <input
          id="founder-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="Seu melhor e-mail *"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={state === "loading"}
          className="h-11 w-full rounded-lg border border-white/20 bg-white/[0.08] px-4 text-sm text-white placeholder:text-white/40 transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-60"
        />
      </div>

      {state === "error-network" && (
        <div role="alert" className="rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-2.5 text-center text-sm text-white">
          Erro de conexão.{" "}
          <button type="submit" className="font-semibold underline">
            Tentar novamente
          </button>
        </div>
      )}

      <label className="flex cursor-pointer items-start gap-2.5">
        <input
          type="checkbox"
          checked={lgpdConsent}
          onChange={(e) => setLgpdConsent(e.target.checked)}
          disabled={state === "loading"}
          className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-white/30 bg-white/10 accent-accent"
        />
        <span className="text-xs leading-snug text-white/60">
          Concordo em receber comunicações sobre o lançamento do Shareo. Posso cancelar a qualquer momento
          pelo e-mail{" "}
          <a href="mailto:privacidade@shareo.com.br" className="underline decoration-white/30 hover:decoration-white/60">
            privacidade@shareo.com.br
          </a>.
        </span>
      </label>

      <button
        type="submit"
        disabled={state === "loading" || !email.trim() || !lgpdConsent}
        aria-busy={state === "loading"}
        className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-brand px-6 py-3 text-sm font-semibold uppercase tracking-[0.4px] text-white transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary disabled:cursor-not-allowed disabled:opacity-70"
      >
        {state === "loading" ? (
          <>
            <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
            Enviando…
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
            Garantir minha vaga
          </>
        )}
      </button>

      <p className="text-center text-xs text-white/40">
        Ao continuar você aceita as{" "}
        <a href="/politicas" className="underline decoration-white/30 hover:decoration-white/60">
          políticas do Shareo
        </a>.
      </p>
    </form>
  )
}
