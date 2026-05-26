"use client"

import { useEffect } from "react"

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="text-2xl font-bold text-navy">Algo deu errado</h2>
      <p className="text-gray-600">{error.message}</p>
      <button onClick={reset} className="rounded-md bg-brand px-6 py-2 text-white hover:bg-brand-hover">
        Tentar novamente
      </button>
    </main>
  )
}
