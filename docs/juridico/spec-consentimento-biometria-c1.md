# Spec — Consentimento Especifico para Biometria (C1) — gated D4

> **DRAFT — gated D4, nao publicar.**
> Especificacao tecnica produzida em reacao a **decisao juridica de 2026-06-30 (resposta C1)**: a selfie do KYC e dado pessoal sensivel de natureza biometrica e exige consentimento especifico e destacado (LGPD art. 11, II, "a"), separado do aceite dos Termos.
>
> Esta spec descreve **onde plugar** o consentimento no fluxo atual de KYC do ShareO e **o que registrar como prova**. Este documento e DOC; a implementacao (codigo + UI + migration) e um follow-up que **so deve sair do backlog apos a publicacao do parecer D4 e da aprovacao do texto em `docs/juridico/consentimento-biometria-texto-c1.md` pelo DPO**.

**Versao:** 2026-06-30
**Status:** Draft pre-D4
**Bandeira de feature (a criar):** `biometricConsentRequired` no `PlatformConfig` — default `false` ate o D4 aprovar a ativacao.

---

## 1. Resumo executivo

O fluxo atual de KYC (`POST /api/users/me/id-verification` + componente `app/perfil/_IdVerification.tsx`) aceita o upload do par documento+selfie sem coletar consentimento especifico para a selfie. A correcao consiste em:

1. **Bloquear o upload** se o usuario nao tiver registro valido de consentimento biometrico **antes** da captura.
2. **Coletar o consentimento** num passo dedicado da UI, com checkbox separado e texto integral (vide `docs/juridico/consentimento-biometria-texto-c1.md`).
3. **Persistir prova de consentimento** no modelo `User` (campos `idSelfieConsent*`), analogo ao padrao ja usado em `ContractAcceptance` (`contractVersion` + `contractTextHash`).
4. **Logar acessos** a selfie em `admin_logs` e implementar **endpoint de revogacao** que apaga a selfie do bucket.

A ativacao em producao ocorre via flag (`biometricConsentRequired = true`) so apos o D4 e o RIPD assinado.

---

## 2. Pontos de plug no codigo atual

### 2.1 UI — onde inserir o passo de consentimento

| Arquivo atual | O que faz hoje | O que muda |
|---|---|---|
| `app/perfil/_IdVerification.tsx` (linhas 130-211 do modal) | Abre modal com botoes "Tirar foto" / "Galeria" diretamente, sem checkbox especifico para a selfie. Texto generico "Seus dados sao protegidos pela LGPD" (linhas 185-188) **nao serve** como consentimento destacado. | Antes do bloco da selfie (a partir da linha 163 — "Selfie segurando o documento"), inserir um **passo dedicado** (sub-modal ou step) com o texto integral de `docs/juridico/consentimento-biometria-texto-c1.md` e checkbox separado. Botao "Tirar selfie" / "Galeria" **so habilita** apos o checkbox. Estado novo: `biometricConsentAccepted: boolean`. |

**Importante:** o componente atual e Client (`"use client"`); a captura da selfie ocorre **inteiramente no navegador** ate o envio (linhas 65-93). O consentimento precisa ser registrado no servidor **antes** da subida do arquivo, para que a API possa aplicar o bloqueio do item 2.2. Sugestao: novo endpoint `POST /api/users/me/biometric-consent` que retorna `{ consentVersion, acceptedAt }` e e chamado pelo `submit()` **antes** do `fetch("/api/users/me/id-verification")`. Alternativa: enviar `consentVersion` e `consentTextHash` como campos extras no mesmo `FormData` e gravar atomicamente no upload.

### 2.2 API — onde inserir o bloqueio

| Arquivo atual | O que faz hoje | O que muda |
|---|---|---|
| `app/api/users/me/id-verification/route.ts` (linhas 14-103) | Aceita `document` e `selfie` no `FormData` (linhas 30-39), valida tamanho/MIME (linhas 40-66) e faz upload no bucket `id-docs` (linhas 76-79). Atualiza `User.idVerificationStatus = PENDING` (linhas 92-100). | Antes do upload (apos linha 66, antes de criar paths/buffers): se a flag `biometricConsentRequired` estiver ligada, verificar `User.idSelfieConsentAt != null && idSelfieConsentVersion == BIOMETRIC_CONSENT_VERSION`. Se nao, retornar **412 Precondition Failed** com `{ error: { code: "BIOMETRIC_CONSENT_REQUIRED" } }`. Se a UI mandar `consentVersion` + `consentTextHash` no mesmo FormData, gravar `idSelfieConsent*` no mesmo `prisma.user.update` da linha 92-100. |

### 2.3 Componente de visualizacao admin

