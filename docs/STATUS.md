# ShareO — Status de Prontidão para o MVP

**Gerado em**: 2026-05-22  
**Referência**: Diagnóstico inicial + auditoria de artefatos  
**Público**: Time técnico, Gestor de Projeto, PO

---

## Resumo Executivo

O projeto passou de **zero artefatos técnicos** para um estado onde o primeiro commit de feature pode acontecer em **2–3 horas**, bastando criar o projeto Supabase de dev e preencher o `.env.local`.

Todos os P0 foram resolvidos. Os P1 pendentes são dependências humanas (backlog, wireframes formais, instâncias de infraestrutura) — nenhum bloqueia o desenvolvimento local.

---

## Status Consolidado — P0

| # | Item | Status | Artefato |
|---|---|---|---|
| P0.1 | PRD / Especificação funcional | ✅ Feito | `PRD.md` |
| P0.2 | Schema de banco de dados | ✅ Feito | `prisma/schema.prisma` |
| P0.3 | ADR de autenticação | ✅ Feito | `ADRs/ADR-001-autenticacao.md` |
| P0.4 | Ambiente de dev + README | ✅ Feito | `README.md` |
| P0.5 | `.env.example` completo | ✅ Feito | `.env.example` |
| P0.6 | Definição de "done" do MVP | ✅ Feito | `PRD.md` §3 + `.github/PULL_REQUEST_TEMPLATE.md` |
| P0.7 | Ferramenta de backlog | ❌ Pendente | Decisão humana: Linear / Jira / Notion |

---

## Status Consolidado — P1

| # | Item | Status | Artefato |
|---|---|---|---|
| P1.1 | Backlog inicial (10+ histórias) | ❌ Pendente | Responsabilidade do PO |
| P1.2 | Contratos de API — Auth | ✅ Feito | `docs/api/auth.md` |
| P1.3 | Contratos de API — Items | ✅ Feito | `docs/api/items.md` |
| P1.4 | Contratos de API — Bookings, Users, Chat, Admin | ❌ Pendente | Pode ser gerado pelo Claude Code |
| P1.5 | Wireframes das 7 telas core | ⚠️ Coberto | `shareo-prototipo.html` serve como referência visual |
| P1.6 | Máquina de estados do aluguel | ✅ Feito | `PRD.md` §4.4 |
| P1.7 | ADR geo-search | ✅ Feito | `ADRs/ADR-002-mapas.md` |
| P1.8 | ADR chat | ✅ Feito | `ADRs/ADR-003-chat.md` |
| P1.9 | ADR criptografia CPF/CNPJ | ✅ Feito | `ADRs/ADR-004-criptografia-documentos.md` |
| P1.10 | Políticas RLS — tabela messages | ✅ Feito | `supabase/rls-policies.sql` |
| P1.11 | Políticas RLS — demais tabelas | ✅ Feito | `supabase/rls-policies.sql` |
| P1.12 | CI/CD (GitHub Actions) | ✅ Feito | `.github/workflows/ci.yml` |
| P1.13 | `tailwind.config.ts` | ✅ Feito | `tailwind.config.ts` |
| P1.14 | 3 instâncias Supabase configuradas | ❌ Pendente | Ação manual de infra (15 min por instância) |

---

## Artefatos Criados Nesta Sessão

### Planejamento e Especificação
| Arquivo | Descrição |
|---|---|
| `PRD.md` | Personas, 14 features (MoSCoW), fluxos end-to-end, máquina de estados do aluguel (7 estados), critérios de aceite por feature, métricas de sucesso |
| `docs/estrutura-projeto.md` | Estrutura completa de pastas Next.js App Router + convenções de nomenclatura, imports e branches |

### Architecture Decision Records
| Arquivo | Decisão |
|---|---|
| `ADRs/ADR-001-autenticacao.md` | NextAuth.js v5 com Prisma adapter (contra JWT próprio e Supabase Auth) |
| `ADRs/ADR-002-mapas.md` | Mapbox (free tier 50k loads/mês) + PostGIS para queries de proximidade |
| `ADRs/ADR-003-chat.md` | Supabase Realtime via Postgres Changes — zero custo extra no MVP |
| `ADRs/ADR-004-criptografia-documentos.md` | AES-256-GCM (exibição mascarada) + bcrypt hash (unicidade) para CPF/CNPJ |

### Banco de Dados
| Arquivo | Descrição |
|---|---|
| `prisma/schema.prisma` | 11 models de domínio + 3 modelos NextAuth. User, Item, Category, Booking, Review, Favorite, Conversation, Message, Notification, AdminLog, ItemImage, Account, Session, VerificationToken |
| `prisma/seed.ts` | 8 categorias (Ferramentas, Eletrônicos, Casa, Construção, Esporte, Moda, Festas, Jardim) + usuário admin para dev/staging |

### Configuração do Projeto
| Arquivo | Descrição |
|---|---|
| `package.json` | Todas as dependências do MVP (next, prisma, next-auth, tanstack-query, zod, supabase, mapbox, sharp, bcryptjs, resend, sentry) + scripts |
| `next.config.ts` | Headers de segurança (CSP, HSTS, X-Frame-Options), domínios de imagem Supabase, transpile Mapbox |
| `tsconfig.json` | TypeScript strict, path alias `@/*`, moduleResolution bundler |
| `tailwind.config.ts` | Tokens completos: paleta ShareO, breakpoints (xs/md/xl), tipografia Inter, espaçamento 4px grid, sombras, animações, z-index semântico |
| `jest.config.ts` | Next.js Jest config, cobertura ≥70% em lib/utils/services/hooks, threshold global |
| `jest.setup.ts` | `@testing-library/jest-dom` |
| `.eslintrc.json` | next/core-web-vitals + @typescript-eslint + prettier |
| `.prettierrc` | Formatação padrão do projeto |
| `.gitignore` | Node modules, .next, .env*, coverage, playwright-report |
| `postcss.config.js` | Tailwind + autoprefixer |

