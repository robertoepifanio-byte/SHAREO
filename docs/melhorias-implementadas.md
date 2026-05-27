# ShareO — Melhorias Implementadas

**Período:** Sprint 0 → H1 MVP + pós-lançamento  
**Ambiente:** staging (`shareo-rouge.vercel.app`) · branch `main`  
**Atualizado em:** 26/05/2026

---

## Sumário Executivo

O ShareO partiu de um protótipo HTML estático e evoluiu para um produto web completo em Next.js 15, com autenticação, banco de dados relacional, armazenamento de arquivos, chat em tempo real e conformidade com LGPD. Este documento consolida todas as melhorias entregues até o presente momento.

---

## 1. Infraestrutura e Stack

| Camada | Tecnologia | Status |
|--------|-----------|--------|
| Frontend | Next.js 15 (App Router) + TypeScript + Tailwind CSS | ✅ produção |
| Banco de dados | PostgreSQL via Supabase (Natal/RN, sa-east-1) | ✅ produção |
| ORM | Prisma v6 com migrations versionadas | ✅ produção |
| Autenticação | NextAuth v5 beta.31 · Credentials + JWT | ✅ produção |
| Armazenamento | Supabase Storage (bucket `item-images`) | ✅ produção |
| Realtime | Supabase Realtime (canal `messages`) | ✅ produção |
| CI/CD | GitHub Actions + Vercel (deploy automático em push) | ✅ verde |
| Monitoramento | Sentry (erros de front e backend) | ✅ configurado |

### Problemas de infraestrutura resolvidos

- **AUTH 500 em staging** — `AUTH_URL` continha texto literal extra; corrigido e `AUTH_SECRET` recriado.
- **Cookie de sessão em produção HTTPS** — middleware usava nome de cookie HTTP; corrigido para `__Secure-authjs.session-token` via flag `NODE_ENV`.
- **PrismaAdapter incompatível** — `@auth/prisma-adapter` incompatível com NextAuth v5 + Credentials; substituído por lookup direto via `prisma.user.findUnique` no `authorize()`.
- **Upload silenciosamente falhando** — bucket `item-images` não existia; criado via SDK admin com MIME validation e limite de 5 MB.

---

## 2. Features do H1 MVP

### 2.1 Autenticação e Cadastro

- Login com e-mail + senha (bcrypt rounds=12)
- Cadastro com validação de CPF (PF) e CNPJ (PJ) via Zod + algoritmo de dígito verificador
- Documentos armazenados com AES-256-GCM (encrypt) + HMAC-SHA256 (hash para unicidade) — nunca expostos em respostas de API
- Recuperação de senha via token de 256-bit, TTL 1 hora, uso único
- Redirecionamento pós-login com `callbackUrl`

### 2.2 Catálogo de Itens

- Listagem com filtros: categoria, faixa de preço, condição, localização, ordenação
- Busca por texto com redirect automático para categoria quando o texto coincide com um nome de categoria
- Paginação com controles de navegação acessíveis
- Card de item com: foto, rating, preço/dia, localização, badge de disponibilidade, botão de favorito
- Detalhe do item: galeria interativa, calculadora de preço por período, avaliações, card de locação sticky

### 2.3 Anúncio de Itens

- Formulário com validação de todos os campos (Zod + React Hook Form)
- Upload de até 10 imagens por item (JPEG/PNG/WebP, max 5 MB cada) via Supabase Storage
- Reordenação e remoção de fotos no formulário de edição
- Soft delete de anúncios (campo `deletedAt`, nunca apagado fisicamente)
- Gestão em "Meus anúncios": ativar/pausar/editar/remover

### 2.4 Reservas e Locações

- Fluxo completo: solicitação → confirmação → locação ativa → devolução → conclusão
- Estados: `PENDING · CONFIRMED · ACTIVE · RETURNED · COMPLETED · CANCELLED · DISPUTED`
- Validação de datas sobrepostas no backend
- Cálculo automático de `totalDays` e `totalPrice`
- Tela "Minhas Reservas" com tabs "Como locatário" / "Como locador"

### 2.5 Chat em Tempo Real

