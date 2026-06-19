# ADR-023 — Correção da migration `consolidate_item_status` para deploy em DB fresco

**Status:** Aceito
**Data:** 2026-06-15
**Decisores:** arquiteto-shareo
**Consulted:** devops-shareo, qa-shareo
**Relacionado:** CLAUDE.md "Migrations Prisma — lições" (regra `ALTER TYPE ADD VALUE` + `UPDATE` na mesma transação), [diagnóstico de deploy staging](../diagnostico-deploy-staging.md)

---

## Contexto

O banco de **produção do ShareO ainda não existe** — será criado do zero somente após D4 (consulta jurídica, bloqueador total). Quando esse momento chegar, a criação do schema será feita via `prisma migrate deploy` apontando para o novo Supabase de produção, partindo de um DB completamente vazio.

A migration `prisma/migrations/20260603100000_consolidate_item_status/migration.sql` viola a regra documentada no `CLAUDE.md` ("`ALTER TYPE ... ADD VALUE` e `UPDATE` na mesma transação PG → inválido; separar em dois SQLs"). Ela contém, no mesmo arquivo (= mesma transação que o Prisma abre por arquivo):

```sql
-- linha 11
ALTER TYPE "ItemStatus" ADD VALUE IF NOT EXISTS 'DELETED';

-- linhas 14–16
UPDATE "items" SET "status" = 'DELETED'
WHERE "isActive" = false AND "deletedAt" IS NOT NULL;
```

O PostgreSQL recusa esse padrão com erro `55P04` ("unsafe use of new value 'DELETED' of enum type ItemStatus"): um valor adicionado por `ALTER TYPE ... ADD VALUE` só pode ser referenciado como literal **depois** que a transação que o introduziu for commitada.

Por que passou despercebido nos ambientes atuais:

- Em **local** (`jtianehxosfdrhjzqvqj`) e **staging** (`fflpuoluiqmhpvcxubqi`) a migration já consta como aplicada na tabela `_prisma_migrations`. O Prisma não tenta reaplicá-la — então o erro nunca aconteceu nesses bancos.
- Num **DB fresco** (futuro banco de produção), a migration será executada pela primeira vez e quebrará, travando o `prisma migrate deploy` e impedindo o go-live.

---

## Opções Consideradas

### A. Editar a migration existente, separando em duas transações no mesmo diretório

- **Como:** mover os `UPDATE` para um segundo arquivo ou separar com `COMMIT;` (Prisma não suporta múltiplos blocos transacionais em um único `.sql`).
- **Prós:** elegante para o futuro DB de produção.
- **Contras:** quebra o checksum SHA registrado em `_prisma_migrations` nos DBs de local e staging. O `prisma migrate deploy` e o `prisma migrate dev` passam a falhar com `P3019` ("migration modified after applied"). Exigiria patch manual em todos os DBs existentes (UPDATE em `_prisma_migrations` ou `prisma migrate resolve --rolled-back && --applied`), com risco operacional alto no staging compartilhado.

### B. Migration corretiva com timestamp ANTERIOR a `20260603100000` adicionando `DELETED` ao enum em transação própria — **escolhida**

- **Como:** criar `20260603050000_add_item_status_deleted_value/migration.sql` contendo apenas `ALTER TYPE "ItemStatus" ADD VALUE IF NOT EXISTS 'DELETED';`. A migration original `20260603100000_consolidate_item_status` permanece **intocada** (checksum preservado).
- **Como funciona em DB fresco:** o Prisma aplica as migrations em ordem lexicográfica. A nova migration roda primeiro, em sua própria transação, e comita o valor `DELETED` no catálogo do PostgreSQL. Quando `20260603100000_consolidate_item_status` roda em seguida, seu `ALTER TYPE ... ADD VALUE IF NOT EXISTS 'DELETED'` vira no-op (o valor já existe), e os `UPDATE ... = 'DELETED'` funcionam porque o valor foi introduzido por uma transação **anterior** já commitada — exatamente o que o PostgreSQL exige.
- **Como funciona em local/staging (já migrados):** o diretório novo não consta em `_prisma_migrations`. Duas alternativas equivalentes:
  1. Deixar o `prisma migrate deploy` rodar a nova migration: como o SQL é idempotente (`IF NOT EXISTS`) e o valor já existe, é um no-op real e o Prisma registra a migration como aplicada.
  2. Marcar a migration como aplicada sem executar SQL via `npx prisma migrate resolve --applied 20260603050000_add_item_status_deleted_value` em cada ambiente. Mais explícito; recomendado para staging.
- **Prós:** zero modificação em migration já aplicada → zero quebra de checksum. Solução compatível com a regra documentada no `CLAUDE.md`. SQL idempotente, seguro de rodar duas vezes.
- **Contras:** timestamp "fora de ordem" relativo à hora real em que foi escrito (15/06 batizado como 03/06 05:00). O Prisma pode emitir aviso de "migration out of order" no `migrate dev` (não bloqueante). Mitigação: comentário explicativo no próprio arquivo SQL e este ADR.

### C. Aceitar o bug e refazer o banco de produção manualmente (via `db push` ou aplicar a migration em duas partes "à mão" no momento do go-live)