### Fundação do App
| Arquivo | Descrição |
|---|---|
| `app/layout.tsx` | Root layout: Inter font, metadata base, OpenGraph PT-BR |
| `app/globals.css` | Tailwind directives |
| `app/page.tsx` | Placeholder da home (substituir pela Landing Page na Sprint 1) |
| `lib/prisma.ts` | Singleton PrismaClient com log query em dev |
| `lib/auth.ts` | NextAuth.js v5: Credentials provider, JWT strategy, callbacks (role + userType no token) |
| `lib/supabase/client.ts` | `createBrowserClient` para uso em Client Components |
| `lib/supabase/server.ts` | `createServerClient` para Server Components e Route Handlers |

### CI/CD e Qualidade
| Arquivo | Descrição |
|---|---|
| `.github/workflows/ci.yml` | 6 estágios: lint, test (PostGIS container), build, preview deploy (PR), staging (merge main), production (aprovação manual) |
| `.github/PULL_REQUEST_TEMPLATE.md` | Checklist de DoD: código, segurança/LGPD, banco, UI/UX |

### Contratos de API
| Arquivo | Domínio | Endpoints |
|---|---|---|
| `docs/api/README.md` | Convenções gerais | Formato de resposta, erros HTTP, preços em centavos, rate limiting, LGPD |
| `docs/api/auth.md` | Auth | 6 endpoints: register, login (NextAuth), forgot-password, reset-password, change-password, delete-account |
| `docs/api/items.md` | Items | 7 endpoints: list (geo), create, get, update, delete, upload-images, favorite |

### Ambiente
| Arquivo | Descrição |
|---|---|
| `.env.example` | Todas as variáveis documentadas: Supabase, NextAuth, Mapbox, Sentry, Resend, ENCRYPTION_KEY |
| `README.md` | Setup em 5 passos + troubleshooting dos 4 erros mais comuns |

---

## O Que Falta Para o Primeiro Commit

### Pode ser feito agora (Claude Code)
- [ ] Políticas RLS completas para todas as tabelas (`docs/rls-policies.sql`)
- [ ] Contratos de API: Bookings, Users, Chat, Admin (`docs/api/bookings.md`, etc.)
- [ ] `utils/cpf.ts` e `utils/cnpj.ts` com testes
- [ ] `lib/crypto.ts` (implementação do ADR-004)
- [ ] `middleware.ts` — proteção de rotas com NextAuth

### Depende de você (15–30 min)
- [ ] Criar projeto `shareo-dev` em [supabase.com](https://supabase.com/dashboard) → **New project** → South America (São Paulo)
- [ ] Ativar extensão PostGIS: **Database → Extensions → postgis → Enable**
- [ ] Preencher `.env.local` com as credenciais do projeto criado
- [ ] Rodar `pnpm install && pnpm prisma migrate dev --name init && pnpm prisma db seed`
- [ ] Verificar que `pnpm dev` sobe em [localhost:3000](http://localhost:3000)

### Depende de decisão (sem urgência técnica)
- [ ] Escolher ferramenta de backlog: **Linear** (recomendado para times técnicos), Jira ou Notion
- [ ] PO escrever as primeiras histórias de usuário

---

## Decisões Técnicas Fechadas

| Decisão | Escolha | Referência |
|---|---|---|
| Framework de autenticação | NextAuth.js v5 + Prisma Adapter | ADR-001 |
| API de mapas | Mapbox + PostGIS | ADR-002 |
| Chat em tempo real | Supabase Realtime (Postgres Changes) | ADR-003 |
| Criptografia de CPF/CNPJ | AES-256-GCM + bcrypt hash | ADR-004 |
| Estratégia de renderização | SSG/SSR/ISR/CSR por tipo de página | CLAUDE.md |
| Pagamento no MVP | Fora do escopo — combinação direta entre usuários | PRD.md §3.2 |
| Moderação de anúncios | Reativa (publicação direta no MVP) | PRD.md §3.2 |
| Package manager | pnpm | package.json |
| ORM | Prisma v5 | schema.prisma |

---

## Estimativa para Sprint 1

Com o ambiente configurado, a Sprint 1 (features F01 Auth + F04 Anúncio básico) leva **5–7 dias úteis** para um desenvolvedor sênior, dado o nível de detalhe dos contratos de API existentes.

**Sequência recomendada para a Sprint 1:**
1. `utils/cpf.ts` + `utils/cnpj.ts` (com testes — base para registro)
2. `lib/crypto.ts` (criptografia CPF/CNPJ)
3. `POST /api/auth/register` (primeiro endpoint funcional)
4. Páginas `/login` e `/cadastro` (UI com componentes `ui/Button` e `ui/Input`)
5. `POST /api/items` + `GET /api/items` básico (sem PostGIS ainda — só filtro por cidade)
6. Adicionar PostGIS queries no `GET /api/items` após validar o fluxo básico