| Arquivo atual | O que faz hoje | O que muda |
|---|---|---|
| `app/admin/verificacoes/page.tsx` e `_Actions.tsx` | Mostra documentos pendentes para o admin moderar. Usa signed URLs do bucket `id-docs`. | Cada chamada que gera signed URL para a selfie de um usuario deve gerar entrada em `admin_logs` com `action = "kyc.selfie.view"`, `entityType = "User"`, `entityId = targetUserId`, e `metadata = { purpose: "kyc-review", adminId, ip, userAgent }`. Reaproveitar `lib/audit.ts`. |

### 2.4 Endpoint novo — revogacao

| Endpoint a criar | Metodo | Comportamento |
|---|---|---|
| `/api/users/me/biometric-consent` | `DELETE` | Apenas para o proprio titular autenticado. Apaga o arquivo de selfie no bucket `id-docs` (path em `User.idSelfieUrl`); zera `User.idSelfieUrl` e `idSelfieConsentAt` no banco; rebaixa `idVerificationStatus` para `UNVERIFIED` (ou estado intermediario "BIOMETRIC_REVOKED" — decisao do DPO). **Mantem** os registros de auditoria do consentimento (`idSelfieConsentVersion`, `...TextHash`, `...Ip`) por 5 anos como prova de cumprimento. Retorna 204. |
| `/api/users/me/biometric-consent` | `POST` (opcional, se separar do upload) | Grava `idSelfieConsentAt = now()`, `idSelfieConsentVersion = BIOMETRIC_CONSENT_VERSION`, `idSelfieConsentTextHash = sha256(textoExibido)`, `idSelfieConsentIp = req.ip`. Idempotente: se ja existe consentimento da versao vigente, retorna 200 com os campos atuais. |

---

## 3. Schema — campos novos no modelo `User`

Aditivos (nao quebram dados existentes). Em `prisma/schema.prisma`, no model `users` (proximo aos campos `idSubmittedAt/idVerifiedAt/idRejectionReason`, linhas 268-273):

```prisma
// Prova de consentimento especifico para tratamento biometrico (selfie)
// Base legal: LGPD art. 11, II, "a" (decisao C1, 2026-06-30).
// Padrao analogo a ContractAcceptance.contractVersion/contractTextHash.
idSelfieConsentAt        DateTime?
idSelfieConsentVersion   String?
idSelfieConsentTextHash  String?
idSelfieConsentIp        String?
```

**Migration:** uma unica migration aditiva (`add_biometric_consent_fields`) com `ALTER TABLE users ADD COLUMN`. Sem backfill — os usuarios ja verificados antes da entrada em vigor terao os campos `null`, e o codigo deve tratar `null` como "consentimento ainda nao coletado" e re-pedir no proximo upload.

---

## 4. `lib/legal-config.ts` — versao independente

Hoje (`lib/legal-config.ts` linha 13) existe `CONSENT_VERSION = "v1.1"` para Termos+Politica. Adicionar:

```ts
/**
 * Versao do TEXTO de consentimento especifico para tratamento biometrico
 * (selfie KYC) — LGPD art. 11, II, "a". Evolui em ciclo proprio,
 * independente de CONSENT_VERSION.
 */
export const BIOMETRIC_CONSENT_VERSION = "biometric-v1.0"
```

O texto integral exibido ao usuario fica em um arquivo de constante separado (por exemplo, `lib/legal/biometric-consent-text.ts`) para permitir o `sha256()` no servidor a partir da MESMA string que a UI renderiza — evitando divergencia.

---

## 5. `PlatformConfig` — flag de ativacao

Chave nova: `biometricConsentRequired` (boolean). Default `false`. Quando o D4 aprovar, o SuperAdmin liga em `/admin/financeiro` (ou em area dedicada a flags LGPD). Enquanto desligada, a API segue aceitando uploads sem o gate — mas o **registro** do consentimento ja pode comecar a ser gravado em paralelo (modo "shadow"), para amadurecer o fluxo antes do gate hard.

Recomendacao: lancar em duas etapas.
- **Etapa 1 (pre-D4):** UI mostra o passo de consentimento e grava `idSelfieConsent*`, **sem** bloquear quem nao consentir. Permite testar a UX no staging.
- **Etapa 2 (pos-D4):** ligar `biometricConsentRequired = true` em producao — API passa a retornar 412 para uploads sem consentimento valido.

---

## 6. Log de acesso a biometria

Aproveitar `lib/audit.ts` (modelo `admin_logs`). Acoes novas a registrar:

| Acao | Quando ocorre | Metadata minima |
|---|---|---|
| `kyc.selfie.view` | Toda vez que um admin gera signed URL ou abre a tela de revisao com a imagem | `adminId`, `targetUserId`, `purpose`, `ip`, `userAgent` |
| `kyc.selfie.consent.granted` | POST/upload com consentimento aceito | `userId`, `consentVersion`, `consentTextHash`, `ip` |
| `kyc.selfie.consent.revoked` | DELETE do consentimento pelo titular | `userId`, `consentVersion`, `ip` |
| `kyc.selfie.deleted` | Eliminacao efetiva do arquivo no bucket | `userId`, `reason` (revogacao / exclusao-conta / expiracao) |

