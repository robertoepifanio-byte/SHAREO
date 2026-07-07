# Redline / Adendo ao RIPD — Selfie como Dado Biometrico Sensivel (C1)

> **DRAFT — gated D4, nao publicar.**
> Adendo ao `docs/juridico/rascunho-ripd.md` produzido em reacao a **decisao juridica de 2026-06-30 (resposta C1)**: a selfie coletada no fluxo de KYC do ShareO **e dado pessoal sensivel de natureza biometrica** (LGPD art. 5o II + art. 11). Interesse legitimo (art. 7o IX) **nao e base legal suficiente** para esse tratamento; e exigido **consentimento especifico e destacado** (art. 11, II, "a"), separado do aceite dos Termos.
>
> Quando o RIPD for consolidado para assinatura do DPO/advogada, este redline deve ser **incorporado** as Secoes C.3, B, E, F e H do `rascunho-ripd.md`. Insumo cruzado: `docs/auditorias/auditoria-conformidade-tecnica-s40.md` (linha 58 — categoria "Documentos de imagem (KYC)").

**Versao do redline:** 2026-06-30
**Decisao juridica que motivou:** C1 (parecer D4, 2026-06-30) — enquadramento de selfie KYC como biometria.
**Status no produto:** **gated D4** — codigo nao alterado; consentimento destacado ainda **nao implementado**. Spec em `docs/juridico/spec-consentimento-biometria-c1.md`.

---

## 1. Redline da Secao C.3 — Dados de verificacao de identidade

A tabela atual em `docs/juridico/rascunho-ripd.md` (Secao C.3, linhas 83-92) classifica a selfie como "Dado pessoal — imagem (potencialmente biometrico)" com base legal art. 7o IX. **Substituir por:**

| Campo no banco | Descricao | Classificacao (revisada C1) | Base legal (revisada C1) |
|---|---|---|---|
| `idDocumentUrl` | URL/path do documento de identidade (RG/CNH) — bucket privado `id-docs` | Dado pessoal (documento de identificacao) | Art. 7o V (execucao de contrato) + art. 7o IX (interesse legitimo — prevencao a fraude) |
| `idSelfieUrl` | URL/path da selfie para verificacao — bucket privado `id-docs` | **Dado pessoal SENSIVEL — biometrico (art. 5o II LGPD)** | **Art. 11, II, "a" LGPD — consentimento especifico e destacado do titular para finalidades especificas.** Art. 7o IX (interesse legitimo) **nao se aplica** a dado sensivel. Alternativa art. 11, II, "d" (obrigacao legal) **nao cabe** sem norma expressa exigindo a coleta. |
| `idVerificationStatus` | Status (UNVERIFIED/PENDING/VERIFIED/REJECTED) | Dado pessoal derivado | Art. 7o V + art. 7o IX (apenas o status, nao a imagem) |
| `idSubmittedAt`, `idVerifiedAt`, `idRejectionReason` | Auditoria do processo | Dado pessoal | Art. 7o II (obrigacao legal) + art. 7o IX |
| **`idSelfieConsentAt`** (novo — a criar) | Timestamp do consentimento especifico para tratamento biometrico | Dado de auditoria | Prova do consentimento (art. 11, II, "a") |
| **`idSelfieConsentVersion`** (novo — a criar) | Versao do texto de consentimento aceito | Dado de auditoria | Prova do consentimento |
| **`idSelfieConsentTextHash`** (novo — a criar) | SHA-256 do texto exato exibido ao titular | Dado de auditoria | Prova do consentimento (integridade — analogo a `ContractAcceptance.contractTextHash`) |
| **`idSelfieConsentIp`** (novo — a criar) | IP no momento do consentimento | Dado pessoal | Prova do consentimento |

**Substituicao da "Nota para o DPO" ao final da Secao C.3 do rascunho original:**

> ~~"imagens de selfie podem ser enquadradas como dado biometrico (art. 5 II LGPD), categoria especial (art. 11). Verificar se a base legal art. 7 IX e suficiente ou se e necessario consentimento especifico (art. 11 II a). Ponto a confirmar com a advogada no parecer D4."~~

**Substituir por:**