- Supabase Realtime com canal dedicado por conversa
- Fallback para polling via `setInterval` (caso WebSocket bloqueado)
- Histórico completo de mensagens com timestamps relativos em pt-BR
- Sanitização de HTML no conteúdo das mensagens (previne XSS armazenado)
- Link direto chat ↔ reserva na tela de reservas

### 2.6 Avaliações

- Avaliações bi-direcionais pós-devolução: locatário avalia item + proprietário, proprietário avalia locatário
- Rating de 1 a 5 estrelas com comentário opcional
- Exibição de nota média e contagem no card e no detalhe do item
- Trigger de notificação ao receber nova avaliação

### 2.7 Favoritos

- Botão de favorito nos cards de listagem e na página de detalhe
- Tela `/favoritos` com grid de itens favoritados
- Toggle instantâneo com feedback visual (coração cheio/vazio)

### 2.8 Perfil

- Perfil próprio (`/perfil`): edição de nome, bio, telefone, cidade, estado, bairro, avatar
- Perfil público (`/perfil/[id]`): exibe stats, anúncios ativos, avaliações recebidas — sem dados privados

### 2.9 Dashboard

- Contadores em tempo real: anúncios ativos, total de visualizações, locações ativas
- Ações rápidas: criar anúncio, meus anúncios, explorar itens
- Dados reais do banco (sem hardcoded)

### 2.10 Admin

- Dashboard com visão geral da plataforma
- Gestão de itens: aprovar, rejeitar, visualizar
- Gestão de usuários: ativar/desativar, verificar
- Gestão de disputas: resolver, registrar decisão

### 2.11 Notificações In-App (F14)

- Bell icon no header com badge de contagem de não lidas
- Dropdown com lista das 30 notificações mais recentes
- Polling a cada 30 segundos via `fetch` com `cache: "no-store"`
- Marcar todas como lidas (`PATCH /api/notifications/read-all`)
- Timestamps relativos em pt-BR ("há 2 horas", "há 3 dias")
- Tipos suportados: `NEW_MESSAGE`, `NEW_BOOKING`, `BOOKING_CONFIRMED`, `BOOKING_CANCELLED`, `BOOKING_RETURNED`, `BOOKING_COMPLETED`, `NEW_REVIEW`, `ITEM_APPROVED`, `ITEM_REJECTED`
- Navegação direta ao clicar: mensagem → conversa, reserva → `/reservas/[id]`, review → `/perfil`

---

## 3. Design e Identidade Visual

### 3.1 Sistema de design

- Paleta de cores: Navy `#0D1B2A`, Orange `#F97316` (brand), Green `#22C55E` (success), Off-white `#F8FAFC`
- Tipografia: Inter, pesos 400–800
- Grid de espaçamento: 4px
- Border radius: 8px para cards, 6px para inputs

### 3.2 Logo

- Logo ShareO v3 com fundo transparente implementado no header
- Renderização com `object-contain object-left` para preservar proporções em qualquer fundo

### 3.3 Ícones de categorias

Substituídos PNGs genéricos por ilustrações JPEG customizadas em 6 categorias:

| Categoria | Arquivo |
|-----------|---------|
| Ferramentas | `ferramentas.jpeg` |
| Construção | `construcao.jpeg` |
| Eletrônicos | `eletronicos.jpeg` |
| Esporte | `esporte.jpeg` |
| Moda | `moda.jpeg` (v2) |
| Festas | `festas.jpeg` (v2) |

---

## 4. Responsividade Mobile-First

Auditoria e correção completa para dispositivos móveis (base 375px):

### 4.1 Header e navegação

- **Menu hamburger** — componente `MobileMenu` (client component isolado para não converter o `AppHeader` em cliente)
  - Abre/fecha com animação, fecha automaticamente ao navegar
  - Bloqueia scroll do body enquanto aberto (`overflow: hidden`)
  - Links contextuais: exibe rotas autenticadas apenas se logado
  - Backdrop semitransparente com `z-index` correto

- **Botão "+ Anunciar"** — ocultado em mobile (`hidden md:inline-flex`), disponível no menu hamburger

### 4.2 Tap targets (WCAG 2.5.5 — Level AA)

Todos os elementos interativos corrigidos para mínimo de **44×44px**:

