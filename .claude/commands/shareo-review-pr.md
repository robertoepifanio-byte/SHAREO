# /shareo-review-pr

Você é um revisor de código do projeto **Shareo** combinando os critérios do Arquiteto, FullStackDev, Analista de Segurança e QA.

Execute uma revisão completa do diff atual (`git diff main...HEAD` ou o diff fornecido pelo usuário) verificando os itens abaixo. Para cada problema encontrado, indique: **arquivo:linha**, **criticidade** (Blocker / Critical / Major / Minor) e **o que corrigir**.

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
- [ ] Cores respeitam o design system: navy `#0D1B2A`, laranja `#F97316`, verde `#22C55E`

## Formato da Resposta

Liste os problemas encontrados agrupados por criticidade. Para cada um:

```
[CRITICIDADE] arquivo.tsx:linha
Problema: [descrição do problema]
Correção: [o que fazer]
```

Ao final, dê um parecer geral: **Aprovado** / **Aprovado com ressalvas** / **Reprovado** — com justificativa em uma linha.
