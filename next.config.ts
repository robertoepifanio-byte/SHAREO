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
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
]

const config: NextConfig = {
  // Headers de segurança em todas as rotas
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
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

export default withSentryConfig(config, {
  org:       process.env.SENTRY_ORG       ?? "shareo-ow",
  project:   process.env.SENTRY_PROJECT   ?? "shareo-web",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent:    !process.env.CI,
  hideSourceMaps:          true,
  widenClientFileUpload:   true,
  disableLogger:           true,
  automaticVercelMonitors: true,
})
