# ADR-024 — KYB Leve para Cadastro de Pessoa Jurídica

**Status**: Proposto
**Data**: 2026-06-20
**Decisores**: Arquiteto, Product Owner; Segurança (consultado em paralelo)
**Referências**: ADR-005 (criptografia de documentos), ADR-009 (RLS desabilitado), `lib/crypto.ts`, `lib/ssrfGuard.ts`, `app/api/users/me/upgrade-pj/route.ts`, `app/api/users/me/complete-registration/route.ts`

---

## Contexto

Hoje, virar PJ no ShareO é raso demais para um marketplace que processa pagamentos e gera obrigação fiscal:

1. `POST /api/users/me/upgrade-pj` aceita só `{ cnpj }`, valida dígito verificador local (`utils/cnpj.ts validateCNPJ`) e grava `userType="PJ"`. **Não consulta a Receita.** Um CNPJ baixado/suspenso passa.
2. `PATCH /api/users/me/complete-registration` aceita `userType: "PJ"` informando **apenas** o CNPJ — nenhum CPF de pessoa física por trás. Conta PJ sem responsável identificado é incompatível com a estratégia de antifraude pré-D4.

A feature **KYB Leve** fecha quatro requisitos:

- **M1**: validar situação cadastral do CNPJ contra a Receita antes de gravar; rejeitar inativo/baixado/suspenso. Persistir razão social, situação, data de abertura.
- **M2**: coletar nome do responsável legal + checkbox de declaração auditada (timestamp + IP).
- **M3**: persistir razão social retornada pela consulta (sai de graça do M1).
- **M4**: exigir cadastro PF completo (CPF verificado + `profileCompletedAt`) antes de virar PJ.

---

## Decisões

### D1 — Fluxo POST único atômico

**Opções consideradas:**
- **A) Fluxo em 2 passos com estado servidor** (`cnpjLookupDraft`): cria estado parcial, abre TOCTOU, duplica rate-limit.
- **B) Fluxo em 2 passos sem estado**: dobra chamadas à API externa — inviável sob quota.
- **C) POST único atômico** com payload `{ cnpj, responsavelLegal, declaracaoVinculo: true }`.

**Decisão: C.** A razão social retornada é informativa, não negociável — não há decisão do usuário entre os dois passos que justifique partir o fluxo. O frontend pode chamar um `GET /api/users/me/pj-preview?cnpj=…` opcional (mesmo helper, cache compartilhado) só para mostrar a razão social no formulário; o POST final reconsulta (cache hit evita 2ª chamada à Receita) e grava.

**Reavaliar se:** API primária passar a exigir captcha/OAuth interativo.

---

### D2 — Fail-open controlado com fila de revisão administrativa

**Opções consideradas:**
- **A) Fail-open** com `cnpjSituacaoVerificada=false` + fila de revisão. Cria janela de bypass conhecida (downtimes da Receita são frequentes), mitigável.
- **B) Fail-closed estrito**: bloqueia 100% durante outages.
- **C) Fail-closed com bypass do `ADMIN_OPERACIONAL`** em tela dedicada.

**Decisão: A (revisão do fundador, 2026-06-20).** O Arquiteto havia proposto **C (fail-closed)**; o fundador optou por **fail-open controlado** após o parecer de Segurança, priorizando conversão (as APIs públicas da Receita caem com frequência e bloquear travaria cadastros legítimos no lançamento nacional). Como o payout já está bloqueado pelo D4 jurídico, uma PJ em revisão não movimenta dinheiro — o risco prático pré-D4 é baixo.

**Comportamento técnico:**
- Após timeout (5s) + 1 retry no primário + fallback + 1 retry, o cadastro **conclui** com `cnpjSituacaoVerificada=false` (estado de revisão) — não retorna 503.
- Situações resolvidas pela Receita seguem bloqueando: `CNPJ_INACTIVE` (baixado/suspenso/inapto/nulo) → 422; `CNPJ_NOT_FOUND` → 422. Só a **indisponibilidade** dispara o fail-open.
- Fila de revisão é query sobre `User` (`userType='PJ' AND cnpjSituacaoVerificada=false AND cnpjVerificacaoOverrideAt IS NULL`) — sem tabela nova. Aprovação admin grava `cnpjVerificacaoOverrideBy` + `cnpjVerificacaoOverrideAt`.

