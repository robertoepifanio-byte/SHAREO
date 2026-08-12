import Image from "next/image"
import { ROTAS } from "@/lib/config"

/**
 * Rodapé da campanha. Só marca + links legais.
 *
 * Os links legais NÃO são opcionais: uma landing que capta e-mail sem link de
 * política de privacidade é reprovada na revisão de anúncios do Meta/Google e é
 * frágil sob LGPD.
 *
 * Eles apontam para o SITE DO SHAREO por URL absoluta, com `<a>` em vez de
 * `<Link>` — o texto legal tem fonte única lá. Duplicar termos e política nesta
 * landing criaria duas versões do mesmo documento, que divergem na primeira
 * revisão jurídica e deixam o visitante aceitando um texto que não é o vigente.
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
            <a href={ROTAS.termos} className="text-sm text-white/90 underline-offset-2 hover:text-white hover:underline">
              Termos de Uso
            </a>
            <a href={ROTAS.privacidade} className="text-sm text-white/90 underline-offset-2 hover:text-white hover:underline">
              Privacidade
            </a>
            <a href={ROTAS.politicas} className="text-sm text-white/90 underline-offset-2 hover:text-white hover:underline">
              Políticas
            </a>
            <a
              href="mailto:contato@shareo.com.br"
              className="text-sm text-white/90 underline-offset-2 hover:text-white hover:underline"
            >
              Contato
            </a>
          </nav>
        </div>

        {/*
          text-white (opaco), não text-white/80: sobre o bg-brand (#007B3C) o
          branco a 80% compõe 4,03:1 — abaixo do mínimo 4,5:1 do WCAG AA para
          texto pequeno (12px). Opaco dá 5,39:1. Era a única violação de
          contraste da landing, e aparecia 6× nos relatórios do axe (3 páginas
          auditadas × 2 temas) por ser o rodapé compartilhado.

          A 90% daria 4,68:1, que passa raspando — não vale a margem.
        */}
        <p className="mt-6 border-t border-white/20 pt-5 text-center text-xs text-white">
          © {year} ShareO · Marketplace de aluguel entre pessoas
        </p>
      </div>
    </footer>
  )
}
