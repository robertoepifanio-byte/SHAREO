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
            <p className="mt-3 text-sm text-white/70">
              Compartilhe. Economize. Sustentável.
            </p>
            <p className="mt-3 text-xs leading-relaxed text-white/50">
              <strong className="text-white/70">Marketplace de economia circular</strong>{" "}
              para aluguel de itens na sua região.
            </p>
            <p className="mt-1 text-xs leading-relaxed text-white/50">
              Transforme seus itens parados em{" "}
              <strong className="text-white/70">renda extra</strong>{" "}
              e facilite a vida de quem está ao seu redor.
            </p>
          </div>

          {/* Links */}
          <nav
            aria-label="Links do rodapé"
            className="grid grid-cols-2 gap-8 md:flex md:gap-12"
          >
            <div className="flex flex-col gap-2">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-white/40">
                Plataforma
              </p>
              <Link href="/itens"      className="text-sm text-white/75 hover:text-white transition-colors">Explorar itens</Link>
              <Link href="/itens/novo" className="text-sm text-white/75 hover:text-white transition-colors">Anunciar item</Link>
              <Link href="/reservas"   className="text-sm text-white/75 hover:text-white transition-colors">Minhas reservas</Link>
              <Link href="/mensagens"  className="text-sm text-white/75 hover:text-white transition-colors">Mensagens</Link>
            </div>

            <div className="flex flex-col gap-2">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-white/40">
                Conta
              </p>
              <Link href="/login"    className="text-sm text-white/75 hover:text-white transition-colors">Entrar</Link>
              <Link href="/cadastro" className="text-sm text-white/75 hover:text-white transition-colors">Criar conta</Link>
              <Link href="/perfil"   className="text-sm text-white/75 hover:text-white transition-colors">Meu perfil</Link>
            </div>
          </nav>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 flex flex-col gap-2 border-t border-white/20 pt-6 md:flex-row md:items-center md:justify-between">
          <p className="text-xs text-white/40">
            © {year} ShareO · Todos os direitos reservados.
          </p>
          <p className="text-xs text-white/40">
            Natal/RN · Use Mais. Possua Menos.
          </p>
        </div>
      </div>
    </footer>
  )
}
