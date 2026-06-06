"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"

interface Props {
  isLoggedIn: boolean
  role?:      string | null
}

const EXPLORAR_LINKS = [
  { href: "/itens?intent=rent", icon: "🛒", label: "Quero alugar algo" },
  { href: "/itens",             icon: "📋", label: "Ver todos os itens" },
  { href: "/itens?view=map",    icon: "🗺️", label: "Buscar no mapa" },
  { href: "/itens?sort=views",  icon: "🔥", label: "Mais alugados" },
  { href: "/itens?minRating=4", icon: "⭐", label: "Mais bem avaliados" },
]

const ANUNCIAR_LINKS = [
  { href: "/itens/novo",           icon: "📦", label: "Cadastre seu item" },
  { href: "/anunciar/estimativa",  icon: "💰", label: "Estimativa de ganhos" },
  { href: "/anunciar/dicas",       icon: "💡", label: "Dicas para anfitriões" },
]

const ATIVIDADE_LINKS = [
  { href: "/reservas",  label: "Reservas",  icon: "📅" },
  { href: "/mensagens", label: "Mensagens", icon: "💬" },
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
]

const HELP_LINKS = [
  { href: "/ajuda#primeiros-passos", label: "Primeiros passos", icon: "🚀" },
  { href: "/ajuda#locatario",        label: "Quero alugar",     icon: "🛒" },
  { href: "/ajuda#locador",          label: "Quero anunciar",   icon: "📦" },
  { href: "/ajuda#taxas-secao",      label: "Taxas",            icon: "🧾" },
  { href: "/ajuda#disputas",         label: "Disputas",         icon: "⚖️" },
  { href: "/ajuda#suporte",          label: "Suporte",          icon: "🎧" },
  { href: "/ajuda#pagamento",        label: "Pagamento",        icon: "🔒" },
  { href: "/ajuda#legal",            label: "Legal e Fiscal",   icon: "📋" },
]

const ACCOUNT_LINKS = [
  { href: "/perfil",             label: "Ver Perfil",           icon: "👤" },
  { href: "/perfil/editar",      label: "Editar dados",        icon: "✏️" },
  { href: "/perfil/endereco",    label: "Endereço",            icon: "📍" },
  { href: "/perfil/seguranca",   label: "Segurança",           icon: "🔒" },
  { href: "/perfil/documentos",  label: "Documentos",          icon: "🪪" },
  { href: "/perfil/indicacoes",  label: "Indicações",          icon: "🎁" },
  { href: "/perfil/dados",       label: "Privacidade e dados", icon: "📂" },
]

const Chevron = ({ open }: { open: boolean }) => (
  <svg
    width="16" height="16" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2.5"
    className={`transition-transform flex-shrink-0 ${open ? "rotate-180" : ""}`}
    aria-hidden="true"
  >
    <polyline points="6 9 12 15 18 9"/>
  </svg>
)

export function MobileMenu({ isLoggedIn, role }: Props) {
  const isAdmin = role != null && role !== "USER"
  const [open,          setOpen]          = useState(false)
  const [explorarOpen,  setExplorarOpen]  = useState(false)
  const [anunciarOpen,  setAnunciarOpen]  = useState(false)
  const [accountOpen,   setAccountOpen]   = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setOpen(false)
    setExplorarOpen(false)
    setAnunciarOpen(false)
    setAccountOpen(false)
  }, [pathname])

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

              {/* Início */}
              <li>
                <Link
                  href="/"
                  className="flex h-12 items-center rounded-lg px-4 text-base font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                >
                  Início
                </Link>
              </li>

              {/* Explorar — expansível */}
              <li>
                <button
                  type="button"
                  onClick={() => setExplorarOpen((v) => !v)}
                  aria-expanded={explorarOpen}
                  className="flex h-12 w-full items-center justify-between rounded-lg px-4 text-base font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <span>Explorar</span>
                  <Chevron open={explorarOpen} />
                </button>
              </li>
              {explorarOpen && EXPLORAR_LINKS.map((link) => (
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

              {/* Anunciar — expansível */}
              <li>
                <button
                  type="button"
                  onClick={() => setAnunciarOpen((v) => !v)}
                  aria-expanded={anunciarOpen}
                  className="flex h-12 w-full items-center justify-between rounded-lg px-4 text-base font-medium bg-accent text-[#003366] font-bold hover:brightness-105 transition-colors"
                >
                  <span>Anunciar</span>
                  <Chevron open={anunciarOpen} />
                </button>
              </li>
              {anunciarOpen && ANUNCIAR_LINKS.map((link) => (
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

              {isLoggedIn && (
                <>
                  <li><div className="my-1 h-px bg-white/10" /></li>

                  {/* Seção Atividade */}
                  <li>
                    <p className="px-4 pt-2 pb-1 text-xs font-semibold text-white/50 uppercase tracking-wider">Atividade</p>
                  </li>
                  {ATIVIDADE_LINKS.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="flex h-11 items-center gap-3 rounded-lg px-4 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                      >
                        <span aria-hidden="true">{link.icon}</span>
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
                      <Chevron open={accountOpen} />
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

                  {/* Central de Ajuda */}
                  <li>
                    <p className="px-4 pt-2 pb-1 text-xs font-semibold text-white/50 uppercase tracking-wider">Central de Ajuda</p>
                  </li>
                  {HELP_LINKS.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="flex h-11 items-center gap-3 rounded-lg px-4 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                      >
                        <span aria-hidden="true">{link.icon}</span>
                        {link.label}
                      </Link>
                    </li>
                  ))}
                  <li>
                    <Link href="/ajuda" className="flex h-11 items-center gap-3 rounded-lg px-4 text-sm font-medium text-brand hover:bg-white/10 transition-colors">
                      Ver tudo →
                    </Link>
                  </li>

                  {/* Painel Admin — apenas para admins */}
                  {isAdmin && (
                    <>
                      <li><div className="my-1 h-px bg-white/10" /></li>
                      <li>
                        <Link
                          href="/admin"
                          className="flex h-12 w-full items-center rounded-lg px-4 text-base font-semibold text-brand hover:bg-white/10 transition-colors"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="mr-2" aria-hidden="true">
                            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                          </svg>
                          Painel Admin
                        </Link>
                      </li>
                    </>
                  )}

                  {/* Sair */}
                  <li><div className="my-1 h-px bg-white/10" /></li>
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

                  {/* Central de Ajuda — não logado */}
                  <li><div className="my-1 h-px bg-white/10" /></li>
                  <li>
                    <p className="px-4 pt-2 pb-1 text-xs font-semibold text-white/50 uppercase tracking-wider">Central de Ajuda</p>
                  </li>
                  {HELP_LINKS.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="flex h-11 items-center gap-3 rounded-lg px-4 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                      >
                        <span aria-hidden="true">{link.icon}</span>
                        {link.label}
                      </Link>
                    </li>
                  ))}
                  <li>
                    <Link href="/ajuda" className="flex h-11 items-center gap-3 rounded-lg px-4 text-sm font-medium text-brand hover:bg-white/10 transition-colors">
                      Ver tudo →
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
