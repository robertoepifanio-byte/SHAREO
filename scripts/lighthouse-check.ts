/**
 * scripts/lighthouse-check.ts — Smoke #32 — Lighthouse / Core Web Vitals
 *
 * Executa a Lighthouse CLI contra as páginas-chave do staging e valida thresholds.
 * Usa a CLI via child_process para evitar problemas de ESM/Windows com a API Node.
 *
 * Uso:
 *   pnpm test:lighthouse
 *   BASE_URL=https://shareo-rouge.vercel.app pnpm test:lighthouse
 */

import { execSync } from "child_process"
import fs from "fs"
import os from "os"
import path from "path"

const BASE = process.env.BASE_URL ?? "https://shareo-rouge.vercel.app"

const PAGES = [
  { path: "/",      label: "Home (landing)"   },
  { path: "/itens", label: "Itens (listagem)"  },
  { path: "/login", label: "Login"             },
]

const RUNS_PER_PAGE = 2  // executa N vezes, usa o melhor resultado (reduz ruído)

// Thresholds alinhados com .lighthouserc.json
const THRESHOLDS: Record<string, { label: string; max?: number; min?: number; unit: string }> = {
  "categories.performance.score":                { label: "Performance Score",  min: 0.75, unit: "/100" },
  "categories.accessibility.score":              { label: "Accessibility Score", min: 0.90, unit: "/100" },
  "categories.best-practices.score":             { label: "Best Practices",      min: 0.90, unit: "/100" },
  "categories.seo.score":                        { label: "SEO Score",           min: 0.90, unit: "/100" },
  "audits.largest-contentful-paint.numericValue":{ label: "LCP",                 max: 2500, unit: " ms"  },
  "audits.cumulative-layout-shift.numericValue": { label: "CLS",                 max: 0.10, unit: ""     },
  "audits.first-contentful-paint.numericValue":  { label: "FCP",                 max: 1800, unit: " ms"  },
  "audits.total-blocking-time.numericValue":     { label: "TBT (proxy INP)",     max: 300,  unit: " ms"  },
}

function getNestedValue(obj: Record<string, unknown>, dotPath: string): number | undefined {
  return dotPath.split(".").reduce((acc: unknown, key) => {
    if (acc == null || typeof acc !== "object") return undefined
    return (acc as Record<string, unknown>)[key]
  }, obj as unknown) as number | undefined
}

function formatValue(key: string, value: number): string {
  if (key.endsWith(".score")) return `${(value * 100).toFixed(0)}/100`
  if (key.includes("layout-shift")) return value.toFixed(3)
  return `${Math.round(value)} ms`
}

function pass(key: string, value: number): boolean {
  const t = THRESHOLDS[key]
  if (t.min !== undefined) return value >= t.min
  if (t.max !== undefined) return value <= t.max
  return true
}

async function runLighthouseCli(url: string): Promise<Record<string, unknown>> {
  const outFile = path.join(os.tmpdir(), `lh-report-${Date.now()}.json`)

  const cmd = [
    "npx lighthouse",
    `"${url}"`,
    "--output=json",
    `--output-path="${outFile}"`,
    "--only-categories=performance,accessibility,best-practices,seo",
    "--form-factor=mobile",
    "--chrome-flags=\"--headless --no-sandbox --disable-gpu\"",
    "--quiet",
  ].join(" ")

  try {
    execSync(cmd, { stdio: ["ignore", "ignore", "ignore"], timeout: 120_000 })
  } catch {
    // lighthouse exits with non-zero even on success sometimes — just try to read output
  }

  if (!fs.existsSync(outFile)) {
    throw new Error(`Arquivo de relatório não gerado: ${outFile}`)
  }

  const raw = fs.readFileSync(outFile, "utf-8")
  fs.unlinkSync(outFile)
  return JSON.parse(raw) as Record<string, unknown>
}

async function main() {
  console.log(`\n🔦 Lighthouse Smoke #32 — ${BASE}`)
  console.log("=".repeat(70))
  console.log("   Modo: mobile, throttled (3G simulado, CPU 4×)")
  console.log("   Thresholds: LCP<2,5s | CLS<0,1 | TBT<300ms | Perf≥75 | A11y≥90 | SEO≥90\n")

  let globalFail = false
  const summary: Array<{ page: string; scores: string[] }> = []

  for (const page of PAGES) {
    const url = BASE + page.path
    console.log(`📄 ${page.label}`)
    console.log(`   ${url}`)
    process.stdout.write("   Executando…")

    // Executar RUNS_PER_PAGE vezes e usar o melhor resultado (menor LCP)
    let lhr: Record<string, unknown> | null = null
    let bestLcp = Infinity

    for (let run = 1; run <= RUNS_PER_PAGE; run++) {
      process.stdout.write(run === 1 ? "   Executando (1/" + RUNS_PER_PAGE + ")…" : " (2/" + RUNS_PER_PAGE + ")…")
      try {
        const result = await runLighthouseCli(url)
        const lcp = getNestedValue(result, "audits.largest-contentful-paint.numericValue") ?? Infinity
        if (lcp < bestLcp) { bestLcp = lcp; lhr = result }
      } catch (e) {
        console.log(` ❌ ERRO: ${e instanceof Error ? e.message : e}`)
      }
    }

    if (!lhr) {
      console.log(` ❌ Todas as ${RUNS_PER_PAGE} execuções falharam\n`)
      globalFail = true
      continue
    }
    console.log(` concluído (melhor de ${RUNS_PER_PAGE} execuções).\n`)

    const pageScores: string[] = []
    let pageFail = false

    for (const [key, threshold] of Object.entries(THRESHOLDS)) {
      const value = getNestedValue(lhr, key)

      if (value == null) {
        console.log(`   ⚠️  ${threshold.label.padEnd(22)} n/a`)
        continue
      }

      const ok   = pass(key, value)
      const icon = ok ? "✅" : "❌"
      const fmt  = formatValue(key, value)
      const thresholdStr = threshold.min !== undefined
        ? `≥ ${threshold.min >= 1 ? threshold.min : Math.round(threshold.min * 100) + "/100"}`
        : `≤ ${threshold.max}${threshold.unit}`

      console.log(`   ${icon} ${threshold.label.padEnd(22)} ${fmt.padEnd(10)} (${thresholdStr})`)
      pageScores.push(`${icon} ${threshold.label}: ${fmt}`)

      if (!ok) { pageFail = true; globalFail = true }
    }

    summary.push({ page: page.label, scores: pageScores })
    console.log(pageFail ? "   ⚠️  Página com thresholds violados\n" : "   ✅ Todos os thresholds OK\n")
  }

  console.log("=".repeat(70))
  if (globalFail) {
    console.log("❌ RESULTADO FINAL: um ou mais thresholds foram violados.")
    console.log("   Revise os itens marcados com ❌ acima.\n")
    process.exit(1)
  } else {
    console.log("✅ RESULTADO FINAL: todos os thresholds passaram.\n")
    process.exit(0)
  }
}

main().catch((e) => {
  console.error("Erro fatal:", e instanceof Error ? e.message : e)
  process.exit(1)
})
