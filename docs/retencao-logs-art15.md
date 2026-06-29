# Retenção de Logs de Acesso — Marco Civil da Internet, art. 15

**Data:** 2026-06-28 (s40) · **Autor:** DevOps (subagente) · **Status:** aguardando decisão dos fundadores
**Relacionado a:** `auditoria-conformidade-tecnica-s40.md`, `checklist-conformidade-juridica.md`

> Este documento compara duas arquiteturas para cumprir a obrigação de retenção de logs de acesso
> prevista no art. 15 da Lei 12.965/2014 (Marco Civil da Internet). A escolha final cabe aos fundadores,
> preferencialmente com validacao do jurídico.

---

## O que exige o art. 15

O art. 15 do Marco Civil da Internet (Lei 12.965/2014) determina que provedores de aplicações de
internet devem **guardar os registros de acesso a aplicações por 6 meses** (180 dias), sob sigilo,
em ambiente controlado e de segurança, e fornecê-los à autoridade policial ou ao Ministério Público
mediante ordem judicial.

Os campos mínimos exigidos por regulamentação:
- Data e hora do acesso (timestamp UTC)
- Endereço IP do terminal utilizado
- Identificação do usuário (quando autenticado)

Não há obrigação de reter além de 6 meses para fins de conformidade com o art. 15 — exceto
quando houver ordem judicial de preservação específica.

---

## Opcao I — Vercel Log Drain + Destino Gerenciado

### Como funciona

O Vercel (plano Pro) suporta **Log Drains**: encaminha todos os logs de acesso HTTP e console em
tempo real para um destino externo configurado pelo cliente. Os logs incluem automaticamente
`timestamp`, `IP`, `path`, `status`, `method` e `x-vercel-id`.

Destinos compatíveis com retenção >= 6 meses:

| Destino | Retenção | Custo estimado | Região dos dados |
|---|---|---|---|
| **Axiom** | até 30 dias no gratuito; configurável no pago | ~$25/mês (dev) | EUA (ajustável) |
| **Better Stack (Logtail)** | configurável por tier | ~$25-50/mês | EUA ou EU |
| **AWS S3** | indefinida (por custo de storage) | ~$1-5/mês (volume MVP) | sa-east-1 possível |
| **Datadog** | 15 dias (Standard) / configurável | mais caro (~$100+/mês) | vários |

Para o caso do ShareO, a combinação mais simples seria **Axiom** ou **Better Stack** com retenção
configurada para 180 dias e depois arquivamento (ou descarte) automático.

### Vantagens

- Zero código na aplicação: a infraestrutura do Vercel faz o trabalho.
- Melhor performance: nenhuma latência extra no caminho das requisições.
- Cobertura completa: 100% das requisições, inclusive as não autenticadas.
- Dashboard e busca incluídos nos serviços gerenciados.
- Mais fácil de demonstrar conformidade: logs imutáveis gerenciados por terceiro.

### Desvantagens

- **Transferência internacional de dados**: logs vão para EUA (Axiom/Better Stack) ou precisam
  de configuração específica de região. Isso exige formalizar a transferência sob art. 33 LGPD
  (cláusulas-padrão ou garantias equivalentes) — já identificado na auditoria s40 como pendência.
- Custo mensal adicional (~$25-50/mês no H1, crescente com o volume).
- Dependência de serviço externo: se o destino ficar fora do ar, os logs são perdidos (sem buffer
  durável por padrão no Vercel Log Drain).
- O `userId` do ShareO NÃO está presente no log HTTP do Vercel por padrão — exigiria um
  middleware leve que adicione um header `x-user-id` à resposta para que o Log Drain capture.

### Como implementar (se escolhida)

1. No Vercel Dashboard → Settings → Log Drains → Add Drain → selecionar destino.
2. Configurar retenção de 180 dias no destino.
3. Adicionar middleware em `middleware.ts` para propagar `x-user-id` no header de resposta
   (somente em rotas autenticadas, sem expor dados além do ID interno).
4. Configurar alerta de expiração a 180 dias e automação de descarte.
5. Formalizar a transferência internacional com o jurídico (se destino for EUA).

**Tempo estimado de implementação:** 1-2 dias (incluindo configuração do destino e middleware).

---

## Opcao II — Tabela `access_logs` no PostgreSQL (in-repo)

### Como funciona

Tabela `access_logs` criada no banco PostgreSQL do Supabase (sa-east-1) via Prisma migration.
Um logger lean (`lib/access-log.ts`) grava uma linha por requisição de API autenticada, de forma
fire-and-forget (sem bloquear a resposta HTTP).

A gravação é controlada por flag em `PlatformConfig`:
- `accessLogsEnabled = "false"` (default): nenhuma linha é gravada, zero impacto de performance.
- `accessLogsEnabled = "true"`: logger grava a entrada em background após a resposta ser enviada.

Um cron de expurgo (`/api/cron/purge-access-logs`) deleta registros com mais de 180 dias,
executado semanalmente.

