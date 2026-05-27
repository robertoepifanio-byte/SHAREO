/**
 * Gera um slug único para a vitrine do usuário.
 * Formato: nome-normalizado-XXXXXX (6 últimos chars do ID)
 * Ex.: "Ferramentas do João" + "abc123xyz" → "ferramentas-do-joao-xyz"
 */
export function generateUserSlug(name: string, id: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFD")                        // decompõe acentos
    .replace(/[̀-ͯ]/g, "")        // remove diacríticos
    .replace(/[^a-z0-9\s-]/g, "")           // remove chars especiais
    .trim()
    .replace(/\s+/g, "-")                   // espaços → hífens
    .replace(/-+/g, "-")                    // hífens consecutivos → um
    .slice(0, 40)                            // máx 40 chars no prefixo

  const suffix = id.slice(-6)               // 6 últimos chars do cuid (sempre únicos)
  return `${base}-${suffix}`
}

/**
 * Valida se um slug customizado tem formato aceitável.
 * Aceita: letras minúsculas, números, hífens. Mín 3, máx 50 chars.
 */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(slug)
}
