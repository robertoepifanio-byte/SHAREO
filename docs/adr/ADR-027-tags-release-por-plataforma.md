# ADR-027 — Tags de release prefixadas por plataforma (`web-v*` / `mobile-v*`)

**Status:** Accepted (2026-07-09)
**Data:** 2026-07-09
**Decisores:** Fundadores, DevOps, Arquiteto.
**Contexto:** ShareO — monorepo (site Next.js na raiz + app React Native em `apps/mobile/`), duas plataformas com cadências de release independentes.

---

## Contexto

O monorepo publica **dois artefatos independentes**: o **site web** (deploy Vercel de produção, via `.github/workflows/deploy.yml`) e o **app mobile** (build EAS, via `.github/workflows/eas-release.yml`). Cada um evolui em sua própria cadência.

Até aqui a convenção era **assimétrica**:

- **Web:** tags planas `v*` (`v1.0.0` … `v1.11.0`) disparavam o job `production` do `deploy.yml`.
- **Mobile:** tags `mobile-v*` (introduzidas junto do `eas-release.yml`, 2026-07-07) disparavam o build EAS.

O prefixo mobile explícito já existia, mas o web usava o `v*` "genérico". Isso cria três problemas: (1) **ambiguidade** — `v*` parece "o release do repo", mas na prática só publica o web; (2) **assimetria** — dois esquemas conceituais diferentes para a mesma ideia (release por plataforma); (3) **risco de gatilho indevido** — qualquer tag começando com `v` (inclusive uma criada por engano ou por ferramenta) dispara o workflow inteiro de produção do site.

## Decisão

Adotar **tags de release prefixadas por plataforma**, simétricas:

| Plataforma | Prefixo | Workflow disparado | Exemplo (próximo release) |
|---|---|---|---|
| **Site (web)** | `web-v*` | `deploy.yml` → job `production` (com aprovação) | `web-v1.12.0` |
| **App mobile** | `mobile-v*` | `eas-release.yml` → build EAS | `mobile-v1.1.0` |

**Roteamento no CI (`deploy.yml`) — dois pontos load-bearing, alterados juntos:**
1. `on.push.tags: ["web-v*"]` (antes `["v*"]`).
2. Guard do job `production`: `startsWith(github.ref, 'refs/tags/web-v')` (antes `'refs/tags/v'`).

> ⚠️ **Os dois são obrigatórios e atômicos.** Mudar só o glob → o workflow dispara mas o job `production` nunca casa (o `if` ainda exige `refs/tags/v`, que não bate `refs/tags/web-v…`). Mudar só o `if` → tags `web-v*` nunca disparam o workflow.

**Não-colisão de prefixos:** `web-v*` casa `web-v1.12.0` mas **não** casa `mobile-v1.1.0` (prefixo `m`) nem `v1.11.0` (prefixo `v`). `mobile-v*` é disjunto de `web-v*`. Sem overlap.

**Versões de origem (source of truth):**
- **Web:** `package.json` (raiz) bumpado **1.11.0 → 1.12.0** agora (desacoplado do mobile e do device).
- **Mobile:** `apps/mobile/app.json`, `apps/mobile/package.json` e `AppFooter.tsx` (`APP_VERSION`) **permanecem em 1.0.0 por ora** — o bump para 1.1.0 é **deferido para o momento do release cut do `mobile-v1.1.0`** (ver "Acoplamento runtimeVersion" abaixo).

**Acoplamento `runtimeVersion` (por que o bump mobile é deferido):** `app.json` tem `runtimeVersion.policy = "appVersion"`, então o `runtimeVersion` é **derivado** de `expo.version`. Bumpar mobile 1.0.0 → 1.1.0 mudaria o `runtimeVersion` para `1.1.0`, e o **dev-client instalado no device** (buildado em `runtimeVersion 1.0.0`) passaria a divergir do manifest do Metro (que anunciaria `1.1.0`) — o `expo-dev-client` acusa incompatibilidade e pode bloquear o carregamento, **atritando a validação em device em andamento**. Como não há OTA (`expo-updates`) configurado, o `runtimeVersion` hoje só tem esse efeito de pareamento dev-client↔manifest. Logo, o bump mobile deve acontecer **junto com um novo build do dev-client** em `runtimeVersion 1.1.0`, no release cut — não antes. `versionCode` (Android) / `buildNumber` (iOS) **não** são tocados: `eas.json` usa `appVersionSource: "remote"` (o EAS gerencia e auto-incrementa no servidor).

## Gates operacionais (as tags NÃO são empurradas agora)

Adotar o **esquema** não significa cortar os **releases**. Nenhuma tag é empurrada nesta mudança:

- **`web-v1.12.0`** dispararia o deploy de **produção** — **bloqueado por D4** (parecer jurídico) e pela ausência do projeto Supabase `shareo-prd` (org FREE só cabe 2 projetos → upgrade Pro antes do go-live). Além do gate técnico, o job `production` exige **aprovação manual** no GitHub Environment `production`.
- **`mobile-v1.1.0`** dispararia o **build EAS** — **bloqueado pela ausência do secret `EXPO_TOKEN`** (o `eas-release.yml` falha no 1º step sem ele). Além disso exige o bump de versão + rebuild do dev-client (acima).

**Migração:** as tags antigas `v1.0.0`…`v1.11.0` permanecem no repositório como histórico — push events são one-shot, não re-disparam nada. Uma tag `v1.x` empurrada por engano **após** esta mudança **não** dispara o `deploy.yml` (o glob passou a ser `web-v*`) — comportamento desejado, comunicar ao time.

## Consequências

### Positivas
- **Simetria e clareza:** `web-v*`/`mobile-v*` deixam explícito qual plataforma cada tag publica; some o `v*` "genérico" ambíguo.
- **Isolamento de gatilho:** só uma tag deliberada `web-v*` dispara o deploy de produção do site — reduz o risco de disparo acidental por qualquer tag `v…`.
- **Cadências independentes** ficam formalizadas (web e mobile versionam e lançam separadamente).

### Negativas / custos
- **Dois pontos load-bearing** no `deploy.yml` (glob + `if`) precisam ser mantidos em sincronia — documentado aqui e com comentário no próprio workflow.
- **Descontinuidade de convenção:** quem estiver acostumado a `git tag v1.x` precisa migrar para `git tag web-v1.x`. Os docs de release (`docs/README.md`, `docs/checklist-go-live.md`, `README.md`) foram atualizados.

## Arquivos afetados

- `.github/workflows/deploy.yml` — glob `on.push.tags` + guard `if` do job `production` + comentários.
- `.github/workflows/eas-release.yml` — comentário de referência ao esquema web.
- `package.json` (raiz) — versão web 1.11.0 → 1.12.0.
- `README.md`, `docs/README.md`, `docs/checklist-go-live.md`, `docs/STATUS.md`, `docs/relatorios/relatorio-status-tecnico-s41.md`, `docs/juridico/{d4-cobranca-juridico,briefing-juridico-d4}.md`, `CLAUDE.md` — referências de convenção reprefixadas para `web-v*`.
- **Deferido** (release cut do mobile): `apps/mobile/app.json`, `apps/mobile/package.json`, `apps/mobile/components/layout/AppFooter.tsx` — bump 1.0.0 → 1.1.0.
