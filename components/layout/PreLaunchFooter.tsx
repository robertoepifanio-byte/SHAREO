import Image from "next/image"
import Link from "next/link"

/**
 * Rodapé do modo de pré-lançamento.
 *
 * Só marca + links legais. O `AppFooter` normal lista /itens, /itens/novo,
 * /reservas, /mensagens, /perfil e /cadastro — tudo bloqueado pelo gate, o que
 * daria ao visitante um rodapé cheio de links que redirecionam de volta para a
 * própria página.
 *
 * Os links legais NÃO são opcionais aqui: uma landing que capta e-mail sem link
 * de política de privacidade é reprovada na revisão de anúncios do Meta/Google e
 * é frágil sob LGPD.
 */
export function PreLaunchFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-brand" aria-label="Rodapé ShareO">
      <div className="container py-8">
        <div className="flex flex-col items-center gap-5 text-center md:flex-row md:justify-between md:text-left">
          <div>
            <span className="inline-block overflow-hidden rounded-lg bg-white px-3 py-1.5">
              <Image
                src="/logos/shareo-logo.png"
                alt="ShareO"
                width={110}
                height={32}
                className="h-7 w-auto object-contain"
              />
            </span>
            <p className="mt-3 text-sm text-white">Use Mais. Possua Menos.</p>
          </div>

          <nav aria-label="Links legais" className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <Link href="/termos" className="text-sm text-white/90 underline-offset-2 hover:text-white hover:underline">
              Termos de Uso
            </Link>
            <Link href="/privacidade" className="text-sm text-white/90 underline-offset-2 hover:text-white hover:underline">
              Privacidade
            </Link>
            <Link href="/politicas" className="text-sm text-white/90 underline-offset-2 hover:text-white hover:underline">
              Políticas
            </Link>
            <a
              href="mailto:contato@shareo.com.br"
              className="text-sm text-white/90 underline-offset-2 hover:text-white hover:underline"
            >
              Contato
            </a>
          </nav>
        </div>

        <p className="mt-6 border-t border-white/20 pt-5 text-center text-xs text-white/80">
          © {year} ShareO · Marketplace de aluguel entre pessoas
        </p>
      </div>
    </footer>
  )
}
