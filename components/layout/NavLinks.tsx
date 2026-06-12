"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const LINKS = [
  { href: "/",          label: "Início",   exact: true  },
  { href: "/itens",     label: "Explorar", exact: false },
  { href: "/itens/novo",label: "Anunciar", exact: true  },
] as const

interface NavLinksProps {
  hideAnunciar?: boolean
}

export function NavLinks({ hideAnunciar = false }: NavLinksProps) {
  const pathname = usePathname()

  function isActive(href: string, exact: boolean) {
    if (exact) return pathname === href
    // /itens matches /itens/* mas não /itens/novo (que é "Anunciar")
    return pathname.startsWith(href) && pathname !== "/itens/novo"
  }

  return (
    <>
      {LINKS.filter((l) => !(hideAnunciar && l.href === "/itens/novo")).map(({ href, label, exact }) => {
        const active = isActive(href, exact)
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={[
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors outline-none",
              "focus-visible:ring-1 focus-visible:ring-white",
              active
                ? "bg-white/15 text-white font-semibold"
                : "text-white/75 hover:bg-white/10 hover:text-white",
            ].join(" ")}
          >
            {label}
          </Link>
        )
      })}
    </>
  )
}
