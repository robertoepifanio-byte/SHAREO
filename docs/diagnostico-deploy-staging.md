# Diagnóstico — Deploy de staging quebrado (2026-06-14, s17)

> **Status:** o staging (`shareo-rouge.vercel.app`) está **defasado há várias versões**. O auto-deploy "main → staging" descrito no CLAUDE.md **não está funcionando**. Nenhuma ação de deploy foi tomada — este documento registra o diagnóstico para tratamento posterior.

## Sintomas

- `https://shareo-rouge.vercel.app/seguranca` → **404** (página criada na onda-3, PR #13).
- `https://shareo-rouge.vercel.app/.well-known/security.txt` → **404** (também onda-3).
- Logo, **onda 3, onda 4, s15 e s16 nunca chegaram ao staging.** Toda a bateria E2E roda contra esse código antigo.
- No Vercel, os deploys recentes aparecem como **`Canceled by Ignored Build Step`** (inclusive os de `Production`/staging).

## Causa raiz (dois problemas independentes e somados)

### 1. A `main` não builda — erro de lint derruba `next build`
Confirmado com `pnpm build` local: **`Failed to compile`** em
`app/seguranca/page.tsx:29` — `react/no-unescaped-entities` (aspas literais em `"https://"`).
Como o `next.config` **não tem** `eslint.ignoreDuringBuilds`, qualquer erro de ESLint quebra o build inteiro.
O erro existe desde a criação da página (`2280b20`, onda-3) — por isso ela nunca subiu.

**Correção (1 linha):** em `app/seguranca/page.tsx:29`, trocar
`sem o "https://".` por `sem o &quot;https://&quot;.`
(Preparei esse fix nesta sessão, mas reverti — precisa ir por PR, não push direto na `main`.)

> Aviso da CI também mostra warnings (não-fatais) em `app/perfil/_IdVerification.tsx`
> (`@typescript-eslint/no-unused-expressions`) — não bloqueiam o build, mas valem limpeza.

### 2. O Vercel cancela os deploys disparados por git (`Ignored Build Step`)
Mesmo com o build corrigido, o auto-deploy não dispara: a etapa "Ignored Build Step" do projeto cancela os builds vindos do git. **Pode ser intencional** (alguém configurou para segurar deploys) — confirmar antes de sobrepor.

Para forçar um deploy manual (procedimento já documentado no CLAUDE.md):
```
npx vercel --prod
```
Isso sobe **onda 3/4/s15/s16 + o fix do forgot-password de uma vez** — revisar o que vai ao ar.

## Blocker adicional — provisionamento de banco novo (NÃO afeta o build/deploy atual)

O job **Tests** da CI falha em `prisma migrate deploy` num banco limpo:
`P3018 / 55P04: unsafe use of new value "DELETED" of enum type "ItemStatus"`.
É a armadilha PG documentada no CLAUDE.md (`ALTER TYPE ... ADD VALUE` + uso na mesma transação).
Uma das migrations em `prisma/migrations` precisa **separar o `ADD VALUE` do uso em 2 SQLs**.
⚠️ **Isso vai quebrar a criação do Supabase de produção (pós-D4)** — `migrate deploy` do zero falhará igual. O staging atual não sofre porque o enum já foi commitado lá.

## Checklist de remediação sugerida

1. [ ] PR com o fix de lint do `/seguranca` (1 linha) → `main` volta a buildar.
2. [ ] (Opcional) limpar warnings de `_IdVerification.tsx`.
3. [ ] Decidir sobre o `Ignored Build Step`: reabilitar auto-deploy **ou** padronizar deploy manual via `npx vercel --prod`.
4. [ ] Forçar 1 deploy de staging e validar: `/seguranca` 200, `security.txt` 200, e o fix do forgot-password (2+ POSTs consecutivos retornam body) → roda `security2 #19` verde.
5. [ ] Corrigir a migration `ItemStatus`/`DELETED` (split em 2 SQLs) **antes** de criar o Supabase de produção.
6. [ ] Investigar por que o GitHub Actions "Deploy - ShareO" está vermelho (era o caminho de deploy?).

## Contexto

- O fix do forgot-password (Response singleton → 200 com body vazio) já está **mesclado na `main`** (PR #15, commits `bea8da7` + `c506bba`), mas **não no staging** enquanto o pipeline não for destravado.
- Ver memória `[[feedback-nextresponse-singleton]]` e `[[project-e2e-suite]]`.
