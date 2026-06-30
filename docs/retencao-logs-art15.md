# Retencao de Logs de Acesso — Marco Civil da Internet, art. 15

**Data original:** 2026-06-28 (s40) · **Atualizado:** 2026-06-30 (s41) · **Autor:** DevOps
**Status:** DECISOES REGISTRADAS (A1/A2/A3/A4 — ver abaixo)
**Relacionado a:** `auditoria-conformidade-tecnica-s40.md`, `checklist-conformidade-juridica.md`

---

## Decisoes dos fundadores (2026-06-30)

As seguintes decisoes foram registradas pelos fundadores em 2026-06-30, com base no parecer
juridico formal (D4):

| ID | Decisao | Status |
|---|---|---|
| **A1** | Prazos confirmados: 180 dias para logs MCI art.15; 5 anos fiscal para admin_logs e consent IPs | IMPLEMENTADO |
| **A2** | Escopo do logAccess(): rotas autenticadas + acoes sensiveis (ver secao abaixo) | IMPLEMENTADO |
| **A3** | Opcao II escolhida: tabela `access_logs` no PostgreSQL Supabase (sa-east-1/Brasil) | IMPLEMENTADO |
| **A4** | Retencao legal (legal hold): flag por registro suspende o expurgo automatico | IMPLEMENTADO |

Producao ainda bloqueada pelo D4 (contrato MP + conta PJ + Termos/Politica publicados).

---

## O que exige o art. 15

O art. 15 do Marco Civil da Internet (Lei 12.965/2014) determina que provedores de aplicacoes de
internet devem **guardar os registros de acesso a aplicacoes por 6 meses** (180 dias), sob sigilo,
em ambiente controlado e de seguranca, e fornece-los a autoridade policial ou ao Ministerio Publico
mediante ordem judicial.

Os campos minimos exigidos por regulamentacao:
- Data e hora do acesso (timestamp UTC)
- Endereco IP do terminal utilizado
- Identificacao do usuario (quando autenticado)

Nao ha obrigacao de reter alem de 6 meses para fins de conformidade com o art. 15 — exceto
quando houver ordem judicial de preservacao especifica (tratada pela flag `legalHold`, decisao A4).

---

## A3 — Decisao de Arquitetura: Opcao II (Postgres/Supabase)

**Decisao final dos fundadores (2026-06-30):** Opcao II — tabela `access_logs` no PostgreSQL
Supabase em sa-east-1 (Brasil). **Opcao I (Vercel Log Drain para destino nos EUA) foi descartada.**

### Motivos da escolha

1. **Dados em sa-east-1, sem transferencia internacional**: o art. 33 da LGPD exige formalizacao
   contratual para transferencias internacionais. A Opcao I (Axiom/Better Stack nos EUA) adicionaria
   mais uma transferencia para formalizar, antes mesmo de D4. A Opcao II mantem os dados no mesmo
   banco Supabase ja usado pelo ShareO — zero transferencia internacional.
2. **Zero custo adicional no H1**: dentro do plano existente do Supabase Free.
3. **userId nativo**: a Opcao I exigiria middleware extra para propagar o userId via header HTTP.
4. **Scaffolding ja implementado**: tabela + cron + flag OFF desde PR #125.

### Para H2/escala

Se o volume de requisicoes crescer muito (>100k/dia), reavaliar a Opcao I (Log Drain para Axiom
ou S3 em sa-east-1 — nao EUA) como solucao mais eficiente.

---

## A2 — Escopo do logAccess()

**Decisao:** cobrir rotas autenticadas + acoes sensiveis. Navegacao anonima NAO e logada.

### Rotas cobertas (implementadas)

| Rota | Metodo | Categoria | Status |
|---|---|---|---|
| `POST /api/auth/register` | POST | Novo cadastro (consentimento LGPD) | Implementado |
| `POST /api/auth/reset-password` | POST | Alteracao de credencial | Implementado |
| `GET /api/users/me` | GET | Acesso a dados proprios | Implementado |
| `PATCH /api/users/me` | PATCH | Alteracao cadastral | Implementado |
| `DELETE /api/users/me` | DELETE | Exclusao de conta (LGPD art.18) | Implementado |
| `GET /api/bookings` | GET | Acesso a movimentacoes financeiras | Implementado |
| `POST /api/bookings` | POST | Criacao de movimentacao financeira | Implementado |
| `GET /api/conversations` | GET | Acesso a dados de terceiros (chat) | Implementado |

### Fora do escopo (decisao)

- Navegacao anonima (landing, /itens, buscas publicas) — sem usuario identificado.
- Rotas admin: ja cobertas pelo model `AdminLog` (trilha de auditoria separada).
- Rotas de checkout de pagamento: cobertos pelo modelo financeiro (PlatformTransaction).
- Requisicoes nao autenticadas em geral: sem obrigacao explicita no art. 15 MCI para este caso.

### Ampliacao futura

Se o juridico exigir cobertura de rotas publicas (por exemplo, buscas geolocalizadas), o escopo
pode ser ampliado sem quebrar a API — basta chamar `logAccess()` no handler com `userId: null`.

---

## A1 — Prazos de retencao (confirmados)

| Dado | Prazo | Base legal | Cron |
|---|---|---|---|
| Logs MCI art.15 (`access_logs`) | 180 dias | MCI art. 15 | `purge-access-logs` (semanal) |
| Trilha admin (`admin_logs`) | 5 anos | LGPD art. 7o IX + CTN art. 173 | `purge-admin-logs` (mensal) |
| IPs de consentimento (`User.consentIp`, `ContractAcceptance.ipAddress`, `FounderLead.consentIp`) | 5 anos | LGPD art. 7o IX | `purge-consent-ips` (mensal) |

