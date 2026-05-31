/**
 * P3-81 — Teste de carga k6: GET /api/items
 *
 * Meta: P95 < 1s com 50 VUs simultâneos.
 *
 * Executar: k6 run k6/load-test.js --env BASE_URL=https://staging.shareo.com.br
 * Instalar: https://grafana.com/docs/k6/latest/set-up/install-k6/
 */

import http from "k6/http"
import { check, sleep } from "k6"
import { Trend, Rate } from "k6/metrics"

const p95Latency    = new Trend("p95_latency",    true)
const errorRate     = new Rate("error_rate")

export const options = {
  stages: [
    { duration: "30s", target: 50 },  // ramp-up a 50 VUs em 30s
    { duration: "60s", target: 50 },  // sustentado por 60s
    { duration: "15s", target: 0  },  // ramp-down
  ],
  thresholds: {
    http_req_duration:   ["p(95)<1000"],  // P95 < 1s
    error_rate:          ["rate<0.01"],   // < 1% de erros
    http_req_failed:     ["rate<0.01"],
  },
}

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000"

const SCENARIOS = [
  "/api/items",
  "/api/items?category=ferramentas",
  "/api/items?city=Natal",
  "/api/items?priceMax=5000",
]

export default function () {
  const url = BASE_URL + SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)]

  const res = http.get(url, {
    headers: { "Accept": "application/json" },
    tags:    { name: "GET /api/items" },
  })

  const ok = check(res, {
    "status 200":       (r) => r.status === 200,
    "body is JSON":     (r) => r.headers["Content-Type"]?.includes("application/json") ?? false,
    "response < 1000ms": (r) => r.timings.duration < 1000,
  })

  p95Latency.add(res.timings.duration)
  errorRate.add(!ok)

  sleep(Math.random() * 0.5 + 0.1) // 100–600ms think time
}
