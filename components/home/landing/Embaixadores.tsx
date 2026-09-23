// Fonte: apps/campanha/components/landing/Embaixadores.tsx
import { Secao, TituloSecao } from "./Secao"
import { EMBAIXADORES_NOTA, EMBAIXADOR_TIERS } from "@/lib/landing-content"

export function Embaixadores() {
  return (
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
