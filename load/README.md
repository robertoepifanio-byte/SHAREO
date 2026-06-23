# Testes de Carga — ShareO (k6)

Suíte de testes de carga/stress para os endpoints de leitura do ShareO,
cobrindo `GET /api/items` (listagem e busca) e `GET /api/items/[id]` (detalhe).

---

## AVISO IMPORTANTE

**Nunca rode os perfis `load` ou `stress` contra `staging.shareo.com.br`.**

O staging usa Supabase Free Tier (limite de 200 conexoes simultaneas e pool
PgBouncer restrito) e Upstash com rate limit de producao. Rodar carga
agressiva contra o staging:

- Derruba o banco para usuarios reais e para os testers de QA
- Aciona o rate limit do Upstash, bloqueando usuarios legitimos
- Gera alertas falsos no Sentry, mascarando erros reais

Os perfis `load` e `stress` sao para **ambiente local** (`http://localhost:3000`)
ou um ambiente dedicado a testes de carga, completamente separado do staging
de validacao. O perfil `smoke` pode ser usado apos deploys locais.

---

## Instalacao do k6

### Windows

```powershell
# Winget (recomendado)
winget install k6 --source winget

# Chocolatey
choco install k6

# Binario direto
# https://github.com/grafana/k6/releases — baixar k6_v*_windows_amd64.zip
```

### macOS

```bash
brew install k6
```

### Linux (Debian/Ubuntu)

```bash
sudo gpg -k
sudo gpg --no-default-keyring \
  --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 \
  --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" \
  | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6
```

### Verificar instalacao

```bash
k6 version
# k6 v2.x.x (...)
```

---

## Estrutura

```
load/
  lib/
    common.js   — helpers, BASE_URL, checks, fetchFirstItemId()
  smoke.js      — 1 VU, 6 iteracoes (~20s) — sanidade pos-deploy local
  load.js       — ate 30 VUs, ~6min — carga moderada/realista
  stress.js     — ate 100 VUs, ~7min — stress/pico para encontrar limite
  README.md     — este arquivo
```

---

## Como rodar

### Perfil Smoke (rapido — para validacao local)

```bash
# Sobe o dev server primeiro
pnpm dev &
# Aguarde "Ready on http://localhost:3000"

# Roda o smoke (1 VU, 6 iteracoes, ~20s)
k6 run load/smoke.js

# Ou com BASE_URL explicito
k6 run --env BASE_URL=http://localhost:3000 load/smoke.js

# Alternativa via package.json
pnpm test:load
```

### Perfil Load (carga moderada)

```bash
# Requer ambiente local ou dedicado — NAO use staging
k6 run --env BASE_URL=http://localhost:3000 load/load.js
```

### Perfil Stress (carga extrema)

```bash
# Requer ambiente local ou dedicado — NUNCA use staging
k6 run --env BASE_URL=http://localhost:3000 load/stress.js
```

### Parametros uteis

```bash
# Sobrescrever VUs e duracao (util para testes rapidos)
k6 run --vus 5 --duration 30s --env BASE_URL=http://localhost:3000 load/load.js

# Output detalhado em JSON (para analise posterior)
k6 run --out json=load-results.json --env BASE_URL=http://localhost:3000 load/load.js

# Apenas inspecionar o script sem gerar trafego
k6 inspect load/smoke.js
k6 inspect load/load.js
k6 inspect load/stress.js
```

---

## O que cada perfil faz

### smoke.js

| Parametro | Valor |
|---|---|
| VUs | 1 |
| Iteracoes | 6 |
| Duracao estimada | ~20s |
| Proposito | Sanidade rapida apos deploy local |

Cenarios cobertos (1 VU, ciclando):
- `GET /api/items` — listagem padrao
- `GET /api/items?search=<termo>` — busca textual
- `GET /api/items/<id>` — detalhe (id capturado dinamicamente via `setup()`)

Thresholds:
- `http_req_failed < 5%` (smoke e tolerante — qualquer falha ja e sinal de problema grave)
- `http_req_duration p(95) < 3s`
- `checks > 90%`

### load.js

