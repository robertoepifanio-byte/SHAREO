/**
 * lib/supabase/user-storage-paths.ts — prefixos de Storage que levam o userId no caminho.
 *
 * Fonte ÚNICA: quem grava (rotas de upload) e quem apaga (lib/supabase/purge-user-storage.ts)
 * chamam estas funções. Foi o drift entre os dois lados que deixou o documento e a
 * selfie do titular no bucket depois da exclusão da conta — ver o helper de purge.
 * Sem dependências: pode ser importado por qualquer rota e pelos testes sem puxar SDK.
 */

/** Bucket `id-docs` (privado): `<prefixo>/document-<ts>.<ext>` e `<prefixo>/selfie-<ts>.<ext>`. */
export const idVerificationPrefix = (userId: string) => `id-verification/${userId}`

/** Buckets `item-images` e `booking-photos` (POST /api/upload): `<prefixo>/<ts>.<ext>`. */
export const uploadPrefix = (userId: string) => `uploads/${userId}`

/**
 * Bucket `item-images`: pasta de um anúncio (POST /api/items/[id]/images).
 * O caminho gravado é `<itemId>/<filename>`, então o prefixo é o próprio ID do item.
 * Usado na exclusão de conta para apagar todas as fotos dos anúncios do titular.
 */
export const itemImagesPrefixo = (itemId: string) => itemId

/**
 * Extrai o caminho relativo ao bucket a partir de uma URL pública do Supabase Storage.
 * Retorna null se a URL não pertencer ao bucket informado.
 *
 * Exemplo:
 *   storagePathFromUrl(
 *     "https://xyz.supabase.co/storage/v1/object/public/booking-photos/bookings/b1/checkin/foto.jpg",
 *     "booking-photos",
 *   ) → "bookings/b1/checkin/foto.jpg"
 */
export function storagePathFromUrl(url: string, bucket: string): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`
  const i = url.indexOf(marker)
  return i >= 0 ? url.slice(i + marker.length) : null
}
