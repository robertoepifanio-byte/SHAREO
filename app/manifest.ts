import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name:             "ShareO — Use Mais. Possua Menos.",
    short_name:       "ShareO",
    description:      "Marketplace de economia circular para aluguel local de itens em todo o Brasil.",
    start_url:        "/",
    display:          "standalone",
    orientation:      "portrait",
    background_color: "#F8FAFC",
    theme_color:      "#003366",
    lang:             "pt-BR",
    categories:       ["shopping", "lifestyle"],
    icons: [
      {
        src:     "/logos/pwa-icon-192.png",
        sizes:   "192x192",
        type:    "image/png",
        purpose: "any",
      },
      {
        src:     "/logos/pwa-icon-512.png",
        sizes:   "512x512",
        type:    "image/png",
        purpose: "any",
      },
      {
        src:     "/logos/pwa-icon-512.png",
        sizes:   "512x512",
        type:    "image/png",
        purpose: "maskable",
      },
    ],
    screenshots: [
      {
        src:         "/logos/pwa-screenshot-mobile.png",
        sizes:       "390x844",
        type:        "image/png",
        form_factor: "narrow",
        label:       "ShareO — Tela inicial mobile",
      },
      {
        src:         "/logos/pwa-screenshot-wide.png",
        sizes:       "1280x800",
        type:        "image/png",
        form_factor: "wide",
        label:       "ShareO — Tela inicial desktop",
      },
    ],
    shortcuts: [
      {
        name:        "Explorar itens",
        short_name:  "Explorar",
        url:         "/itens",
        description: "Encontre itens para alugar",
        icons: [{ src: "/logos/pwa-icon-192.png", sizes: "192x192" }],
      },
      {
        name:        "Minhas reservas",
        short_name:  "Reservas",
        url:         "/reservas",
        description: "Ver suas reservas ativas",
        icons: [{ src: "/logos/pwa-icon-192.png", sizes: "192x192" }],
      },
    ],
  }
}
