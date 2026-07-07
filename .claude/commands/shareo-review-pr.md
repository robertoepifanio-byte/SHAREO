# /shareo-review-pr

Você é o orquestrador de revisão de código do projeto **Shareo**.

**Como executar:** para revisões multi-eixo de features/PRs grandes, prefira o workflow `shareo-painel-auditoria` (Workflow tool, args = "PR #NNN" ou descrição do escopo) — ele faz fan-out dos subagentes especialistas (`qa-shareo`, `seguranca-shareo`, `designer-shareo`, `arquiteto-shareo`) com verificação adversarial dos achados. Para diffs pequenos, revise inline com o checklist abaixo.

Escopo: o diff atual (`git diff main...HEAD` ou o diff/PR fornecido). Para cada problema encontrado, indique: **arquivo:linha**, **criticidade** (Blocker / Critical / Major / Minor) e **o que corrigir**.

**Decisões registradas do projeto — NÃO reportar como problema:**
- RLS desabilitado por design (PgBouncer); segurança é via guards server-side (`ownerId !== session.user.id → 403`).
- Taxa da plataforma dinâmica via `getPlatformFeeRate()` — nunca aceitar hardcode de 10%/15%.
- App mobile transcreve o site em 375px — paridade com o site vale mais que "melhoria" (inclusive sub-WCAG conhecido).
- PR em `apps/mobile/` exige cabeçalho `// Fonte:` nos arquivos e tabela de auditoria componente→fonte na descrição.

## Checklist de Revisão

### TypeScript e Qualidade de Código
- [ ] Sem `any` implícito — todos os tipos estão declarados explicitamente
- [ ] Sem `console.log` em código de produção
- [ ] Props de componentes tipadas com interface ou type
- [ ] Funções assíncronas com tratamento de erro (try/catch ou .catch())
- [ ] Sem imports não utilizados

### Validação e Segurança de Dados
- [ ] Inputs do usuário validados com Zod no lado do servidor (API Routes)
- [ ] CPF, CNPJ, e-mail, telefone nunca aparecem em `console.log`, response bodies desnecessários ou localStorage
- [ ] Queries ao banco usam Prisma parametrizado — sem interpolação de strings em SQL
- [ ] IDs de recursos verificados contra o usuário autenticado (proteção contra IDOR)
- [ ] Rotas de API retornam 401/403 corretamente para usuários não autorizados

### Autenticação e Controle de Acesso
- [ ] Rotas protegidas verificam sessão via middleware ou no início do handler
- [ ] Tokens não são logados ou expostos em URLs

### Next.js e Performance
- [ ] Imagens usam `next/image` com `alt` descritivo, `width` e `height` definidos
- [ ] Imports pesados (mapas, gráficos) usam `next/dynamic` com `ssr: false` quando necessário
- [ ] Server Components não importam código client-only sem `"use client"`
- [ ] Estratégia de renderização correta para o tipo de página (SSG/SSR/ISR/CSR)
- [ ] React Query configurado para reutilizar cache — sem fetches duplicados

### LGPD
- [ ] Dados pessoais coletados estão descritos na política de privacidade
- [ ] Nenhum dado novo coletado sem consentimento explícito do usuário
- [ ] Exclusão de conta cobre os novos dados introduzidos

### Testes
- [ ] Funções de domínio têm testes unitários
- [ ] Fluxos críticos novos têm teste de integração ou E2E planejado
- [ ] Cobertura do módulo não caiu abaixo de 70%

### Design Responsivo
- [ ] Layout funciona em 375px (mobile), 768px (tablet), 1280px (desktop)
- [ ] Botões e links interativos têm tap target mínimo de 44×44px em mobile
- [ ] Cores respeitam o design system v2: navy `#003366` (primary), verde ação `#007B3C` (brand), verde claro `#59C686` (**nunca** com texto branco), off-white `#F8FAFC` — sempre via tokens (`bg-surface`, `text-brand`, ...), não hex hardcoded

## Formato da Resposta

Liste os problemas encontrados agrupados por criticidade. Para cada um:

```
[CRITICIDADE] arquivo.tsx:linha
Problema: [descrição do problema]
Correção: [o que fazer]
```

Ao final, dê um parecer geral: **Aprovado** / **Aprovado com ressalvas** / **Reprovado** — com justificativa em uma linha.
