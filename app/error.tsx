"use client"

import { useEffect } from "react"
import Image from "next/image"
import Link from "next/link"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log apenas o digest (sem stack trace ou mensagem interna) para rastreamento
    console.error("[ShareO] Erro capturado:", error.digest ?? "sem digest")
  }, [error])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-0 bg-background px-6 py-12 text-center">
      {/* Logo */}
      <Link href="/" className="mb-8 inline-block" aria-label="ShareO — página inicial">
        <Image
          src="/logos/shareo-logo-v4.webp"
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
      <p className="mb-1 text-sm font-semibold uppercase tracking-widest text-red-500">
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
