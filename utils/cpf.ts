export function stripCPF(cpf: string): string {
  return cpf.replace(/\D/g, "")
}

export function formatCPF(cpf: string): string {
  const d = stripCPF(cpf)
  return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4")
}

export function validateCPF(cpf: string): boolean {
  const d = stripCPF(cpf)
  if (d.length !== 11) return false
  // Rejeita sequências repetidas (000...0, 111...1, etc.)
  if (/^(\d)\1{10}$/.test(d)) return false

  const digits = d.split("").map(Number)

  const calc = (limit: number): number => {
    const sum = digits
      .slice(0, limit)
      .reduce((acc, val, i) => acc + val * (limit + 1 - i), 0)
    const rem = (sum * 10) % 11
    return rem === 10 ? 0 : rem
  }

  return calc(9) === digits[9] && calc(10) === digits[10]
}
