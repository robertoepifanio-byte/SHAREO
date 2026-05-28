"use client"

import { useEffect } from "react"
import { signOut } from "next-auth/react"
import Image from "next/image"
import Link from "next/link"

export default function SairPage() {
  useEffect(() => {
    // Dispara o signout imediatamente ao acessar esta página
    signOut({ callbackUrl: "/" })
  }, [])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <Link
        href="/"
        className="mb-8 outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-4 rounded-sm"
      >
        <Image
          src="/logos/shareo-logo.png"
          alt="ShareO"
          width={160}
          height={48}
          className="object-contain h-12 w-auto"
          priority
        />
      </Link>

      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-8 text-center shadow-sm">
        {/* Spinner */}
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <svg
            className="h-7 w-7 animate-spin text-brand"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        </div>

        <h1 className="mb-2 text-xl font-bold text-primary">Saindo…</h1>
        <p className="text-sm text-muted-foreground">
          Você está sendo desconectado. Aguarde um momento.
        </p>

        <p className="mt-6 text-xs text-muted-foreground">
          Não foi redirecionado?{" "}
          <Link href="/" className="font-medium text-brand hover:underline">
            Clique aqui
          </Link>
        </p>
      </div>

      <p className="mt-8 text-xs text-muted-foreground">
        © {new Date().getFullYear()} ShareO — Use Mais. Possua Menos.
      </p>
    </div>
  )
}
