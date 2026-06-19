/**
 * Serializa um objeto para injeção segura em <script type="application/ld+json">.
 *
 * `JSON.stringify` NÃO escapa `<`, então um valor controlado pelo usuário
 * (ex.: título/descrição de item) contendo `</script>` quebraria o bloco e
 * permitiria XSS armazenado em página pública. Escapamos `<` `>` `&` e os
 * separadores de linha U+2028/U+2029 como escapes \uXXXX — todos válidos em
 * JSON, preservando a semântica do dado.
 *
 * Ref.: SEC-MIN-05 (auditoria s13).
 */
export function jsonLdScript(data: unknown): string {
  const lineSep = String.fromCharCode(0x2028)
  const paraSep = String.fromCharCode(0x2029)
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .split(lineSep).join("\\u2028")
    .split(paraSep).join("\\u2029")
}
