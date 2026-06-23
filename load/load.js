/**
 * load/load.js — Perfil LOAD do ShareO
 *
 * Objetivo: simular tráfego realista de navegação concorrente nos endpoints
 * de leitura. Rampa gradual até 30 VUs, sustentada por 3 minutos.
 * Mede se o sistema aguenta carga moderada dentro dos SLOs do MVP.
 *
 * Uso:
 *   k6 run load/load.js
 *   k6 run --env BASE_URL=http://localhost:3000 load/load.js
 *
 * AVISO: NÃO rode contra o staging (staging.shareo.com.br).
 *        Load/stress pode acionar rate limit do Upstash e prejudicar
 *        validações dos testers. Use ambiente local ou dedicado.
 */

import http from "k6/http"
import { sleep } from "k6"
import { Trend, Rate } from "k6/metrics"
import {
  BASE_URL,
  defaultHeaders,
  checkItemsList,
  checkItemDetail,
  randomSearch,
  pickRandom,
  fetchFirstItemId,
} from "./lib/common.js"

// Métricas customizadas por cenário
const listingDuration = new Trend("shareo_listing_duration", true)
const searchDuration  = new Trend("shareo_search_duration", true)
const detailDuration  = new Trend("shareo_detail_duration", true)
const scenarioErrors  = new Rate("shareo_scenario_errors")

export const options = {
  stages: [
    { duration: "30s", target: 5  }, // aquecimento lento
    { duration: "60s", target: 15 }, // rampa gradual
    { duration: "90s", target: 30 }, // pico de carga moderada
    { duration: "3m",  target: 30 }, // sustenta 30 VUs por 3 minutos
    { duration: "30s", target: 0  }, // ramp-down
  ],

  thresholds: {
    // SLOs do MVP
    http_req_failed:          ["rate<0.01"],   // < 1% de falhas HTTP
    http_req_duration:        ["p(95)<1500"],  // P95 geral < 1,5s
    shareo_listing_duration:  ["p(95)<1200"],  // listagem: P95 < 1,2s
    shareo_search_duration:   ["p(95)<1500"],  // busca: P95 < 1,5s
    shareo_detail_duration:   ["p(95)<1000"],  // detalhe: P95 < 1s
    shareo_scenario_errors:   ["rate<0.01"],   // < 1% de erros de negócio
    checks:                   ["rate>0.95"],   // > 95% checks passando
  },
}

// Paginação e filtros que um usuário real usaria no "Explorar"
const PAGES = ["", "?page=2", "?page=3"]
const PRICE_FILTERS = [
  "",
  "?minPrice=1000&maxPrice=10000",
  "?minPrice=5000",
]

export function setup() {
  const itemId = fetchFirstItemId()
  return { itemId }
}

export default function (data) {
  // Distribuição de cenários imitando comportamento real:
  // 50% listagem, 30% busca, 20% detalhe
  const roll = Math.random()

  if (roll < 0.50) {
    // Cenário A: listagem com paginação e/ou filtro de preço
    const suffix = pickRandom(PAGES) + pickRandom(PRICE_FILTERS)
    const res = http.get(`${BASE_URL}/api/items${suffix}`, {
      headers: defaultHeaders,
      tags: { name: "load: GET /api/items" },
    })
    const ok = checkItemsList(res)
    listingDuration.add(res.timings.duration)
    scenarioErrors.add(!ok)
    sleep(Math.random() * 2 + 1) // 1–3s think time

  } else if (roll < 0.80) {
    // Cenário B: busca textual
    const term = randomSearch()
    const res = http.get(
      `${BASE_URL}/api/items?search=${encodeURIComponent(term)}`,
      {
        headers: defaultHeaders,
        tags: { name: "load: GET /api/items?search=" },
      }
    )
    const ok = checkItemsList(res)
    searchDuration.add(res.timings.duration)
    scenarioErrors.add(!ok)
    sleep(Math.random() * 2 + 1)

  } else {
    // Cenário C: detalhe de item
    const itemId = data?.itemId
    if (!itemId) {
      sleep(1)
      return
    }
    const res = http.get(`${BASE_URL}/api/items/${itemId}`, {
      headers: defaultHeaders,
      tags: { name: "load: GET /api/items/[id]" },
    })
    const ok = checkItemDetail(res)
    detailDuration.add(res.timings.duration)
    scenarioErrors.add(!ok)
    sleep(Math.random() * 1.5 + 0.5) // 0,5–2s (detalhe tem interação mais rápida)
  }
}
