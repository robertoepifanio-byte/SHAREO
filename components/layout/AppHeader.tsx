import { auth } from "@/lib/auth"
import Link from "next/link"

export async function AppHeader() {
  const session  = await auth()
  const initial  = session?.user.name?.[0]?.toUpperCase() ?? "U"

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
      <nav className="container flex h-16 items-center justify-between gap-4">
        {/* Logo */}
        <Link
          href={session ? "/dashboard" : "/"}
          className="flex-shrink-0 font-extrabold text-xl tracking-tight text-primary outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 rounded-sm"
        >
          Share<span className="text-brand">O</span>
        </Link>

        {/* Nav central — tablet+ */}
        <div className="hidden md:flex flex-1 items-center justify-center gap-8">
          <Link
            href="/itens"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors outline-none focus-visible:text-foreground"
          >
            Explorar
          </Link>
          {session && (
            <Link
              href="/meus-anuncios"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors outline-none focus-visible:text-foreground"
            >
              Meus Anúncios
            </Link>
          )}
        </div>

        {/* Auth section */}
        <div className="flex flex-shrink-0 items-center gap-3">
          {session ? (
            <>
              <Link
                href="/itens/novo"
                className="hidden md:inline-flex items-center gap-1.5 h-9 px-4 rounded-md text-sm font-medium bg-brand text-white hover:bg-brand-hover transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Anunciar
              </Link>
              <Link
                href="/dashboard"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-brand/10 text-sm font-bold text-brand hover:bg-brand/20 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                title={session.user.name ?? "Meu perfil"}
                aria-label="Meu perfil"
              >
                {initial}
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors outline-none focus-visible:text-foreground"
              >
                Entrar
              </Link>
              <Link
                href="/cadastro"
                className="inline-flex h-9 items-center px-4 rounded-md text-sm font-medium bg-brand text-white hover:bg-brand-hover transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
              >
                Cadastrar
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}
