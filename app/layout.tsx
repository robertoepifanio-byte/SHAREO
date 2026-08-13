import type { Metadata } from "next"
import { headers } from "next/headers"
import { Montserrat, Inter } from "next/font/google"
import { ThemedToaster } from "@/components/layout/ThemedToaster"
import { BottomNav } from "@/components/layout/BottomNav"
import { AppFooter } from "@/components/layout/AppFooter"
import { ServiceWorkerRegister } from "@/components/layout/ServiceWorkerRegister"
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics"
import { MetaPixel } from "@/components/analytics/MetaPixel"
import { Providers } from "@/components/layout/Providers"
import { jsonLdScript } from "@/lib/jsonLd"
import { NOINDEX_ENABLED } from "@/lib/seo-flags"
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

/**
 * `||`, não `??`. O `??` só cai no fallback com null/undefined — e em PR do
 * Dependabot o GitHub NÃO expõe os secrets do repositório, então
 * `NEXT_PUBLIC_APP_URL: ${{ secrets.STAGING_URL }}` chega como STRING VAZIA.
 * Com `??`, `new URL("")` lançava `TypeError: Invalid URL` e o build quebrava
 * em "Failed to collect configuration for /_not-found" — por isso TODO PR do
 * Dependabot estava vermelho, independente do pacote que bumpava.
 *
 * Mesmo defeito do `getHmacKey()` (`??` × `||` com string vazia), corrigido em
 * junho no PR #125. Vale para os 6 pontos que leem NEXT_PUBLIC_APP_URL.
 */
const BASE = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

export const metadata: Metadata = {
  title: {
    default:  "ShareO — Use Mais. Possua Menos.",
    template: "%s | ShareO",
  },
  description:
    "Marketplace de economia circular para aluguel local de itens entre pessoas e empresas em todo o Brasil.",
  metadataBase: new URL(BASE),
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
  // NEXT_PUBLIC_NOINDEX é ligada em STAGING: sem isso o Google indexa o host de
  // teste e racha autoridade com shareo.com.br antes mesmo do go-live.
  robots: {
    index:  !NOINDEX_ENABLED,
    follow: !NOINDEX_ENABLED,
  },
  appleWebApp: {
    capable:          true,
    title:            "ShareO",
    statusBarStyle:   "default",
  },
  icons: {
    apple: "/icons/shareo-logo.png",
  },
}

const orgJsonLd = {
  "@context":   "https://schema.org",
  "@type":      "Organization",
  name:         "ShareO",
  url:          BASE,
  logo:         `${BASE}/shareo-logo.png`,
  description:  "Marketplace de economia circular para aluguel local de itens em todo o Brasil.",
  sameAs:       [],
  contactPoint: {
    "@type":       "ContactPoint",
    contactType:   "customer service",
    availableLanguage: "Portuguese",
  },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers()
  const nonce = headersList.get("x-nonce") ?? undefined

  return (
    <html lang="pt-BR" className={`${montserrat.variable} ${inter.variable}`} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        {/* JSON-LD é data block (não executado) — CSP script-src não se aplica, nonce dispensável */}
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: jsonLdScript(orgJsonLd) }}
        />
        {/* Skip link — acessibilidade de teclado */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[9999] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary"
        >
          Pular para o conteúdo principal
        </a>
        {/* Padding bottom garante que o BottomNav não tape o conteúdo no mobile. */}
        <Providers nonce={nonce}>
          <div id="main-content" className="pb-[72px] md:pb-0">
            {children}
            <AppFooter />
          </div>
          <BottomNav />
          <ThemedToaster />
          <ServiceWorkerRegister />
          {/* P3-82: GA4 — carregado apenas quando NEXT_PUBLIC_GA_MEASUREMENT_ID definido */}
          <GoogleAnalytics nonce={nonce} />
          {/* Meta Pixel — inerte sem NEXT_PUBLIC_META_PIXEL_ID.
              ⚠️ Ligar exige parecer jurídico antes: compartilha dados com terceiro
              para uso publicitário dele. Ver components/analytics/MetaPixel.tsx. */}
          <MetaPixel nonce={nonce} />
        </Providers>
    </body>
    </html>
  )
}
