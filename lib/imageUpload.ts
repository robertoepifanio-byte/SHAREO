import { fileTypeFromBuffer } from "file-type"

/**
 * Whitelist de MIME types de imagem aceitos em uploads.
 *
 * Não usar `startsWith("image/")` (permitiria image/svg+xml → XSS) nem
 * aceitar `application/octet-stream` (qualquer binário). Validação em duas
 * camadas: Content-Type declarado + magic bytes reais do arquivo.
 *
 * Ref.: SEC-CRIT-05 / SEC-MAJ-02 / SEC-MAJ-03 (auditoria s13).
 */
export const ALLOWED_IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
])

export function isImageType(mimeType: string): boolean {
  return ALLOWED_IMAGE_MIMES.has(mimeType)
}

/**
 * Valida os magic bytes reais do buffer (file-type lê apenas ~12 bytes).
 * Retorna false se o tipo detectado não estiver na whitelist ou for
 * desconhecido — impede SVG/HTML/executável disfarçado de imagem alterando
 * somente o Content-Type declarado pelo cliente.
 */
export async function isMagicBytesValid(buffer: ArrayBuffer): Promise<boolean> {
  const detected = await fileTypeFromBuffer(buffer)
  if (!detected) return false
  return ALLOWED_IMAGE_MIMES.has(detected.mime)
}
