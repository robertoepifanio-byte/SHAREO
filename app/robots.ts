import type { MetadataRoute } from "next"
import { PRELAUNCH_ENABLED, NOINDEX_ENABLED } from "@/lib/prelaunch"

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "https://shareo-rouge.vercel.app"

export default function robots(): MetadataRoute.Robots {
  // Staging: bloqueio total. Sem isso o Google indexa o host de teste e racha
  // autoridade de domínio com shareo.com.br antes mesmo do go-live.
  if (NOINDEX_ENABLED) {
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
    }
  }

  // Pré-lançamento: só a landing e as páginas de cidade devem ser rastreadas.
  // O marketplace inteiro está atrás do gate — deixar o crawler bater nele
  // gastaria orçamento de rastreio em URLs que respondem 307 para "/".
  if (PRELAUNCH_ENABLED) {
    return {
      rules: [
        {
          userAgent: "*",
          allow: ["/", "/pilotos/", "/termos", "/privacidade", "/politicas"],
          disallow: [
            "/admin/", "/api/", "/itens", "/loja", "/carrinho", "/anunciar",
            "/ganhar", "/sobre", "/comunidade", "/ajuda", "/suporte", "/seguranca",
            "/dashboard", "/favoritos", "/mensagens", "/reservas", "/meus-anuncios",
            "/perfil", "/cadastro", "/login", "/sair",
          ],
        },
      ],
      sitemap: `${BASE}/sitemap.xml`,
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