**Mitigações do fail-open (parecer de Segurança):**
- Timeout curto (5s) — forçar timeout não destrava nada além do que o fail-open já permite.
- Dois provedores em cascata (D3) reduzem probabilidade de indisponibilidade simultânea.
- Rate limit por CNPJ (`RATE_LIMITS.upgradePjCnpj`, 3/24h) — corta hammering do mesmo CNPJ.
- Fila admin obrigatória + (H2) retry agendado e circuit breaker.

**Reavaliar se:** volume de `PENDING_REVIEW` por fraude tornar a revisão manual inviável → endurecer para fail-closed ou adicionar KYB pesado.

---

### D3 — API: Brasil API (primária) + Minha Receita (fallback)

**Opções consideradas:**

| API                                          | Cota                 | Custo | Adequação MVP nacional |
|---------------------------------------------|----------------------|-------|------------------------|
| `publica.cnpj.ws`                           | 3 req/min            | Free  | Inviável               |
| `cnpj.ws` (pago)                            | 500/dia free, depois | US$10+/mês | Reserva               |
| `brasilapi.com.br/api/cnpj/v1/{cnpj}`       | Sem cota documentada | Free  | ✅ Primária             |
| `minhareceita.org/{cnpj}`                   | Sem cota documentada | Free  | ✅ Fallback             |
| API gov.br oficial                          | mTLS + convênio      | Burocracia | Fora de alcance       |

**Decisão:**
- **Primária:** Brasil API.
- **Fallback:** Minha Receita (schema JSON diferente — adaptador no helper).
- **Última camada:** 503 + bypass admin (D2).

**Segurança da requisição outbound:**
- URL é construída server-side a partir de allowlist de **2 hosts fixos** + path `/{cnpj}` validado por `^\d{14}$`. **Não passa por `lib/ssrfGuard.ts`** — esse guard cobre URLs controladas pelo usuário (webhooks PJ).
- `fetch` com `redirect: "error"` para impedir redirect 3xx para destino arbitrário.
- Validar `response.url.hostname` está na allowlist após o fetch (cinto + suspensório).

**Política de timeout/retry/cache:**
- Timeout: 5s por chamada (`AbortSignal.timeout(5000)`).
- Retries: 1 no primário, 1 no fallback (até 4 tentativas, ~20s pior caso).
- Backoff: 500ms entre tentativas.
- Cache: Upstash Redis (já configurado em `lib/rateLimit.ts`), key `cnpj:lookup:<14-dígitos>`.
  - TTL "sucesso ATIVA": **7 dias**.
  - TTL "sucesso outras situações": **24h**.
  - Erros: **não cachear**.

**Reavaliar se:** Brasil API + Minha Receita ficarem indisponíveis simultaneamente >2x/semana → contratar `cnpj.ws` pago.

---

### D4 — Schema: 10 colunas + 1 enum, sem tabela nova

```prisma
// ─── KYB leve PJ (ADR-024) ──────────────────────────────────
cnpjRazaoSocial             String?       @db.VarChar(150)
cnpjSituacao                CnpjSituacao?
cnpjDataAbertura            DateTime?     @db.Date
cnpjSituacaoVerificada      Boolean       @default(false)
cnpjVerificadoAt            DateTime?
cnpjResponsavelLegal        String?       // cripto: decisão de Segurança
cnpjDeclaracaoAt            DateTime?
cnpjDeclaracaoIp            String?       // cripto: decisão de Segurança
cnpjVerificacaoOverrideBy   String?       // User.id do admin (bypass D2)
cnpjVerificacaoOverrideAt   DateTime?

enum CnpjSituacao {
  ATIVA
  SUSPENSA
  INAPTA
  BAIXADA
  NULA
}
```

**Ajustes contra a proposta inicial:**
- `cnpjSituacao` virou enum (não string) — impede sujeira de valor e permite query indexada.
- `cnpjDataAbertura` ganhou `@db.Date` (sem hora).
- Adicionados `cnpjVerificadoAt` (timestamp da última verificação bem-sucedida — útil para revalidações periódicas em H2) e `cnpjVerificacaoOverrideBy/At` (auditoria do bypass D2).

**Migração:**
- 1 migration `add_kyb_fields_to_user` adicionando 10 colunas (todas nullable, sem backfill) + enum.
- Aplicar nos **dois** projetos Supabase (local `jtianehxosfdrhjzqvqj` e staging `fflpuoluiqmhpvcxubqi`).
- Sem RLS policy a dropar (RLS desabilitado por ADR-009).

---

### D5 — Helper `lib/pjVerification.ts` como ponto único de verdade