Cross-ref: a auditoria s40 (`docs/auditorias/auditoria-conformidade-tecnica-s40.md` secao 1) recomenda Log Drain para retencao MCI art. 15. Esses eventos entram no mesmo pipeline.

---

## 7. Comportamento na exclusao de conta

O endpoint `DELETE /api/users/me` ja faz best-effort para remover documentos KYC (cross-ref: auditoria s40, linha 58). Garantir, na lista de side-effects do delete:

1. Apagar o arquivo de selfie no bucket `id-docs`.
2. Zerar `idSelfieUrl`, `idDocumentUrl`.
3. **Manter** `idSelfieConsent*` por 5 anos (prova de cumprimento legal).
4. Registrar `kyc.selfie.deleted` com `reason = "exclusao-conta"`.

---

## 8. Politica de Privacidade — adendo

Em `/privacidade` (`app/politicas/page.tsx`), incluir secao curta:

> "Coletamos a sua selfie como dado pessoal sensivel de natureza biometrica, exclusivamente para a finalidade de verificacao da sua identidade, com base no seu consentimento especifico (art. 11, II, "a" da LGPD). O texto integral do consentimento e exibido no momento da coleta. Voce pode revoga-lo a qualquer momento — vide secao Direitos do Titular."

A alteracao do texto da Politica de Privacidade nao exige novo aceite dos Termos (`CONSENT_VERSION`), mas **exige bump** de `BIOMETRIC_CONSENT_VERSION` se o texto especifico do consentimento da selfie for alterado.

---

## 9. Separacao DOC vs CODIGO/UI

### O que esta entregue agora (DOC — gated D4)

- `docs/juridico/redline-ripd-biometria-c1.md` — adendo ao RIPD reclassificando a selfie como dado biometrico, atualizando F-09 e medidas de seguranca.
- `docs/juridico/consentimento-biometria-texto-c1.md` — texto integral do consentimento que sera exibido ao titular (a aprovar pelo DPO).
- `docs/juridico/spec-consentimento-biometria-c1.md` — este documento.

### O que e follow-up de CODIGO/UI (a implementar depois — gated D4)

| Item | Arquivo / area |
|---|---|
| Migration aditiva com `idSelfieConsent*` | `prisma/migrations/{ts}_add_biometric_consent_fields/migration.sql` |
| Schema Prisma | `prisma/schema.prisma` (model `users`) |
| Constantes legais | `lib/legal-config.ts` (BIOMETRIC_CONSENT_VERSION) + `lib/legal/biometric-consent-text.ts` (texto integral) |
| Flag de ativacao | `PlatformConfig` — chave `biometricConsentRequired` |
| Passo de consentimento na UI | `app/perfil/_IdVerification.tsx` (antes do bloco da selfie) |
| Bloqueio na API de upload | `app/api/users/me/id-verification/route.ts` (retorno 412 se flag ligada e sem consentimento) |
| Endpoint de gravar consentimento | `app/api/users/me/biometric-consent/route.ts` (POST) |
| Endpoint de revogar consentimento | `app/api/users/me/biometric-consent/route.ts` (DELETE) — apaga selfie do bucket |
| Log de acesso admin a selfie | `app/admin/verificacoes/page.tsx` + `lib/audit.ts` (nova acao `kyc.selfie.view`) |
| Adendo a Politica de Privacidade | `app/politicas/page.tsx` |
| Testes E2E | extender `e2e/id-verification.spec.ts` com cenarios: sem consentimento -> 412; com consentimento -> 200; revogacao apaga selfie |
| Atualizacao do scrub Sentry/log | garantir que `idSelfieConsentTextHash` e demais campos nao caiam em scrub agressivo (sao auditoria, nao PII sensivel) |

---

## 10. Definition of Done (de seguranca/LGPD)

A implementacao so e considerada concluida quando:

1. Texto do consentimento aprovado pelo DPO/advogada (assinatura do D4).
2. Migration aplicada em dev, staging e producao sem drift.
3. Flag `biometricConsentRequired` ligada em producao.
4. API rejeita uploads de selfie sem consentimento valido (412).
5. Revogar consentimento apaga o arquivo no bucket (verificavel pelo Storage admin do Supabase).
6. Log `kyc.selfie.view` aparece para toda visualizacao admin.
7. `DELETE /api/users/me` continua apagando a selfie e mantendo o consentimento por 5 anos.
8. Politica de Privacidade publicada cita a base legal art. 11, II, "a" para selfies.
9. RIPD assinado com Secao C.3, B, E, F e H atualizadas conforme `docs/juridico/redline-ripd-biometria-c1.md`.

---

*Spec preparada pela Analista de Seguranca — ShareO. Gated D4. Nao iniciar implementacao antes do sign-off do parecer juridico e da aprovacao do texto pelo DPO.*
