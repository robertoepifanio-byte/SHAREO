// Auto-preenchimento de endereço via ViaCEP — compartilhado entre cadastro completo e perfil.
// O domínio viacep.com.br precisa estar no connect-src do CSP (middleware.ts).

export interface AddressFromCep {
  street?:       string
  neighborhood?: string
  city?:         string
  state?:        string
}

interface ViaCepResponse {
  erro?:       boolean
  logradouro?: string
  bairro?:     string
  localidade?: string
  uf?:         string
}

/**
 * Consulta o ViaCEP. Aceita CEP com ou sem máscara.
 * - Retorna o endereço quando encontrado.
 * - Retorna `null` quando o CEP não existe (data.erro) ou não tem 8 dígitos.
 * - Lança em caso de falha de rede (tratar no chamador).
 */
export async function fetchAddressByCep(cep: string): Promise<AddressFromCep | null> {
  const digits = cep.replace(/\D/g, "")
  if (digits.length !== 8) return null

  const res  = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
  const data = (await res.json()) as ViaCepResponse
  if (data.erro) return null

  return {
    street:       data.logradouro || undefined,
    neighborhood: data.bairro     || undefined,
    city:         data.localidade || undefined,
    state:        data.uf         || undefined,
  }
}
