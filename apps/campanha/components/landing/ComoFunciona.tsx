import { Secao, TituloSecao } from "./Secao"
import { ANCORAS, TRILHAS } from "@/lib/landing-content"

/**
 * As duas trilhas do produto, em paralelo.
 *
 * ⚠️ O título está no FUTURO ("vai funcionar") de propósito, e isso vale para
 * toda a página: nada está no ar. Descrever o serviço no presente seria anunciar
 * algo que ainda não existe (CDC art. 30/37). Com o enquadramento no título, os
 * passos podem descrever a mecânica sem prometer disponibilidade.
 *
 * As duas trilhas aparecem juntas, e não em abas, porque o visitante ainda não
 * decidiu de que lado está — e esconder metade da explicação atrás de um clique
 * seria pedir uma decisão antes de dar a informação que a fundamenta.
 */
const COR = {
  tem: "bg-brand text-white",
  precisa: "bg-blue-medium text-white",
}

export function ComoFunciona() {
  return (
    <Secao id={ANCORAS.comoFunciona} variante="navy" rotuladoPor="como-titulo">
      <div className="mb-9 max-w-[560px]">
        <TituloSecao id="como-titulo" sobreNavy className="mb-3">
          Como vai funcionar
        </TituloSecao>
        <p className="text-[15px] leading-relaxed text-white/85">
          É simples. Você tem algo. Alguém precisa. O ShareO conecta os dois.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {(["tem", "precisa"] as const).map((chave) => {
          const trilha = TRILHAS[chave]
          const cor = COR[chave]

          return (
            <div key={chave} className="rounded-2xl border border-white/[0.12] bg-white/[0.07] p-5 sm:p-6">
              <span
                className={`mb-5 inline-block rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-[0.6px] ${cor}`}
              >
                {trilha.etiqueta}
              </span>

              <ol className="grid gap-5 sm:grid-cols-2">
                {trilha.passos.map((passo, indice) => (
                  <li key={passo.titulo}>
                    <span
                      aria-hidden="true"
                      className={`mb-2.5 inline-flex h-8 w-8 items-center justify-center rounded-full font-display text-sm font-extrabold ${cor}`}
                    >
                      {indice + 1}
                    </span>
                    <h3 className="mb-1 text-sm font-bold text-white">{passo.titulo}</h3>
                    <p className="text-xs leading-relaxed text-white/75">{passo.texto}</p>
                  </li>
                ))}
              </ol>
            </div>
          )
        })}
      </div>
    </Secao>
  )
}
