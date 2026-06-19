import type { NextConfig } from "next"
import { withSentryConfig } from "@sentry/nextjs"


// CSP é gerado por request no middleware.ts (com nonce em produção).
// Aqui ficam apenas os headers estáticos que não dependem de nonce.
const securityHeaders = [
  { key: "X-DNS-Prefetch-Control",    value: "on" },
  { key: "X-Frame-Options",           value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options",    value: "nosniff" },
  { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy",        value: "camera=(), microphone=(), geolocation=(self)" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
]

const staticCacheHeaders = [
  { key: "Cache-Control", value: "public, max-age=3600, stale-while-revalidate=86400" },
]

const config: NextConfig = {
  // Headers de segurança em todas as rotas
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      // Páginas estáticas institucionais — habilitam BF Cache no browser
      { source: "/sobre",       headers: staticCacheHeaders },
      { source: "/politicas",   headers: staticCacheHeaders },
      { source: "/termos",      headers: staticCacheHeaders },
      { source: "/privacidade", headers: staticCacheHeaders },
      { source: "/ajuda",       headers: staticCacheHeaders },
      { source: "/comunidade",  headers: staticCacheHeaders },
      { source: "/ganhar",      headers: staticCacheHeaders },
    ]
  },

  // Domínios permitidos para next/image
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/sign/**",
      },
      // Unsplash — imagens de seed para staging
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
    formats: ["image/avif", "image/webp"],
  },

  // Mapbox GL requer transpilação
  transpilePackages: ["mapbox-gl"],

  // Logs de build mais limpos
  logging: {
    fetches: { fullUrl: process.env.NODE_ENV === "development" },
  },
}

// Sentry só é ativado quando SENTRY_AUTH_TOKEN estiver presente e válido.
// Sem token (ex: staging sem secret configurado), exporta nextConfig diretamente
// para evitar falha de build por 401 no sentry-cli.
export default process.env.SENTRY_AUTH_TOKEN
  ? withSentryConfig(config, {
      org:       process.env.SENTRY_ORG     ?? "shareo-ow",
      project:   process.env.SENTRY_PROJECT ?? "shareo-web",
      authToken: process.env.SENTRY_AUTH_TOKEN,
      sourcemaps: { disable: false },
      hideSourceMaps:        true,
      widenClientFileUpload: true,
      telemetry:             false,
      silent:                true,
      disableLogger:         true,
      automaticVercelMonitors: true,
    })
  : config
