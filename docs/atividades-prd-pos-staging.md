# Atividades de PRD — Pós-Validação Staging

**Data**: 26/05/2026  
**Pré-condição**: Executar apenas após o smoke test de staging aprovado e o Sprint 1 validado em staging  
**Objetivo**: Fechar as lacunas do PRD antes de abrir o produto para produção  
**Referência**: `revisao-pre-sprint1.md` — gaps P1, P2, P3 e decisões pendentes

---

## 1. Critérios de Aceite — Features com lacunas (P1)

> Escrever critérios no formato **Gherkin** (`Given / When / Then`) para cada feature listada abaixo.  
> Sem critérios definidos, o QA não consegue validar nem a Definition of Done pode ser cumprida.

- [ ] **F02 — Perfil do usuário**
  - Edição de dados pessoais (nome, telefone, foto)
  - Diferença entre perfil PF e PJ
  - Validação de CPF e CNPJ

- [ ] **F06 — Filtros de busca**
  - Filtros por categoria, localização (raio em km), faixa de preço, disponibilidade
  - Comportamento com zero resultados
  - Persistência de filtros na URL (para compartilhamento)

- [ ] **F07 — Detalhe do item**
  - Exibição de fotos, descrição, preço, disponibilidade, caução
  - Botão de solicitação de aluguel
  - Exibição do perfil do locador

- [ ] **F11 — Favoritos**
  - Adicionar e remover item dos favoritos
  - Listagem de favoritos do usuário
  - Comportamento quando o item favoritado é removido pelo locador

- [ ] **F12 — Dashboard do locatário**
  - Listagem de aluguéis (ativos, histórico, pendentes)
  - Visualização do estado atual de cada locação
  - Ações disponíveis por estado (cancelar PENDING, confirmar recebimento)

- [ ] **F13 — Painel Admin**
  - Listagem e moderação de itens
  - Gestão de usuários (banir, aprovar PJ)
  - Visualização de métricas básicas

- [ ] **F14 — Notificações**
  - Quais eventos disparam notificação (nova solicitação, aceite, recusa, cancelamento)
  - Canal de entrega: e-mail, in-app, ou ambos
  - Preferências de notificação do usuário

---

## 2. Features Implícitas Obrigatórias — Sem Feature ID no PRD (P2)

> Estas features são pré-requisitos do MVP mas estão ausentes do PRD. Cada uma precisa de Feature ID, descrição, critérios de aceite e estimativa antes de entrar no backlog.

- [ ] **Recuperação de senha**
  - Fluxo: e-mail com link de reset (expiração em X horas), nova senha, confirmação
  - Critério de aceite mínimo: usuário que esqueceu a senha consegue recuperar acesso sem suporte humano

- [ ] **Verificação de e-mail**
  - Mencionada no fluxo 4.1 do PRD sem Feature ID
  - Definir: obrigatória para publicar anúncio? Para solicitar aluguel? Para ambos?
  - Fluxo de reenvio do e-mail de verificação

- [ ] **Exclusão de conta (LGPD — Direito ao Esquecimento)**
  - O PRD alega "conformidade total" com LGPD — este fluxo é obrigatório
  - Definir: exclusão lógica (`deletedAt`) ou purga física dos dados?
  - O que acontece com aluguéis ativos no momento da exclusão?
  - Prazo de retenção de dados após exclusão (LGPD permite manter por obrigações legais)

- [ ] **Calendário de disponibilidade**
  - Sem ele, múltiplas solicitações simultâneas para o mesmo período não têm tratamento definido
  - Definir: o locador bloqueia períodos manualmente ou o sistema bloqueia automaticamente após confirmação?
  - Granularidade: por dia ou por hora?

- [ ] **Status do aluguel visível ao locatário**
  - F12 lista "minhas locações" mas não define como o locatário acompanha o estado
  - Definir os estados visíveis, labels em português, e ações disponíveis por estado

---

## 3. Máquina de Estados de Aluguel — Indefinições Críticas (P3)