- **Prós:** zero mudança no repo agora.
- **Contras:** torna o go-live de produção um procedimento manual, frágil, sem reprodutibilidade. Viola o princípio de que `prisma migrate deploy` deve ser a fonte única de verdade da criação do schema. Descartada.

---

## Decisão

**Opção B.** Adicionar a migration `prisma/migrations/20260603050000_add_item_status_deleted_value/migration.sql` contendo apenas o `ALTER TYPE "ItemStatus" ADD VALUE IF NOT EXISTS 'DELETED';`. A migration `20260603100000_consolidate_item_status` permanece exatamente como está (sem nenhuma alteração de bytes — checksum preservado).

### Por que essa abordagem ganha

1. **DB fresco funciona:** ordem lexicográfica garante que a transação que introduz `DELETED` é commitada antes da transação que faz `UPDATE ... = 'DELETED'`.
2. **DBs existentes não quebram:** nenhum checksum é alterado; a nova migration é idempotente e pode ser tanto aplicada (no-op) quanto reconciliada via `prisma migrate resolve`.
3. **Compatível com a regra do `CLAUDE.md`:** explicita a separação `ALTER TYPE` ↔ `UPDATE` em transações distintas, alinhada à lição documentada.
4. **Reversibilidade trivial:** se algum dia for necessário, basta `DROP TYPE`/recriar (mesmo nível de reversibilidade que qualquer enum em Postgres).

---

## Consequências

### Imediato

- Repositório passa a ter 27 diretórios em `prisma/migrations/`.
- O arquivo `prisma/migrations/20260603100000_consolidate_item_status/migration.sql` **não** é modificado por este PR.

### Em local (DB `jtianehxosfdrhjzqvqj`)

Após pull desta branch:
```bash
# Opção 1 — deixar Prisma aplicar como no-op:
npx prisma migrate deploy

# Opção 2 — marcar como aplicada sem rodar SQL:
npx prisma migrate resolve --applied 20260603050000_add_item_status_deleted_value
```
Ambas devem terminar sem erros. Verificar com `npx prisma migrate status` (deve reportar "Database schema is up to date").

### Em staging (DB `fflpuoluiqmhpvcxubqi`)

Após merge em `main` e deploy automático no Vercel, o build do Vercel **não roda `prisma migrate deploy` automaticamente** (não há `postinstall` ou `build` que dispare migrations no `package.json` atual — confirmar antes do merge). Reconciliação explícita recomendada, **com o `.env.staging-migrate` apontando para `fflpuoluiqmhpvcxubqi`**:

```bash
# Carregar variáveis de ambiente de staging
DATABASE_URL=... DIRECT_URL=... \
  npx prisma migrate resolve --applied 20260603050000_add_item_status_deleted_value
```

Se a equipe optar por deixar `migrate deploy` rodar como no-op em staging, validar antes com `npx prisma migrate status` apontado para staging e confirmar que apenas a nova migration aparece como pendente. O SQL é idempotente e seguro.

### Em produção (DB ainda não existe)

Quando o D4 for liberado e o Supabase de produção for criado:
```bash
DATABASE_URL=... DIRECT_URL=... npx prisma migrate deploy
```
deve rodar **todas** as 27 migrations de cabo a rabo sem erro. A nova migration garante que `20260603100000_consolidate_item_status` encontre o valor `DELETED` já commitado.

### Para o desenvolvedor que executar `prisma migrate dev` no futuro

O Prisma pode mostrar um aviso de "migrations out of order" porque o timestamp da nova migration (`20260603050000`) é anterior ao último timestamp aplicado (`20260612220000_add_coupons`). Esse aviso é informativo, não bloqueante, e está documentado no comentário do próprio arquivo SQL.

---

## Quando reavaliar

- Se o time decidir adotar uma convenção mais rígida de timestamps "monotonicamente crescentes" para migrations, esta decisão será revisitada — mas a alternativa seria editar uma migration já aplicada, o que tem custo operacional maior.
- Se aparecer uma terceira armadilha do tipo `ALTER TYPE ADD VALUE` + uso imediato no repositório, é momento de criar um lint/checagem CI dedicada (`grep` no `migration.sql` por `ADD VALUE` seguido de uso na mesma transação).
- Se o Vercel passar a rodar `prisma migrate deploy` no build (hoje não roda), reavaliar o processo de reconciliação em staging para não rodar SQL no-op em todo deploy.

---

## Verificação manual sugerida (sem aplicar em DB real)

Inspeção pura do SQL (já feita):

1. ✅ O novo arquivo contém **apenas** o `ALTER TYPE ADD VALUE IF NOT EXISTS`. Nenhum `UPDATE`/`SELECT` com literal `'DELETED'`.
2. ✅ O timestamp `20260603050000` é estritamente menor que `20260603100000` em ordem lexicográfica.
3. ✅ A migration original `20260603100000_consolidate_item_status/migration.sql` continua bit-a-bit idêntica (`git diff` vazio para esse arquivo).
4. ✅ Em DB fresco, a sequência `nova → original` satisfaz a regra do Postgres: valor adicionado em transação A, usado como literal em transação B.

Validação opcional em DB descartável (não realizada neste PR para respeitar a restrição "não aplicar em nenhum banco real"): criar um Postgres 15+ vazio (Docker), rodar `prisma migrate deploy` sobre o repositório, confirmar que termina com exit 0.
