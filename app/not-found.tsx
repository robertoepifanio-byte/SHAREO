import Image from "next/image"
import Link from "next/link"

export default function NotFound() {
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
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-muted-foreground"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
          <line x1="11" y1="8" x2="11" y2="12" />
          <circle cx="11" cy="15" r="0.5" fill="currentColor" />
        </svg>
      </div>

      {/* Código e mensagem */}
      <p className="mb-1 text-sm font-semibold uppercase tracking-widest text-brand">
        Erro 404
      </p>
      <h1 className="mb-3 text-3xl font-extrabold text-primary">
        Página não encontrada
      </h1>
      <p className="mb-8 max-w-sm text-base text-muted-foreground">
        A página que você está procurando não existe ou foi movida.
        Que tal explorar os itens disponíveis?
      </p>

      {/* CTAs */}
      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="inline-flex h-11 items-center rounded-lg bg-brand px-6 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
        >
          Ir para o início
        </Link>
        <Link
          href="/itens"
          className="inline-flex h-11 items-center rounded-lg border border-border px-6 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
        >
          Explorar anúncios
        </Link>
      </div>

      {/* Link de suporte */}
      <p className="mt-8 text-xs text-muted-foreground">
        Precisa de ajuda?{" "}
        <Link href="/contato" className="text-brand hover:underline">
          Entre em contato
        </Link>
      </p>
    </main>
  )
}
