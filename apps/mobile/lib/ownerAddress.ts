// Fonte: lib/ownerAddress.ts (web) — espelho literal.
// ⚠️ Ao alterar a regra aqui, atualizar também lib/ownerAddress.ts. Mesmo
// acordo de `apps/mobile/lib/pricing.ts`: o app tem tsconfig próprio e não
// importa do web, então "reusar" significa espelhar e manter os dois em sincronia.
/**
 * Endereço de retirada do proprietário.
 *
 * Por que existe: a tela da reserva mostrava "Natal — RN" como LOCAL DE RETIRADA
 * com a advertência "a retirada deve ocorrer exclusivamente neste endereço. Não
 * aceite outro local." — mandando o locatário a uma cidade inteira e o
 * instruindo a recusar alternativas.
 *
 * A causa era o formatador aceitar cidade+estado como "tem endereço". Todo
 * usuário tem cidade (o cadastro pede); quase nenhum tem rua — em 22/08/2026,
 * 41 dos 46 donos de item do staging não tinham `street`.
 *
 * 🪤 O fallback correto ("combine pelo chat") já existia nas duas telas — só
 * nunca era alcançado, porque o formatador nunca devolvia `null`.
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

/** Endereço em uma linha, ou `null` quando não dá para chegar até ele. */
export function formatPickupAddress(owner: OwnerAddressFields | null | undefined): string | null {
  if (!hasPickupAddress(owner)) return null

  const partes: string[] = [owner.street.trim()]
  if (owner.neighborhood) partes.push(owner.neighborhood)
  if (owner.city && owner.state) partes.push(`${owner.city} — ${owner.state}`)
  else if (owner.city) partes.push(owner.city)
  if (owner.cep) partes.push(`CEP ${owner.cep.replace(/\D/g, "").replace(/(\d{5})(\d{3})/, "$1-$2")}`)

  return partes.join(", ")
}
