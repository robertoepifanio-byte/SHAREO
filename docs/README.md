# docs/ — Índice

Reorganizado em 2026-07-07 (diagnóstico de estrutura). Regra: **documentos vivos na raiz, arquiváveis em subpastas temáticas**. PDFs/DOCX não são versionados (`.gitignore`) — gere-os on-demand a partir dos `.md` (pipeline `npx marked` + Chrome headless).

## Vivos (raiz)

| Arquivo | Papel |
|---|---|
| `STATUS.md` | Estado atual do projeto (fonte do `/shareo-status`) |
| `backlog-atividades-priorizadas.md` | Backlog P0–P3 |
| `backlog-site-padroes-pos-validacao-mobile.md` | Backlog de paridade site↔app |
| `checklist-go-live.md` | Checklist de produção (histórico, desatualizado) |
| `checklist-go-live-2026-10-01.md` | Checklist técnico do go-live 01/10/2026 — levantamento detalhado, 4 áreas, Anexo por área |
| `checklist-dia-d0.md` | Sondas, ordem de passos e escala para o dia D0 (01/10/2026) |
| `runbook-rollback-deploy.md` | Procedimento de rollback de deploy de produção (Vercel Instant Rollback + CLI) |
| `roteiro-smoke-d0.md` | Roteiro de smoke de 15 passos a executar em D-2 (ensaio) e D0 (abertura) |
| `ensaio-d2-2026-09-29.md` | Ficha de 14 linhas do ensaio de rollback e roteiro STRIPE-04 (locação assistida live) — executar em 29/09 |
| `promessas-nao-implementadas.md` | Auditoria viva de promessas de UI |
| `estrutura-projeto.md`, `component-spec.md`, `prototype-to-implementation.md` | Referências de arquitetura/design |
| `lighthouse-baseline-mobile.md` | Baseline de performance |
| `draft-ajuda-mp-rewrite.md` | Revisão da Central de Ajuda (publicar pós-D4) |

## Subpastas

- **`adr/`** — Architecture Decision Records (ADR-001+)
- **`juridico/`** — D4, LGPD, RIPD, biometria, cláusulas MP/CDC, pautas jurídicas
- **`auditorias/`** — auditorias e revisões por sprint (s14, s40, s41…)
- **`relatorios/`** — relatórios executivos e de status por sprint
- **`planos/`** — planos e metas de sprint/módulo (dark mode, financeiro, lojas…)
- **`guias/`** — roteiros de teste e checklists manuais
- **`mobile/`** — publicação nas lojas (Play/App Store): data safety, listing, builds
- **`design/`** — protótipos e handoffs (spec aprovada do app: `mobile-app-prototipo-v1.html` + `mobile-app-handoff.md`)
- **`fundacao/`** — documentos fundacionais dos fundadores (pitch, identidade visual, visão/backlog, RACI) — ex-`Documentos/` da raiz
- **`api/`**, **`bugs/`**, **`metas/`**, **`migrations/`**, **`user-stories/`** — como os nomes dizem

## Assets-fonte

Matéria-prima de design (fotos de seed, ícones .jpeg originais) vive em **`assets-fonte/`** na raiz do repo (ex-`icones/` e `imagens/`) — fora de `public/` de propósito: `public/` é servido no site; lá ficam só os derivados processados (`public/imagens/*.webp`, `public/icons/`).

## Versionamento por plataforma (convenção, 2026-07-07)

- **Site (web):** tags `web-v*` (ex.: `web-v1.12.0`) — disparam o Deploy Production **sem** gate de aprovação via `deploy.yml` (verificado: o job `production` usa `environment: name: production` sem `wait-timer` nem `Required reviewers` configurados; `workflow_dispatch` também publica direto). Prefixo `web-` adotado em 2026-07-09 (antes era `v*`; ver ADR-027).
- **App mobile:** tags `mobile-v*` (ex.: `mobile-v1.1.0`) — disparam build EAS via `.github/workflows/eas-release.yml` (requer secret `EXPO_TOKEN`). Os prefixos não colidem: `web-v*` não casa com `mobile-v*` e vice-versa.
- `apps/mobile/app.json` tem `runtimeVersion: { policy: "appVersion" }` — pré-requisito de OTA updates (expo-updates) e das lojas; sem efeito até OTA ser adotado.
