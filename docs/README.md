# docs/ — Índice

Reorganizado em 2026-07-07 (diagnóstico de estrutura). Regra: **documentos vivos na raiz, arquiváveis em subpastas temáticas**. PDFs/DOCX não são versionados (`.gitignore`) — gere-os on-demand a partir dos `.md` (pipeline `npx marked` + Chrome headless).

## Vivos (raiz)

| Arquivo | Papel |
|---|---|
| `STATUS.md` | Estado atual do projeto (fonte do `/shareo-status`) |
| `backlog-atividades-priorizadas.md` | Backlog P0–P3 |
| `backlog-site-padroes-pos-validacao-mobile.md` | Backlog de paridade site↔app |
| `checklist-go-live.md` | Checklist de produção (gated D4) |
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
- **`api/`**, **`bugs/`**, **`metas/`**, **`migrations/`**, **`user-stories/`** — como os nomes dizem
