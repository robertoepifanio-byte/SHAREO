// Fonte: lib/forms/masks.ts + lib/forms/address.ts (site)
//
// Espelho dos helpers de formulário do site. Mesmo motivo de lib/legalConfig.ts:
// o app não importa do pacote web (`@/*` do apps/mobile/tsconfig.json resolve só
// dentro de apps/mobile).
//
// 🪤 Antes deste arquivo, `maskCEP`, `maskPhone` e a consulta ao ViaCEP viviam
// copiados DENTRO das telas (app/perfil/endereco.tsx, app/perfil/editar.tsx).
// Cada tela nova que pedisse endereço fazia a próxima cópia — e foi assim que a
// captação de leads acabou com um formulário diferente do site.

/** Espelha maskCEP de lib/forms/masks.ts. Formata XXXXX-XXX. */
export function maskCEP(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 8)
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d
}

/** Espelha maskPhone de lib/forms/masks.ts. Formata (XX) XXXXX-XXXX. */
export function maskPhone(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11)
  if (d.length <= 2)  return d
  if (d.length <= 7)  return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

/**
 * Telefone em E.164 para envio, ou `undefined` se incompleto.
 *
 * O banco guarda `+5584999990000`, mesmo formato de `User.phone`. Menos de 10
 * dígitos é número pela metade — melhor não gravar do que gravar quebrado.
 * Transcrito do handleSubmit de components/home/FounderCaptureForm.tsx.
 */
export function phoneToE164(masked: string): string | undefined {
  const d = masked.replace(/\D/g, "")
  return d.length >= 10 ? `+55${d}` : undefined
}

/** Espelha AddressFromCep de lib/forms/address.ts. */
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
 * Espelha fetchAddressByCep de lib/forms/address.ts.
 *
 * - Devolve o endereço quando encontrado.
 * - Devolve `null` quando o CEP não existe (`data.erro`) ou não tem 8 dígitos.
 * - LANÇA em falha de rede.
 *
 * 🪤 Os três desfechos são caminhos de UX distintos, e é por isso que o `null`
 * e a exceção não foram unificados: "CEP não existe" pede correção do campo,
 * "sem rede" pede o preenchimento manual.
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
