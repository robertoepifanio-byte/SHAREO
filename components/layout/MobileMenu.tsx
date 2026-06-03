"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"

interface Props {
  isLoggedIn: boolean
}

const NAV_LINKS = [
  { href: "/",           label: "Início" },
  { href: "/itens",      label: "Explorar" },
  { href: "/itens/novo", label: "Anunciar", cta: true },
]

const AUTH_LINKS = [
  { href: "/reservas",  label: "Reservas" },
  { href: "/mensagens", label: "Mensagens" },
  { href: "/dashboard", label: "Dashboard" },
]

const ACCOUNT_LINKS = [
  { href: "/perfil",             label: "Meu Perfil",          icon: "👤" },
  { href: "/perfil/editar",      label: "Editar Perfil",       icon: "✏️" },
  { href: "/perfil/endereco",    label: "Endereço",            icon: "📍" },
  { href: "/perfil/seguranca",   label: "Segurança",           icon: "🔒" },
  { href: "/perfil/documentos",  label: "Documentos",          icon: "🪪" },
  { href: "/perfil/indicacoes",  label: "Indicações",          icon: "🎁" },
  { href: "/perfil/dados",       label: "Privacidade e dados", icon: "📂" },
]

export function MobileMenu({ isLoggedIn }: Props) {
  const [open,         setOpen]         = useState(false)
  const [accountOpen,  setAccountOpen]  = useState(false)
  const pathname = usePathname()

  useEffect(() => { setOpen(false); setAccountOpen(false) }, [pathname])

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [open])

  return (
    <>
      {/* Botão hamburguer */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Fechar menu" : "Abrir menu"}
        aria-expanded={open}
        aria-controls="mobile-nav"
        className="md:hidden flex h-11 w-11 items-center justify-center rounded-lg text-white hover:bg-white/10 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white flex-shrink-0"
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <line x1="3" y1="7" x2="21" y2="7"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="17" x2="21" y2="17"/>
          </svg>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 top-16 bg-black/50 z-[190] md:hidden"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          <nav
            id="mobile-nav"
            className="fixed left-0 right-0 top-16 bg-primary border-t border-white/10 shadow-2xl z-[195] md:hidden overflow-y-auto max-h-[calc(100dvh-4rem)]"
            aria-label="Navegação mobile"
          >
            <ul className="container py-3 flex flex-col gap-1">

              {/* Links principais */}
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={`flex h-12 items-center rounded-lg px-4 text-base font-medium transition-colors ${
                      link.cta
                        ? "bg-accent text-[#003366] font-bold hover:brightness-105"
                        : "text-white/80 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}

              {isLoggedIn && (
                <>
                  <li><div className="my-1 h-px bg-white/10" /></li>

                  {/* Links autenticados */}
                  {AUTH_LINKS.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="flex h-12 items-center rounded-lg px-4 text-base font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}

                  <li><div className="my-1 h-px bg-white/10" /></li>

                  {/* Seção Minha Conta — expansível */}
                  <li>
                    <button
                      type="button"
                      onClick={() => setAccountOpen((v) => !v)}
                      aria-expanded={accountOpen}
                      className="flex h-12 w-full items-center justify-between rounded-lg px-4 text-base font-semibold text-white/90 hover:bg-white/10 transition-colors"
                    >
                      <span>Minha Conta</span>
                      <svg
                        width="16" height="16" viewBox="0 0 24 24"
                        fill="none" stroke="currentColor" strokeWidth="2.5"
                        className={`transition-transform ${accountOpen ? "rotate-180" : ""}`}
                        aria-hidden="true"
                      >
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </button>
                  </li>

                  {accountOpen && ACCOUNT_LINKS.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="flex h-11 items-center gap-3 rounded-lg pl-8 pr-4 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                      >
                        <span aria-hidden="true">{link.icon}</span>
                        {link.label}
                      </Link>
                    </li>
                  ))}

                  <li><div className="my-1 h-px bg-white/10" /></li>

                  {/* Ajuda + Sair */}
                  <li>
                    <Link href="/ajuda" className="flex h-12 items-center rounded-lg px-4 text-base font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors">
                      Ajuda
                    </Link>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => signOut({ callbackUrl: "/" })}
                      className="flex h-12 w-full items-center rounded-lg px-4 text-base font-medium text-red-300 hover:bg-white/10 hover:text-red-200 transition-colors"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2" aria-hidden="true">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                        <polyline points="16 17 21 12 16 7"/>
                        <line x1="21" y1="12" x2="9" y2="12"/>
                      </svg>
                      Sair
                    </button>
                  </li>
                </>
              )}

              {!isLoggedIn && (
                <>
                  <li><div className="my-1 h-px bg-white/10" /></li>
                  <li>
                    <Link href="/login" className="flex h-12 items-center rounded-lg px-4 text-base font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors">
                      Entrar
                    </Link>
                  </li>
                  <li>
                    <Link href="/ajuda" className="flex h-12 items-center rounded-lg px-4 text-base font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors">
                      Ajuda
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </nav>
        </>
      )}
    </>
  )
}
