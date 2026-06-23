/**
 * load/smoke.js — Perfil SMOKE do ShareO
 *
 * Objetivo: verificar rapidamente que os endpoints de leitura respondem
 * com status 200 e payload correto. 1 VU, poucas iterações.
 * Ideal para rodar após cada deploy local antes de abrir um PR.
 *
 * Uso:
 *   k6 run load/smoke.js
 *   k6 run --env BASE_URL=http://localhost:3000 load/smoke.js
 *
 * AVISO: NÃO rode contra o staging (staging.shareo.com.br).
 *        Use sempre BASE_URL apontando para localhost ou ambiente dedicado.
 */

import http from "k6/http"
import { sleep } from "k6"
import {
  BASE_URL,
  defaultHeaders,
  checkItemsList,
  checkItemDetail,
  randomSearch,
  fetchFirstItemId,
} from "./lib/common.js"

export const options = {
  vus: 1,
  iterations: 6, // 2 cenários x 3 variações = smoke rápido

  thresholds: {
    // Smoke: apenas confirmar que os endpoints respondem sem erro
    http_req_failed: ["rate<0.05"],          // < 5% (smoke é mais permissivo)
    http_req_duration: ["p(95)<3000"],       // P95 < 3s (aceitável em smoke local)
    checks: ["rate>0.90"],                   // > 90% dos checks passando
  },
}

// setup() roda uma vez antes dos VUs — captura um id real da listagem
export function setup() {
  const itemId = fetchFirstItemId()
  return { itemId }
}

export default function (data) {
  const iteration = __ITER % 3 // 0, 1, 2 dentro de cada "rodada"

  if (iteration === 0) {
    // Cenário 1a: listagem padrão
    const res = http.get(`${BASE_URL}/api/items`, {
      headers: defaultHeaders,
      tags: { name: "smoke: GET /api/items" },
    })
    checkItemsList(res)
    sleep(0.5)
  } else if (iteration === 1) {
    // Cenário 1b: busca textual
    const term = randomSearch()
    const res = http.get(
      `${BASE_URL}/api/items?search=${encodeURIComponent(term)}`,
      {
        headers: defaultHeaders,
        tags: { name: "smoke: GET /api/items?search=" },
      }
    )
    checkItemsList(res)
    sleep(0.5)
  } else {
    // Cenário 2: detalhe de item (se disponível)
    const itemId = data?.itemId
    if (itemId) {
      const res = http.get(`${BASE_URL}/api/items/${itemId}`, {
        headers: defaultHeaders,
        tags: { name: "smoke: GET /api/items/[id]" },
      })
      checkItemDetail(res)
    }
    sleep(0.5)
  }
}
