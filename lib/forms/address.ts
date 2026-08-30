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

/** Tempo máximo de espera pela resposta do ViaCEP antes de lançar. */
const VIACEP_TIMEOUT_MS = 5_000

/**
 * Consulta o ViaCEP. Aceita CEP com ou sem máscara.
 * - Retorna o endereço quando encontrado.
 * - Retorna `null` quando o CEP não existe (data.erro) ou não tem 8 dígitos.
 * - Lança em caso de falha de rede ou timeout de 5 s (tratar no chamador).
 *
 * Usa AbortController + setTimeout para o timeout: compatível com todos os
 * ambientes (browser, Node.js, Hermes). AbortSignal.timeout() não foi usado
 * porque não está disponível em todas as versões do Hermes em uso (RN ≤ 0.73).
 */
export async function fetchAddressByCep(cep: string): Promise<AddressFromCep | null> {
  const digits = cep.replace(/\D/g, "")
  if (digits.length !== 8) return null

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), VIACEP_TIMEOUT_MS)
  try {
    const res  = await fetch(`https://viacep.com.br/ws/${digits}/json/`, { signal: controller.signal })
    const data = (await res.json()) as ViaCepResponse
    if (data.erro) return null

    return {
      street:       data.logradouro || undefined,
      neighborhood: data.bairro     || undefined,
      city:         data.localidade || undefined,
      state:        data.uf         || undefined,
    }
  } finally {
    clearTimeout(timer)
  }
}
