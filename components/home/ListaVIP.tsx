import { unstable_cache } from "next/cache"
import { prisma } from "@/lib/prisma"
import { FounderCaptureForm } from "./FounderCaptureForm"

const getFounderCount = unstable_cache(
  async () => {
    try {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      const [total, thisWeek] = await Promise.all([
        prisma.founderLead.count({ where: { deletedAt: null } }),
        prisma.founderLead.count({ where: { deletedAt: null, createdAt: { gte: weekAgo } } }),
      ])
      return { total, thisWeek }
    } catch {
      return { total: 0, thisWeek: 0 }
    }
  },
  ["founder-leads-count"],
  { revalidate: 300, tags: ["founders"] },
)

export async function ListaVIP() {
  const { total, thisWeek } = await getFounderCount()
  const showCount = total >= 10

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
        <div
          role="note"
          className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-amber-400/50 bg-amber-400/20 px-3.5 py-1.5 text-xs font-semibold text-amber-200"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          Pré-lançamento · Primeiros no Brasil
        </div>

        <h2
          id="vip-title"
          className="mb-3 font-display text-[24px] font-extrabold leading-snug text-white xl:text-[32px]"
        >
          Shareo está chegando.
          <br />
          <span className="text-accent">Entre na lista.</span>
        </h2>

        <p className="mx-auto mb-9 max-w-[520px] text-[15px] leading-relaxed text-white/85">
          Seja avisado em primeira mão quando lançarmos e conheça as condições
          especiais que planejamos oferecer aos primeiros anunciantes.
        </p>

        <div
          role="list"
          aria-label="Por que entrar na lista"
          className="mx-auto mb-9 grid max-w-[640px] grid-cols-1 gap-4 text-left xl:grid-cols-2"
        >
          <div role="listitem" className="flex items-start gap-3.5 rounded-xl border border-white/[0.12] bg-white/[0.07] p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/30 text-accent" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 6v2m0 8v2M9.5 9.5a2.5 2.5 0 0 1 5 0c0 1.5-2.5 3-2.5 3"/>
              </svg>
            </div>
            <div>
              <div className="mb-1 text-sm font-bold text-white">Condições especiais</div>
              <div className="text-xs leading-snug text-white/60">
                Os primeiros anunciantes terão reconhecimento exclusivo — detalhes no lançamento
              </div>
            </div>
          </div>

          <div role="listitem" className="flex items-start gap-3.5 rounded-xl border border-white/[0.12] bg-white/[0.07] p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/30 text-accent" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div>
              <div className="mb-1 text-sm font-bold text-white">Verificação de perfil gratuita</div>
              <div className="text-xs leading-snug text-white/60">
                Credibilidade desde o primeiro dia — sem custos adicionais
              </div>
            </div>
          </div>

          <div role="listitem" className="flex items-start gap-3.5 rounded-xl border border-white/[0.12] bg-white/[0.07] p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/30 text-accent" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
            </div>
            <div>
              <div className="mb-1 text-sm font-bold text-white">Acesso antecipado</div>
              <div className="text-xs leading-snug text-white/60">
                Você será avisado antes de todo mundo quando Shareo abrir na sua cidade
              </div>
            </div>
          </div>

          <div role="listitem" className="flex items-start gap-3.5 rounded-xl border border-white/[0.12] bg-white/[0.07] p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/30 text-accent" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </div>
            <div>
              <div className="mb-1 text-sm font-bold text-white">Primeiro a descobrir</div>
              <div className="text-xs leading-snug text-white/60">
                Novas funcionalidades chegam primeiro para quem está na lista
              </div>
            </div>
          </div>
        </div>

        {/* Mini-formulário de captação — folha client */}
        <FounderCaptureForm />

        {/* Social proof dinâmico — só com dados reais */}
        {showCount ? (
          <p className="mt-4 text-[13px] text-white/55">
            <strong className="text-white/85">
              {thisWeek > 0
                ? `${thisWeek} pessoas entraram esta semana`
                : `${total} pessoas já estão na lista`}
            </strong>{" "}
            no Brasil
          </p>
        ) : (
          <p className="mt-4 text-[13px] text-white/55">
            Seja um dos primeiros fundadores do Shareo no Brasil
          </p>
        )}
      </div>
    </section>
  )
}
