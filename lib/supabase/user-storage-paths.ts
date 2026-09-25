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