| Parametro | Valor |
|---|---|
| VUs maximo | 30 |
| Duracao total | ~6 min |
| Proposito | Carga realista de producao |

Fases:
1. `0→5 VUs` em 30s (aquecimento)
2. `5→15 VUs` em 60s (rampa)
3. `15→30 VUs` em 90s (pico moderado)
4. `30 VUs` por 3 min (sustentado)
5. `30→0 VUs` em 30s (ramp-down)

Mix de cenarios (imitando comportamento real):
- 50%: `GET /api/items` com paginacao e filtros de preco
- 30%: `GET /api/items?search=<termo>` (busca textual)
- 20%: `GET /api/items/<id>` (detalhe)

Thresholds:
- `http_req_failed < 1%`
- `http_req_duration p(95) < 1.5s` (SLO geral)
- `shareo_listing_duration p(95) < 1.2s`
- `shareo_search_duration p(95) < 1.5s`
- `shareo_detail_duration p(95) < 1s`
- `checks > 95%`

### stress.js

| Parametro | Valor |
|---|---|
| VUs maximo | 100 (spike) |
| Duracao total | ~7 min |
| Proposito | Encontrar ponto de ruptura |

Fases:
1. `0→10 VUs` em 30s
2. `10→50 VUs` em 60s
3. `50 VUs` por 2 min
4. **Spike:** `50→100 VUs` em 30s
5. `100 VUs` por 1 min (pico extremo)
6. `100→30 VUs` em 30s (recuperacao)
7. `30 VUs` por 1 min (verificar estabilizacao)
8. `30→0 VUs` em 30s

Mix de cenarios (foco nas queries mais custosas):
- 60%: listagem com paginacao
- 25%: busca textual (ILIKE no PostgreSQL)
- 15%: detalhe (payload maior com reviews e imagens)

Thresholds (mais permissivos — objetivo e encontrar limite, nao passar):
- `http_req_failed < 10%`
- `http_req_duration p(95) < 5s`
- `http_req_duration p(99) < 10s` (timeout absoluto)
- `checks > 80%`

Interpretacao:
- P95 < 2s: sistema aguenta bem
- P95 2s–5s: zona de alerta — investigar pool de conexoes e queries lentas
- P95 > 5s ou error_rate > 10%: ponto de ruptura encontrado — reportar ao Arquiteto

---

## Parametrizacao por BASE_URL

Todos os perfis usam `__ENV.BASE_URL` com default seguro `http://localhost:3000`.
O default NUNCA aponta para o staging ou producao.

```bash
# Local (default — sem precisar passar a variavel)
k6 run load/smoke.js

# Ambiente de testes de carga dedicado (separado do staging de QA)
k6 run --env BASE_URL=http://meu-ambiente-carga:3000 load/load.js
```

---

## Execucao no CI

Os perfis k6 **NAO estao no pipeline de CI** (.github/workflows/).
Motivos:
1. Requerem o binario k6 instalado (nao e dependencia npm)
2. Requerem um alvo dedicado com banco real populado
3. Rodar no CI contra staging prejudicaria a validacao continua dos testers

Para integracao futura (H2/H3), considerar:
- Ambiente de carga dedicado com seed automatico
- Job separado no GitHub Actions com `runs-on: self-hosted`
- Thresholds de regressao de performance como gate de release

---

## Dicas de analise

Apos rodar `load.js` ou `stress.js`, preste atencao em:

1. **`shareo_listing_duration` P95** — se > 1.2s, investigar query `findMany` + `count`
2. **`shareo_search_duration` P95** — se > 1.5s, avaliar indice GIN no PostgreSQL para full-text
3. **`http_req_failed` rate** — qualquer falha acima de 1% em `load` e critica
4. **Recuperacao apos spike** — no `stress`, verificar se P95 volta ao nivel pre-spike apos ramp-down
5. **Conexoes Supabase** — monitorar o dashboard do Supabase durante o teste local

Para correlacionar com o banco:
- Supabase Dashboard > Database > Query Performance (queries lentas)
- Sentry > Performance > Transactions (se Sentry estiver configurado localmente)
