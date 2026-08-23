/**
 * Ponte entre o calendário de disponibilidade e o formulário de reserva.
 *
 * Os dois são Client Components IRMÃOS pendurados num Server Component
 * (`app/itens/[id]/page.tsx`), então não há como passar callback de um para o
 * outro nem estado compartilhado por props. Um evento no `window` é o caminho
 * mais direto sem transformar a página inteira em client.
 *
 * O nome do evento mora aqui, e não solto nos dois arquivos, porque um typo de
 * um lado quebraria em silêncio: o clique simplesmente não faria nada — que é
 * exatamente o defeito que isto veio consertar.
 */

export const EVENTO_SELECIONAR_RETIRADA = "shareo:selecionar-retirada"

/** Data no formato `YYYY-MM-DD`, o mesmo que o `<input type="date">` espera. */
export type DetalheSelecionarRetirada = { data: string }

export function selecionarRetirada(data: string): void {
  window.dispatchEvent(
    new CustomEvent<DetalheSelecionarRetirada>(EVENTO_SELECIONAR_RETIRADA, {
      detail: { data },
    }),
  )
}
