// Fonte: apps/campanha/components/landing/Confianca.tsx
import { Secao, TituloSecao } from "./Secao"
import { UiIcon } from "./icons/UiIcon"
import { ANCORAS, PILARES } from "@/lib/landing-content"

export function Confianca() {
  return (
    <Secao id={ANCORAS.seguranca} variante="navy" rotuladoPor="seguranca-titulo">
      <div className="mb-9 max-w-[620px]">
        <TituloSecao id="seguranca-titulo" sobreNavy className="mb-3">
          E se eu emprestar meu item para um desconhecido?
        </TituloSecao>
        <p className="text-[15px] leading-relaxed text-white/85">
          O ShareO está sendo desenhado para tornar essa experiência mais segura e
          transparente para os dois lados.
        </p>
      </div>

      <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
        {PILARES.map((pilar) => (
          <li key={pilar.titulo} className="rounded-xl border border-white/[0.12] bg-white/[0.07] p-5">
            <span
              className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-brand/30 text-accent"
              aria-hidden="true"
            >
              <UiIcon name={pilar.icone} size={24} />
            </span>
            <h3 className="mb-1.5 text-sm font-bold text-white">{pilar.titulo}</h3>
            <p className="text-xs leading-relaxed text-white/75">{pilar.texto}</p>
          </li>
        ))}
      </ul>
    </Secao>
  )
}
