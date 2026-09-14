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
          A arte é uma panorâmica muito larga e baixa (2172×182). Esticá-la para
          cobrir a seção inteira com `object-cover` mostraria só o miolo — a
          moldura recortaria mais da metade da orla. Ancorada na base, em largura
          total e na proporção nativa, ela aparece inteira e funciona como linha
          de horizonte: o céu dela é navy e encosta no fundo da seção sem emenda.

          Fora do fluxo (`absolute`), então não há caixa a reservar nem CLS a
          evitar — a altura da seção vem do texto.
        */}
        {ARTE.cidade && (
          <img
            src="/campanha/cidade-1280.webp"
            srcSet="/campanha/cidade-1280.webp 1280w, /campanha/cidade-2172.webp 2172w"
            sizes="100vw"
            alt=""
            loading="lazy"
            decoding="async"
            className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 w-full opacity-60"
            /*
              Sem a máscara, o topo da faixa encosta no fundo da seção com uma
              linha horizontal dura: medido, o topo da arte é rgb(62,105,160) e
              o navy-deep é rgb(0,31,64) — 58 níveis de diferença no azul, que
              lê como falha de montagem. O degradê dissolve o céu da foto no
              fundo da seção e deixa só a orla iluminada.

              Vai em `style` porque é um efeito pontual: criar utilitário de
              máscara obrigaria editar o tailwind.config, que é cópia
              byte-idêntica da raiz e não deve divergir por causa de uma seção.
            */
            style={{
              maskImage: "linear-gradient(to bottom, transparent 0%, #000 55%)",
              WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, #000 55%)",
            }}
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
