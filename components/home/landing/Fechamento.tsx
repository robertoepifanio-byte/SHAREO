// Fonte: apps/campanha/components/landing/Fechamento.tsx — troca o form
// (ListaVIP) por um CTA de Cadastro, a pedido do fundador (sem formulário de
// lead nesta home).
import { Secao } from "./Secao"
import { CtaCadastro } from "./CtaCadastro"

export function Fechamento() {
  return (
    <Secao
      variante="navy"
      rotuladoPor="fechamento-titulo"
      className="relative isolate overflow-hidden"
    >
      <img
        src="/campanha/cidade-1280.webp"
        srcSet="/campanha/cidade-1280.webp 1280w, /campanha/cidade-2172.webp 2172w"
        sizes="100vw"
        alt=""
        loading="lazy"
        decoding="async"
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 w-full opacity-60"
        style={{
          maskImage: "linear-gradient(to bottom, transparent 0%, #000 55%)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, #000 55%)",
        }}
      />

      <h2
        id="fechamento-titulo"
        className="mb-6 max-w-[640px] font-display text-[22px] font-extrabold leading-snug text-white xl:text-[30px]"
      >
        O que está parado na sua casa pode estar sendo procurado por alguém perto de você.
      </h2>

      <CtaCadastro className="w-full sm:w-auto">Quero me cadastrar</CtaCadastro>
    </Secao>
  )
}
