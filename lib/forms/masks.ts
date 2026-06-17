// Máscaras de input compartilhadas entre formulários (cadastro completo, perfil/endereço).
// Extraídas do antigo RegisterForm para evitar duplicação.

export function maskCPF(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11)
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4")
}

export function maskCNPJ(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 14)
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3/$4")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, "$1.$2.$3/$4-$5")
}

export function maskCEP(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 8)
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d
}

export function maskPhone(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11)
  if (d.length <= 2)  return d
  if (d.length <= 7)  return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

/**
 * Exibe um telefone E.164 brasileiro SEM o código do país (+55), só DDD + número.
 * "+5584999990000" → "(84) 99999-0000". Preserva DDDs como 55 (só remove o 55 de país).
 */
export function displayPhone(value: string | null | undefined): string {
  if (!value) return ""
  let d = value.replace(/\D/g, "")
  if (d.startsWith("55") && d.length > 11) d = d.slice(2) // remove o código do país (+55)
  return maskPhone(d)
}
