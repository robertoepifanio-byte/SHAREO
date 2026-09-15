import type { NextConfig } from "next"

/**
 * Landing da campanha — app independente do marketplace.
 *
 * Sem Prisma, sem NextAuth, sem middleware de gate. A única fronteira com o
 * ShareO é HTTP: a captação faz POST em /api/founders/leads e a prova social lê
 * /api/founders/stats. Ver lib/config.ts.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,

  // @shareo/legal é TypeScript não compilado (pacote do workspace) — o Next
  // precisa transpilá-lo. É de lá que vêm os textos de /termos, /privacidade e
  // /politicas, os mesmos que o marketplace publica.
  transpilePackages: ["@shareo/legal"],

  // A landing não sobe imagem de usuário; as artes são .webp estáticos servidos
  // de public/campanha por <picture>. Nenhum host remoto é necessário.
  images: { remotePatterns: [] },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            // A landing é estática: só precisa falar com a API do ShareO
            // (captação e prova social) e com o ViaCEP (preenchimento por CEP).
            // Sem isso o fetch do formulário cai no catch com "erro de conexão"
            // e nada no console explica — armadilha conhecida do projeto.
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // Domínios do Google Tag Manager (GoogleTagManager.tsx): o container
              // em si e o destino de tags de medição que ele vier a publicar —
              // 'unsafe-inline' já cobre os scripts que o container injeta em
              // runtime, que não carregam nonce.
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://www.google-analytics.com",
              "font-src 'self' data:",
              `connect-src 'self' ${process.env.NEXT_PUBLIC_SHAREO_API_URL ?? ""} https://viacep.com.br https://www.googletagmanager.com https://www.google-analytics.com https://analytics.google.com https://region1.google-analytics.com`,
              // Só para o iframe de fallback sem-JS do GTM; frame-ancestors abaixo
              // continua protegendo contra ESTE site ser embutido alhures.
              "frame-src https://www.googletagmanager.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ]
  },
}

export default nextConfig