> Sem essas definições, o desenvolvimento do core de bookings não pode ser finalizado.

- [ ] **SLA de expiração do PENDING**
  - Quantas horas o locador tem para responder antes de PENDING → CANCELLED automático?
  - Notificar o locador antes de expirar (ex.: 2h antes)?
  - O que acontece com o locatário: notificação + liberação para nova solicitação?

- [ ] **Transição CONFIRMED → ACTIVE**
  - Automática por data de início do aluguel?
  - Manual pelo locador (confirmação de entrega)?
  - Manual pelo locatário (confirmação de recebimento)?
  - Ou dupla confirmação (locador entregou + locatário recebeu)?

- [ ] **Solicitações simultâneas no mesmo item**
  - Aceitar múltiplos PENDING para o mesmo período ou bloquear após o primeiro?
  - Se múltiplos PENDING: o que acontece com os demais quando um é CONFIRMED?
  - Impacto no calendário de disponibilidade

- [ ] **Caução**
  - Campo `deposit` existe no anúncio mas não há processo de cobrança/devolução no MVP
  - Definir claramente no PRD: caução é informativo (combinado fora da plataforma) ou será processado na plataforma?
  - Se fora da plataforma: documentar isso explicitamente para evitar expectativa errada do usuário

---

## 4. Decisões de Produto Pendentes

> Estas decisões impactam o escopo do Sprint 1 e precisam ser tomadas antes ou durante o Planning.

| Decisão | Contexto | Responsável |
|---|---|---|
| PJ no MVP: aprovação manual por e-mail? | CNPJ é validado automaticamente ou precisa de revisão humana antes de publicar anúncios? | PO |
| Dark mode: descartar explicitamente ou planejar tokens agora? | Se não for planejar, documentar no PRD que dark mode está fora do escopo H1 | Designer + PO |

---

## 5. Segurança e Infraestrutura — Pré-Produção

> Não bloqueiam staging, mas bloqueiam a abertura para o público.

- [ ] **CSP — remover `unsafe-inline` de `script-src`**
  - Implementar nonces via `next/headers` no `middleware.ts`
  - Adicionar domínios do Google Analytics e Vercel Analytics ao `connect-src`

- [ ] **Rate limiting**
  - Decisão: Upstash Rate Limit vs middleware Next.js (ver ADR-001)
  - Implementar nos endpoints: `/api/auth/*`, `/api/items` (POST), `/api/bookings` (POST)
  - Implementar nos endpoints de upload de documentos

- [ ] **Criar projeto Sentry `shareo-web`**
  - Configurar source maps no build Vercel
  - Definir alertas de erro crítico

- [ ] **Criar projeto Supabase production separado**
  - Ativar PostGIS
  - Criar environment `production` no GitHub com approval gate
  - Separar secrets de staging e production

---

## 6. SEO — Pré-Deploy Público

- [ ] Criar `app/sitemap.ts` via Next.js Metadata API
  - Incluir itens publicados com `slug` canônico
  - Excluir páginas de dashboard, admin e autenticação
- [ ] Criar `app/robots.ts`
  - Bloquear `/admin`, `/dashboard`, `/api`
  - Apontar para o sitemap

---

## Checklist de "pronto para produção"

| Item | Status |
|---|---|
| Critérios de aceite escritos para F02, F06, F07, F11, F12, F13, F14 | ☐ |
| Features implícitas com Feature ID, critérios e estimativa | ☐ |
| Máquina de estados completa (SLA, CONFIRMED→ACTIVE, simultâneas, caução) | ☐ |
| Decisões de PJ e dark mode tomadas e documentadas no PRD | ☐ |
| CSP sem `unsafe-inline` | ☐ |
| Rate limiting implementado nos endpoints críticos | ☐ |
| Sentry configurado com source maps | ☐ |
| Supabase production provisionado | ☐ |
| Environment `production` no GitHub com approval gate | ☐ |
| Sitemap e robots.txt criados | ☐ |

---

*Gerado em 26/05/2026 — referência: `docs/revisao-pre-sprint1.md`*
