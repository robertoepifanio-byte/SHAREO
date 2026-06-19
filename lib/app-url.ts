/**
 * lib/app-url.ts
 * Base URL pública da aplicação — fonte única para links em e-mails e redirects.
 *
 * Usa || (não ??) de propósito: env var definida como string vazia no Vercel
 * NÃO cai no fallback com ?? e gera links relativos quebrados nos e-mails.
 * Barras finais são removidas para evitar "//rota" (404 no App Router).
 */
export const APP_URL = (
  process.env.AUTH_URL ||
  process.env.NEXTAUTH_URL ||
  "https://shareo-rouge.vercel.app"
).replace(/\/+$/, "")