> **Decisao juridica formal (C1, 2026-06-30):** a selfie e dado pessoal sensivel de natureza biometrica (art. 5o II LGPD). Tratamento autorizado exclusivamente por **consentimento especifico e destacado do titular para finalidades especificas** (art. 11, II, "a"). O consentimento deve ser coletado **antes** da captura/upload da selfie, em fluxo proprio (modal/passo dedicado), **separado** do aceite dos Termos de Uso e da Politica de Privacidade. Cada coleta gera um registro auditavel (versao + timestamp + IP + hash do texto exibido). A revogacao do consentimento implica eliminacao da selfie do bucket `id-docs` (salvo dever de retencao fiscal/regulatorio expressamente justificado).

---

## 2. Redline da Secao B — Finalidades

Substituir a linha "Verificacao de identidade" da tabela de finalidades (`rascunho-ripd.md` linha 39) por **duas finalidades distintas**:

| Finalidade | Descricao | Base legal |
|---|---|---|
| **Verificacao de identidade — documento** | Confirmar identidade do titular via foto de RG/CNH/passaporte | Art. 7o V (execucao de contrato) + art. 7o IX (interesse legitimo — antifraude) |
| **Verificacao de identidade — biometria (selfie)** | Confirmar que o titular do documento e a pessoa fisica por tras da conta (selfie segurando o documento) | **Art. 11, II, "a" LGPD — consentimento especifico e destacado.** Finalidade: confirmar identidade no onboarding e prevenir uso fraudulento da conta. Sem uso secundario. |

---

## 3. Redline da Secao E — Medidas de Seguranca reforcadas

Adicionar a tabela da Secao E (`rascunho-ripd.md` linhas 227-243) as seguintes medidas, **especificas ao tratamento biometrico**:

| Medida | Descricao | Alcance |
|---|---|---|
| **Bucket dedicado e privado para biometria** | `id-docs` permanece privado; selfies e documentos so servidos via URLs pre-assinadas geradas server-side com TTL curto. Nenhuma URL publica e exposta. | Supabase Storage |
| **Acesso restrito por papel administrativo** | Apenas `ADMIN_SUPERADMIN` e `ADMIN_OPERACIONAL` podem visualizar selfies em `/admin/verificacoes`; toda visualizacao e registrada em `admin_logs` (acao dedicada `kyc.selfie.view`). | API admin |
| **Criptografia em repouso reforcada** | Storage do Supabase ja cifra em repouso; avaliar (H2) cifragem adicional no nivel de aplicacao (envelope encryption) especifica para o bucket `id-docs`. | Supabase Storage |
| **Logs de uso e acesso a biometria** | Cada `getSignedUrl` para `id-docs` gera evento estruturado com `adminId`, `targetUserId`, `purpose`, `timestamp`, `ip`. Retencao alinhada ao Marco Civil (minimo 6 meses). | Postgres + log drain |
| **Consentimento auditavel anterior a captura** | Captura/upload da selfie so e aceita pela API se houver registro valido de consentimento (`idSelfieConsentAt` + versao vigente). Sem consentimento, retorno **412 Precondition Failed**. | API `POST /api/users/me/id-verification` |
| **Eliminacao na revogacao** | Endpoint para o titular revogar consentimento biometrico remove selfie do bucket, anonimiza `idSelfieUrl` e move status para `UNVERIFIED`. Apenas registros de auditoria do consentimento sobrevivem. | API + cron |
| **Vedacao de uso secundario** | A selfie e tratada **exclusivamente** para verificacao de identidade no onboarding/antifraude. Nao pode ser usada para reconhecimento facial em outros fluxos, treinamento de modelos, marketing ou enriquecimento de perfil. | Governanca |
| **Nao compartilhamento com terceiros sem nova base legal** | Vedado transmitir a selfie a subprocessadores fora do escopo declarado. Caso futuramente seja integrado um provedor de KYC com biometria (ex.: liveness check), exige adendo formal ao RIPD + novo consentimento. | Governanca / contratos |

---

## 4. Redline da Secao F — Riscos (atualizacao do risco F-09)

A linha F-09 atual de `rascunho-ripd.md` (linha 257) deve ser **substituida** por:

