# Auditoria Jurídico-Técnica (read-only) — ShareO

**Data:** 2026-06-28 (s40) · **Autor:** especialista de Segurança (subagente) · **Escopo:** Marco Civil art. 15 + pilares LGPD + inventário de dados pessoais · **Insumo para:** parecer D4 / RIPD / `../juridico/checklist-conformidade-juridica.md`.

> Auditoria **read-only** — nenhuma alteração de código. Evidências citadas em `file:line`.

---

## 1) Marco Civil art. 15 — Retenção de logs de acesso (6 meses)

**🔴 NÃO CONFORME hoje.** Não há registro estruturado de **acesso a aplicações** (IP + timestamp + identificação) com retenção de 6 meses.

| Destino | Conteúdo | Retenção atual |
|---|---|---|
| **Vercel Logs** (runtime + access HTTP) | `console.*` + IP/path/status | **≤ 1–3 dias** (Pro) — muito abaixo dos 6 meses |
| **Sentry** | erros + breadcrumbs (PII filtrada) | 30d (free) / 90d (pago) — **só erros**, não cobre acesso |
| **Postgres `admin_logs`** | ações de admin (`lib/audit.ts`) | **indefinida** (sem expurgo) |
| **Postgres `contract_acceptances`** | IP+UA da assinatura do contrato | **indefinida** |
| **`User.consentIp`/`cnpjDeclaracaoIp`/`FounderLead.consentIp`** | IP de consentimentos | PJ: **5 anos** (cron `app/api/cron/kyb/route.ts:144`); PF/leads: **indefinida** |

**Solução mínima recomendada (não implementada):**
- **Opção A (H1, mais barata):** **Vercel Log Drain** → destino com retenção 6m+ (Axiom / Better Stack / S3). Log mínimo por requisição autenticada: `timestamp UTC`, `IP`, `userId` (só o ID interno), `path`, `status`, `request-id`. Adicionar `userId` via middleware leve.
- **Opção B (H2, mais robusta):** tabela `access_logs` no Postgres (particionada por mês + expurgo aos 180 dias) — fica em sa-east-1, sem transferência internacional.
- **Complementares:** jobs de expurgo para `admin_logs`, `ContractAcceptance` (IP/UA), `User.consentIp` (PF) e `FounderLead.consentIp`; restringir acesso aos logs ao DPO/SuperAdmin (art. 15 exige sigilo + ambiente controlado).

---

## 2) Pilares LGPD — confirmados no código (com 6 ressalvas)

| Pilar | Status | Evidência |
|---|---|---|
| Criptografia **AES-256-GCM** (CPF/CNPJ/responsável) | ✅ | `lib/crypto.ts:38-47`, `:64-70` |
| **HMAC-SHA256** p/ índice de unicidade | ✅ | `lib/crypto.ts:16-23` |
| Bucket **`id-docs` privado** | ✅ | `scripts/setup-dev-storage.ts:45`; upload em `app/api/users/me/id-verification/route.ts:77` |
| **Exclusão (art. 18)** — soft delete + scrub atômico | ✅ | `app/api/users/me/route.ts:11-142` |
| **Portabilidade (art. 20)** — export JSON | ✅ | `app/api/users/me/export/route.ts` |
| **DPO/Encarregado** | ✅ | `lib/legal-config.ts:19` (`privacidade@shareo.com.br`) |
| **Mascaramento de PII** em Sentry | ✅ | `sentry.{server,client}.config.ts` (`beforeSend` + `SENSITIVE_RE`) |

**⚠️ Ressalvas a sinalizar ao parecer:**
1. **Chave única para AES e HMAC** (`ENCRYPTION_KEY`) — vazamento compromete sigilo **e** unicidade. Recomendar `HMAC_KEY` separada com rotação independente.
2. **Exclusão não bloqueia em janela fiscal de 5 anos** — `DELETE /api/users/me` só bloqueia em `Booking ACTIVE` (`:24-43`), não checa `PlatformTransaction`/`Payout`. Diverge do ADR-017.
3. **Portabilidade incompleta** — export omite mensagens, financeiro, KYC, ambassador/fundador, `ContractAcceptance`.
4. **`sentry.edge.config.ts` faz scrub mais raso** (não recursivo) que server/client.
5. **`console.error` server-side não é mascarado** (ex.: `app/api/auth/register/route.ts:121`).
6. **`SENSITIVE_RE` não inclui** `pixKey`/`holderName`/`responsavelLegal` — risco se aparecerem em payload.

---

## 3) Inventário de dados pessoais (insumo do RIPD) — 19 categorias

