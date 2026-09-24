/**
 * lib/app-url.ts
 * Base URL pública da aplicação — fonte única para links em e-mails e redirects.
 *
 * Usa || (não ??) de propósito: env var definida como string vazia no Vercel
 * NÃO cai no fallback com ?? e gera links relativos quebrados nos e-mails.
 * Barras finais são removidas para evitar "//rota" (404 no App Router).
 *
 * Ordem: AUTH_URL → NEXTAUTH_URL → NEXT_PUBLIC_APP_URL → staging. As duas primeiras
 * são lidas em runtime; NEXT_PUBLIC_APP_URL é inlinada no build (deploy.yml), então
 * um valor de runtime sempre vence. Sem esse degrau, uma produção sem AUTH_URL
 * mandava links de e-mail e retornos do Stripe para o staging. Em builds sem a
 * variável (staging, PRs do Dependabot) o valor é ausente ou vazio e cai no último.
 */
export const APP_URL = (
  process.env.AUTH_URL ||
  process.env.NEXTAUTH_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://shareo-rouge.vercel.app"
).replace(/\/+$/, "")
