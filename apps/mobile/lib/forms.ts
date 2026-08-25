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

/** Espelha maskCPF de lib/forms/masks.ts. Formata XXX.XXX.XXX-XX. */
export function maskCPF(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11)
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4")
}

/** Espelha maskCNPJ de lib/forms/masks.ts. Formata XX.XXX.XXX/XXXX-XX. */
export function maskCNPJ(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 14)
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3/$4")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, "$1.$2.$3/$4-$5")
}

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

/** Espelha VIACEP_TIMEOUT_MS de lib/forms/address.ts. */
const VIACEP_TIMEOUT_MS = 5_000

/**
 * Espelha fetchAddressByCep de lib/forms/address.ts.
 *
 * - Devolve o endereço quando encontrado.
 * - Devolve `null` quando o CEP não existe (`data.erro`) ou não tem 8 dígitos.
 * - LANÇA em falha de rede ou timeout de 5 s (tratar no chamador).
 *
 * 🪤 Os três desfechos são caminhos de UX distintos, e é por isso que o `null`
 * e a exceção não foram unificados: "CEP não existe" pede correção do campo,
 * "sem rede" pede o preenchimento manual.
 *
 * Usa AbortController + setTimeout para o timeout: compatível com Hermes (RN
 * 0.71+). AbortSignal.timeout() não foi usado porque não está disponível em
 * todas as versões do Hermes — ver apps/mobile/package.json.
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