| Categoria | Campos (principais) | Finalidade | Base legal (LGPD) | Retenção | Onde / subprocessador |
|---|---|---|---|---|---|
| Identificação PF/PJ | `User.name/email/phone/userType/slug/avatarUrl/bio` | Cadastro, auth, perfil | Art. 7º V (+I p/ exibição) | até soft-delete | Supabase (sa-east-1) |
| Localização do usuário | `User.cep/street/neighborhood/city/state/lat/lng` | Geo-busca; antifraude | Art. 7º V (+IX) | até soft-delete | Supabase + **Mapbox (EUA)** |
| Documento fiscal PF | `User.cpfHash`(HMAC), `cpfEncrypted`(AES) | KYC; fiscal; antifraude | Art. 7º II (+IX) | **5 anos** (ADR-017) | Supabase (cifrado) |
| Documento fiscal PJ + responsável | `cnpjHash/cnpjEncrypted/cnpjRazaoSocial/...Encrypted/cnpjDeclaracaoIp` | KYB (ADR-024); fiscal | Art. 7º II (+IX) | IP decl.: **5 anos** (cron); demais 5 anos | Supabase + API Receita |
| Documentos de imagem (KYC) | `idDocumentUrl/idSelfieUrl/idVerificationStatus` | Verificação de identidade | Art. 7º V (+IX) | removido no DELETE (best-effort) | Supabase Storage **privado** `id-docs` |
| Credenciais de auth | `passwordHash`(bcrypt), `emailVerifyToken`(SHA-256), `PasswordResetToken`, `Session`, `Account` | Autenticação | Art. 7º V | TTL próprio | Supabase |
| Consentimentos LGPD | `consentAt/consentIp/consentVersion/ageDeclaredAt` | Prova de consentimento | Art. 8º + 7º I | **indefinida (gap p/ PF)** | Supabase |
| Programa Fundadores (lead) | `FounderLead.email/name/intent/utm*/consentIp/consentUserAgent` | Lista de espera; marketing | Art. 7º I | sem expurgo automático | Supabase + **Resend (EUA)** |
| Programa Embaixadores | `AmbassadorProfile.pixKey/pixKeyType/consentIp` | Comissões (bloqueado até D4) | Art. 7º V | enquanto vinculado | Supabase |
| Dados de pagamento (PIX) | `OwnerPaymentAccount.pixKey/holderName/bankName` | Repasse ao proprietário | Art. 7º V | scrub no DELETE | Supabase + (futuro) **Mercado Pago (BR)** |
| Transacionais financeiros | `Booking.totalPrice/platformFeeAmount/ownerNetAmount`; `PlatformTransaction`; `Payout`; `StripeEventQueue.payload` | Fiscal; conciliação | Art. 7º II | **5 anos** (ADR-017) | Supabase + Stripe(oculto)/MP |
| Comunicações privadas | `Message.content`; `Notification.{title,body,data}` | Chat/notificações | Art. 7º V | soft-delete + scrub | Supabase + Realtime |
| Reviews / reputação | `Review.comment/rating/sentiment/photoUrl` | Reputação | Art. 7º V (+IX) | comment→null no DELETE | Supabase + Storage |
| Item / anúncio | `Item.address/city/state/lat/lng`; `ItemImage.url` | Localização p/ retirada; vitrine | Art. 7º V | soft-delete | Supabase + Storage + **Mapbox (EUA)** |
| Contrato eletrônico | `ContractAcceptance.ipAddress/userAgent/acceptedAt` | Prova de aceite | Art. 7º V (+VI) | **indefinida (gap)** | Supabase |
| Auditoria admin | `AdminLog.{adminId,action,entityType,...}` | Auditoria interna | Art. 7º IX | **indefinida (gap)** | Supabase |
| Indicações / referrals | `Referral`; `AmbassadorCommission` | Programa de indicação | Art. 7º V | persistente | Supabase |
| Telemetria de erros | stack traces (PII filtrada) | Observabilidade | Art. 7º IX | **Sentry: 30/90d (EUA)** | **Sentry (EUA)** |
| Logs de acesso HTTP | IP+path+status+timestamp | Operação/segurança | Art. 7º II (MCI art.15) | **≤3 dias (EUA) — GAP** | **Vercel (EUA)** |
| Analytics web | pageviews/UTM/eventos | Marketing | Art. 7º I | ~14 meses (GA4) | **Google Analytics (EUA)** |

---

## Resumo executivo (para o parecer)
1. **MCI art. 15: não conforme** — implementar Log Drain (6m+) antes do go-live.
2. **Pilares LGPD confirmados**, com **6 ressalvas** (chave única AES/HMAC; exclusão vs. retenção fiscal; export incompleto; scrub raso no Edge; `console.error` não mascarado; `SENSITIVE_RE` sem pixKey/holderName).
3. **19 categorias** inventariadas — retenções fixadas só p/ fiscais (5a); **demais indefinidas** (admin_logs, ContractAcceptance, consentIp PF, FounderLead) → RIPD decide prazos.
4. **Transferência internacional** a formalizar (art. 33): Resend, Sentry, Mapbox, Vercel, Stripe, GA — todas EUA.

> 💡 **Achado relevante:** o modelo **`ContractAcceptance` já existe** no schema (`prisma/schema.prisma`) + endpoint `app/api/bookings/[id]/contract/route.ts` — a feature de aceite de contrato pode já estar parcialmente implementada (cruzar com o PR do especialista Fullstack).