**Esta opcao ja esta implementada como scaffolding neste PR** (tabela + flag OFF + logger + cron).

### Vantagens

- **Dados em sa-east-1**: nenhuma transferência internacional — dados ficam no Brasil, no mesmo
  banco Supabase já usado pelo ShareO. Simplifica conformidade LGPD/MCI.
- Zero custo adicional de infraestrutura no H1 (dentro do plano existente do Supabase).
- Controle total: a política de retenção, acesso e expurgo é nossa.
- O `userId` interno é gravado nativamente (sem gambiarra de header).
- Consulta por autoridade judicial: podemos exportar um CSV direto do Supabase Dashboard.

### Desvantagens

- **Impacto no banco de dados**: cada requisição autenticada gera um INSERT. Para o volume esperado
  no MVP (estimativa: 1.000-10.000 req/dia autenticadas), o impacto é baixo. Acima de 100k req/dia,
  avaliar particionamento por mês.
- A implementação atual não cobre requisições não autenticadas (apenas API autenticadas). Se o
  jurídico exigir cobertura de rotas públicas, o escopo precisará ser ampliado.
- Sem dashboard de busca nativo — consultas via Supabase Dashboard ou exportação SQL.
- Exige monitorar o crescimento do banco (alerta configurado em 70% do limite do plano Supabase).

### Implementacao atual (scaffolding neste PR)

| Componente | Arquivo | Status |
|---|---|---|
| Migration da tabela | `prisma/migrations/20260628000000_add_access_logs/` | Criado |
| Model Prisma | `prisma/schema.prisma` (model `AccessLog`) | Adicionado |
| Logger | `lib/access-log.ts` | Criado |
| Cron de expurgo | `app/api/cron/purge-access-logs/route.ts` | Criado |
| Flag de controle | `PlatformConfig.accessLogsEnabled` (default `"false"`) | Pronto |

Para ativar: inserir `accessLogsEnabled = "true"` em `PlatformConfig` via `/admin/financeiro`
(ou via SQL direto em staging para testes). O logger precisa ser invocado no handler de cada
rota de API coberta — ver nota de integração abaixo.

**Nota de integração (trabalho adicional necessario):** O logger `logAccess()` precisa ser
chamado em cada handler de rota de API coberta, ou alternativamente via um wrapper centralizado.
A abordagem mais simples para cobrir todas as rotas de uma vez seria um wrapper no `middleware.ts`
— porém o middleware roda no Edge Runtime e não tem acesso ao Prisma (Node.js apenas). Alternativa:
criar um wrapper de handler server-side reutilizável que envolve cada route handler e chama
`logAccess()` após a resposta, usando `after()` do Next.js 15.

---

## Comparacao direta

| Criterio | Opcao I (Log Drain) | Opcao II (Postgres) |
|---|---|---|
| Performance | Melhor (zero impacto no app) | Boa (fire-and-forget) |
| Custo mensal H1 | +$25-50/mes | Incluido no Supabase |
| Localizacao dos dados | EUA (transferencia intl.) | sa-east-1 (Brasil) |
| Cobertura | 100% das requisicoes | API autenticadas (ampliavel) |
| Complexidade de impl. | Baixa (config Vercel + middleware) | Media (logger + integração) |
| Consulta por autoridade | Via dashboard do destino | Via Supabase/SQL export |
| userId no log | Exige middleware extra | Nativo |
| Conformidade LGPD art. 33 | Exige formalizacao intl. | Sem transferencia intl. |
| Tempo de ativacao | 1-2 dias | H1 scaffolding pronto; integração pendente |

---

## Recomendacao

Para o MVP/H1 do ShareO:

**Preferencia: Opcao II (Postgres/Supabase)**, pelos seguintes motivos:

1. Os dados ficam em sa-east-1, sem transferência internacional — simplifica a conformidade LGPD
   (já temos a pendência de formalizar transferências para Vercel/Resend/Sentry/Mapbox; adicionar
   mais um destino EUA antes do D4 não é ideal).
2. Zero custo adicional no H1 (orçamento de infraestrutura já aprovado).
3. O scaffolding já está implementado neste PR — basta ativar a flag e integrar o logger nas rotas.
4. Para o volume esperado no MVP, o impacto no banco é desprezível.

**Para H2/escala**, se o volume de requisições crescer muito (>100k/dia), reavaliar a Opcao I
(Log Drain para Axiom ou S3 em sa-east-1) como solução mais eficiente.

**Acao imediata necessaria (pós-D4):**

1. Confirmar com jurídico: (a) escopo das rotas a cobrir, (b) se requisições não autenticadas
   precisam ser incluídas, (c) exceções para registros sob investigação judicial.
2. Decidir entre Opcao I e Opcao II (recomendamos II para H1).
3. Se Opcao II: integrar `logAccess()` nas rotas de API autenticadas e ativar a flag.
4. Documentar no RIPD a política de retenção adotada.

> A escolha cabe aos fundadores, com validacao do jurídico (D4 bloqueador).
