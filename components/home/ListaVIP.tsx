import Link from "next/link"

export function ListaVIP() {
  return (
    <section
      id="lista-vip"
      className="relative overflow-hidden bg-gradient-to-br from-primary to-[#001f40] px-6 py-16 text-center"
      aria-labelledby="vip-title"
    >
      {/* Orbe decorativo */}
      <div
        className="pointer-events-none absolute -right-20 -top-20 h-[400px] w-[400px] rounded-full bg-brand/[0.12]"
        aria-hidden="true"
      />

      <div className="relative z-10">
        {/* Urgency badge */}
        <div
          role="note"
          className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-[rgba(245,158,11,0.4)] bg-[rgba(245,158,11,0.15)] px-3.5 py-1.5 text-xs font-semibold text-[#92400E]"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          Vagas limitadas · Apenas para os primeiros
        </div>

        {/* H2 */}
        <h2
          id="vip-title"
          className="mb-3 font-display text-[24px] font-extrabold leading-snug text-white xl:text-[32px]"
        >
          Cadastre-se agora e faça parte
          <br />
          <span className="text-accent">dos fundadores SHAREO</span>
        </h2>

        {/* Sub */}
        <p className="mx-auto mb-9 max-w-[520px] text-[15px] leading-relaxed text-white/70">
          Os primeiros proprietários a se cadastrar têm acesso a benefícios exclusivos e
          permanentes que não estarão disponíveis depois.
        </p>

        {/* Benefits grid */}
        <div
          role="list"
          aria-label="Benefícios exclusivos para fundadores"
          className="mx-auto mb-9 grid max-w-[640px] grid-cols-1 gap-4 text-left xl:grid-cols-2"
        >
          {/* Benefício 1: Taxa */}
          <div
            role="listitem"
            className="flex items-start gap-3.5 rounded-xl border border-white/[0.12] bg-white/[0.07] p-4"
          >
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/30 text-accent"
              aria-hidden="true"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v2m0 8v2M9.5 9.5a2.5 2.5 0 0 1 5 0c0 1.5-2.5 3-2.5 3" />
              </svg>
            </div>
            <div>
              <div className="mb-1 text-sm font-bold text-white">Taxa promocional</div>
              <div className="text-xs leading-snug text-white/60">
                Comissão reduzida permanentemente para fundadores
              </div>
            </div>
          </div>

          {/* Benefício 2: Verificado */}
          <div
            role="listitem"
            className="flex items-start gap-3.5 rounded-xl border border-white/[0.12] bg-white/[0.07] p-4"
          >
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/30 text-accent"
              aria-hidden="true"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div>
              <div className="mb-1 text-sm font-bold text-white">Perfil verificado gratuito</div>
              <div className="text-xs leading-snug text-white/60">
                Sem custo de verificação — credibilidade desde o primeiro dia
              </div>
            </div>
          </div>

          {/* Benefício 3: Destaque */}
          <div
            role="listitem"
            className="flex items-start gap-3.5 rounded-xl border border-white/[0.12] bg-white/[0.07] p-4"
          >
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/30 text-accent"
              aria-hidden="true"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <div>
              <div className="mb-1 text-sm font-bold text-white">Destaque nos resultados</div>
              <div className="text-xs leading-snug text-white/60">
                Seus anúncios aparecem primeiro nas buscas da sua região
              </div>
            </div>
          </div>

          {/* Benefício 4: Acesso antecipado */}
          <div
            role="listitem"
            className="flex items-start gap-3.5 rounded-xl border border-white/[0.12] bg-white/[0.07] p-4"
          >
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/30 text-accent"
              aria-hidden="true"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </div>
            <div>
              <div className="mb-1 text-sm font-bold text-white">Benefícios exclusivos</div>
              <div className="text-xs leading-snug text-white/60">
                Acesso antecipado a novas funcionalidades e suporte prioritário
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <Link
          href="/cadastro"
          className="inline-flex min-h-tap w-full items-center justify-center gap-2 rounded-lg bg-brand px-10 py-4 text-base font-semibold uppercase tracking-[0.5px] text-white transition-colors hover:bg-brand-hover xl:w-auto xl:min-w-[260px]"
          aria-label="Entrar na lista VIP de fundadores do ShareO"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          Entrar na Lista VIP
        </Link>

        {/* Social proof */}
        <p className="mt-4 text-[13px] text-white/55">
          <strong className="text-white/85">247 proprietários</strong> já entraram na lista esta
          semana
        </p>
      </div>
    </section>
  )
}
