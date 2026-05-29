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
    theme_color:      "#0D1B2A",
    lang:             "pt-BR",
    categories:       ["shopping", "lifestyle"],
    icons: [
      {
        src:     "/icons/shareo-logo.png",
        sizes:   "192x192",
        type:    "image/png",
        purpose: "any",
      },
      {
        src:     "/icons/shareo-logo.png",
        sizes:   "512x512",
        type:    "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name:      "Explorar itens",
        short_name: "Explorar",
        url:       "/itens",
        description: "Encontre itens para alugar",
      },
      {
        name:      "Minhas reservas",
        short_name: "Reservas",
        url:       "/reservas",
        description: "Ver suas reservas ativas",
      },
    ],
  }
}
