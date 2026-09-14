import { ItemIcon, type ItemIconName } from "./icons/ItemIcon"

/**
 * Ocupa o lugar de uma arte que ainda não foi entregue.
 *
 * O ponto não é "ficar bonito enquanto isso": é reservar EXATAMENTE a mesma
 * caixa que a imagem final vai ocupar, para que trocar o placeholder pela arte
 * não mova mais nada na página (CLS zero). Por isso `aspecto` é obrigatório e
 * deve receber as mesmas classes `aspect-[…]` que o <picture> definitivo usará.
 *
 * Enquanto as flags de `ARTE` (lib/landing-content.ts) estiverem `false`, é
 * isto que a página renderiza. Nenhum request de rede é feito aqui.
 */
export function ArtePlaceholder({
  aspecto,
  icones = [],
  className = "",
}: {
  aspecto: string
  icones?: ItemIconName[]
  className?: string
}) {
  return (
    <div
      aria-hidden="true"
      className={`relative flex w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-primary to-navy-deep ${aspecto} ${className}`}
    >
      <div className="flex flex-wrap items-center justify-center gap-5 p-6 text-white/25">
        {icones.map((icone) => (
          <ItemIcon key={icone} name={icone} size={44} />
        ))}
      </div>
    </div>
  )
}
