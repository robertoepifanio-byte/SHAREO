import type { ReactNode } from "react"
import Link from "next/link"
import { PreLaunchHeader } from "@/components/PreLaunchHeader"
import { ROTAS } from "@/lib/config"

/**
 * Moldura das três páginas legais da campanha.
 *
 * Reusa o cabeçalho da landing inteiro — os links dele apontam para `/#âncora`,
 * então funcionam daqui também, levando de volta à seção certa da landing.
 * O rodapé já vem do layout.
 *
 * O texto em si NÃO mora aqui: vem de `@shareo/legal`, o mesmo componente que o
 * marketplace renderiza em /termos, /privacidade e /politicas.
 */
export function PaginaLegal({ children }: { children: ReactNode }) {
  return (
    <>
      <PreLaunchHeader navegacao={false} />

      <main className="bg-background px-5 py-10 sm:px-6">
        <div className="mx-auto max-w-3xl">
          {children}

          <nav
            aria-label="Outros documentos"
            className="mt-10 flex flex-wrap gap-4 border-t border-border pt-6 text-sm"
          >
            <Link href={ROTAS.termos} className="text-brand hover:underline">
              Termos de Uso
            </Link>
            <Link href={ROTAS.privacidade} className="text-brand hover:underline">
              Privacidade
            </Link>
            <Link href={ROTAS.politicas} className="text-brand hover:underline">
              Políticas
            </Link>
            <Link href="/" className="text-brand hover:underline">
              Voltar para a página inicial
            </Link>
          </nav>
        </div>
      </main>
    </>
  )
}
