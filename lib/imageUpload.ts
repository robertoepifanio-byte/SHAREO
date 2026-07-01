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
 * A2 (SEC-ALTO): mapa MIME → extensão de arquivo.
 * Extensão derivada do MIME já validado (isImageType + magic bytes), NUNCA do
 * nome do arquivo do cliente (evita salvar .php/.exe em buckets públicos ou privados).
 *
 * Fonte única para todas as rotas de upload:
 *   - app/api/upload/route.ts (antes: definição inline)
 *   - app/api/bookings/[id]/photos/route.ts (antes: file.name.split(".").pop())
 *   - app/api/users/me/id-verification/route.ts (antes: file.name.split(".").pop())
 */
export const EXT_BY_MIME: Readonly<Record<string, string>> = {
  "image/jpeg": "jpg",
  "image/jpg":  "jpg",
  "image/png":  "png",
  "image/webp": "webp",
  "image/gif":  "gif",
  "image/heic": "heic",
  "image/heif": "heif",
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
