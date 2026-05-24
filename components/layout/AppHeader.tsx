import { auth } from "@/lib/auth"
import Image from "next/image"
import Link from "next/link"

export async function AppHeader() {
  const session = await auth()
  const initial = session?.user.name?.[0]?.toUpperCase() ?? "U"

  return (
    <header className="sticky top-0 z-[200] bg-primary" role="banner">
      <nav className="container flex h-16 items-center gap-3" aria-label="Navegação principal">

        {/* Logo */}
        <Link
          href={session ? "/dashboard" : "/"}
          className="flex-shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-primary rounded-sm"
          aria-label="ShareO — página inicial"
        >
          <Image
            src="/icones/shareo-logo.jpeg"
            alt="ShareO"
            width={140}
            height={46}
            className="rounded object-cover object-center"
            priority
          />
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1 ml-6">
          <Link
            href="/"
            className="rounded-md px-3 py-1.5 text-sm font-medium text-white/75 hover:bg-white/10 hover:text-white transition-colors outline-none focus-visible:ring-1 focus-visible:ring-white"
          >
            Início
          </Link>
          <Link
            href="/itens"
            className="rounded-md px-3 py-1.5 text-sm font-medium text-white/75 hover:bg-white/10 hover:text-white transition-colors outline-none focus-visible:ring-1 focus-visible:ring-white"
          >
            Explorar
          </Link>
          {session && (
            <Link
              href="/meus-anuncios"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-white/75 hover:bg-white/10 hover:text-white transition-colors outline-none focus-visible:ring-1 focus-visible:ring-white"
            >
              Meus Anúncios
            </Link>
          )}
        </div>

        {/* Search bar — desktop only */}
        <Link
          href="/itens"
          className="hidden md:flex flex-1 max-w-sm items-center gap-2 h-10 rounded-lg border border-white/20 bg-white/10 px-3 text-sm text-white/55 hover:bg-white/15 transition-colors ml-auto"
          aria-label="Buscar itens"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          Buscar item para alugar…
        </Link>

        {/* Auth actions */}
        <div className="flex flex-shrink-0 items-center gap-2 ml-auto md:ml-3">
          {session ? (
            <>
              <Link
                href="/itens/novo"
                className="hidden md:inline-flex items-center gap-1.5 h-9 px-4 rounded-md text-sm font-semibold bg-brand text-white hover:opacity-90 transition-opacity outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Anunciar
              </Link>
              <Link
                href="/dashboard"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-brand border-2 border-white/30 text-sm font-bold text-white hover:opacity-90 transition-opacity outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
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
                className="inline-flex h-9 items-center px-3.5 rounded-md text-sm font-medium border border-white/30 text-white hover:bg-white/10 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
              >
                Entrar
              </Link>
              <Link
                href="/cadastro"
                className="inline-flex h-9 items-center px-4 rounded-md text-sm font-semibold bg-brand text-white hover:opacity-90 transition-opacity outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
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
