# Checklist de Go-Live — ShareO

**Atualizado:** 2026-06-27 (s39) · **Para repasse aos fundadores** (complementa o material do **D4** e do **Mercado Pago**).

> Legenda: ✅ feito · 🟡 em andamento · ⬜ pendente · 🔵 decisão dos fundadores · ⚠️ ponto de atenção

---

## 0. 🔴 Bloqueador único

- ✅ **D4 — parecer jurídico FORMAL recebido (30/06/2026)**, revisado com o Mercado Pago como PSP — `docs/juridico/parecer-juridico-revisado-mp.md`. É a **condição 1 de 4** do go-live. ⚠️ **Isto NÃO libera produção**, e o quadro mudou em 24/08: (2) ✅ **fechada** — o MP foi descartado, o contrato que a travava ficou sem objeto, e a conta plataforma da Stripe está no CNPJ da PJ; (3) 🟡 a **identificação da PJ já está publicada** (razão social + CNPJ + sede em `/termos`, `/privacidade`, `/politicas`), mas os textos **ainda descrevem o MP como operador** e precisam ser reescritos junto com a análise de transferência internacional; (4) checklist 100% (B3 regime tributário, C2 DPAs, C3 RIPD+DPO). ⚠️ O parecer citado acima analisou o **Mercado Pago** — ver a ressalva no topo dele.

---

## 1. Licenças de software

- ⚠️ 🔵 **Mapbox GL (`mapbox-gl` v3)** — **licença proprietária + custo por uso** (mapas e Geocoding tarifados). Único dep comercial. Decidir orçamento/limite na conta Mapbox.
- ⚠️ ⬜ **NextAuth `5.0.0-beta.32`** — segue em **beta** num caminho crítico (auth); item VÁLIDO, só a versão estava velha (era beta.31, subiu em 04/08 corrigindo 3 CVEs). Definir versão GA + ADR-023 antes do go-live.
- 🧹 ⬜ **Remover dep morta** `@auth/prisma-adapter` (auth é JWT sem adapter).
- ✅ Demais dependências (Radix, React 19, Prisma 6, Tailwind, zod, resend, upstash, supabase-js, etc.) = licenças **permissivas** (MIT/ISC/Apache/BSD), sem copyleft no runtime.

---

## 2. Infraestrutura — provisionar ambiente de produção isolado

- ✅ **Vercel Pro** — pago/ativo (Team `shareo-marketplace`). Deploy por GitHub Actions (token).
- ✅ **Projeto Vercel `shareo-prod` criado e testado (05/08/2026)** — topologia atual: dev=local · staging=`shareo` · prod=`shareo-prod`, com Deployment Protection ativa (uso interno). O **bug latente que este item alertava foi corrigido** no PR #262: os jobs `staging` e `production` do `deploy.yml` usavam o MESMO `VERCEL_PROJECT_ID` e uma tag `web-v*` jogaria o build de produção no slot do staging. Hoje o job `production` usa `VERCEL_PROJECT_ID_PROD` + `AUTH_SECRET_PROD`/`ENCRYPTION_KEY_PROD`/`HMAC_KEY_PROD` dedicados (verificado: 3 ocorrências de `VERCEL_PROJECT_ID_PROD` no workflow).
- 🗓️ **Supabase produção** — **AGENDADO p/ 1ª semana de julho/2026** (migração para licença **Pro**, decisão dos fundadores). Criar **3º projeto** `shareo-prd` (sa-east-1, org corporativa) via `migrate deploy` em banco **VAZIO** (validado em ARQ-ALTO-15). 🚨 **NUNCA clonar o staging** (carrega drift). Pro = sem auto-pause, mais conexões, PITR. **Os secrets `DATABASE_URL_PROD` / `NEXT_PUBLIC_SUPABASE_*_PROD` só serão setados quando esse projeto existir.**
- ⬜ **Upstash Redis de produção** — instância própria (rate limit + epoch de sessão; fail-open se ausente).
- ⬜ **Resend Pro** — domínio `shareo.com.br` já verificado; subir de Free→Pro (~US$20) quando escalar (~20-30 reservas/dia).
- 🟢 **Sentry** — **Free atende o lançamento** (projeto `shareo-web` na org `shareo-ow` já ativo; sampling enxuto: 10% traces, sem session replay → cota baixa). Usar o **mesmo projeto** com tag de `environment` separando staging × prod. **Team (~US$26/mês) só se:** >1 assento (Free = 1 usuário), volume acima da cota, ou retenção/recursos avançados. ⚠️ **2 ajustes técnicos:** (a) hoje `environment=NODE_ENV` → staging e prod aparecem ambos como "production"; usar `VERCEL_ENV`/`NEXT_PUBLIC_SENTRY_ENV` para separar; (b) `SENTRY_AUTH_TOKEN` não pode expirar (**quebra o build silenciosamente**).
- ⚠️ **Mapbox** — billing/limite (ver §1).
- ⬜ **GitHub environment `production`** com **Required Reviewers** (aprovação manual do deploy).

