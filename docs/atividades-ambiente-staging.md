# Atividades — Ambiente Staging

**Data**: 26/05/2026  
**Objetivo**: Tudo que precisa estar pronto antes do primeiro deploy em staging e do início do Sprint 1  
**Referência**: `revisao-pre-sprint1.md` — itens ❌ bloqueadores e checklist Sprint 0

---

## 1. GitHub — Environments e Secrets

> **Bloqueador B7** — sem isso o pipeline de CI/CD não consegue fazer deploy

- [ ] Criar environment `staging` em **Settings → Environments** no repositório GitHub
- [ ] Adicionar os seguintes secrets ao environment `staging`:

| Secret | Descrição |
|---|---|
| `SUPABASE_URL` | URL do projeto Supabase staging |
| `SUPABASE_ANON_KEY` | Chave pública do Supabase staging |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de serviço do Supabase staging (nunca exposta no cliente) |
| `NEXTAUTH_SECRET` | String aleatória ≥ 32 chars (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | URL do preview Vercel para staging |
| `RESEND_API_KEY` | Chave da API Resend para envio de e-mails transacionais |
| `NEXT_PUBLIC_SUPABASE_URL` | Mesmo valor de `SUPABASE_URL` (variável pública) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Mesmo valor de `SUPABASE_ANON_KEY` (variável pública) |

---

## 2. Supabase — Staging

- [ ] Confirmar que o projeto Supabase staging está provisionado (`.env.local` já existe — verificar conectividade)
- [ ] Confirmar que a extensão PostGIS está ativa: `SELECT postgis_version();`
- [ ] Confirmar que as migrations foram aplicadas com sucesso:
  - `init` (22/05/2026)
  - `add_slug_and_soft_deletes` (25/05/2026)
- [ ] Rodar `npx prisma migrate deploy` apontando para staging antes do primeiro deploy

---

## 3. Vercel — Projeto e Deploy

- [ ] Criar projeto no Vercel e linkar com o repositório GitHub
- [ ] Configurar as variáveis de ambiente no Vercel (mesmo conjunto dos secrets do GitHub, environment `staging`)
- [ ] Confirmar que o deploy de preview automático por PR está ativo
- [ ] Confirmar que o deploy do branch `main` aponta para o environment `staging`

---

## 4. Código — Pendências antes do primeiro PR

- [ ] Instalar `eslint-plugin-jsx-a11y` e adicionar ao `.eslintrc.json`:
  ```bash
  pnpm add -D eslint-plugin-jsx-a11y
  ```
- [ ] Implementar geração automática de slug em `app/api/items/route.ts` ao criar um item:
  - Formato: `{titulo}-em-{cidade}-{uf}-{ulid}`
  - Slugify: caracteres especiais → ASCII, espaços → hífens, lowercase
  - Campo `slug` já existe no schema (`Item.slug String @unique`)

---

## 5. CI/CD — Verificação do pipeline

- [ ] Confirmar que o job `e2e` (Playwright) passa no CI com o ambiente staging provisionado
- [ ] Confirmar que o job `audit` (`pnpm audit`) não retorna vulnerabilidades críticas
- [ ] Confirmar que o job `test` passa com o threshold de cobertura zerado (temporário)
- [ ] Confirmar que `.github/dependabot.yml` está configurado corretamente

---

## 6. Smoke test pós-deploy

- [ ] Acessar a URL de staging após o primeiro deploy
- [ ] Verificar que a página inicial carrega sem erros de console
- [ ] Verificar que o fluxo de autenticação (login/cadastro) funciona
- [ ] Verificar que as variáveis de ambiente estão sendo lidas corretamente (sem erros 500)
- [ ] Rodar `e2e/smoke.spec.ts` apontando para a URL de staging

---

## Checklist de "pronto para staging"

| Item | Status |
|---|---|
| GitHub environment `staging` criado com todos os secrets | ☐ |
| Supabase staging com PostGIS + migrations aplicadas | ☐ |
| Vercel project criado e linkado | ☐ |
| Variáveis de ambiente configuradas no Vercel | ☐ |
| `eslint-plugin-jsx-a11y` instalado | ☐ |
| Slug automático implementado em `app/api/items/route.ts` | ☐ |
| Pipeline CI/CD verde (lint + test + e2e + audit) | ☐ |
| Smoke test pós-deploy aprovado | ☐ |

---

*Gerado em 26/05/2026 — referência: `docs/revisao-pre-sprint1.md`*
