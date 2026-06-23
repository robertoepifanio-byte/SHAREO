/**
 * load/lib/common.js
 * Helpers e utilitários compartilhados entre os perfis k6 do ShareO.
 *
 * Uso:
 *   import { BASE_URL, defaultHeaders, checkJson, randomSearch, pickRandom } from './lib/common.js'
 */

import http from "k6/http"
import { check } from "k6"

// ---------------------------------------------------------------------------
// BASE_URL — padrão seguro para localhost; NUNCA default para staging.
// Para apontar para outro alvo: k6 run --env BASE_URL=http://localhost:3000 ...
// ---------------------------------------------------------------------------
export const BASE_URL = (__ENV.BASE_URL || "http://localhost:3000").replace(/\/$/, "")

// ---------------------------------------------------------------------------
// Headers padrão para requisições de leitura
// ---------------------------------------------------------------------------
export const defaultHeaders = {
  Accept: "application/json",
  "User-Agent": "k6-shareo-load/1.0",
}

// ---------------------------------------------------------------------------
// Termos de busca representativos do catálogo do ShareO
// ---------------------------------------------------------------------------
const SEARCH_TERMS = [
  "furadeira",
  "escada",
  "betoneira",
  "bicicleta",
  "câmera",
  "projetor",
  "geladeira",
  "tenda",
  "violao",
  "mesa",
]

// ---------------------------------------------------------------------------
// pickRandom — retorna um elemento aleatório do array
// ---------------------------------------------------------------------------
export function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

// ---------------------------------------------------------------------------
// randomSearch — retorna um termo de busca aleatório
// ---------------------------------------------------------------------------
export function randomSearch() {
  return pickRandom(SEARCH_TERMS)
}

// ---------------------------------------------------------------------------
// GET /api/items e extrai o primeiro id disponível para usar em /api/items/[id]
// Retorna null se não houver itens.
// ---------------------------------------------------------------------------
export function fetchFirstItemId() {
  const res = http.get(`${BASE_URL}/api/items?limit=1`, {
    headers: defaultHeaders,
    tags: { name: "GET /api/items (setup)" },
  })

  try {
    const body = JSON.parse(res.body)
    const items = body?.data
    if (Array.isArray(items) && items.length > 0) {
      return items[0].id
    }
  } catch {
    // noop — o setup falhou silenciosamente; os testes de detalhe vão pular
  }
  return null
}

// ---------------------------------------------------------------------------
// checkJson — checks padrão para toda resposta JSON do ShareO
// Retorna true se todos os checks passaram.
// ---------------------------------------------------------------------------
export function checkJson(res, extraChecks = {}) {
  return check(res, {
    "status 200": (r) => r.status === 200,
    "content-type json": (r) =>
      (r.headers["Content-Type"] || "").includes("application/json"),
    "body nao vazio": (r) => r.body && r.body.length > 0,
    "sem campo error": (r) => {
      try {
        return !JSON.parse(r.body).error
      } catch {
        return false
      }
    },
    ...extraChecks,
  })
}

// ---------------------------------------------------------------------------
// checkItemsList — checks específicos para GET /api/items
// ---------------------------------------------------------------------------
export function checkItemsList(res) {
  return checkJson(res, {
    "data e array": (r) => {
      try {
        return Array.isArray(JSON.parse(r.body).data)
      } catch {
        return false
      }
    },
    "meta.total existe": (r) => {
      try {
        return typeof JSON.parse(r.body).meta?.total === "number"
      } catch {
        return false
      }
    },
  })
}

// ---------------------------------------------------------------------------
// checkItemDetail — checks específicos para GET /api/items/[id]
// ---------------------------------------------------------------------------
export function checkItemDetail(res) {
  return checkJson(res, {
    "data.id existe": (r) => {
      try {
        return !!JSON.parse(r.body).data?.id
      } catch {
        return false
      }
    },
    "data.title existe": (r) => {
      try {
        return !!JSON.parse(r.body).data?.title
      } catch {
        return false
      }
    },
  })
}
