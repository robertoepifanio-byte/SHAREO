import Image from "next/image"
import Link from "next/link"

/**
 * Rodapé global do ShareO.
 * Fundo verde escuro (#007B3C) conforme identidade visual v1.0.
 * Texto branco/semi-transparente garante contraste WCAG AA.
 */
export function AppFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-[#007B3C]" aria-label="Rodapé ShareO">
      <div className="container py-10">
        <div className="flex flex-col gap-8">

          {/* Brand + tagline */}
          <div className="max-w-xs">
            <div className="inline-block rounded-lg overflow-hidden bg-white px-3 py-1.5">
              <Image
                src="/logos/shareo-logo.png"
                alt="ShareO"
                width={110}
                height={32}
                className="object-contain h-7 w-auto"
              />
            </div>
            <p className="mt-3 text-sm text-white">
              Compartilhe. Economize. Sustentável.
            </p>
            <p className="mt-3 text-xs text-white/90">
              <strong className="text-white">Marketplace circular</strong>{" "}
              para aluguel de itens locais.
            </p>
            <p className="mt-1 text-xs text-white/90 whitespace-nowrap">
              Transforme itens parados em{" "}
              <strong className="text-white">renda</strong>{" "}
              e ajude sua comunidade.
            </p>
          </div>

          {/* Links — 3 colunas */}
          <nav
            aria-label="Links do rodapé"
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            <div className="flex flex-col gap-2">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-white/90">
                Plataforma
              </p>
              <Link href="/sobre"         className="text-sm text-white/90 hover:text-white transition-colors">Sobre Nós</Link>
              <Link href="/sobre#missao"  className="text-sm text-white/90 hover:text-white transition-colors">Nossa Missão</Link>
              <Link href="/contato"       className="text-sm text-white/90 hover:text-white transition-colors">Contato</Link>
            </div>

            <div className="flex flex-col gap-2">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-white/90">
                Legal
              </p>
              <Link href="/privacidade" className="text-sm text-white/90 hover:text-white transition-colors">Privacidade</Link>
              <Link href="/termos"      className="text-sm text-white/90 hover:text-white transition-colors">Termos</Link>
              <Link href="/politicas"   className="text-sm text-white/90 hover:text-white transition-colors">Políticas e Regras</Link>
            </div>

            <div className="flex flex-col gap-2">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-white/90">
                Suporte
              </p>
              <Link href="/ajuda"             className="text-sm text-white/90 hover:text-white transition-colors">Central de Ajuda</Link>
              <Link href="/suporte"           className="text-sm text-white/90 hover:text-white transition-colors">Suporte 24/7</Link>
              <Link href="/perfil/documentos" className="text-sm text-white/90 hover:text-white transition-colors">Verificação de Identidade</Link>
            </div>
          </nav>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 flex flex-col gap-3 border-t border-white/20 pt-6 md:flex-row md:items-center md:justify-between">
          <p className="text-xs text-white/90">
            © {year} ShareO · Todos os direitos reservados.
          </p>
          <div className="flex flex-wrap gap-3">
            <span className="flex items-center gap-1.5 rounded-md border border-white/20 px-3 py-1 text-xs font-semibold text-white">
              🔒 Pagamento seguro
            </span>
            <span className="flex items-center gap-1.5 rounded-md border border-white/20 px-3 py-1 text-xs font-semibold text-white">
              ✓ Usuários verificados
            </span>
            <span className="flex items-center gap-1.5 rounded-md border border-white/20 px-3 py-1 text-xs font-semibold text-white">
              🌿 Economia circular
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
