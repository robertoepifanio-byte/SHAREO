import { ListaVIP } from "@/components/ListaVIP"
import { Secao } from "./Secao"
import { ARTE } from "@/lib/landing-content"

/**
 * Fechamento da página: a última frase antes do formulário.
 *
 * A faixa com a foto da cidade existe para dar escala ao argumento — "alguém
 * perto de você" é abstrato em texto e concreto sobre uma imagem de bairro. O
 * formulário vem logo abaixo, dentro da `ListaVIP`, que é o ÚNICO ponto de
 * captação da página.
 *
 * ⚠️ Copy sobre "pessoas" mora aqui, nunca dentro da ListaVIP: o teste dela usa
 * `queryByText(/pessoas/)` para provar que o contador de prova social some
 * abaixo do limiar de 10, e qualquer frase nova com essa palavra lá dentro
 * quebraria a suíte por um motivo que não tem nada a ver com o defeito real.
 */
export function Fechamento() {
  return (
    <>
      <Secao
        variante="navy"
        rotuladoPor="fechamento-titulo"
        className="relative isolate overflow-hidden"
      >
        {/*
          Imagem de fundo: `absolute inset-0 -z-10`, fora do fluxo. Por isso não
          há placeholder nem proporção a reservar — a caixa da seção é definida
          pelo texto, e a foto entrando depois não move nada.
        */}
        {ARTE.fotosProntas && (
          <img
            src="/campanha/cidade-1280.webp"
            srcSet="/campanha/cidade-640.webp 640w, /campanha/cidade-1280.webp 1280w"
            sizes="100vw"
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 -z-10 h-full w-full object-cover opacity-40"
          />
        )}

        <h2
          id="fechamento-titulo"
          className="max-w-[640px] font-display text-[22px] font-extrabold leading-snug text-white xl:text-[30px]"
        >
          O que está parado na sua casa pode estar sendo procurado por alguém perto de você.
        </h2>
      </Secao>

      <ListaVIP as="h2" hideBadge />
    </>
  )
}
