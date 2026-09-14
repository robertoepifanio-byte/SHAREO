import Image from "next/image"
import Link from "next/link"
import { ThemeToggle } from "@/components/ThemeToggle"
import { CtaAncora } from "@/components/landing/CtaAncora"
import { NAV_LINKS } from "@/lib/landing-content"

/**
 * Cabeçalho da landing: logo, navegação por âncoras, tema e o CTA.
 *
 * Não reusa o `AppHeader` do marketplace de propósito — ele arrasta links para
 * rotas (/itens, /itens/novo) que não existem nesta campanha. Um header que
 * leva a lugar nenhum é pior do que header nenhum.
 *
 * ⚠️ `h-16` é fixo em TODAS as larguras, e isso não é estético: é o número que
 * o `scroll-mt-16` de cada seção compensa. Mudar a altura aqui sem mudar lá faz
 * toda âncora aterrissar com o título escondido atrás do cabeçalho.
 *
 * A navegação é `hidden md:flex`. Em 375px sobram ~343px úteis, onde os cinco
 * links não cabem — e numa página única a navegação é redundante com a própria
 * rolagem. A alternativa (segunda linha rolável) custaria `h-24` no mobile e
 * obrigaria `scroll-mt-24 md:scroll-mt-16` em todas as seções, para resolver um
 * problema que o scroll já resolve. No mobile fica logo + CTA.
 */
export function PreLaunchHeader() {
  return (
    <header className="sticky top-0 z-[200] bg-primary" role="banner">
      <nav
        className="container flex h-16 items-center justify-between gap-3"
        aria-label="Navegação da campanha"
      >
        <Link
          href="/"
          className="flex min-h-tap flex-shrink-0 items-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
          aria-label="ShareO — página inicial"
        >
          <span className="block overflow-hidden rounded-lg bg-white px-2 py-1">
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
          </span>
        </Link>

        <ul className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="inline-flex min-h-tap items-center rounded-lg px-3 text-sm font-semibold text-white/85 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
              >
                {link.rotulo}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {/* No mobile o rótulo encurta para caber ao lado do logo em 375px. */}
          <CtaAncora className="px-4 text-xs sm:px-6 sm:text-sm">
            <span className="sm:hidden">Participar</span>
            <span className="hidden sm:inline">Quero participar</span>
          </CtaAncora>
        </div>
      </nav>
    </header>
  )
}
