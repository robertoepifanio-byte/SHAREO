import Image from "next/image"
import Link from "next/link"
import { ThemeToggle } from "@/components/layout/ThemeToggle"
import { PrelaunchBadge } from "@/components/home/PrelaunchBadge"

/**
 * Cabeçalho do modo de pré-lançamento: logo + tema, nada mais.
 *
 * Não reusa o `AppHeader` de propósito — ele arrasta `NavLinks` (/itens,
 * /itens/novo) e o `MobileMenu` com seis listas de links do marketplace, todos
 * apontando para rotas que o gate bloqueia. Um header que leva a lugar nenhum é
 * pior do que header nenhum.
 */
type Props = {
  /**
   * `"minimal"` omite o logo. Usado quando o banner da campanha abre a página —
   * ele já traz a marca em destaque, e repetir o logo logo acima só rouba altura
   * da primeira tela. Default `"full"` para não afetar outros usos.
   */
  variant?: "full" | "minimal"
  /**
   * Mostra o selo de pré-lançamento no cabeçalho. Como ele é sticky, o aviso de
   * que o serviço ainda não abriu acompanha a rolagem inteira — em vez de sumir
   * assim que a pessoa passa do topo. Quando ligado, a ListaVIP deve receber
   * `hideBadge` para o selo não aparecer duas vezes.
   */
  showBadge?: boolean
}

export function PreLaunchHeader({ variant = "full", showBadge = false }: Props = {}) {
  return (
    <header className="sticky top-0 z-[200] bg-primary" role="banner">
      <div className={`container flex h-16 items-center gap-2 ${variant === "minimal" && !showBadge ? "justify-end" : "justify-between"}`}>
        {variant === "full" && (
          <Link
            href="/"
            className="flex-shrink-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
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
        )}

        {showBadge && <PrelaunchBadge />}

        <ThemeToggle />
      </div>
    </header>
  )
}
