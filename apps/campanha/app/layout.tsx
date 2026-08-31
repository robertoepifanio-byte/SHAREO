import type { Metadata } from "next"
import { Montserrat, Inter } from "next/font/google"
import { Providers } from "@/components/Providers"
import { PreLaunchFooter } from "@/components/PreLaunchFooter"
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics"
import { MetaPixel } from "@/components/analytics/MetaPixel"
import { BASE_URL, NOINDEX_ENABLED } from "@/lib/seo"
import "./globals.css"

const montserrat = Montserrat({
  subsets:  ["latin"],
  variable: "--font-montserrat",
  weight:   ["600", "700", "800"],
  display:  "swap",
})

const inter = Inter({
  subsets:  ["latin"],
  variable: "--font-inter",
  weight:   ["400", "500", "600", "700"],
  display:  "swap",
})

export const metadata: Metadata = {
  title: "ShareO — Use Mais. Possua Menos.",
  description:
    "Entre na lista de pré-lançamento do ShareO: o marketplace local para anunciar e alugar itens com segurança e praticidade.",
  metadataBase: new URL(BASE_URL),
  openGraph: {
    type:     "website",
    locale:   "pt_BR",
    siteName: "ShareO",
    images: [
      {
        url:    "/logos/og-image-v5.webp",
        width:  1200,
        height: 630,
        alt:    "ShareO — alugue ferramentas, eletrônicos, bikes e mais perto de você.",
      },
    ],
  },
  twitter: {
    card:   "summary_large_image",
    site:   "@shareo_br",
    images: ["/logos/og-image-v5.webp"],
  },
  robots: { index: !NOINDEX_ENABLED, follow: !NOINDEX_ENABLED },
  icons:  { apple: "/icons/shareo-logo.png" },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${montserrat.variable} ${inter.variable}`} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        {/* Skip link — acessibilidade de teclado */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[9999] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary"
        >
          Pular para o conteúdo principal
        </a>

        <Providers>
          {/* Sem o padding-bottom de 72px do app principal: aqui não há BottomNav,
              e aquele espaço seria vazio morto no fim de uma landing de conversão. */}
          <div id="main-content">
            {children}
            <PreLaunchFooter />
          </div>
          <GoogleAnalytics />
          {/* Inerte sem NEXT_PUBLIC_META_PIXEL_ID.
              ⚠️ Ligar exige parecer jurídico: compartilha dados com terceiro para
              uso publicitário dele. */}
          <MetaPixel />
        </Providers>
      </body>
    </html>
  )
}