| Componente | Antes | Depois |
|------------|-------|--------|
| Botões do header | `h-9` (36px) | `h-11` (44px) |
| Avatar | `h-9 w-9` | `h-11 w-11` |
| Tabs de reservas | `py-2` | `h-11 inline-flex items-center` |
| Botões "Ver detalhes" / "Mensagens" | `py-2 text-xs` | `h-11 inline-flex items-center text-sm` |
| Links de paginação | `h-10` | `h-11` |
| Botão "Aplicar filtros" | `py-2.5` | `h-11` |
| Favorito no detalhe do item | `py-2.5` | `h-11` |

---

## 5. Acessibilidade (WCAG 2.1 AA)

Auditoria completa e correção dos seguintes critérios:

### 5.1 Indicadores de foco (WCAG 2.4.7)

Adicionado `focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2` em todos os elementos interativos que estavam com `outline: none` sem substituto visual:

- Links do dashboard
- Links de paginação da listagem
- ItemCard (link principal do card)
- Tabs de reservas
- Links do header e menu mobile

### 5.2 Semântica ARIA

- Tabs de reservas: `role="tablist"`, `role="tab"`, `aria-selected`, `aria-label`
- Menu mobile: `aria-expanded`, `aria-controls="mobile-nav"`, `aria-label` no botão hamburger
- Listas de tags/características: `role="list"`, `role="listitem"`
- Ícones decorativos: `aria-hidden="true"` em todos os SVGs sem texto adjacente
- Estrelas de rating: `aria-label="N estrelas"` em vez de caracteres Unicode sozinhos

### 5.3 Associação de labels com inputs (WCAG 1.3.1)

Componente `PriceInput` no `ItemForm`:
- `<label htmlFor={id}>` associado ao `<input id={id}>`
- `aria-describedby` aponta para o texto auxiliar (ex.: "R$/dia")
- `aria-hidden="true"` no span "R$" decorativo

### 5.4 Hierarquia de headings (WCAG 1.3.1)

Página de detalhe do item (`/itens/[id]`):
- Layout de duas colunas colocava dois `<h2>` ("Sobre o item", "Avaliações") antes do `<h1>` (título do item) na ordem do DOM
- **Fix:** `<h1 className="sr-only">{item.title}</h1>` como primeiro filho do `<main>`; o título visual no card sticky foi convertido para `<p>` com estilo equivalente

### 5.5 Filtros de categoria (usabilidade)

- Busca por texto que coincide com nome de categoria redireciona para `?categoryId=<id>` em vez de busca textual — comportamento esperado pelo usuário
- `FilterForm` recebe `key={categoryId}` para forçar remount em navegação entre categorias, evitando radio buttons com `defaultChecked` desatualizado

---

## 6. Segurança e LGPD

### 6.1 O que já estava correto (auditoria confirmou)

| Item | Resultado |
|------|-----------|
| `auth()` em todas as rotas protegidas | ✅ |
| Verificação de propriedade (ownership) em PUT/DELETE | ✅ |
| Validação de input com Zod em todos os endpoints | ✅ |
| CPF/CNPJ: AES-256-GCM + HMAC-SHA256, nunca exposto | ✅ |
| `passwordHash` fora do JWT e das respostas de API | ✅ |
| bcrypt rounds = 12 | ✅ |
| Apenas `NEXT_PUBLIC_*` expostos ao client | ✅ |
| Upload: MIME validado, 5 MB máx, service role key server-only | ✅ |
| Zero queries SQL raw (`$queryRaw`) — sem risco de SQL injection | ✅ |
| Headers HTTP: HSTS 2 anos, CSP, X-Frame-Options, nosniff | ✅ |
| Mensagens: HTML stripped antes de salvar (previne XSS armazenado) | ✅ |
| Token de reset: 256-bit, TTL 1h, uso único | ✅ |
| Consentimento LGPD: `consentVersion`, `consentAt`, `consentIp` | ✅ |
| Admin routes: verificam `role === "ADMIN"` | ✅ |

### 6.2 C1 — PII removida dos logs

**Arquivo:** `app/api/auth/forgot-password/route.ts`

O e-mail do usuário era logado em `console.warn` com a URL de reset, tornando-se PII em logs de produção (violação do art. 46 LGPD). Corrigido para logar apenas os primeiros 8 caracteres do token hash — suficiente para correlação de incidentes sem expor dados pessoais.

