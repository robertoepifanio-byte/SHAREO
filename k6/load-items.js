/**
 * P3-16 — Teste de carga: GET /api/items
 *
 * Meta: 50 usuários simultâneos, P95 < 1s, taxa de erro < 1%.
 *
 * Rodar (k6 instalado: https://k6.io/docs/get-started/installation/):
 *   k6 run k6/load-items.js                                  # contra staging
 *   k6 run -e BASE_URL=http://localhost:3000 k6/load-items.js # contra dev local
 *
 * ⚠️ SKIP_RATE_LIMIT precisa estar ativo no alvo, senão o rate limit
 *    do Upstash derruba o teste com 429 (20 req/10s por IP).
 */
import http from "k6/http"
import { check, sleep } from "k6"

const BASE_URL = __ENV.BASE_URL || "https://shareo-rouge.vercel.app"

export const options = {
  stages: [
    { duration: "30s", target: 10 }, // warm-up
    { duration: "1m",  target: 50 }, // rampa até a meta
    { duration: "2m",  target: 50 }, // sustenta 50 VUs
    { duration: "30s", target: 0  }, // ramp-down
  ],
  thresholds: {
    http_req_duration: ["p(95)<1000"], // P95 < 1s
    http_req_failed:   ["rate<0.01"],  // < 1% de erros
  },
}

// Mix de queries que um usuário real faz no Explorar
const QUERIES = [
  "",
  "?page=2",
  "?search=furadeira",
  "?sort=price_asc",
  "?sort=rented",
  "?categoryId=", // categoria vazia = todas
]

export default function () {
  const qs  = QUERIES[Math.floor(Math.random() * QUERIES.length)]
  const res = http.get(`${BASE_URL}/api/items${qs}`, {
    tags: { name: "GET /api/items" },
  })

  check(res, {
    "status 200":      (r) => r.status === 200,
    "tem data array":  (r) => {
      try { return Array.isArray(JSON.parse(r.body).data) } catch { return false }
    },
  })

  sleep(Math.random() * 2 + 1) // 1–3s entre requests, como navegação real
}
