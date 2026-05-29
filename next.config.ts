import type { NextConfig } from "next"

const isDev = process.env.NODE_ENV === "development"

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
  // CSP mais permissiva em dev (Next.js Fast Refresh + mapbox-gl WebAssembly exigem unsafe-eval)
  {
    key: "Content-Security-Policy",
    value: isDev
      ? [
          "default-src 'self'",
          "script-src 'self' 'unsafe-eval' 'unsafe-inline' blob:",
          "worker-src blob:",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob: *.supabase.co *.mapbox.com",
          "connect-src 'self' ws: wss: *.supabase.co api.mapbox.com events.mapbox.com *.tiles.mapbox.com",
          "font-src 'self' data:",
          "frame-src 'none'",
        ].join("; ")
      : [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob:",
          "worker-src blob:",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob: *.supabase.co *.mapbox.com",
          "connect-src 'self' wss://*.supabase.co api.mapbox.com events.mapbox.com *.tiles.mapbox.com *.sentry.io",
          "font-src 'self' data:",
          "frame-src 'none'",
        ].join("; "),
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
    ],
    formats: ["image/avif", "image/webp"],
  },

  // Mapbox GL requer transpilação
  transpilePackages: ["mapbox-gl"],

  // Logs de build mais limpos
  logging: {
    fetches: { fullUrl: isDev },
  },
}

export default config
