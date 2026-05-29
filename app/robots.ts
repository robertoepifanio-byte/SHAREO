import type { MetadataRoute } from "next"

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "https://shareo-rouge.vercel.app"

export default function robots(): MetadataRoute.Robots {
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
