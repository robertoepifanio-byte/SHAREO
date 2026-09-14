import { Secao, TituloSecao } from "./Secao"
import { CtaAncora } from "./CtaAncora"
import { UiIcon } from "./icons/UiIcon"
import {
  ANCORAS,
  FUNDADORES_BENEFICIOS,
  FUNDADORES_CHAMADA,
  FUNDADORES_VAGAS,
} from "@/lib/landing-content"

/**
 * Programa Fundadores.
 *
 * Substitui a arte que ocupava este lugar (banner .webp com todo o texto dentro
 * da imagem, ~150 KB). Em HTML o texto escala com a fonte do sistema, é
 * traduzível, indexável e legível por leitor de tela sem depender de um `alt`
 * de 900 caracteres transcrevendo a arte.
 *
 * ⚠️ Nenhum benefício aqui é quantificado em dinheiro. A arte antiga citava
 * "taxa reduzida", mas não existe percentual definido em lugar nenhum do código
 * — e inventar um número criaria promessa financeira sem lastro. O teste em
 * __tests__/unit/lib/landing-content.test.ts trava isso.
 *
 * O id `programa-fundadores` fica como alias: era a âncora do banner aposentado
 * e pode estar em anúncio já publicado.
 */
export function Fundadores() {
  return (
    <Secao id={ANCORAS.fundadores} variante="suave" rotuladoPor="fundadores-titulo">
      {/* Âncora legada (ANCORAS_LEGADO). Precisa de elemento próprio: a
          <Secao> já carrega `fundadores`, e um elemento tem um id só. */}
      <div id="programa-fundadores" className="scroll-mt-16" />

      <div className="grid gap-8 rounded-2xl border border-border bg-surface p-6 sm:p-8 xl:grid-cols-[1.1fr_1fr] xl:gap-12">
        <div>
          <span
            className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-brand"
            aria-hidden="true"
          >
            <UiIcon name="foguete" size={26} />
          </span>

          <TituloSecao id="fundadores-titulo" className="mb-3">
            Faça parte do grupo fundador do ShareO
          </TituloSecao>

          <p className="mb-4 text-[15px] leading-relaxed text-muted-foreground">
            {FUNDADORES_CHAMADA}
          </p>

          <p className="mb-6 text-[15px] font-semibold text-foreground">
            São {FUNDADORES_VAGAS.toLocaleString("pt-BR")} vagas para os primeiros usuários a
            entrar na lista.
          </p>

          <CtaAncora className="w-full sm:w-auto">Quero ser um fundador</CtaAncora>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-[0.6px] text-muted-foreground">
            Você vai ter
          </h3>

          <ul className="grid gap-3">
            {FUNDADORES_BENEFICIOS.map((beneficio) => (
              <li key={beneficio} className="flex items-start gap-3">
                <span
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand"
                  aria-hidden="true"
                >
                  <UiIcon name="check" size={13} />
                </span>
                <span className="text-sm leading-relaxed text-foreground">{beneficio}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Secao>
  )
}
