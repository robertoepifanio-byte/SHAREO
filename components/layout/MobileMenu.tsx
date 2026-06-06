"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"

interface Props {
  isLoggedIn: boolean
  role?:      string | null
}

const EXPLORAR_LINKS = [
  { href: "/itens?intent=rent", icon: "cart",     label: "Quero alugar algo" },
  { href: "/itens",             icon: "list",     label: "Ver todos os itens" },
  { href: "/itens?view=map",    icon: "map",      label: "Buscar no mapa" },
  { href: "/itens?sort=views",  icon: "trending", label: "Mais alugados" },
  { href: "/itens?minRating=4", icon: "star",     label: "Mais bem avaliados" },
]

const ANUNCIAR_LINKS = [
  { href: "/itens/novo",          icon: "package", label: "Cadastre seu item" },
  { href: "/anunciar/estimativa", icon: "dollar",  label: "Estimativa de ganhos" },
  { href: "/anunciar/dicas",      icon: "bulb",    label: "Dicas para anfitriões" },
]

const ATIVIDADE_LINKS = [
  { href: "/reservas",  label: "Reservas",  icon: "calendar" },
  { href: "/mensagens", label: "Mensagens", icon: "message" },
  { href: "/dashboard", label: "Dashboard", icon: "grid" },
]

const ADMIN_ATALHOS_LINKS = [
  { href: "/admin",          label: "Visão Geral", icon: "home" },
  { href: "/admin/usuarios", label: "Usuários",    icon: "users" },
  { href: "/admin/disputas", label: "Disputas",    icon: "shield" },
]

const HELP_LINKS = [
  { href: "/ajuda#primeiros-passos", label: "Primeiros passos", icon: "rocket" },
  { href: "/ajuda#locatario",        label: "Quero alugar",     icon: "cart" },
  { href: "/ajuda#locador",          label: "Quero anunciar",   icon: "package" },
  { href: "/ajuda#taxas-secao",      label: "Taxas",            icon: "receipt" },
  { href: "/ajuda#disputas",         label: "Disputas",         icon: "shield" },
  { href: "/ajuda#suporte",          label: "Suporte",          icon: "headphones" },
  { href: "/ajuda#pagamento",        label: "Pagamento",        icon: "lock" },
  { href: "/ajuda#legal",            label: "Legal e Fiscal",   icon: "file" },
]

const ACCOUNT_LINKS = [
  { href: "/perfil",            label: "Ver Perfil",          icon: "user" },
  { href: "/perfil/editar",     label: "Editar dados",        icon: "edit" },
  { href: "/perfil/endereco",   label: "Endereço",            icon: "pin" },
  { href: "/perfil/seguranca",  label: "Segurança",           icon: "lock" },
  { href: "/perfil/documentos", label: "Documentos",          icon: "idcard" },
  { href: "/perfil/indicacoes", label: "Indicações",          icon: "gift" },
  { href: "/perfil/dados",      label: "Privacidade e dados", icon: "folder" },
]

