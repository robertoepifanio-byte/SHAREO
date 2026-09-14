import { Secao, TituloSecao } from "./Secao"
import { EMBAIXADORES_NOTA, EMBAIXADOR_TIERS } from "@/lib/landing-content"

/**
 * Programa Embaixadores — substitui a arte aposentada.
 *
 * ⚠️ Dois cuidados que não são estéticos:
 *
 * 1. Os percentuais são 2/3/5. Material antigo circulou com 3/5/7, que está
 *    MORTO desde 12/08/2026 (getTierCommissionRateBp em lib/ambassador.ts é a
 *    fonte da verdade). Travado por teste.
 * 2. A nota sobre a base de cálculo NÃO é rodapé decorativo: o percentual
 *    incide sobre a comissão que a ShareO recebe, não sobre o valor do aluguel.
 *    Sem a nota, "5% das locações do seu indicado" lê como uma ordem de
 *    grandeza muito maior do que a real.
 *
 * Bloco curto de propósito: na campanha ainda não existe conta para indicar
 * ninguém, então isto é argumento de entrada na lista, não uma ação disponível.
 */
export function Embaixadores() {
  return (
    // O id é a âncora legada (ANCORAS_LEGADO): esta seção não tem âncora
    // própria, então ela mesma pode carregá-lo, sem elemento extra.
    <Secao id="programa-embaixadores" variante="clara" rotuladoPor="embaixadores-titulo">
      <div className="mb-7 max-w-[620px]">
        <TituloSecao id="embaixadores-titulo" className="mb-3">
          Indique um amigo e seja um Embaixador
        </TituloSecao>
        <p className="text-[15px] leading-relaxed text-muted-foreground">
          Quando a plataforma abrir, quem convidar amigos vai receber uma parte da comissão das
          locações de quem indicou. Quanto mais indicados ativos, maior a faixa.
        </p>
      </div>

      <ul className="grid gap-4 sm:grid-cols-3">
        {EMBAIXADOR_TIERS.map((tier) => (
          <li key={tier.nome} className="rounded-xl border border-border bg-surface p-5 text-center">
            <span className="mb-1 block text-sm font-bold uppercase tracking-[0.6px] text-muted-foreground">
              {tier.nome}
            </span>
            <span className="mb-1 block font-display text-[32px] font-extrabold leading-none text-brand">
              {tier.percentual}%
            </span>
            <span className="block text-xs text-muted-foreground">{tier.faixa}</span>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{EMBAIXADORES_NOTA}</p>
    </Secao>
  )
}