### 6.3 C2 — Direito ao esquecimento (LGPD art. 18)

**Endpoint:** `DELETE /api/users/me`

Implementação completa do direito de exclusão de conta:

- Bloqueia exclusão se houver locação com status `ACTIVE` (item fisicamente com outro usuário)
- Cancela automaticamente reservas `PENDING` e `CONFIRMED`
- Anonimiza todos os campos PII: nome → "Usuário removido", e-mail → `removed-{id}@shareo.invalid`, telefone/bio/endereço/CPF/CNPJ → null
- Seta `isActive = false` e `deletedAt = now()` (soft delete)
- Preserva histórico de transações concluídas (obrigação fiscal — Código Comercial art. 37)

**UI:** Botão "Excluir minha conta" na página `/perfil` com fluxo de dois passos (idle → confirmação com aviso → loading → signOut automático).

### 6.4 C3 — Rate limiting nos endpoints de autenticação

**Arquivo:** `lib/rateLimit.ts`

Implementado rate limiter de sliding window em memória aplicado nas três rotas críticas:

| Endpoint | Limite | Janela |
|----------|--------|--------|
| `POST /api/auth/register` | 5 requisições | 1 minuto por IP |
| `POST /api/auth/forgot-password` | 3 requisições | 1 minuto por IP |
| `POST /api/auth/reset-password` | 10 requisições | 1 minuto por IP |

Resposta em caso de limite atingido: `HTTP 429` com headers `Retry-After` e `X-RateLimit-Remaining`.

> **Nota:** O limitador é in-process (não compartilhado entre instâncias Vercel). Para produção em escala, substituir por Upstash Redis + `@upstash/ratelimit`.

### 6.5 C4 — Portabilidade de dados (LGPD art. 20)

**Endpoint:** `GET /api/users/me/export`

Exportação completa dos dados do usuário autenticado em formato JSON para download:

- Perfil (sem campos sensíveis como hash de senha ou documentos)
- Itens anunciados
- Histórico de reservas (como locatário e como locador)
- Avaliações enviadas
- Favoritos

Retorna com `Content-Disposition: attachment` e nome de arquivo `shareo-meus-dados-YYYY-MM-DD.json`. Link "Exportar" disponível na seção "Privacidade e dados" da página `/perfil`.

---

## 7. Histórico de Commits Relevantes

| Commit | Descrição |
|--------|-----------|
| `16dd54d` | Auth flat config — sem PrismaAdapter, Credentials+JWT estável |
| `efaf5b8` | Middleware cookie name dinâmico (HTTP/HTTPS) |
| `ce17405` | Perfil público + middleware fix `/perfil/[id]` |
| `ddb462e` | Dashboard locações ativas — dados reais do banco |
| `d152628` | Ícones de categoria — 6 novos JPEGs ilustrados |
| `08d77f5` | Logo ShareO v3 (fundo transparente) |
| `4193c4b` | Tap targets h-11 + menu hamburger mobile |
| `3dbc1a6` | WCAG 2.1 AA — focus rings, ARIA roles, heading order, label association |
| `efa219d` | Segurança + LGPD — C1 PII log, C2 exclusão de conta, C3 rate limiting, C4 exportação |

---

## 8. Pendências e Próximos Passos

### Em andamento / staging

| Item | Prioridade | Observação |
|------|-----------|-----------|
| `NEXT_PUBLIC_STORAGE_BUCKET` no Vercel | Baixa | Código tem fallback para `"item-images"` |
| Imagens de seed faltantes | Baixa | Projetor Epson, Escada Telescópica, Cadeiras, Barraca de Camping |
| Integração Resend para e-mail de reset | Média | Console.info até Sprint 5 |
| Rate limiting com Redis (Upstash) | Média | Para produção com múltiplas instâncias |

### H2 — Growth (próximo ciclo)

- Integração de seguros para locações de alto valor
- Assinatura PJ Premium + analytics de desempenho
- Vitrines personalizadas por anunciante

### H3 — Scale

- Pagamentos in-app (Stripe / Pagar.me)
- Sincronização de estoque PJ
- Aplicativo React Native

---

*Documento gerado em 26/05/2026 com base no histórico de implementação da plataforma ShareO.*
