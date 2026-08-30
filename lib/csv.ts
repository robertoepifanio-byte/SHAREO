/**
 * Geração de CSV compartilhada entre as exportações administrativas.
 *
 * Extraído de `app/api/admin/export/route.ts`, onde vivia como função local não
 * exportada, quando a exportação de interessados da campanha passou a precisar da
 * mesma lógica. A regra de escape é a parte que NÃO pode ser reimplementada por
 * cópia — ver S14-SEC-06 abaixo.
 */

/**
 * Escapa uma célula de CSV.
 *
 * Além do escape padrão de vírgula/aspas/quebra de linha, neutraliza **CSV formula
 * injection** (S14-SEC-06): uma célula iniciada por `=`, `+`, `-`, `@`, TAB ou CR é
 * interpretada como fórmula pelo Excel/Sheets ao abrir o arquivo. Um título de item
 * como `=cmd|...` executaria na máquina do admin que abrisse a planilha. O prefixo
 * com apóstrofo força o tratamento como texto.
 */
function escapeCell(v: unknown): string {
  let s = v == null ? "" : String(v)
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s
  return s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")
    ? `"${s.replace(/"/g, '""')}"`
    : s
}

/**
 * Converte linhas homogêneas em CSV (CRLF, cabeçalho derivado da 1ª linha).
 * Retorna string vazia para entrada vazia.
 */
export function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ""
  const headers = Object.keys(rows[0])
  const lines = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escapeCell(r[h])).join(",")),
  ]
  return lines.join("\r\n")
}

/**
 * BOM UTF-8. Sem ele o Excel em pt-BR abre o arquivo em ANSI e exibe "São Paulo"
 * como "SÃ£o Paulo". Prefixar no corpo da resposta, não no header.
 */
export const CSV_BOM = "﻿"

/** Centavos → decimal simples ("1234.56"), sem símbolo de moeda — pra célula numérica de planilha. */
export function centsToCsvDecimal(cents: number | null | undefined): string {
  return cents == null ? "" : (cents / 100).toFixed(2)
}
