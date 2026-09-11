/**
 * Remove blocos de tag perigosos inteiros (com o conteúdo interno) e depois
 * qualquer tag remanescente. Usado em qualquer campo de texto livre que possa
 * acabar embutido em e-mail transacional (HTML não escapado por padrão em
 * `lib/email.ts`) ou em contexto que não seja JSX puro do React.
 */
export function stripHtml(input: string): string {
  return input
    .replace(/<(script|style|iframe|object|embed|svg|math)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<[^>]*>/g, "")
    .trim()
}
