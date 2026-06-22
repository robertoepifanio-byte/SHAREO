# Checklist de Go-Live — ShareO

**Atualizado:** 2026-06-22 (s34) · **Para repasse aos fundadores** (complementa o material do **D4** e do **Mercado Pago**).

> Legenda: ✅ feito · 🟡 em andamento · ⬜ pendente · 🔵 decisão dos fundadores · ⚠️ ponto de atenção

---

## 0. 🔴 Bloqueador único

- ⬜ **D4 — parecer jurídico** (5 questões: Lei 12.865, fiscal, LGPD, CDC/Termos, PLD). **Nada vai a produção antes disso.** Detalhe em `docs/` + memória do D4.

---

## 1. Licenças de software

- ⚠️ 🔵 **Mapbox GL (`mapbox-gl` v3)** — **licença proprietária + custo por uso** (mapas e Geocoding tarifados). Único dep comercial. Decidir orçamento/limite na conta Mapbox.
- ⚠️ ⬜ **NextAuth `5.0.0-beta.31`** — está em **beta** num caminho crítico (auth). Definir versão GA + ADR-023 antes do go-live.
- 🧹 ⬜ **Remover dep morta** `@auth/prisma-adapter` (auth é JWT sem adapter).
- ✅ Demais dependências (Radix, React 19, Prisma 6, Tailwind, zod, resend, upstash, supabase-js, etc.) = licenças **permissivas** (MIT/ISC/Apache/BSD), sem copyleft no runtime.

---

## 2. Infraestrutura — provisionar ambiente de produção isolado

- ✅ **Vercel Pro** — pago/ativo (Team `shareo-marketplace`). Deploy por GitHub Actions (token).
- ⬜ **Supabase produção** — criar **3º projeto** (sa-east-1) via `migrate deploy` em banco **VAZIO** (validado em ARQ-ALTO-15). 🚨 **NUNCA clonar o staging** (carrega drift). Avaliar plano **Pro** (sem auto-pause, mais conexões, PITR).
- ⬜ **Upstash Redis de produção** — instância própria (rate limit + epoch de sessão; fail-open se ausente).
- ⬜ **Resend Pro** — domínio `shareo.com.br` já verificado; subir de Free→Pro (~US$20) quando escalar (~20-30 reservas/dia).
- ⬜ **Sentry produção** — projeto + `SENTRY_AUTH_TOKEN` válido. ⚠️ token expirado **quebra o build silenciosamente**.
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

- ⚠️ ⬜ **Rotacionar `CRON_SECRET`** — hoje está hardcoded no repo (`shareo-cron-2026`). Gerar valor forte só em produção.
- ⚠️ ⬜ **`E2E_BYPASS_DISABLED=true`** em produção; **NUNCA** colocar `E2E_SECRET` nem `SKIP_RATE_LIMIT` no runtime de prod (desliga rate limit).
- ⚠️ ⬜ **`NEXT_PUBLIC_*` NÃO podem ser "Sensitive"** no Vercel (senão não injetam no build → aparecem vazias).
- ⬜ Gerar **`AUTH_SECRET` e `ENCRYPTION_KEY` novos** para produção.
- ⬜ Setar `AUTH_URL`/`NEXTAUTH_URL`/`NEXT_PUBLIC_APP_URL` = domínio de produção.
- **Inventário de env vars de produção:** `DATABASE_URL`(+`DIRECT_URL`), `AUTH_SECRET`/`NEXTAUTH_SECRET`, `AUTH_URL`/`NEXTAUTH_URL`, `ENCRYPTION_KEY`, `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_STORAGE_BUCKET`, `RESEND_API_KEY`, `EMAIL_FROM`, `NEXT_PUBLIC_MAPBOX_TOKEN`, `UPSTASH_REDIS_REST_URL/TOKEN`, `SHAREO_WEBHOOK_SECRET`, `CRON_SECRET`, `E2E_BYPASS_DISABLED`, + (pagamento) `STRIPE_*` **ou** `MP_*`.

---

## 5. Pagamentos

- 🔵 ⬜ **Decisão:** Stripe live (+ KYC) **×** Mercado Pago (modelo A gateway × B marketplace) — ver `docs/mercadopago-procedimentos-fundadores.md`.
- ⚠️ ⬜ **Trocar o PIX pessoal do Raimundo pela conta PJ oficial** da ShareO (hoje é chave temporária no staging).
- ⬜ Configurar credenciais de **produção** do provedor escolhido + webhook + assinatura.

---

## 6. Banco de dados e dados de produção

- ✅ Integridade das migrations validada (`migrate deploy` 34/34 em banco vazio = zero drift — ARQ-ALTO-15).
- ⬜ **Replicar o fix da Data API** do Supabase em produção (remover `public` dos *Exposed schemas* — senão a `anon key` lê/edita tudo).
- ⬜ Seed mínimo de produção (categorias + admin SUPERADMIN + `PlatformConfig`).
- ⬜ **Backups/PITR** + política de retenção + runbook de restauração.

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
- ⬜ **Tag `v1.x` + GitHub Release**.

---

## ⚪ Não bloqueantes / pós go-live

- App **mobile (Expo)** — scaffold não testado; fora do go-live web.
- **GA4** (adiado — sem Measurement ID).
- **Perf em escala:** filtro de distância (Haversine em JS) → PostGIS; índices de admin/dashboard (medir com dados reais).
- **Node 20 deprecado** nos runners do GitHub (forçando Node 24) — atualizar versões das actions.

---

### Resumo
- **Software/licenças:** limpo, exceto **Mapbox** (comercial) e **NextAuth beta** (estabilidade).
- **Infra:** **Vercel Pro ✅ feito**; faltam **Supabase Pro, Upstash e Resend de produção** + ambiente prod isolado.
- **Bloqueador real:** **D4**. Os demais itens são o **checklist técnico do momento do go-live**.
