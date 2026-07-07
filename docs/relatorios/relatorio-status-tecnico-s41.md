# Relatório de Status Técnico — ShareO

**Data:** 2026-07-01 · **Sessão:** s41 · **Branch:** `main` · **Último commit:** `959d63d`
**Ambiente vivo:** https://staging.shareo.com.br (staging — **não é produção**)
**Release baseline:** `v1.10.0` · **Bloqueador de produção:** D4 (jurídico)

---

## 1. Estado do produto

| Métrica | Valor |
|---|---|
| Fase | MVP completo, validado em staging |
| Páginas | 37+ |
| Endpoints de API | 52+ |
| Modelos de dados (Prisma) | 34 tabelas |
| Migrations aplicadas | 34/34 (zero drift verificado) |
| Suíte E2E | verde (regressão) |
| `tsc` + `lint` | verdes |
| PRs abertos | 0 |

**Stack:** Next.js 15.5 (App Router) · TypeScript 5 · Prisma v6 · PostgreSQL/Supabase (sa-east-1) · NextAuth v5 (JWT) · Tailwind 3 · Vercel (Pro).

---

## 2. Entregas da sessão s41

### 2.1 Pagamentos — Mercado Pago Fase 2 (mesclada + ciclo E2E validado)
- **Migração Stripe → Mercado Pago** (Modelo B / split marketplace) implementada e mesclada (PRs #120/#121/#122).
- **Ciclo E2E completo validado no sandbox:** reserva → `PAID`, split correto (R$80 → taxa 15% R$12 → locador R$68), **webhook real do MP** marcou PAID sozinho, POST manual posterior **idempotente**.
- **Tudo atrás do gate `isMercadoPagoActive()`** (flag `mercadoPagoEnabled`) — com a flag no fluxo atual, nada muda.
- ⚠️ **Dívidas técnicas a limpar antes do go-live:** remover o override de sandbox `MP_SANDBOX_SELLER_TOKEN` (#122, staging-only); configurar `MP_WEBHOOK_SECRET`; desacoplar o PIX legado.

### 2.2 Central de Ajuda migrada para o modelo Mercado Pago (#129, #144)
- Reescrita da copy de pagamento (Stripe → Mercado Pago), SLA atualizado (8h/4h, seg–sex 09h–17h), remoção de afirmações desalinhadas.
- Correção de **dark mode** verificada no preview.

### 2.3 Conformidade técnica LGPD / Marco Civil (#125, #127, #130)
- **`HMAC_KEY`** separada da `ENCRYPTION_KEY` (com fallback retrocompatível).
- **Scrub de PII unificado** (`lib/sentry-scrub.ts`) edge/server/client + `safeServerError()`.
- **`DELETE /api/users/me`** respeita a **janela fiscal de 5 anos** (ADR-017).
- **Export art. 20** (portabilidade) completo.
- **Logs de acesso (Marco Civil art. 15)** integrados via `after()`, atrás da flag `accessLogsEnabled` (OFF).
- **Legal-hold** (suspensão de expurgo sob ordem judicial).

### 2.4 Consentimento biométrico da selfie de KYC (#139, #140, #143, #145)
- Implementado o consentimento (LGPD art. 11, decisão C1) atrás da flag **`biometricConsentRequired` (OFF → KYC atual idêntico)**.
- Schema aditivo (`idSelfieConsent{At,Version,TextHash,Ip}`), endpoint de revogação, painel de consentimento no modal.
- **Acessibilidade do modal de KYC** (role=dialog, aria, focus-trap, scroll-lock, tap targets ≥44px).
- Botão de revogação + export art. 20 dos campos de consentimento.

### 2.5 Navegabilidade e polimento de UI (#142, #148–#150)
- Correção de dead-link do CTA de reserva mobile (N1).
- 10 achados de navegabilidade resolvidos (tabs, âncoras, back-links, CTA "Avaliar" na lista de reservas).
- Log de auditoria `kyc.selfie.view` no admin.
- Rascunho do adendo à Política de Privacidade sobre biometria.

---

## 3. Riscos técnicos e dívidas conhecidas

| Item | Severidade | Situação |
|---|---|---|
| Override de sandbox MP (`MP_SANDBOX_SELLER_TOKEN`) | 🔴 remover antes do go-live | Rastreado |
| `MP_WEBHOOK_SECRET` não configurado | 🟡 ação humana (painel MP + Vercel) | Pendente |
| PIX manual em chave pessoal de sócio (staging) | 🟡 cutover para conta PJ no go-live | Documentado |
| PIX legado acoplado (NOT NULL) | 🟢 faxina no cutover | #126 iniciou desacoplamento |
| `ENCRYPTION_KEY` do staging é Sensitive/irrecuperável | 🟡 contornado com override | Documentado |
| Logs art. 15 dependem de decisão de retenção antes de ligar | 🟢 flag OFF, inerte | Aguarda C3 |

**Banco de produção validado:** `migrate deploy` em banco vazio = 34/34 sem erro, zero drift (ARQ-ALTO-15). O maior risco técnico de go-live está eliminado.

---

## 4. O que está bloqueado (gated D4)

- Criação do Supabase de produção (3º projeto).
- Ativação de pagamento real (flag MP ON em produção).
- DNS / domínio `shareo.com.br` apontando para produção.
- Tag `v1.1.0` / go-live.

**Regra absoluta:** nenhuma atividade de produção antes das 4 condições de go-live (parecer ✅ · contrato MP ⏳ · Termos/Política publicados · checklist 100%).

---

## 5. Próximos passos técnicos (sem tocar produção)

1. Aguardar contrato MP + conta PJ (bloqueador B1 — humano).
2. Ao ligar a flag MP em staging: configurar `MP_WEBHOOK_SECRET`, remover override #122.
3. Fechar conformidade C2 (DPAs) / C3 (RIPD/DPO) — ver `docs/juridico/atividades-dpa-ripd-dpo.md`.
4. Aguardar parecer do tributarista (B3) para o regime fiscal.
5. No go-live: criar Supabase prod via `migrate deploy` em banco **vazio** (nunca clonar staging).

---

*Relatório técnico — ShareO s41. Fonte: `docs/STATUS.md`, memória do projeto, histórico de PRs.*