function MenuIcon({ name }: { name: string }) {
  const p = {
    width: 16, height: 16, viewBox: "0 0 24 24",
    fill: "none", stroke: "currentColor", strokeWidth: 2,
    strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
    className: "flex-shrink-0",
  }
  switch (name) {
    case "cart":      return <svg {...p}><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
    case "list":      return <svg {...p}><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
    case "map":       return <svg {...p}><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>
    case "trending":  return <svg {...p}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
    case "star":      return <svg {...p}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
    case "package":   return <svg {...p}><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
    case "dollar":    return <svg {...p}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
    case "bulb":      return <svg {...p}><line x1="9" y1="18" x2="15" y2="18"/><line x1="10" y1="22" x2="14" y2="22"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg>
    case "calendar":  return <svg {...p}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
    case "message":   return <svg {...p}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
    case "grid":      return <svg {...p}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
    case "home":      return <svg {...p}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
    case "users":     return <svg {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
    case "shield":    return <svg {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
    case "rocket":    return <svg {...p}><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>
    case "receipt":   return <svg {...p}><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1Z"/><path d="M14 8H8"/><path d="M16 12H8"/><path d="M13 16H8"/></svg>
    case "headphones":return <svg {...p}><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>
    case "lock":      return <svg {...p}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
    case "file":      return <svg {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
    case "user":      return <svg {...p}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
    case "edit":      return <svg {...p}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
    case "pin":       return <svg {...p}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
    case "idcard":    return <svg {...p}><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><line x1="7" y1="15" x2="10" y2="15"/></svg>
    case "gift":      return <svg {...p}><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>
    case "folder":    return <svg {...p}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
    default:          return null
  }
}

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
  const [open,         setOpen]         = useState(false)
  const [explorarOpen, setExplorarOpen] = useState(false)
  const [anunciarOpen, setAnunciarOpen] = useState(false)
  const [accountOpen,  setAccountOpen]  = useState(false)
  const [helpOpen,     setHelpOpen]     = useState(false)
  const pathname     = usePathname()
  const navRef       = useRef<HTMLElement>(null)
  const hamburgerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => { setOpen(false) }, [pathname])

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [open])

  // Focus trap + Escape
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false)
        hamburgerRef.current?.focus()
        return
      }
      if (e.key === "Tab") {
        const nav = navRef.current
        if (!nav) return
        const focusable = Array.from(
          nav.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        )
        if (focusable.length === 0) return
        const first = focusable[0]
        const last  = focusable[focusable.length - 1]
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first.focus()
          }
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [open])

  const subItem = "flex h-11 items-center gap-3 rounded-lg pl-8 pr-4 text-sm font-medium text-white/75 hover:bg-white/10 hover:text-white transition-colors"
  const topItem = "flex h-12 items-center rounded-lg px-4 text-base font-medium text-white/75 hover:bg-white/10 hover:text-white transition-colors"
  const sectionBtn = "flex h-12 w-full items-center justify-between rounded-lg px-4 text-base font-semibold text-white/75 hover:bg-white/10 hover:text-white transition-colors"

  return (
    <>
      {/* Botão hamburguer */}
      <button
        ref={hamburgerRef}
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
            ref={navRef}
            id="mobile-nav"
            className="fixed left-0 right-0 top-16 bg-primary border-t border-white/10 shadow-2xl z-[195] md:hidden overflow-y-auto max-h-[calc(100dvh-4rem)]"
            aria-label="Navegação mobile"
          >
            <ul className="container py-3 flex flex-col gap-1">

              {/* Início */}
              <li>
                <Link href="/" className={topItem}>Início</Link>
              </li>

              {/* Explorar — expansível */}
              <li>
                <button
                  type="button"
                  onClick={() => setExplorarOpen((v) => !v)}
                  aria-expanded={explorarOpen}
                  aria-haspopup="menu"
                  className={sectionBtn}
                >
                  <span>Explorar</span>
                  <Chevron open={explorarOpen} />
                </button>
              </li>
              {explorarOpen && EXPLORAR_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={subItem}>
                    <MenuIcon name={link.icon} />
                    {link.label}
                  </Link>
                </li>
              ))}

              {/* Anunciar — expansível (apenas para não-admins) */}
              {!isAdmin && (
                <>
                  <li>
                    <button
                      type="button"
                      onClick={() => setAnunciarOpen((v) => !v)}
                      aria-expanded={anunciarOpen}
                      aria-haspopup="menu"
                      className="flex h-12 w-full items-center justify-between rounded-lg px-4 text-base font-bold bg-accent text-[#003366] hover:brightness-105 transition-colors"
                    >
                      <span>Anunciar</span>
                      <Chevron open={anunciarOpen} />
                    </button>
                  </li>
                  {anunciarOpen && ANUNCIAR_LINKS.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className={subItem}>
                        <MenuIcon name={link.icon} />
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </>
              )}

              {isLoggedIn && (
                <>
                  <li><div className="my-1 h-px bg-white/10" /></li>

                  {/* Atividade / Admin atalhos */}
                  <li>
                    <p className="px-4 pt-2 pb-1 text-xs font-semibold text-white/50 uppercase tracking-wider">
                      {isAdmin ? "Admin" : "Atividade"}
                    </p>
                  </li>
                  {(isAdmin ? ADMIN_ATALHOS_LINKS : ATIVIDADE_LINKS).map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className={`${subItem} pl-4`}>
                        <MenuIcon name={link.icon} />
                        {link.label}
                      </Link>
                    </li>
                  ))}

                  <li><div className="my-1 h-px bg-white/10" /></li>

                  {/* Minha Conta — expansível */}
                  <li>
                    <button
                      type="button"
                      onClick={() => setAccountOpen((v) => !v)}
                      aria-expanded={accountOpen}
                      aria-haspopup="menu"
                      className={sectionBtn}
                    >
                      <span>Minha Conta</span>
                      <Chevron open={accountOpen} />
                    </button>
                  </li>
                  {accountOpen && ACCOUNT_LINKS.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className={subItem}>
                        <MenuIcon name={link.icon} />
                        {link.label}
                      </Link>
                    </li>
                  ))}

                  {/* Painel Admin — apenas para admins */}
                  {isAdmin && (
                    <>
                      <li><div className="my-1 h-px bg-white/10" /></li>
                      <li>
                        <Link
                          href="/admin"
                          className="flex h-12 w-full items-center rounded-lg px-4 text-base font-semibold text-brand hover:bg-white/10 transition-colors"
                        >
                          <MenuIcon name="grid" />
                          <span className="ml-2">Painel Admin</span>
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
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 flex-shrink-0" aria-hidden="true">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                        <polyline points="16 17 21 12 16 7"/>
                        <line x1="21" y1="12" x2="9" y2="12"/>
                      </svg>
                      Sair
                    </button>
                  </li>

                  {/* Central de Ajuda — APÓS o Sair */}
                  <li><div className="my-1 h-px bg-white/10" /></li>
                  <li>
                    <button
                      type="button"
                      onClick={() => setHelpOpen((v) => !v)}
                      aria-expanded={helpOpen}
                      aria-haspopup="menu"
                      className={sectionBtn}
                    >
                      <span>Central de Ajuda</span>
                      <Chevron open={helpOpen} />
                    </button>
                  </li>
                  {helpOpen && (
                    <>
                      {HELP_LINKS.map((link) => (
                        <li key={link.href}>
                          <Link href={link.href} className={subItem}>
                            <MenuIcon name={link.icon} />
                            {link.label}
                          </Link>
                        </li>
                      ))}
                      <li>
                        <Link href="/ajuda" className="flex h-11 items-center gap-3 rounded-lg pl-8 pr-4 text-sm font-medium text-brand hover:bg-white/10 transition-colors">
                          Ver tudo →
                        </Link>
                      </li>
                    </>
                  )}
                </>
              )}

              {!isLoggedIn && (
                <>
                  <li><div className="my-1 h-px bg-white/10" /></li>
                  <li>
                    <Link href="/login" className={topItem}>Entrar</Link>
                  </li>

                  {/* Central de Ajuda — não logado */}
                  <li><div className="my-1 h-px bg-white/10" /></li>
                  <li>
                    <button
                      type="button"
                      onClick={() => setHelpOpen((v) => !v)}
                      aria-expanded={helpOpen}
                      aria-haspopup="menu"
                      className={sectionBtn}
                    >
                      <span>Central de Ajuda</span>
                      <Chevron open={helpOpen} />
                    </button>
                  </li>
                  {helpOpen && (
                    <>
                      {HELP_LINKS.map((link) => (
                        <li key={link.href}>
                          <Link href={link.href} className={subItem}>
                            <MenuIcon name={link.icon} />
                            {link.label}
                          </Link>
                        </li>
                      ))}
                      <li>
                        <Link href="/ajuda" className="flex h-11 items-center gap-3 rounded-lg pl-8 pr-4 text-sm font-medium text-brand hover:bg-white/10 transition-colors">
                          Ver tudo →
                        </Link>
                      </li>
                    </>
                  )}
                </>
              )}
            </ul>
          </nav>
        </>
      )}
    </>
  )
}
