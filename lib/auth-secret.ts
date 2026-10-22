/**
 * Chave HS256 dos JWTs Bearer do app mobile. Lança se AUTH_SECRET faltar.
 *
 * 🪤 Nunca usar `process.env.AUTH_SECRET ?? ""`: o jose ACEITA um JWT assinado
 * com chave vazia, então qualquer um forjaria o `sub` de outro usuário. A
 * variável já ficou ausente em prod por 25 dias sem erro algum — por isso o
 * console.error, que torna a falha visível nos logs da Vercel.
 */
export function authSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET
  if (!secret) {
    console.error("[auth] AUTH_SECRET ausente — Bearer rejeitado")
    throw new Error("AUTH_SECRET not set")
  }
  return new TextEncoder().encode(secret)
}
