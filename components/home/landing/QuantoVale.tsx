// Fonte: apps/campanha/components/landing/QuantoVale.tsx — CtaAncora vira CtaCadastro (/cadastro)
import { Secao, TituloSecao } from "./Secao"
import { CtaCadastro } from "./CtaCadastro"
import { ProcuradoIcon } from "@/components/home/icons/ProcuradoIcon"
import { PRECOS, PRECOS_DISCLAIMER } from "@/lib/landing-content"

export function QuantoVale() {
  return (
    <Secao variante="clara" rotuladoPor="quanto-titulo">
      <div className="grid gap-10 xl:grid-cols-[minmax(0,0.85fr)_1.4fr] xl:gap-14">
        <div>
          <TituloSecao id="quanto-titulo" className="mb-4">
            Quanto vale o que está parado?
          </TituloSecao>
          <p className="mb-2 text-[15px] leading-relaxed text-muted-foreground">
            Seu item pode estar parado. Seu dinheiro não precisa estar.
          </p>
          <p className="mb-6 text-[15px] font-semibold text-brand">Veja alguns exemplos:</p>

          <CtaCadastro className="w-full sm:w-auto">Quero anunciar meu item</CtaCadastro>
        </div>

        <div>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {PRECOS.map((categoria) => (
              <li
                key={categoria.slug}
                className="flex flex-col rounded-xl border border-border bg-surface p-4"
              >
                <ProcuradoIcon name={categoria.icone} size={30} className="mb-3 text-primary" />
                <span className="text-sm font-bold text-foreground">{categoria.nome}</span>
                <span className="mb-2 text-xs leading-snug text-muted-foreground">
                  {categoria.exemplos}
                </span>
                <span className="mt-auto font-display text-lg font-extrabold text-brand">
                  cerca de R$ {categoria.diaria}
                  <span className="text-xs font-bold text-muted-foreground">/dia</span>
                </span>
              </li>
            ))}
          </ul>

          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{PRECOS_DISCLAIMER}</p>
        </div>
      </div>
    </Secao>
  )
}
