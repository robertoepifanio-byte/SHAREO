import type { MetadataRoute } from "next"

const BASE    = process.env.NEXT_PUBLIC_CAMPANHA_URL ?? "http://localhost:3007"
const NOINDEX = process.env.NEXT_PUBLIC_NOINDEX === "true"

/**
 * Enquanto a campanha vive em subdomínio provisório, ela fica FORA do índice.
 *
 * Duas landings de captação indexadas ao mesmo tempo — esta e a que ainda sai
 * pelo gate do app principal — competem entre si pela mesma marca. Liberar só
 * quando esta assumir shareo.com.br, o que depende do D4.
 */
export default function robots(): MetadataRoute.Robots {
  if (NOINDEX) {
    return { rules: [{ userAgent: "*", disallow: "/" }] }
  }
  return {
    rules:   [{ userAgent: "*", allow: "/" }],
    sitemap: `${BASE}/sitemap.xml`,
  }
}
