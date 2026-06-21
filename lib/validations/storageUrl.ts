/**
 * SEC-ALTO-04 — aceita SÓ fotos hospedadas no nosso Storage público (Supabase).
 *
 * Evita `photoUrl` arbitrária (tracking pixel, phishing, conteúdo de terceiros
 * servido pelo IP da plataforma) em disputas e avaliações. As URLs legítimas vêm de
 * `supabase.storage.from(bucket).getPublicUrl(path)` =
 *   `${NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/<bucket>/<path>`.
 */
export function isOwnStoragePhotoUrl(url: string): boolean {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) return false
  return url.startsWith(`${base.replace(/\/$/, "")}/storage/v1/object/public/`)
}
