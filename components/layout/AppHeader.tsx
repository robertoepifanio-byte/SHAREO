import { auth } from "@/lib/auth"
import Image from "next/image"
import Link from "next/link"
import { NotificationBell } from "@/components/ui/NotificationBell"

export async function AppHeader() {
  const session = await auth().catch(() => null)
  const initial = session?.user?.name?.[0]?.toUpperCase() ?? "U"

  return (
    <header className="sticky top-0 z-[200] bg-primary" role="banner">
      <div className="container flex h-16 items-center gap-3">

        {/* Logo */}
        <Link
          href={session ? "/dashboard" : "/"}
          className="flex-shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-primary rounded-sm"
          aria-label="ShareO — página inicial"
        >
          <div className="relative h-8 w-36">
            <Image
              src="/icones/shareo-logo-v3.png"
              alt="ShareO"
              fill
              className="object-contain object-left"
              priority
            />
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 ml-6" aria-label="Navegação principal">
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
          <Link
            href="/itens/novo"
            className="rounded-md px-3 py-1.5 text-sm font-medium text-white/75 hover:bg-white/10 hover:text-white transition-colors outline-none focus-visible:ring-1 focus-visible:ring-white"
          >
            Anunciar
          </Link>
          {session && (
            <>
              <Link
                href="/reservas"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-white/75 hover:bg-white/10 hover:text-white transition-colors outline-none focus-visible:ring-1 focus-visible:ring-white"
              >
                Reservas
              </Link>
              <Link
                href="/mensagens"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-white/75 hover:bg-white/10 hover:text-white transition-colors outline-none focus-visible:ring-1 focus-visible:ring-white"
              >
                Mensagens
              </Link>
            </>
          )}
        </nav>

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
              <NotificationBell />
              <Link
                href="/dashboard"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-brand border-2 border-white/30 text-sm font-bold text-white hover:opacity-90 transition-opacity outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
                title={session?.user?.name ?? "Meu perfil"}
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
                href="/itens/novo"
                className="inline-flex h-9 items-center gap-1 px-4 rounded-md text-sm font-semibold bg-brand text-white hover:opacity-90 transition-opacity outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
              >
                + Anunciar
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
