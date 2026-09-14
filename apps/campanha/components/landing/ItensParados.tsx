import { Secao, TituloSecao } from "./Secao"
import { ItemIcon } from "./icons/ItemIcon"
import { CATEGORIAS_EXTRA_ROTULO, ITENS_PARADOS_EXEMPLOS, PRECOS } from "@/lib/landing-content"

/**
 * O gancho de identificação. Deliberadamente sem CTA.
 *
 * É a única seção da página que não pede nada: o objetivo é a pessoa se
 * reconhecer na descrição ("eu tenho uma furadeira parada") antes de ouvir
 * qualquer proposta. Pedir o cadastro aqui atropelaria esse reconhecimento —
 * que é justamente o que faltava na landing anterior, onde o formulário vinha
 * antes de qualquer explicação.
 *
 * Os chips mostram as 6 categorias REAIS do produto. O mockup trazia "Veículos",
 * "Equipamentos", "Câmeras" e "Som e imagem", que não existem no banco do
 * ShareO — anunciá-las criaria expectativa de um catálogo inexistente.
 */
export function ItensParados() {
  return (
    <Secao variante="clara" rotuladoPor="parados-titulo">
      <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_1.15fr] xl:gap-14">
        <div>
          <TituloSecao id="parados-titulo" className="mb-4">
            Quantas coisas você tem que ficam{" "}
            <span className="text-brand">paradas</span> a maior parte do tempo?
          </TituloSecao>

          <p className="mb-3 text-[15px] font-semibold text-foreground">
            {ITENS_PARADOS_EXEMPLOS}
          </p>

          <p className="mb-3 text-[15px] leading-relaxed text-muted-foreground">
            Você comprou. Usou algumas vezes. E agora…{" "}
            <span className="font-bold text-brand">está parado.</span>
          </p>

          <p className="mb-3 text-[15px] leading-relaxed text-muted-foreground">
            Enquanto isso, alguém perto de você pode estar precisando exatamente desse item.
          </p>

          <p className="text-[15px] font-bold text-foreground">
            O ShareO vai conectar essas duas pessoas.
          </p>
        </div>

        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:gap-4">
          {PRECOS.map((categoria) => (
            <li
              key={categoria.slug}
              className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-surface p-4 text-center"
            >
              <ItemIcon name={categoria.icone} size={32} className="text-primary" />
              <span className="text-xs font-bold text-foreground">{categoria.nome}</span>
            </li>
          ))}

          <li className="flex items-center justify-center rounded-xl border border-dashed border-border bg-surface-muted p-4 text-center text-xs font-bold text-muted-foreground">
            {CATEGORIAS_EXTRA_ROTULO}
          </li>
        </ul>
      </div>
    </Secao>
  )
}
