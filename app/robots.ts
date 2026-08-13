import type { MetadataRoute } from "next"
import { NOINDEX_ENABLED } from "@/lib/seo-flags"

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "https://shareo-rouge.vercel.app"

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
