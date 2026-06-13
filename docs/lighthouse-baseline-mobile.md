# Lighthouse — Baseline Mobile (pós-gru1)

**Data:** 2026-06-13
**URL:** https://shareo-rouge.vercel.app/ (homepage, staging)
**Form factor:** mobile (Moto G Power emulado · throttling 4G · CPU 4×)
**Lighthouse:** 13.3.0 · Chrome headless
**Commit de referência:** `e04d6a1`

Substitui o relatório anterior (`lighthouse-report.json`, 2026-06-06), que era
**desktop e só de performance (97)**. Este é o primeiro baseline **mobile com as
4 categorias**, capturado **após o pin de região `gru1`** (São Paulo) no `vercel.json`.

## Scores

| Categoria | Score | Meta |
|---|---|---|
| Performance | **92** | ≥ 90 ✅ |
| Acessibilidade | **97** | ≥ 90 ✅ |
| Boas Práticas | **96** | ≥ 90 ✅ |
| SEO | **100** | ≥ 90 ✅ |

## Métricas (Core Web Vitals)

| Métrica | Valor | Limite (bom) | Status |
|---|---|---|---|
| Largest Contentful Paint (LCP) | **1.6 s** | < 2.5 s | ✅ |
| Cumulative Layout Shift (CLS) | **0.008** | < 0.1 | ✅ |
| Total Blocking Time (TBT) | **260 ms** | < 300 ms | ✅ |
| First Contentful Paint (FCP) | **1.6 s** | < 1.8 s | ✅ |
| Speed Index | **3.8 s** | < 3.4 s | ⚠️ levemente acima |
| Time to Interactive (TTI) | **2.7 s** | < 3.8 s | ✅ |

## Leitura

- **SEO 100** confirma o achado da auditoria: o app é SSR/ISR (não SPA) — metadata,
  sitemap/robots/manifest e JSON-LD bem configurados.
- **LCP 1.6s no mobile com 4G** é excelente (limite é 2.5s) — efeito direto do `gru1`.
- **CLS 0.008** praticamente zero — reforçado pela migração de `<img>` → `next/image`
  com dimensões fixas (commit `e04d6a1`).
- **Speed Index 3.8s** é o único ponto levemente acima do ideal — candidato a
  acompanhamento (hero da home / ordem de pintura), não bloqueante.

## Como reproduzir

```powershell
$env:CHROME_PATH = "C:\Program Files\Google\Chrome\Application\chrome.exe"
npx lighthouse https://shareo-rouge.vercel.app/ `
  --only-categories=performance,accessibility,best-practices,seo `
  --form-factor=mobile --screenEmulation.mobile `
  --output=json --output=html --output-path=./lighthouse-mobile-baseline `
  --chrome-flags="--headless=new" --quiet
```

> Os artefatos brutos (`lighthouse-mobile-baseline.report.{json,html}`) ficam
> fora do git (`.gitignore`). O gate bloqueante do CI continua em `.lighthouserc.json`
> via `treosh/lighthouse-ci-action` a cada deploy; este doc é o ponto de comparação
> humano para regressões.
