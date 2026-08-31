import type { MetadataRoute } from "next"
import { BASE_URL, NOINDEX_ENABLED } from "@/lib/seo"

/**
 * Enquanto `NEXT_PUBLIC_NOINDEX` estiver ligada, a landing fica FORA do índice.
 *
 * O motivo original era o subdomínio provisório: duas landings de captação
 * indexadas ao mesmo tempo — esta e a que saía pelo gate do app principal —
 * competiriam entre si pela mesma marca. Ao assumir shareo.com.br a flag sai e
 * esta passa a ser a página canônica da marca.
 *
 * A URL anunciada aqui é respondida por `app/sitemap.ts`, que lê a MESMA
 * origem — ver `lib/seo.ts`.
 */
export default function robots(): MetadataRoute.Robots {
  if (NOINDEX_ENABLED) {
    return { rules: [{ userAgent: "*", disallow: "/" }] }
  }
  return {
    rules:   [{ userAgent: "*", allow: "/" }],
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
