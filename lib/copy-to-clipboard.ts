/**
 * Copia texto para a área de transferência com fallback.
 *
 * navigator.clipboard.writeText lança NotAllowedError quando a permissão
 * é negada (iframe sem allow="clipboard-write", contexto não-seguro, etc.).
 * Nesses casos cai no fallback legado via execCommand("copy").
 *
 * @returns true se a cópia funcionou por qualquer um dos caminhos.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const el = document.createElement("textarea")
      el.value = text
      el.setAttribute("readonly", "")
      el.style.position = "fixed"
      el.style.opacity = "0"
      document.body.appendChild(el)
      el.select()
      const ok = document.execCommand("copy")
      document.body.removeChild(el)
      return ok
    } catch {
      return false
    }
  }
}
