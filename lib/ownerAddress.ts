/**
 * Endereço de retirada do proprietário.
 *
 * Por que existe: a tela da reserva mostrava "Natal — RN" como LOCAL DE RETIRADA,
 * acompanhado de "a retirada deve ocorrer exclusivamente neste endereço, não
 * aceite outro local". Ou seja, mandava o locatário a uma cidade inteira e ainda
 * o instruía a recusar qualquer alternativa — pior do que não mostrar nada,
 * porque dá autoridade a uma informação inútil.
 *
 * A causa era o formatador aceitar cidade+estado como "tem endereço". Todo
 * usuário tem cidade (o cadastro pede); quase nenhum tem rua — em 22/08/2026,
 * 41 dos 46 donos de item do staging (89%) estavam sem `street`.
 *
 * REGRA DE PRODUTO (fundadores, 22/08/2026): endereço completo **não** é
 * exigência de cadastro. Vira exigência no momento em que o proprietário tem uma
 * locação — daí o guard em `confirm` (app/api/bookings/[id]/route.ts). Quem só
 * navega ou anuncia não é incomodado.
 */

export interface OwnerAddressFields {
  cep?:          string | null
  street?:       string | null
  neighborhood?: string | null
  city?:         string | null
  state?:        string | null
}

/**
 * O endereço serve para alguém CHEGAR até lá?
 *
 * A rua é o mínimo inegociável: sem ela não há destino, só uma região. Número
 * não é exigido — muitos endereços legítimos não têm (s/n, zona rural), e o
 * complemento costuma ser combinado pelo chat de qualquer forma.
 */
export function hasPickupAddress<T extends OwnerAddressFields>(
  owner: T | null | undefined,
): owner is T & { street: string } {
  return Boolean(owner?.street?.trim())
}

/**
 * Remove o endereço do proprietário quando quem lê ainda não tem direito a ele.
 *
 * 🪤 O `GET /api/bookings/[id]` selecionava `cep`/`street`/`neighborhood` sem
 * nenhuma condição: bastava criar uma reserva — que o dono nem precisa aceitar —
 * e ler a API para obter o endereço residencial de qualquer anunciante. As duas
 * telas do produto escondem isso até `paymentStatus === "PAID"`, mas a API não,
 * e a API é o que um script lê.
 *
 * O projeto já tem essa postura em `GET /api/items/[id]`, que zera `address` e
 * trunca as coordenadas para quem não é o dono. Aqui ela faltava.
 *
 * `city`/`state` continuam sempre visíveis — já aparecem no anúncio público.
 *
 * Quem vê o endereço completo:
 *   - o próprio proprietário (é o dado dele)
 *   - o locatário, só depois de pagar
 */
export function redactOwnerAddress<T extends OwnerAddressFields>(
  owner: T,
  { isOwner, isPaid }: { isOwner: boolean; isPaid: boolean },
): T {
  if (isOwner || isPaid) return owner
  return { ...owner, cep: null, street: null, neighborhood: null }
}

/** Endereço em uma linha, ou `null` quando não dá para chegar até ele. */
export function formatPickupAddress(owner: OwnerAddressFields | null | undefined): string | null {
  if (!hasPickupAddress(owner)) return null

  const partes: string[] = [owner.street.trim()]
  if (owner.neighborhood) partes.push(owner.neighborhood)
  if (owner.city && owner.state) partes.push(`${owner.city} — ${owner.state}`)
  else if (owner.city) partes.push(owner.city)
  // Normaliza antes de mascarar: CEP vindo com hífen ou lixo não passaria pela regex.
  if (owner.cep) partes.push(`CEP ${owner.cep.replace(/\D/g, "").replace(/(\d{5})(\d{3})/, "$1-$2")}`)

  return partes.join(", ")
}
