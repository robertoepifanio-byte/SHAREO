import type { Metadata } from "next"
import { Montserrat, Inter } from "next/font/google"
import { Toaster } from "sonner"
import { BottomNav } from "@/components/layout/BottomNav"
import { AppFooter } from "@/components/layout/AppFooter"
import { ServiceWorkerRegister } from "@/components/layout/ServiceWorkerRegister"
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics"
import { Providers } from "@/components/layout/Providers"
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

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

export const metadata: Metadata = {
  title: {
    default:  "ShareO — Use Mais. Possua Menos.",
    template: "%s | ShareO",
  },
  description:
    "Marketplace de economia circular para aluguel local de itens entre pessoas e empresas em Natal/RN.",
  metadataBase: new URL(BASE),
  openGraph: {
    type:     "website",
    locale:   "pt_BR",
    siteName: "ShareO",
  },
  twitter: {
    card: "summary_large_image",
    site: "@shareo_br",
  },
  robots: {
    index:  true,
    follow: true,
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
  description:  "Marketplace de economia circular para aluguel local de itens em Natal/RN.",
  sameAs:       [],
  contactPoint: {
    "@type":       "ContactPoint",
    contactType:   "customer service",
    availableLanguage: "Portuguese",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${montserrat.variable} ${inter.variable}`}>
      <body className="min-h-screen bg-background font-sans antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        {/* Skip link — acessibilidade de teclado */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[9999] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary"
        >
          Pular para o conteúdo principal
        </a>
        {/* Padding bottom garante que o BottomNav não tape o conteúdo no mobile */}
        <Providers>
          <div id="main-content" className="pb-16 md:pb-0">
            {children}
            <AppFooter />
          </div>
          <BottomNav />
          <Toaster richColors position="top-right" />
          <ServiceWorkerRegister />
          {/* P3-82: GA4 — carregado apenas quando NEXT_PUBLIC_GA_MEASUREMENT_ID definido */}
          <GoogleAnalytics />
        </Providers>
    </body>
    </html>
  )
}
