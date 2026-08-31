/**
 * Compressão de imagem no navegador antes do upload — via <canvas>.
 *
 * Existe porque o Vercel recusa o corpo da requisição em ~4.5 MB (limite de
 * PLATAFORMA, "FUNCTION_PAYLOAD_TOO_LARGE", texto puro — não JSON), bem
 * abaixo do limite de 10 MB que o próprio app valida em
 * app/api/bookings/[id]/photos/route.ts. Foto tirada direto da câmera do
 * celular passa fácil de 4.5 MB; o upload nunca chegava a rodar a validação
 * da API, só a mensagem genérica "Erro ao enviar foto." (achado ao vivo,
 * relato do Thiago, 29/08/2026 — confirmado reproduzindo o 413 real contra
 * staging).
 *
 * Fonte única — antes existia uma cópia quase idêntica, sem o fallback de
 * segurança abaixo, só em app/perfil/_IdVerification.tsx (compressão de
 * documento/selfie da verificação de identidade). Redução progressiva de
 * qualidade (0.85 → 0.3) veio de lá; era estritamente melhor que a
 * passada única fixa da primeira versão desta função.
 *
 * HEIC/HEIF (padrão da câmera do iPhone) fica de fora de propósito: fora do
 * Safari, `<canvas>` não decodifica HEIC — tentar comprimir quebraria
 * silenciosamente em Chrome/Firefox. Passa a imagem original adiante; se for
 * grande demais, o usuário esbarra no erro normal de tamanho.
 */

const COMPRESSIBLE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])

export interface CompressImageOptions {
  maxDimension?: number // maior lado, em px (default 1920)
  maxSizeMB?:    number // reduz a qualidade até caber, ou até o piso (default 4)
}

/**
 * Retorna um novo `File` JPEG redimensionado/comprimido, ou o `file`
 * original sem alteração se o tipo não for suportado, se a compressão falhar
 * (imagem corrompida, decode não suportado) ou se o resultado não ficar
 * menor que o original. Nunca rejeita — pior caso, upload segue com o
 * arquivo original e a validação de tamanho do servidor decide.
 */
export async function compressImageIfNeeded(
  file: File,
  { maxDimension = 1920, maxSizeMB = 4 }: CompressImageOptions = {},
): Promise<File> {
  if (!COMPRESSIBLE_TYPES.has(file.type.toLowerCase())) return file

  try {
    const objectUrl = URL.createObjectURL(file)
    const img = new Image()

    const loaded = await new Promise<HTMLImageElement | null>((resolve) => {
      img.onload  = () => resolve(img)
      img.onerror = () => resolve(null)
      img.src = objectUrl
    })
    URL.revokeObjectURL(objectUrl)
    if (!loaded || loaded.naturalWidth === 0) return file

    const scale = Math.min(1, maxDimension / Math.max(loaded.naturalWidth, loaded.naturalHeight))
    const width  = Math.round(loaded.naturalWidth  * scale)
    const height = Math.round(loaded.naturalHeight * scale)

    const canvas = document.createElement("canvas")
    canvas.width  = width
    canvas.height = height
    const ctx = canvas.getContext("2d")
    if (!ctx) return file
    ctx.drawImage(loaded, 0, 0, width, height)

    // Reduz a qualidade em passos até caber em maxSizeMB, ou até o piso 0.3
    // (abaixo disso o ganho de tamanho não compensa mais a perda visual).
    const maxBytes = maxSizeMB * 1024 * 1024
    let quality = 0.85
    let blob: Blob | null = null
    while (quality > 0.25) {
      blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality))
      if (!blob) break
      if (blob.size <= maxBytes) break
      quality -= 0.1
    }
    if (!blob || blob.size >= file.size) return file

    const newName = file.name.replace(/\.[^.]+$/, "") + ".jpg"
    return new File([blob], newName, { type: "image/jpeg", lastModified: Date.now() })
  } catch {
    return file
  }
}
