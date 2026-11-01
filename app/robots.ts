import type { MetadataRoute } from "next"
import { NOINDEX_ENABLED } from "@/lib/seo-flags"
import { APP_URL } from "@/lib/app-url"

const BASE = APP_URL

export default function robots(): MetadataRoute.Robots {
  // Staging: bloqueio total. Sem isso o Google indexa o host de teste e racha
  // autoridade de domínio com shareo.com.br antes mesmo do go-live.
  if (NOINDEX_ENABLED) {
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
    }
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/api/",
          "/dashboard",
          "/favoritos",
          "/mensagens",
          "/reservas",
          "/meus-anuncios",
          "/perfil/editar",
          "/sair",
        ],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  }
}
