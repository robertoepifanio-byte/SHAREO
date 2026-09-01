import { FounderCaptureForm } from "./FounderCaptureForm"
import { PrelaunchBadge } from "./PrelaunchBadge"
import { ROTAS } from "@/lib/config"

/**
 * Prova social — vem da API do ShareO, não do banco.
 *
 * No app original isto era `prisma.founderLead.count()` com `unstable_cache` e
 * tag "founders", invalidada por `revalidateTag` na rota de captação. Aqui a
 * landing não tem banco: chama `/api/founders/stats`, que já faz exatamente essa
 * contagem com o mesmo cache de 300s do outro lado.
 *
 * Server-side de propósito: sem CORS (é servidor-para-servidor) e o número já
 * chega no HTML, sem piscar depois da hidratação.
 *
 * Falha fechada: qualquer erro devolve zeros, e zero esconde o bloco de prova
 * social (o limiar é 10). Prefiro a landing sem o número a mostrar "0 pessoas
 * na lista" numa campanha paga.
 */
async function getFounderCount(): Promise<{ total: number; thisWeek: number }> {
  try {
    const res = await fetch(ROTAS.stats, { next: { revalidate: 300 } })
    if (!res.ok) return { total: 0, thisWeek: 0 }
    const json = (await res.json()) as { data?: { total?: number; thisWeek?: number } }
    return { total: json.data?.total ?? 0, thisWeek: json.data?.thisWeek ?? 0 }
  } catch {
    return { total: 0, thisWeek: 0 }
  }
}

type Props = {
  /**
   * Nível do título da seção. Na home normal ela é uma seção entre outras (`h2`);
   * na home de pré-lançamento ela É a página, e precisa ser o `h1` — do contrário
   * o documento fica sem h1 (ou com dois), que a suíte de a11y acusa.
   */
  as?: "h1" | "h2"
  /**
   * Esconde o selo de pré-lançamento desta seção. Usado quando ele já aparece
   * no cabeçalho sticky da landing de campanha — mostrar nos dois lugares seria
   * repetição a poucos pixels de distância.
   *
   * Default `false` para a home de marketplace continuar exatamente como está:
   * lá não existe cabeçalho de campanha, e o selo tem que permanecer aqui.
   */
  hideBadge?: boolean
}

export async function ListaVIP({ as = "h2", hideBadge = false }: Props = {}) {
  const { total, thisWeek } = await getFounderCount()
  const showCount = total >= 10
  const Heading = as

  return (
    <section
      id="lista-vip"
      // scroll-mt-16 = altura do cabeçalho sticky (h-16). Sem isso, ao chegar
      // aqui por âncora (#lista-vip) o topo da seção fica escondido atrás dele.
      // Vale para as duas páginas: a landing e a home de marketplace têm
      // cabeçalho sticky da mesma altura.
      className="relative scroll-mt-16 overflow-hidden bg-gradient-to-br from-primary to-navy-deep px-6 py-16 text-center"
      aria-labelledby="vip-title"
    >
      {/* Orbe decorativo */}
      <div
        className="pointer-events-none absolute -right-20 -top-20 h-[400px] w-[400px] rounded-full bg-brand/[0.12]"
        aria-hidden="true"
      />

      <div className="relative z-10">
        {!hideBadge && <PrelaunchBadge className="mb-5" />}

        <Heading
          id="vip-title"
          className="mb-3 font-display text-[24px] font-extrabold leading-snug text-white xl:text-[32px]"
        >
          O Shareo está chegando.
          <br />
          <span className="text-accent">Entre na lista.</span>
        </Heading>

        <p className="mx-auto mb-9 max-w-[520px] text-[15px] leading-relaxed text-white/85">
          As cidades abrem por etapas, e as regiões com mais interessados entram
          primeiro. Você é avisado antes da abertura dos cadastros na sua cidade,
          com as condições especiais que planejamos oferecer aos primeiros
          anunciantes.
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
              <div className="text-xs leading-snug text-white/70">
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
              <div className="text-xs leading-snug text-white/70">
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
              <div className="text-xs leading-snug text-white/70">
                Você é avisado antes da abertura dos cadastros na sua cidade
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
              <div className="text-xs leading-snug text-white/70">
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