| # | Risco identificado | Probabilidade | Impacto | Mitigacao existente | Lacuna / acao necessaria |
|---|---|---|---|---|---|
| **F-09 (revisado C1)** | **Tratamento de dado biometrico (selfie KYC) sem base legal adequada — uso de art. 7o IX em vez de art. 11, II, "a".** Risco regulatorio (ANPD) e civel (titular) por tratamento de dado sensivel sem consentimento especifico e destacado. | Media | **Alto** | Bucket `id-docs` privado; acesso restrito server-side via service role; URLs pre-assinadas; visualizacao restrita a roles admin especificos. | **Implementar consentimento especifico e destacado (art. 11, II, "a") ANTES da captura/upload da selfie**, separado do aceite dos Termos. Registrar prova de consentimento (versao + timestamp + IP + hash do texto). Spec: `docs/juridico/spec-consentimento-biometria-c1.md`. Mitigacao adicional: log de acesso a biometria; endpoint de revogacao com eliminacao efetiva da selfie. **Bloqueador de producao** (gated D4). |

> **Nota para o DPO:** com a entrada em vigor do consentimento destacado e dos demais controles acima, F-09 sai do estado "risco aberto" para "risco mitigado controlado". Ate la, o tratamento da selfie deve permanecer **gated** (flag desligada) em producao.

---

## 5. Redline da Secao H — Retencao (selfie tem prazo proprio)

Substituir a linha "Dados de verificacao de identidade" da tabela de retencao (linha 291 do rascunho) por:

| Categoria de dado | Prazo de retencao | Base legal | Tratamento apos o prazo |
|---|---|---|---|
| **Documentos de identidade (`idDocumentUrl`)** | Ate exclusao de conta pelo titular (salvo disputa ou obrigacao legal pendente) | Art. 18 LGPD + art. 7o IX | Eliminacao dos arquivos no bucket `id-docs` + anonimizacao dos campos no banco |
| **Selfie biometrica (`idSelfieUrl`)** | Ate **revogacao do consentimento especifico** OU exclusao de conta — o que ocorrer primeiro. Nao ha retencao fiscal sobre a imagem biometrica. | Art. 8o paragrafo 5o + art. 11, II, "a" + art. 18 IX LGPD | Eliminacao **imediata** do arquivo no bucket `id-docs` + anonimizacao de `idSelfieUrl`. Registros de auditoria do consentimento (versao, timestamp, IP, hash) sao mantidos por **5 anos** como prova de cumprimento legal. |
| **Registros de consentimento biometrico** (`idSelfieConsentAt`, `...Version`, `...TextHash`, `...Ip`) | **5 anos** apos revogacao ou exclusao de conta | Prova de cumprimento legal (defesa judicial / fiscalizacao ANPD) | Eliminacao fisica |

---

## 6. Proximos passos (incorporar ao bloco final do `rascunho-ripd.md`)

1. Implementar consentimento especifico e destacado para a selfie, conforme `docs/juridico/spec-consentimento-biometria-c1.md` — **gated D4**.
2. Adicionar ao schema os campos de prova de consentimento biometrico (`idSelfieConsent*`).
3. Implementar bloqueio na API: `POST /api/users/me/id-verification` retorna 412 se nao houver consentimento valido.
4. Implementar endpoint de revogacao do consentimento biometrico, com eliminacao efetiva da selfie no bucket.
5. Adicionar log estruturado para toda geracao de signed URL sobre `id-docs` (cross-ref com `access_logs` da secao 1 da auditoria s40).
6. Atualizar `lib/legal-config.ts` com `BIOMETRIC_CONSENT_VERSION` independente de `CONSENT_VERSION` (a biometria evolui em ciclo proprio).
7. Atualizar a Politica de Privacidade (`/privacidade`) para descrever a base legal art. 11, II, "a" para selfies.
8. Atualizar o canal `privacidade@shareo.com.br` para responder pedidos de revogacao biometrica dentro do SLA do art. 18.

---

*Redline elaborado pela Analista de Seguranca — ShareO. Insumo para incorporacao ao `rascunho-ripd.md` antes da assinatura do DPO/advogada. Nao publicar.*
