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

        {/*
          Os 4 cards de benefício que ficavam aqui migraram para a seção
          Fundadores (components/landing/Fundadores.tsx) no redesenho de 09/2026:
          nesta posição eles ficavam entre a headline e o formulário, empurrando
          o primeiro campo para baixo justamente no ponto em que a pessoa já
          decidiu se cadastrar. O argumento agora vem antes, na página; aqui
          sobra só a conversão.
        */}

        {/*
          Mini-formulário de captação — folha client. Sempre expandido: este
          componente tem um único chamador em apps/campanha (PreLaunchHome,
          a landing que a mídia paga leva o visitante), e o botão intermediário
          "Quero ser avisado no lançamento" — mesma cor e peso visual do envio
          final — era um clique a mais sem função, só atrito. Ver
          apps/campanha/components/FounderCaptureForm.tsx (prop `startExpanded`).
        */}
        <FounderCaptureForm startExpanded />

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
