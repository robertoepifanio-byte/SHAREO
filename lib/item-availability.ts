import type { ItemStatus } from "@prisma/client"

/**
 * Carimba `items.availableSince` quando — e só quando — o item ENTRA em
 * `AVAILABLE`.
 *
 * Existe como função, e não como três linhas repetidas nas rotas, porque a
 * regra é sutil: o que interessa não é o item estar disponível (o que é sempre
 * verdade para qualquer item listado, e por isso não é notícia), e sim ele ter
 * VOLTADO a ficar. Republicar um item já disponível não pode reiniciar a
 * contagem, senão qualquer edição de anúncio dispararia "voltou ao catálogo".
 *
 * Uso — espalhar no `data` do update, junto da mudança de status:
 *
 *   data: { status: next, ...availabilityPatch(item.status, next) }
 *
 * 🪤 Quem esquecer de chamar em um caminho novo causa e-mail A MENOS, nunca
 * e-mail errado: o gatilho exige `availableSince` recente, e null nunca casa.
 * É o lado certo de errar, mas continua sendo um esquecimento — os chamadores
 * estão listados abaixo para facilitar a busca.
 *
 * Chamado hoje em:
 *   • app/api/items/[id]/route.ts       — dono pausa/despausa o anúncio
 *   • app/api/admin/items/[id]/route.ts — aprovação/toggle pelo admin
 *
 * 🪤 DE FORA de propósito: `app/api/items/[id]/images/route.ts`. Remover a
 * última foto rebaixa o item para DRAFT, então trocar a foto de capa passa por
 * DRAFT → AVAILABLE em segundos — e carimbar ali anunciaria "voltou ao
 * catálogo" por causa de uma edição de anúncio.
 */
export function availabilityPatch(
  prev: ItemStatus | null | undefined,
  next: ItemStatus | null | undefined,
): { availableSince?: Date } {
  if (next !== "AVAILABLE") return {}
  if (prev === "AVAILABLE") return {}
  return { availableSince: new Date() }
}