---

## 3. DNS e domínio

- ✅ `staging.shareo.com.br` (A → Vercel) ativo.
- ⬜ Apontar **apex `shareo.com.br` + `www`** para a Vercel (A/CNAME) — hoje reservados (apex no WebsiteBuilder GoDaddy).
- 🚨 **NUNCA trocar os NS para a Vercel** — quebra o e-mail (Zoho/Resend). Manter DNS na GoDaddy, só apontar registros.
- ⬜ SSL pela Vercel (automático após o registro).

---

## 4. Segredos e configuração de produção

- ✅ **`CRON_SECRET` ROTACIONADO (14/08/2026), staging e produção.** O literal saiu do repo em 13/08 (#306), mas remover não invalida — o valor seguia no histórico do git, público. Rotacionado nos dois ambientes com valores distintos (256 bits), Vercel env + GitHub Secret dos dois lados (`CRON_SECRET` 13:55, `CRON_SECRET_PROD` 15:54), com redeploy.
  - **Prova em staging:** o segredo antigo passou de `200` para **`401`** em `/api/cron/purge-consent-ips`, com `/api/health` seguindo `200`. Antes da rotação o mesmo comando executava o cron — qualquer pessoa na internet conseguia, sem credencial nem sessão.
  - **Gotcha do redeploy:** reexecutar o run mais recente NÃO deploya se os últimos commits forem só de docs — o job `changes` gateia por mudança de web e o workflow fica verde sem ter deployado. Foi preciso reexecutar o job `Deploy Staging` do último commit que tocou o app.
  - ⚠️ **Não verificável de fora em produção:** o `shareo-prod` está atrás da Deployment Protection, então qualquer sonda leva 302 antes de chegar ao app — o resultado seria idêntico com ou sem a rotação. O sinal válido é o **painel de Cron Jobs do Vercel**: execuções verdes = segredo correto; 401 = divergência entre Vercel env e o que o cron envia.
- ⚠️ ⬜ **`E2E_BYPASS_DISABLED=true`** em produção; **NUNCA** colocar `E2E_SECRET` nem `SKIP_RATE_LIMIT` no runtime de prod (desliga rate limit).
- ⚠️ ⬜ **`NEXT_PUBLIC_*` NÃO podem ser "Sensitive"** no Vercel (senão não injetam no build → aparecem vazias).
- ⬜ Gerar **`AUTH_SECRET` e `ENCRYPTION_KEY` novos** para produção.
- ⬜ Setar `AUTH_URL`/`NEXTAUTH_URL`/`NEXT_PUBLIC_APP_URL` = domínio de produção.
- **Inventário de env vars de produção:** `DATABASE_URL`(+`DIRECT_URL`), `AUTH_SECRET`/`NEXTAUTH_SECRET`, `AUTH_URL`/`NEXTAUTH_URL`, `ENCRYPTION_KEY`, `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_STORAGE_BUCKET`, `RESEND_API_KEY`, `EMAIL_FROM`, `NEXT_PUBLIC_MAPBOX_TOKEN`, `UPSTASH_REDIS_REST_URL/TOKEN`, `SHAREO_WEBHOOK_SECRET`, `CRON_SECRET`, `E2E_BYPASS_DISABLED`, + (pagamento) `STRIPE_*` **ou** `MP_*`.

---

## 5. Pagamentos

- 🔵 ⬜ **Decisão:** Stripe live (+ KYC) **×** Mercado Pago (modelo A gateway × B marketplace) — ver `docs/juridico/mercadopago-procedimentos-fundadores.md`.
- ⚠️ ⬜ **Trocar o PIX pessoal do Raimundo pela conta PJ oficial** da ShareO (hoje é chave temporária no staging).
- ⬜ Configurar credenciais de **produção** do provedor escolhido + webhook + assinatura.

---

## 6. Banco de dados e dados de produção

- ✅ Integridade das migrations validada (`migrate deploy` 34/34 em banco vazio = zero drift — ARQ-ALTO-15).
- ⬜ **Replicar o fix da Data API** do Supabase em produção (remover `public` dos *Exposed schemas* — senão a `anon key` lê/edita tudo).
- ⬜ Seed mínimo de produção (categorias + admin SUPERADMIN + `PlatformConfig`).
- ⬜ **Backups/PITR** + política de retenção + runbook de restauração.
  - 🔗 Bloqueia fechar o texto de retenção na Política de Privacidade: a frase
    sobre cópias de segurança ficou SEM prazo (aprovado por Raimundo em 02/09)
    porque a rotação ainda não está configurada. Definido o prazo aqui, o número
    entra na frase — ver `docs/juridico/redacao-lgpd-retencao-2026-09-02.md`.

---

## 7. Segurança (remediada na auditoria s33 — confirmar ativa em produção)

- ✅ Guards server-side de propriedade (RLS off é decisão arquitetural); rate limits; idempotência Stripe; sem bypass admin no middleware; CSP com nonce; LGPD (AES-256-GCM, delete art.18, export art.20, DPO).
- 🟡 **SEC-ALTO-07** (hash do token de e-mail) — PR [#90](https://github.com/robertoepifanio-byte/SHAREO/pull/90), CI verde, **aguardando merge**.
- ⬜ NextAuth GA (ver §1).

---

## 8. Observabilidade e operação

- ⬜ **Monitor de uptime** (Uptime Robot) — meta 99.9%.
- ⬜ **Alertas Sentry** (novo issue + taxa de erro).
- ⬜ **Runbook** de incidente de deploy.

---

## 9. Verificação final e release

- ⬜ Smokes E2E contra produção (com cuidado para **não poluir dados reais**).
- ⬜ Lighthouse (LCP<2,5s / CLS<0,1 / INP<200ms).
- ⬜ **Tag `web-v1.12.0` + GitHub Release** (convenção web-v*, ver ADR-027).

---

## ⚪ Não bloqueantes / pós go-live

- App **mobile (Expo)** — scaffold não testado; fora do go-live web.
- **GA4** (adiado — sem Measurement ID).
- **Perf em escala:** filtro de distância (Haversine em JS) → PostGIS; índices de admin/dashboard (medir com dados reais).
- **Node 20 deprecado** nos runners do GitHub (forçando Node 24) — atualizar versões das actions.

---

### Resumo
- **Software/licenças:** limpo, exceto **Mapbox** (comercial) e **NextAuth beta** (estabilidade).
- **Infra:** **Vercel Pro ✅ feito**; faltam **projeto Vercel `shareo-prod` separado** (+ fix `VERCEL_PROJECT_ID_PROD` no `deploy.yml`), **Supabase Pro, Upstash e Resend de produção** + ambiente prod isolado.
- **Bloqueador real:** **D4**. Os demais itens são o **checklist técnico do momento do go-live**.
