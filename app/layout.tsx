import type { Metadata } from "next"
import { Montserrat } from "next/font/google"
import { BottomNav } from "@/components/layout/BottomNav"
import { AppFooter } from "@/components/layout/AppFooter"
import "./globals.css"

const montserrat = Montserrat({
  subsets:  ["latin"],
  variable: "--font-montserrat",
  weight:   ["400", "500", "600", "700", "800"],
  display:  "swap",
})

export const metadata: Metadata = {
  title: {
    default:  "ShareO — Use Mais. Possua Menos.",
    template: "%s | ShareO",
  },
  description:
    "Marketplace de economia circular para aluguel local de itens entre pessoas e empresas em Natal/RN.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  openGraph: {
    type:     "website",
    locale:   "pt_BR",
    siteName: "ShareO",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={montserrat.variable}>
      <body className="min-h-screen bg-background font-sans antialiased">
        {/* Skip link — acessibilidade de teclado */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[9999] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary"
        >
          Pular para o conteúdo principal
        </a>
        {/* Padding bottom garante que o BottomNav não tape o conteúdo no mobile */}
        <div id="main-content" className="pb-16 md:pb-0">
          {children}
          <AppFooter />
        </div>
        <BottomNav />
      </body>
    </html>
  )
}
