import Link from "next/link"

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <p className="text-5xl">📡</p>
      <h1 className="text-xl font-bold text-primary">Sem conexão</h1>
      <p className="max-w-xs text-sm text-muted-foreground">
        Você está offline. Verifique sua conexão e tente novamente.
      </p>
      <Link
        href="/"
        className="mt-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
      >
        Tentar novamente
      </Link>
    </div>
  )
}
