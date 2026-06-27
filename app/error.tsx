"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"

// Detecta falha de carregamento de chunk: um deploy novo invalida os hashes dos
// chunks antigos no CDN (aba aberta de antes do deploy), ou há um soluço de rede
// ao baixar um chunk lazy (next/dynamic, ssr:false). São transitórios — recarregar
// busca o manifesto/chunks atuais e resolve.
function isChunkLoadError(error: Error): boolean {
  const msg = error?.message ?? ""
  return (
    error?.name === "ChunkLoadError" ||
    /Loading chunk \S+ failed/i.test(msg) ||
    /Loading CSS chunk/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg) ||
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg)
  )
}

// Trava anti-loop: auto-recarrega no máximo uma vez por janela curta. Se o reload
// não resolver (chunk realmente indisponível), a tela de erro normal aparece em
// vez de recarregar infinitamente.
const RELOAD_GUARD_KEY    = "shareo:chunk-reload-at"
const RELOAD_GUARD_WINDOW = 10_000 // ms

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  // Decidido no primeiro render (síncrono e PURO — só lê a trava): se for chunk
  // obsoleto e a trava permitir, mostra "Atualizando…" e recarrega no efeito,
  // evitando o flash da tela de erro. A trava é GRAVADA no efeito, logo antes do
  // reload, e persiste em sessionStorage através do reload (anti-loop).
  const [autoReloading] = useState(() => {
    if (typeof window === "undefined" || !isChunkLoadError(error)) return false
    try {
      const last = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) ?? 0)
      return Date.now() - last > RELOAD_GUARD_WINDOW
    } catch {
      // sessionStorage indisponível (modo privado) — cai na tela de erro normal
      return false
    }
  })

  useEffect(() => {
    if (autoReloading) {
      try { sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now())) } catch { /* ignore */ }
      window.location.reload()
      return
    }
    // Log apenas o digest (sem stack trace ou mensagem interna) para rastreamento
    console.error("[ShareO] Erro capturado:", error.digest ?? "sem digest")
  }, [autoReloading, error])

  // Estado leve enquanto recarrega por chunk obsoleto (pós-deploy) — o usuário não
  // vê a tela de erro: a página recarrega sozinha e pega os chunks novos.
  if (autoReloading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 py-12 text-center">
        <Image
          src="/logos/shareo-logo.png"
          alt="ShareO"
          width={120}
          height={40}
          priority
          className="h-10 w-auto"
        />
        <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status" aria-live="polite">
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Atualizando para a versão mais recente…
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-0 bg-background px-6 py-12 text-center">
      {/* Logo */}
      <Link href="/" className="mb-8 inline-block" aria-label="ShareO — página inicial">
        <Image
          src="/logos/shareo-logo.png"
          alt="ShareO"
          width={120}
          height={40}
          priority
          className="h-10 w-auto"
        />
      </Link>

      {/* Ícone temático */}
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-red-400"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <circle cx="12" cy="16" r="0.5" fill="currentColor" />
        </svg>
      </div>

      {/* Mensagem genérica — nunca expor error.message */}
      <p className="mb-1 text-sm font-semibold uppercase tracking-widest text-red-700">
        Algo deu errado
      </p>
      <h1 className="mb-3 text-3xl font-extrabold text-primary">
        Erro inesperado
      </h1>
      <p className="mb-8 max-w-sm text-base text-muted-foreground">
        Ocorreu um problema ao carregar esta página. Nossa equipe já foi
        notificada. Você pode tentar novamente ou voltar para o início.
      </p>

      {/* Digest para suporte (apenas quando disponível — não expõe info interna) */}
      {error.digest && (
        <p className="mb-6 rounded-md bg-muted px-4 py-2 text-xs font-mono text-muted-foreground">
          Código: {error.digest}
        </p>
      )}

      {/* CTAs */}
      <div className="flex flex-wrap justify-center gap-3">
        <button
          onClick={reset}
          className="inline-flex h-11 items-center rounded-lg bg-brand px-6 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
        >
          Tentar novamente
        </button>
        <Link
          href="/"
          className="inline-flex h-11 items-center rounded-lg border border-border px-6 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
        >
          Voltar ao início
        </Link>
      </div>

      {/* Link de suporte */}
      <p className="mt-8 text-xs text-muted-foreground">
        O problema persiste?{" "}
        <Link href="/contato" className="text-brand hover:underline">
          Fale com o suporte
        </Link>
      </p>
    </main>
  )
}
