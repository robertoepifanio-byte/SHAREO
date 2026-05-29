import { auth } from "@/lib/auth"
import Image from "next/image"
import Link from "next/link"
import { NotificationBell } from "@/components/ui/NotificationBell"
import { MobileMenu } from "@/components/layout/MobileMenu"
import { SignOutButton } from "@/components/ui/SignOutButton"

export async function AppHeader() {
  const session = await auth().catch(() => null)
  const initial = session?.user?.name?.[0]?.toUpperCase() ?? "U"

  return (
    <header className="sticky top-0 z-[200] bg-primary" role="banner">
      <div className="container flex h-16 items-center gap-2">

        {/* Logo + tagline */}
        <Link
          href={session ? "/dashboard" : "/"}
          className="flex-shrink-0 flex flex-col outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary rounded-lg"
          aria-label="ShareO — página inicial"
        >
          <div className="rounded-lg overflow-hidden bg-white px-2 py-1">
            <Image
              src="/logos/shareo-logo.png"
              alt="ShareO"
              width={120}
              height={32}
              sizes="120px"
              className="object-contain"
              style={{ width: "auto", height: "32px" }}
              priority
            />
          </div>
          <span className="hidden md:block mt-0.5 text-[10px] text-white/50 font-medium leading-none">
            Use Mais. Possua Menos.
          </span>
        </Link>

        {/* Nav desktop — oculta em mobile */}
        <nav className="hidden md:flex items-center gap-1 ml-6" aria-label="Navegação principal">
          <Link href="/"           className="rounded-md px-3 py-1.5 text-sm font-medium text-white/75 hover:bg-white/10 hover:text-white transition-colors outline-none focus-visible:ring-1 focus-visible:ring-white">Início</Link>
          <Link href="/itens"      className="rounded-md px-3 py-1.5 text-sm font-medium text-white/75 hover:bg-white/10 hover:text-white transition-colors outline-none focus-visible:ring-1 focus-visible:ring-white">Explorar</Link>
          <Link href="/itens/novo" className="rounded-md px-3 py-1.5 text-sm font-medium text-white/75 hover:bg-white/10 hover:text-white transition-colors outline-none focus-visible:ring-1 focus-visible:ring-white">Anunciar</Link>
          <Link href="/ganhar"    className="rounded-md px-3 py-1.5 text-sm font-medium text-white/75 hover:bg-white/10 hover:text-white transition-colors outline-none focus-visible:ring-1 focus-visible:ring-white">Quanto ganhar?</Link>
          {session && (
            <>
              <Link href="/reservas"  className="rounded-md px-3 py-1.5 text-sm font-medium text-white/75 hover:bg-white/10 hover:text-white transition-colors outline-none focus-visible:ring-1 focus-visible:ring-white">Reservas</Link>
              <Link href="/mensagens" className="rounded-md px-3 py-1.5 text-sm font-medium text-white/75 hover:bg-white/10 hover:text-white transition-colors outline-none focus-visible:ring-1 focus-visible:ring-white">Mensagens</Link>
            </>
          )}
        </nav>

        {/* Busca — desktop apenas */}
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

        {/* Ações de autenticação */}
        <div className="flex flex-shrink-0 items-center gap-2 ml-auto md:ml-3">
          {session ? (
            <>
              {/* Saudação — apenas desktop */}
              <span className="hidden md:block text-sm font-semibold text-white/85 whitespace-nowrap">
                Olá, {session.user.name?.split(" ")[0] ?? "você"}!
              </span>

              {/* Avatar / perfil */}
              <Link
                href="/dashboard"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-brand border-2 border-white/30 text-sm font-bold text-white hover:opacity-90 transition-opacity outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
                title={session?.user?.name ?? "Meu perfil"}
                aria-label="Meu perfil"
              >
                {initial}
              </Link>

              <NotificationBell />

              {/* Ajuda */}
              <Link
                href="/ajuda"
                className="hidden md:inline-flex h-9 items-center px-3 rounded-md text-sm font-medium border border-white/30 text-white hover:bg-white/10 transition-colors outline-none focus-visible:ring-1 focus-visible:ring-white"
              >
                Ajuda
              </Link>

              {/* Anunciar — apenas desktop */}
              <Link
                href="/itens/novo"
                className="hidden md:inline-flex items-center gap-1.5 h-9 px-4 rounded-md text-sm font-bold bg-accent text-[#003366] hover:brightness-105 transition-all outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Anunciar
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="inline-flex h-11 items-center px-4 rounded-md text-sm font-medium border border-white/30 text-white hover:bg-white/10 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
              >
                Entrar
              </Link>
              {/* + Anunciar — apenas desktop (no mobile fica no menu hamburguer) */}
              <Link
                href="/itens/novo"
                className="hidden md:inline-flex h-11 items-center gap-1 px-4 rounded-md text-sm font-bold bg-accent text-[#003366] hover:brightness-105 transition-all outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
              >
                + Anunciar
              </Link>
            </>
          )}

          {/* Menu hamburguer — apenas mobile */}
          <MobileMenu isLoggedIn={!!session} />
        </div>
      </div>
    </header>
  )
}
