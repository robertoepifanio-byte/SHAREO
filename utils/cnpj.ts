export function stripCNPJ(cnpj: string): string {
  return cnpj.replace(/\D/g, "")
}

export function formatCNPJ(cnpj: string): string {
  const d = stripCNPJ(cnpj)
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")
}

export function validateCNPJ(cnpj: string): boolean {
  const d = stripCNPJ(cnpj)
  if (d.length !== 14) return false
  // Rejeita sequências repetidas
  if (/^(\d)\1{13}$/.test(d)) return false

  const digits = d.split("").map(Number)

  const calc = (limit: number, weights: number[]): number => {
    const sum = digits
      .slice(0, limit)
      .reduce((acc, val, i) => acc + val * weights[i], 0)
    const rem = sum % 11
    return rem < 2 ? 0 : 11 - rem
  }

  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]

  return calc(12, w1) === digits[12] && calc(13, w2) === digits[13]
}
