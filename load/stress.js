/**
 * load/stress.js — Perfil STRESS do ShareO
 *
 * Objetivo: empurrar o sistema além do esperado para encontrar o ponto de
 * ruptura. Rampa agressiva até 100 VUs, seguida de spike e ramp-down.
 * Identifica degradação de latência, vazamento de conexões e erros sob
 * carga extrema.
 *
 * Uso:
 *   k6 run load/stress.js
 *   k6 run --env BASE_URL=http://localhost:3000 load/stress.js
 *
 * AVISO CRITICO: NUNCA rode este perfil contra staging.shareo.com.br.
 *   - Pode derrubar o banco Supabase Free (limite de conexoes)
 *   - Aciona rate limit do Upstash para todos os usuarios reais
 *   - Pode gerar alertas falsos no Sentry
 *   Use SOMENTE em ambiente local ou dedicado (ex: staging isolado para
 *   testes de carga, separado do staging de validacao de QA).
 *
 * Interpretacao dos resultados:
 *   - P95 < 2s: sistema aguenta a carga com degradacao aceitavel
 *   - P95 entre 2s–5s: zona de alerta — investigar queries e conexoes
 *   - P95 > 5s ou error_rate > 5%: ponto de ruptura encontrado
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
  fetchFirstItemId,
} from "./lib/common.js"

// Métricas customizadas
const stressDuration = new Trend("shareo_stress_duration", true)
const stressErrors   = new Rate("shareo_stress_errors")

export const options = {
  stages: [
    // Fase 1: aquecimento
    { duration: "30s", target: 10  },
    // Fase 2: rampa até carga alta
    { duration: "60s", target: 50  },
    // Fase 3: sustenta carga alta
    { duration: "2m",  target: 50  },
    // Fase 4: spike — pico repentino
    { duration: "30s", target: 100 },
    // Fase 5: sustenta pico
    { duration: "1m",  target: 100 },
    // Fase 6: reduz para verificar recuperacao
    { duration: "30s", target: 30  },
    { duration: "1m",  target: 30  },
    // Fase 7: ramp-down completo
    { duration: "30s", target: 0   },
  ],

  thresholds: {
    // Thresholds mais permissivos para stress — o objetivo e encontrar o limite
    http_req_failed:       ["rate<0.10"],  // < 10% falhas HTTP (stress tolera mais)
    http_req_duration:     ["p(95)<5000"], // P95 < 5s (limite absoluto)
    shareo_stress_duration:["p(95)<5000"],
    shareo_stress_errors:  ["rate<0.10"],
    // Threshold que NÃO deve quebrar mesmo sob stress extremo
    http_req_duration:     ["p(99)<10000"], // P99 < 10s (timeout absoluto)
    checks:                ["rate>0.80"],   // > 80% checks passando mesmo no pico
  },
}

export function setup() {
  const itemId = fetchFirstItemId()
  return { itemId }
}

export default function (data) {
  // Sob stress: foco em listagem e busca (cenários mais pesados no banco)
  const roll = Math.random()

  if (roll < 0.60) {
    // 60%: listagem — query mais custosa (count + findMany)
    const page = Math.floor(Math.random() * 5) + 1
    const res = http.get(`${BASE_URL}/api/items?page=${page}`, {
      headers: defaultHeaders,
      tags: { name: "stress: GET /api/items" },
    })
    const ok = checkItemsList(res)
    stressDuration.add(res.timings.duration)
    stressErrors.add(!ok)
    sleep(Math.random() * 0.5 + 0.1) // think time curto — stress e agressivo

  } else if (roll < 0.85) {
    // 25%: busca textual — usa ILIKE, mais custoso
    const term = randomSearch()
    const res = http.get(
      `${BASE_URL}/api/items?search=${encodeURIComponent(term)}`,
      {
        headers: defaultHeaders,
        tags: { name: "stress: GET /api/items?search=" },
      }
    )
    const ok = checkItemsList(res)
    stressDuration.add(res.timings.duration)
    stressErrors.add(!ok)
    sleep(Math.random() * 0.5 + 0.1)

  } else {
    // 15%: detalhe — inclui reviews e imagens (payload maior)
    const itemId = data?.itemId
    if (!itemId) {
      sleep(0.2)
      return
    }
    const res = http.get(`${BASE_URL}/api/items/${itemId}`, {
      headers: defaultHeaders,
      tags: { name: "stress: GET /api/items/[id]" },
    })
    const ok = checkItemDetail(res)
    stressDuration.add(res.timings.duration)
    stressErrors.add(!ok)
    sleep(Math.random() * 0.3 + 0.1)
  }
}
