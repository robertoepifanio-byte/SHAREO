## O que muda

<!-- Descreva em 1–3 bullets o que este PR introduz ou corrige. -->
-

## Tipo de mudança

- [ ] `feat` — nova funcionalidade
- [ ] `fix` — correção de bug
- [ ] `chore` — refactor, deps, config (sem mudança de comportamento)
- [ ] `docs` — documentação
- [ ] `test` — testes

## Checklist (Definition of Done)

### Código
- [ ] Sem erros de TypeScript (`pnpm type-check` passa)
- [ ] Lint passa sem warnings (`pnpm lint`)
- [ ] Testes passam com cobertura ≥ 70% nos módulos alterados (`pnpm test`)

### Segurança & LGPD
- [ ] Nenhum dado sensível (CPF, CNPJ, senha, token) exposto em logs ou respostas de API
- [ ] Campos de PII mascarados no Sentry (se aplicável)
- [ ] RLS do Supabase cobre o novo acesso a dados (se aplicável)
- [ ] Consentimento LGPD preservado em toda nova coleta de dados

### Banco de dados
- [ ] Migration gerada com `prisma migrate dev` (se schema alterado)
- [ ] Migration revisada pelo Arquiteto (se aplicável)
- [ ] Sem alterações manuais diretas no banco

### UI / UX
- [ ] Testado nos breakpoints 375px, 768px e 1280px
- [ ] Contraste mínimo 4.5:1 verificado (WCAG 2.1 AA)
- [ ] Estados de loading, erro e vazio implementados

## Como testar

<!-- Passo a passo para o revisor validar o comportamento esperado. -->
1.
2.
3.

## Preview

<!-- O link de preview deploy será adicionado automaticamente pelo CI. -->
