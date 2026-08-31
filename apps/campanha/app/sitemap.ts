import type { MetadataRoute } from "next"
import { BASE_URL, NOINDEX_ENABLED } from "@/lib/seo"

/**
 * Sitemap da landing — uma única rota, que é a landing inteira.
 *
 * Existe porque `robots.ts` já anunciava `${BASE_URL}/sitemap.xml` desde o
 * primeiro commit sem que o arquivo existisse: enquanto o noindex ficou ligado
 * ninguém leu o robots e o 404 passou despercebido. Ao assumir shareo.com.br a
 * flag sai, e aquele anúncio passaria a mandar o Google para uma página que não
 * existe — logo no início da campanha paga.
 *
 * Com o noindex ligado o sitemap vem VAZIO, e não com a home dentro: listar uma
 * URL que o robots proíbe é sinal contraditório para o rastreador.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  if (NOINDEX_ENABLED) return []
  return [
    {
      url:             BASE_URL,
      lastModified:    new Date(),
      changeFrequency: "weekly",
      priority:        1,
    },
  ]
}
