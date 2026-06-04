import { auth } from "@/lib/auth"
import Image from "next/image"
import Link from "next/link"
import { NotificationBell } from "@/components/ui/NotificationBell"
import { MobileMenu } from "@/components/layout/MobileMenu"
import { UserDropdown } from "@/components/layout/UserDropdown"
import { HelpButton } from "@/components/layout/HelpButton"

export async function AppHeader() {
  const session = await auth().catch(() => null)

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
          <span className="hidden md:block mt-0.5 text-[10px] text-white/85 font-medium leading-none text-center">
            Use Mais. Possua Menos.
          </span>
        </Link>

        {/* Nav desktop — oculta em mobile */}
        <nav className="hidden md:flex items-center gap-1 ml-6" aria-label="Navegação principal">
          <Link href="/"           className="rounded-md px-3 py-1.5 text-sm font-medium text-white/75 hover:bg-white/10 hover:text-white transition-colors outline-none focus-visible:ring-1 focus-visible:ring-white">Início</Link>
          <Link href="/itens"      className="rounded-md px-3 py-1.5 text-sm font-medium text-white/75 hover:bg-white/10 hover:text-white transition-colors outline-none focus-visible:ring-1 focus-visible:ring-white">Explorar</Link>
          <Link href="/itens/novo" className="rounded-md px-3 py-1.5 text-sm font-medium text-white/75 hover:bg-white/10 hover:text-white transition-colors outline-none focus-visible:ring-1 focus-visible:ring-white">Anunciar</Link>
          {session && (
            <>
              <Link href="/reservas"  className="rounded-md px-3 py-1.5 text-sm font-medium text-white/75 hover:bg-white/10 hover:text-white transition-colors outline-none focus-visible:ring-1 focus-visible:ring-white">Reservas</Link>
              <Link href="/mensagens" className="rounded-md px-3 py-1.5 text-sm font-medium text-white/75 hover:bg-white/10 hover:text-white transition-colors outline-none focus-visible:ring-1 focus-visible:ring-white">Mensagens</Link>
            </>
          )}
        </nav>

        {/* Ações de autenticação */}
        <div className="flex flex-shrink-0 items-center gap-2 ml-auto">
          {/* HelpButton — desktop only, logado ou não */}
          <div className="hidden md:block">
            <HelpButton />
          </div>

          {session ? (
            <>
              {/* Saudação — apenas desktop */}
              <span className="hidden md:block text-sm font-semibold text-white/85 whitespace-nowrap">
                Olá, {session.user.name?.split(" ")[0] ?? "você"}!
              </span>

              <NotificationBell />

              {/* Avatar com dropdown — desktop */}
              <div className="hidden md:block">
                <UserDropdown
                  name={session.user.name ?? "Usuário"}
                  avatarUrl={session.user.image ?? null}
                />
              </div>

</>
          ) : (
            <>
              <Link
                href="/login"
                className="inline-flex h-11 items-center px-4 rounded-md text-sm font-medium border border-white/30 text-white hover:bg-white/10 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
              >
                Entrar
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