---

## A4 — Retencao Legal (Legal Hold)

**Decisao:** flag booleana `legalHold` por registro suspende o expurgo automatico para registros
sob ordem judicial, litigio ou investigacao.

### Tabelas cobertas

| Tabela | Colunas adicionadas | Cron que respeita o hold |
|---|---|---|
| `access_logs` | `legalHold`, `legalHoldReason`, `legalHoldAt` | `purge-access-logs` |
| `admin_logs` | `legalHold`, `legalHoldReason`, `legalHoldAt` | `purge-admin-logs` |
| `contract_acceptances` | `legalHold`, `legalHoldReason`, `legalHoldAt` | `purge-consent-ips` |
| `founder_leads` | `legalHold`, `legalHoldReason`, `legalHoldAt` | `purge-consent-ips` |
| `users` | `legalHoldConsent`, `legalHoldConsentReason`, `legalHoldConsentAt` | `purge-consent-ips` |

### Como acionar (juridico/compliance)

Acesso restrito ao Supabase Dashboard (MFA obrigatorio). Sem UI — acao intencional via SQL.

```sql
-- Colocar registro sob retencao legal:
UPDATE access_logs
   SET "legalHold" = TRUE,
       "legalHoldReason" = 'Oficio no XXX -- Delegacia YYY -- 2026-06-30',
       "legalHoldAt" = now()
 WHERE id = '<id_do_registro>';

-- Por userId + periodo:
UPDATE access_logs
   SET "legalHold" = TRUE,
       "legalHoldReason" = 'Investigacao criminal no XXXX',
       "legalHoldAt" = now()
 WHERE "userId" = '<id_do_usuario>'
   AND ts BETWEEN '2026-01-01' AND '2026-06-30';

-- Levantar retencao (apos decisao judicial ou encerramento do processo):
UPDATE access_logs
   SET "legalHold" = FALSE,
       "legalHoldReason" = NULL,
       "legalHoldAt" = NULL
 WHERE id = '<id_do_registro>';
```

Para `User.consentIp`, usar a coluna `legalHoldConsent` (distinta de suspensao de conta):

```sql
UPDATE users
   SET "legalHoldConsent" = TRUE,
       "legalHoldConsentReason" = 'Oficio no XXX',
       "legalHoldConsentAt" = now()
 WHERE id = '<id_do_usuario>';
```

**Registrar todo acionamento em issue privado no repositorio** para trilha de auditoria.

---

## Estado da implementacao

| Componente | Arquivo | Status |
|---|---|---|
| Migration da tabela access_logs | `prisma/migrations/20260628000000_add_access_logs/` | NO AR (staging) |
| Migration legal hold | `prisma/migrations/20260630100000_add_legal_hold/` | Pronto (aplicar no merge) |
| Model Prisma AccessLog + hold | `prisma/schema.prisma` | Atualizado |
| Model Prisma AdminLog + hold | `prisma/schema.prisma` | Atualizado |
| Model Prisma ContractAcceptance + hold | `prisma/schema.prisma` | Atualizado |
| Model Prisma FounderLead + hold | `prisma/schema.prisma` | Atualizado |
| Model Prisma User + legalHoldConsent | `prisma/schema.prisma` | Atualizado |
| Logger com after() | `lib/access-log.ts` | Atualizado |
| Cron purge-access-logs (hold-aware) | `app/api/cron/purge-access-logs/route.ts` | Atualizado |
| Cron purge-admin-logs (hold-aware) | `app/api/cron/purge-admin-logs/route.ts` | Atualizado |
| Cron purge-consent-ips (hold-aware) | `app/api/cron/purge-consent-ips/route.ts` | Atualizado |
| logAccess em register | `app/api/auth/register/route.ts` | Adicionado |
| logAccess em reset-password | `app/api/auth/reset-password/route.ts` | Adicionado |
| Flag de controle | `PlatformConfig.accessLogsEnabled` (default `"false"`) | Pronto |

Para ativar em staging (teste): inserir `accessLogsEnabled = "true"` em `PlatformConfig` via
`/admin/financeiro` (ou via SQL direto no Supabase Dashboard do shareo-staging).

---

## Historico

- **2026-06-28 (s40):** scaffolding inicial — tabela, cron, logger fire-and-forget. Analise A1/A3 pendente.
- **2026-06-30 (s41):** decisoes A1/A2/A3/A4 registradas. Logger migrado para `after()`. Legal hold
  implementado em 5 tabelas. Escopo ampliado para register + reset-password.

---

## Opcao I — Vercel Log Drain (DESCARTADA)

*Mantida abaixo para registro historico — decisao A3 escolheu a Opcao II.*

O Vercel (plano Pro) suporta Log Drains: encaminha todos os logs de acesso HTTP e console em
tempo real para um destino externo. A Opcao I foi descartada pelos seguintes motivos:

- **Transferencia internacional**: destinos disponiveis (Axiom, Better Stack) ficam nos EUA,
  exigindo formalizacao sob art. 33 LGPD — adicionaria mais uma transferencia para formalizar.
- **userId ausente**: exigiria middleware extra para propagar o userId via header HTTP.
- **Custo adicional**: +$25-50/mes no H1 sem beneficio adicional para o volume do MVP.
- **Dependencia externa**: se o destino ficar fora do ar, os logs sao perdidos.
