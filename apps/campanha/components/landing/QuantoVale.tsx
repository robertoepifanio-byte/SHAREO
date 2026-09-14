import { Secao, TituloSecao } from "./Secao"
import { CtaAncora } from "./CtaAncora"
import { ItemIcon } from "./icons/ItemIcon"
import { PRECOS, PRECOS_DISCLAIMER } from "@/lib/landing-content"

/**
 * Preços de referência por categoria.
 *
 * É a seção que responde "quanto isso me daria" — a pergunta que decide o
 * cadastro de quem tem itens parados. Por isso ela existe; e por isso ela é a
 * seção mais sensível da página do ponto de vista jurídico.
 *
 * Três travas deliberadas:
 * 1. São valores por DIÁRIA de referência, não projeção de ganho mensal. Uma
 *    projeção ("R$ X por mês") foi removida do produto por risco CDC art. 30/37.
 * 2. Os números vêm da tabela oficial (CATEGORY_DATA em app/ganhar) e estão
 *    travados por teste — o mockup trazia outros valores, que não bateriam com
 *    o que o próprio produto sugere ao anunciante no formulário de anúncio.
 * 3. O disclaimer é obrigatório e fica junto dos cards, não em nota de rodapé
 *    perdida: quem define o preço é o anunciante.
 *
 * Estática de propósito — uma calculadora aqui viraria Client Component e
 * transformaria referência em simulação de ganho.
 */
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

          <CtaAncora className="w-full sm:w-auto">Quero anunciar meu item</CtaAncora>
        </div>

        <div>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {PRECOS.map((categoria) => (
              <li
                key={categoria.slug}
                className="flex flex-col rounded-xl border border-border bg-surface p-4"
              >
                <ItemIcon name={categoria.icone} size={30} className="mb-3 text-primary" />
                <span className="text-sm font-bold text-foreground">{categoria.nome}</span>
                <span className="mb-2 text-xs leading-snug text-muted-foreground">
                  {categoria.exemplos}
                </span>
                {/* "cerca de", não "a partir de": a tabela oficial traz uma
                    diária de REFERÊNCIA, não um piso — e "a partir de" leria
                    como promessa de mínimo. */}
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