**Assinatura:**

```typescript
// lib/pjVerification.ts

export type CnpjSituacao = "ATIVA" | "SUSPENSA" | "INAPTA" | "BAIXADA" | "NULA"

export interface PjVerificationInput {
  cnpj: string                  // 14 dígitos, já validado por validateCNPJ()
  responsavelLegal: string
  declaracaoVinculo: true       // literal — Zod rejeita false
  declaracaoIp: string          // capturado pelo caller (X-Forwarded-For)
}

export interface PjVerificationResult {
  razaoSocial: string
  situacao: CnpjSituacao
  dataAbertura: Date
  source: "brasilapi" | "minhareceita" | "cache"
}

export type PjVerificationError =
  | { code: "CNPJ_INACTIVE"; situacao: CnpjSituacao }
  | { code: "CNPJ_NOT_FOUND" }
  | { code: "VERIFICATION_UNAVAILABLE" }

export async function verifyCnpjAtReceita(cnpj: string): Promise<PjVerificationResult>

export function buildPjUpdateData(
  input: PjVerificationInput,
  verification: PjVerificationResult,
): Prisma.UserUpdateInput
```

**Onde fica M4 (`profileCompletedAt`):**

- **Em `/upgrade-pj`**: validação **antes** do helper. Se `profileCompletedAt === null` → `409 PROFILE_INCOMPLETE`. Conta PF já tem CPF verificado — caminho trivial.
- **Em `/complete-registration` com `userType: "PJ"`**: o perfil está sendo completado no mesmo request. Exigir **CPF do responsável legal** no payload. Esse CPF vai para `cpfHash`/`cpfEncrypted`; o CNPJ vai para `cnpjHash`/`cnpjEncrypted`. Toda conta PJ no banco passa a ter `cpfHash != null AND cnpjHash != null`.

**Mudança no `CompleteRegistrationSchema`** (`lib/validations/auth.ts:80-107`):
- Quando `userType === "PJ"`: exigir `cnpj` + `cpfResponsavel` (válido) + `responsavelLegal` (string 8-150 chars) + `declaracaoVinculoPJ: z.literal(true)`.

**Captura de IP no caller** (não no helper, para mantê-lo puro/testável):
```typescript
const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
```

---

## Consequências

**Positivas:**
- Toda conta PJ no banco tem CNPJ verificado **e** CPF de responsável identificado (camada de antifraude).
- Trilha de auditoria LGPD: razão social + situação + timestamp + IP da declaração.
- Único helper testável → mudar API externa exige tocar 1 arquivo.
- Fail-open controlado maximiza conversão; payout segue bloqueado por D4, então PJ em revisão não movimenta dinheiro.

**Negativas:**
- Latência de upgrade-pj pode chegar a ~20s em pior caso (timeout primário + fallback). Aceitável para fluxo raramente repetido.
- Cache em Redis adiciona uma dependência ao caminho crítico (já existia para rate-limit; sem novo serviço).
- Quando a API externa não tiver `cpfResponsavel` no payload pré-existente do `/complete-registration`, o frontend precisa adicionar o campo — pequena quebra de schema do cliente.

---

## Itens em Aberto

- [x] Decisão de Segurança (2026-06-20): `cnpjResponsavelLegal` **criptografado** com AES-256-GCM via nova `encryptPII()` (coluna `cnpjResponsavelLegalEncrypted`); `cnpjDeclaracaoIp` em **plaintext** (base legítimo interesse, retenção 5a). Adicionada coluna `cnpjDeclaracaoVersion` (CONSENT_VERSION na declaração). `CONSENT_VERSION` subiu para `v1.1`.
- [ ] **H2** — Circuit breaker (>50% falhas/5min → força revisão) e retry agendado da fila `PENDING_REVIEW`: marcados como negociáveis pelo parecer de Segurança; hoje a revisão é manual via `/admin/usuarios/kyb-pendentes`.
- [ ] **H2** — Cron de revalidação mensal de `cnpjSituacao` para contas com `cnpjVerificadoAt > 30d`.
- [ ] **H2** — Job de retenção: nullificar `cnpjDeclaracaoIp` após 5 anos, preservando `cnpjDeclaracaoAt`.
- [ ] Definir UX da tela admin de revisão (Designer) — hoje é lista funcional read-only com ação de aprovar.
- [ ] Reavaliar contratação de `cnpj.ws` pago se Brasil API + Minha Receita falharem juntas >2x/semana.
