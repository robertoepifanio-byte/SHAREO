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
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">

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
            <div className="mt-5 flex items-center gap-2">
              <span className="text-[11px] text-white/50">Desenvolvido por</span>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-white/15 border border-white/20 px-2.5 py-1">
                <Image
                  src="/logos/pratike-ia-footer.png"
                  alt=""
                  width={30}
                  height={20}
                  className="object-contain h-5 w-auto"
                  aria-hidden="true"
                />
                <span className="text-xs font-semibold text-white tracking-wide">Pratika-IA</span>
              </span>
            </div>
          </div>

          {/* Links */}
          <nav
            aria-label="Links do rodapé"
            className="grid grid-cols-2 gap-8 md:flex md:gap-12"
          >
            <div className="flex flex-col gap-2">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-white/90">
                Plataforma
              </p>
              <Link href="/itens"      className="text-sm text-white/90 hover:text-white transition-colors">Explorar itens</Link>
              <Link href="/itens/novo" className="text-sm text-white/90 hover:text-white transition-colors">Anunciar item</Link>
              <Link href="/reservas"   className="text-sm text-white/90 hover:text-white transition-colors">Minhas reservas</Link>
              <Link href="/mensagens"  className="text-sm text-white/90 hover:text-white transition-colors">Mensagens</Link>
            </div>

            <div className="flex flex-col gap-2">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-white/90">
                Conta
              </p>
              <Link href="/login"    className="text-sm text-white/90 hover:text-white transition-colors">Entrar</Link>
              <Link href="/cadastro" className="text-sm text-white/90 hover:text-white transition-colors">Criar conta</Link>
              <Link href="/perfil"   className="text-sm text-white/90 hover:text-white transition-colors">Meu perfil</Link>
            </div>

            <div className="flex flex-col gap-2">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-white/90">
                Suporte
              </p>
              <Link href="/ajuda"           className="text-sm text-white/90 hover:text-white transition-colors">Central de ajuda</Link>
              <Link href="/ganhar"          className="text-sm text-white/90 hover:text-white transition-colors">Como ganhar</Link>
              <Link href="/termos"          className="text-sm text-white/90 hover:text-white transition-colors">Termos de uso</Link>
              <Link href="/privacidade"     className="text-sm text-white/90 hover:text-white transition-colors">Privacidade</Link>
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
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              Pagamento seguro
            </span>
            <span className="flex items-center gap-1.5 rounded-md border border-white/20 px-3 py-1 text-xs font-semibold text-white">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
              Usuários verificados
            </span>
            <span className="flex items-center gap-1.5 rounded-md border border-white/20 px-3 py-1 text-xs font-semibold text-white">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 22c-4-2-8-6-8-11V5l8-3 8 3v6c0 5-4 9-8 11z"/></svg>
              Economia circular
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
