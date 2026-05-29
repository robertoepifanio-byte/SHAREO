import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name:             "ShareO — Use Mais. Possua Menos.",
    short_name:       "ShareO",
    description:      "Marketplace de economia circular para aluguel local de itens em Natal/RN.",
    start_url:        "/",
    display:          "standalone",
    orientation:      "portrait",
    background_color: "#F8FAFC",
    theme_color:      "#003366",
    lang:             "pt-BR",
    categories:       ["shopping", "lifestyle"],
    icons: [
      {
        src:     "/logos/shareo-logo.png",
        sizes:   "192x192",
        type:    "image/png",
        purpose: "any",
      },
      {
        src:     "/logos/shareo-logo.png",
        sizes:   "512x512",
        type:    "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name:       "Explorar itens",
        short_name: "Explorar",
        url:        "/itens",
        description: "Encontre itens para alugar",
        icons: [{ src: "/logos/shareo-logo.png", sizes: "96x96" }],
      },
      {
        name:       "Minhas reservas",
        short_name: "Reservas",
        url:        "/reservas",
        description: "Ver suas reservas ativas",
        icons: [{ src: "/logos/shareo-logo.png", sizes: "96x96" }],
      },
    ],
  }
}
