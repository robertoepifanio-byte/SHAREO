# Checklist de Conformidade Jurídica — ShareO

**Atualizado:** 2026-09-03 · **Fonte:** **parecer jurídico FORMAL** do D4 ([`parecer-juridico-revisado-mp.md`](parecer-juridico-revisado-mp.md)) — ⚠️ escrito com o **Mercado Pago** como PSP, ver a ressalva — + dossiê [`briefing-juridico-d4.md`](briefing-juridico-d4.md) + revisão da Central de Ajuda (s41).

> ✅ **Parecer FORMAL recebido** (condição 1 das 4 de go-live cumprida). ⚠️ **Go-live ainda NÃO liberado.** Das quatro condições, três estão cumpridas (parecer, PSP + conta PJ, conteúdo de Termos/Política aprovado); falta o **checklist 100%** — hoje **C2 (DPA)** e **C3 (RIPD/DPO)**. 🔴 **Some-se a ressalva do PSP:** o parecer analisou o **Mercado Pago**, e o PSP é a **Stripe** desde 24/08 — ver [`ressalva-psp-stripe-2026-09-03.md`](ressalva-psp-stripe-2026-09-03.md). Até o sign-off, **nenhuma atividade de produção** (regra absoluta). Este checklist **rastreia** os ajustes exigidos; não os declara cumpridos juridicamente.

> Legenda: ✅ **pronto** (no produto/código) · 🟡 **parcial / verificar** · 🔨 **trabalho novo** · 🔵 **decisão de negócio/jurídico** (fora do código)

---

## 1. Pagamentos (Lei 12.865/2013 · BACEN)
- ✅ Migrar recebimento para **PSP licenciado** — **o PSP é a STRIPE desde 24/08/2026** ([ADR-028](../adr/ADR-028-reversao-stripe-connect.md)); o Mercado Pago foi descartado e removido do código. ⚠️ O parecer FORMAL validou o desenho do **Mercado Pag
- ✅ Formalizar **contrato com o PSP** — **CUMPRIDA em 24/08/2026** com a Stripe. **Condição 2 de go-live.**
- 🔨 Garantir fluxo **split/escrow** para afastar enquadramento como instituição de pagamento (aponta para o "Modelo B" da migração MP).
- 🔵 **Conta de recebimento = PJ da ShareO** (nunca pessoal) — societário.

## 2. Fiscal / Tributário
- 🔨 **Emissão de NF** sobre a taxa de 15% (receita da plataforma).
- 🔵 Definição contábil: **85% repassado ao proprietário ≠ receita** da ShareO.
- 🟡 Orientação fiscal a proprietários (PF declara IR / PJ emite NF própria) — hoje há **Informe de IR informativo** com disclaimer; formalizar orientação.
- 🔵 Revisão por **tributarista** (ISS/PIS/COFINS).

## 3. LGPD (Lei 13.709/2018)
- ✅ **DPO/Encarregado** designado + canal (`privacidade@shareo.com.br`, `lib/legal-config.ts`).
- 🟡 **Stripe como operador de dados financeiros** — **a Política já a nomeia, e ganhou a seção 4.1 de transferência internacional em 03/09** (o titular passou a ser informado de que os dados vão ao exterior). Falta o DPA e o mecanismo do art. 33. Substituiu o Mercado Pago, que constava no **RIP
- 🟡 **RIPD** (Relatório de Impacto) — **rascunho elaborado** (#116, [`rascunho-ripd.md`](rascunho-ripd.md)); falta validação do DPO/jurídico + arquivamento formal.
- 🟡 **Formalizar transferência internacional** (Resend/Sentry/Mapbox/Vercel — EUA) — **rascunho** (#116, [`transferencia-internacional-dados.md`](transferencia-internacional-dados.md)); falta assinar cláusulas-padrão (art. 33).
- 🔨 **Expurgo de dados** (minimização/retenção) — crons `purge-admin-logs` / `purge-consent-ips` / `purge-access-logs` implementados (#118, flag-safe); **prazos (5a / 180d) a confirmar com jurídico** antes de ativar em produção.
- ✅ **Direitos do titular**: acesso/exclusão (art. 18, `DELETE /api/users/me`) + portabilidade (art. 20, `GET /api/users/me/export`).
- ✅ **Segurança**: AES-256-GCM em CPF/CNPJ + HMAC; bucket `id-docs` privado; PII mascarada em logs.
- 🔨 **Ressalvas da auditoria s40 — REMEDIADAS (PRs abertos, pendente merge, s41 2026-06-30):** (1) `HMAC_KEY` separada de `ENCRYPTION_KEY` (fallback retrocompat) #125; (2) `DELETE /api/users/me` respeita janela fiscal de 5a (ADR-017) #127; (3) export art. 20 completo (+mensagens/financeiro/KYC/ambassador) #127; (4) scrub unificado `lib/sentry-scrub.ts` (edge/server/client) #125; (5) `lib/logger.ts` `safeServerError()` mascara `console.error` #125; (6) `SENSITIVE_RE` com `pixKey`/`holderName`/`responsavelLegal` #125. **PRs #125/#127** — ainda **não mesclados**; flags OFF, sem produção. Ver `../auditorias/auditoria-conformidade-tecnica-s40.md`.

## 4. CDC / Termos de Uso
- ✅ **Taxa de 15% destacada** na UI e nos Termos (`app/termos`).
- 🔨 **Política de arrependimento** (art. 49 — 7 dias corridos, **antes da retirada**).
- 🔨 Cláusula de **responsabilidade primária do proprietário** — **sem excluir** a responsabilidade **solidária** da ShareO.
- 🟡 **Política de cancelamento/devolução** clara — existe fluxo de cancelamento/devolução; formalizar a redação.
- 🔨 Cláusula de **limitação de responsabilidade** da plataforma (sem excluir obrigações do CDC).

## 5. PLD/FT (Lei 9.613/1998 · COAF)
- 🟡 Definir se a ShareO é **sujeito obrigado** — resposta **B4 (30/06)**: **não é**, porque *"o PSP assume KYC/KYB/monitoramento"*. ⚠️ **A confirmar com a advogada:** a conclusão dependia de o PSP ser **instituição autorizada pelo BACEN**, o que o Mercado Pago cumpria de forma direta. A Stripe é estrangeira — ver [`ressalva-psp-stripe-2026-09-03.md`](ressalva-psp-stripe-2026-09-03.md), pergunta 4.
- ✅ **Onde o KYC acontece, documentado (03/09/2026):** a verificação de identidade de quem recebe repasse é feita **integralmente dentro da Stripe**, no onboarding hospedado do Connect (`lib/stripe-connect.ts` — `createOnboardingLink` com `configurations: ["recipient","merchant"]`). Documento, selfie e dados bancários são coletados **pela Stripe**, e a plataforma só lê o **status** (`stripeConnectStatus`, `requirements`) — nunca os documentos. **Sem `charges_enabled`/`payouts_enabled` não há repasse.**
- 🟡 **KYC/KYB próprio da ShareO** — existe e é complementar, não substituto: verificação de identidade do usuário comum (`idVerificationStatus`, bucket privado `id-docs`) e **KYB leve de PJ** (CNPJ na Receita + declaração, `lib/pjVerification.ts`).
- 🔨 Política de **monitoramento de transações suspeitas** — hoje inexistente. Item 4 da lista de 03/09: avaliar política interna mínima **de reforço**, mesmo não sendo sujeito obrigado. Teto de R$ 500 por transação limita a exposição no MVP.
- 🔨 Procedimento de **comunicação ao COAF** (se aplicável — depende da resposta acima).

## 6. Civil / Contratos (CC, locação de coisas)
- 🟡 **Contrato de locação aceito eletronicamente** por locador e locatário — **implementado atrás de flag** `rentalContractAcceptanceEnabled` (OFF) (#117, [`lib/rental-contract.ts`](../lib/rental-contract.ts) + `contractVersion`/`contractTextHash`); ligar pós-parecer, com o texto contratual aprovado.
- 🔨 Cláusula de **responsabilidade por dano/perda** do item (risco do locatário, salvo vício preexistente).
- 🔵 **Seguro opcional** disponível (parceria/seguradora) — decisão de negócio.
- 🟡 **Multas e atrasos** previstos — verificar cobertura atual (devolução em atraso).

## 7. Marco Civil da Internet (Lei 12.965/2014)
- 🔨 **Guarda de logs por 6 meses** (art. 15) — **scaffolding implementado, flag OFF** (#118, s40): tabela `access_logs` (sa-east-1) + `lib/access-log.ts` (grava só com `accessLogsEnabled="true"`) + cron de expurgo aos 180d. **`logAccess()` já integrado nas rotas autenticadas** (`users/me`, `bookings`, `conversations`) no **PR #125** (s41, flag ainda OFF → zero I/O). **Ainda NÃO conforme em produção** — falta jurídico decidir **Opção I** (Vercel Log Drain → Axiom/Better Stack/S3, dados EUA) × **Opção II** (tabela sa-east-1, recomendada p/ H1) e **ligar a flag**. Ver [`retencao-logs-art15.md`](retencao-logs-art15.md) e [`../auditorias/auditoria-conformidade-tecnica-s40.md`](../auditorias/auditoria-conformidade-tecnica-s40.md).
- 🟡 Política de **notificação e retirada** de conteúdo (art. 19) — **DECISÃO 4.3 (2026-06-30): reescrever** a cláusula E3 como **faculdade futura** ("poderá disponibilizar canais de denúncia"), sem prometer canal inexistente (elimina risco CDC art. 30); cumprimento de ordem judicial afirmado de forma incondicional. Rascunho atualizado em [`draft-clausulas-mp-termos-privacidade.md`](draft-clausulas-mp-termos-privacidade.md) §A.5. **Construir o canal de denúncia (botão "Reportar" + model `ContentReport` + takedown) = roadmap H2**, não pré-requisito dos Termos. Confirmar a nova redação com a advogada.
- ✅ **Termos de Uso e Política de Privacidade publicados/acessíveis** (`/termos`, `/privacidade`) — **revisar o conteúdo** conforme o parecer.

## 8. Complementar
- ✅ **Registro da marca "ShareO" no INPI** — **FEITO** (confirmado no parecer).
- 🔵 Avaliar **seguro coletivo** / parceria com seguradora.
- 🔵 **Estrutura societária** revisada (PJ titular da conta e dos contratos com PSP).

## 9. Central de Ajuda (`/ajuda`) — revisão dos especialistas (s41)

> 🔄 **Atualização 2026-08-20 (ADR-028):** com a reversão do PSP para **Stripe Connect**, a copy de pagamento de `/ajuda` e `/politicas` foi reescrita e alinhada ao que o código executa. O pacote de validação para a advogada é [`copy-pagamento-stripe-connect.md`](copy-pagamento-stripe-connect.md) — que **substitui** [`copy-pagamento-validacao-juridica.md`](copy-pagamento-validacao-juridica.md) (escrito para o Mercado Pago). O ponto de maior peso: a implementação *separate charges and transfers* faz o valor **transitar pela conta ShareO na Stripe**, o que não é o desenho que o parecer D4 validou para o MP ("a ShareO não retém nem custodia"). Segue **gated D4 — não publicar antes do sign-off**.

Revisão read-only por product-owner + designer + segurança. Relatório consolidado: [`../auditorias/ajuda-revisao-especialistas-s41.md`](../auditorias/ajuda-revisao-especialistas-s41.md). Itens a levar à advogada (gated D4 — **não publicar antes do sign-off**):
- ✅ ~~**Conteúdo de pagamento cita "Stripe"** — reescrever para **Mercado Pago**~~ — **INVERTIDO em 24/08:** a Stripe é o PSP, e a copy foi alinhada a ela. (cruzava item 1)
- 🔨 **"Dinheiro retido na plataforma"** (6×) contradiz o Modelo B/split (custódia é do PSP) — reescrever (cruza itens 1/3).
- 🔨 **"Exclusão em 15 dias conforme a LGPD"** — impreciso (art. 18 §3º; 15 dias é do art. 19) — alinhar com #3 e o RIPD.
- 🔨 **"Nunca compartilhamos com terceiros"** — falso (subprocessadores + MP, transferência internacional) — alinhar com #3.
- 🔨 **"Seguro opcional 1%"** — vender "seguro" sem seguradora SUSEP é irregular (DL 73/66); confirmar parceiro ou renomear "proteção" (cruza item 6, ⊕ checar se é promessa não implementada).
- 🟡 SLAs publicados (4h/2h/"7 dias 8h–22h") viram oferta vinculante (CDC art. 30) — alinhar com capacidade real; multa/cancelamento espelhar nos Termos (item 4).
- ✅ **Já corrigido (não-gated, PR #124):** a11y (tap targets/contraste/aria-live) + inconsistência interna da regra de liberação de pagamento.

---

## 🚦 Go-live só após (condições do próprio parecer)
1. ✅(com ressalva) **Parecer jurídico FORMAL** — **recebido** ([`parecer-juridico-revisado-mp.md`](parecer-juridico-revisado-mp.md)). ⚠️ Foi escrito com o **Mercado Pago** como PSP; desde 24/08/2026 o PSP é a **Stripe**. O racional (afastar merchant-of-record, Lei 12.865/2013) continua valendo; a análise de **transferência internacional** (LGPD art. 33) **não**, porque o MP é brasileiro e a Stripe não. Reconfirmar com o jurídico.
2. ✅ **Relação com o PSP formalizada + conta PJ ativa** — **CUMPRIDA em 2026-08-24.** Conta PJ ativa (CNPJ 68.512.556/0001-09, desde 11/08). O **contrato do Mercado Pago deixou de existir como pendência**: o MP foi descartado e a Stripe se formaliza por aceitação eletrônica no cadastro, sem instrumento assinado à parte. **Titularidade confirmada pelo fundador**: a conta plataforma (`acct_1TbiQR…`, "Shareo Marketplace") está no **CNPJ da PJ**, com endereço comercial idêntico ao do Comprovante de Situação Cadastral (Rua Pais Leme, 215, conj. 1713 — Pinheiros, São Paulo/SP, 05424-150). É essa titularidade que sustenta "a ShareO não é merchant of record".
3. ✅(conteúdo) **Termos de Uso e Política de Privacidade revisados** — **conteúdo APROVADO p/ publicação no go-live** (resposta D1); **publicar só no go-live**. ⚠️ Os rascunhos ([`draft-clausulas-mp-termos-privacidade.md`](draft-clausulas-mp-termos-privacidade.md)) nomeiam o **Mercado Pago** como operador — reescrever para a Stripe **junto** com a análise de transferência internacional, não antes dela. A **identificação da PJ** (razão social + CNPJ + endereço da sede) está publicada em `/termos`, `/privacidade` e `/politicas` desde 24/08 — obrigação do CDC art. 44 e do Decreto 7.962/2013, art. 2º, I **cumprida**.
4. 🔨 **Checklist acima 100% cumprido** — destravado pelas respostas de 2026-06-30 (ver abaixo). ~~B3 tributarista~~ **fechado em 03/09 (Simples Nacional, via Contabilizei)**; restam **C2 DPA** e **C3 RIPD/DPO**, mais a **ressalva do PSP** (o parecer analisou o Mercado Pago, não a Stripe) — ver [`ressalva-psp-stripe-2026-09-03.md`](ressalva-psp-stripe-2026-09-03.md).

> Ver também: [`checklist-go-live.md`](checklist-go-live.md) (infra/técnico) · [`d4-cobranca-juridico.md`](d4-cobranca-juridico.md) · memória [[project-d4-juridico]].

---

## ✅ Respostas dos fundadores/jurídico à pauta (2026-06-30, s41)
Fonte: `docs/Pauta única decisões jurídicas societárias Respostas.docx`. **Tudo segue gated D4** — implementar em staging/flag-OFF/draft; **publicar/ativar só no go-live**.

| # | Decisão | Destrava (staging/flag/draft) |
|---|---|---|
| **A1** | ✅ Retenção: **5a** fiscal · **180d** logs · **5a** consentimento. Sem categorias extras. | Ligar os 3 crons de expurgo — **após** a trava legal (A4). |
| **A2** | ✅ Logar **rotas autenticadas + ações sensíveis** (login/logout, alterações cadastrais, consentimentos, movimentações financeiras, acesso a dados de terceiros). **Não** logar navegação anônima. | Fiar `logAccess()` nesse escopo + flag `accessLogsEnabled`. |
| **A3** | ✅ **Opção II (Brasil, `access_logs` sa-east-1)** — sem transferência internacional. | Já alinhado (tabela existe); descartar Opção I. |
| **A4** | ✅ Expurgo **suspenso** sob ordem judicial/litígio/investigação. | Implementar **flag de "retenção legal" por registro** ANTES de ligar os crons. |
| ~~**B1**~~ | ✅ **FECHADO (2026-08-24).** As duas metades do B1 eram *(a)* constituir a PJ e *(b)* contratar o PSP. **(a) está feita:** CNPJ **68.512.556/0001-09 ativo desde 11/08/2026**, CNAE 74.90-1-04 (intermediação), coerente com o parecer. **(b) mudou de objeto:** o Mercado Pago **não será utilizado** (decisão do fundador, 24/08/2026) — o PSP é a **Stripe** ([[ADR-028]]). Com isso o "contrato MP assinado", que era a metade travada, **deixa de existir como pendência**: a Stripe não tem contrato de split para assinar à parte; a relação se formaliza pela aceitação eletrônica do Stripe Services Agreement no cadastro da conta plataforma. **Confirmado pelo fundador em 24/08:** a conta plataforma está no **CNPJ da PJ** — é o que sustenta o desenho de "ShareO não é merchant of record". | — (nada pendente). |
| **B2** | ✅ NF da ShareO sobre os 15% (ISS + PIS/COFINS). 85% = **não-receita** (terceiros em trânsito); locador emite a própria. | Automação de NF = análise futura. |
| **B3** | ✅ **FECHADO (2026-09-03).** Abertura: CNPJ ativo desde 11/08/2026. **Regime tributário definido: SIMPLES NACIONAL**, com apoio dos tributaristas da Contabilizei (contador oficial). | Contabilizei (execução) + Fundador Raimundo. |
| **B4** | ✅ ShareO **não é sujeito obrigado** (PSP assume KYC/KYB/monitoramento). Manter **política mínima** de PLD/FT: KYC/KYB básico (feito), monitoramento de suspeitas, canal de reporte, treinamento, logs de alertas 5a. Sem comunicação direta ao COAF. | Redigir política mínima. |
| **C1** | ✅ Selfie **É dado biométrico sensível (art. 11)** — interesse legítimo **insuficiente**; exige **consentimento específico e destacado** (art. 11 II "a"). | Ajustar base legal no RIPD (risco F-09), texto de consentimento separado dos Termos, segurança reforçada. |
| **C2** | 🟡 **Responsável nomeado (2026-08-04): fundador Raimundo Gomes da Silva**, para o período de MVP e primeiro ano de atividade. DPAs/cláusulas-padrão dos subprocessadores (EUA + MP) ainda a formalizar. | Raimundo Gomes da Silva. |
| **C3** | 🟡 **Responsável nomeado (2026-08-04): fundador Raimundo Gomes da Silva** será o **DPO formal** para o período de MVP e primeiro ano de atividade. Validação/assinatura do RIPD ainda pendente. | Raimundo Gomes da Silva (DPO). |
| **C4** | ✅ Incluir o **PSP como operador** na Política; corrigir "nunca compartilhamos com terceiros" → texto de compartilhamento controlado (redação fornecida). ⚠️ **O operador agora é a Stripe, não o MP (24/08/2026)** — e isso **não é troca de nome**: o MP é entidade brasileira, a Stripe é **estrangeira**, então o compartilhamento passa a configurar **transferência internacional de dados** (LGPD art. 33). Revisar `transferencia-internacional-dados.md` e o RIPD **antes** de publicar a Política. | Atualizar draft da Política + RIPD — **com o jurídico**, não por edição de texto. |
| **D1** 🔒 | ✅ Conteúdo revisado dos Termos/Política **aprovado p/ publicação no go-live**. | Publicar só no go-live (condição 3). |
| **D2** | ✅ Arrependimento **7 dias corridos, antes da retirada**. Reembolso pelo PSP: locatário recebe integral, ShareO **estorna os 15%**. Exceção: locação iniciada → só cancelamento. (PSP passou a ser a Stripe em 24/08/2026 — a regra de negócio não muda; muda o mecanismo de estorno.) | Implementar atrás da flag `withdrawalRightEnabled`. |
| **D3** | ✅ Limitação de responsabilidade **sem excluir** CDC nem solidária (redação da Seção 8 fornecida). | Finalizar Seção 8 dos Termos (draft). |
| **D4** | ✅ **NOVO SLA: 8h/4h; atendimento seg–sex 09:00–17:00** (substitui 4h/2h e "7 dias 8h–22h"). | Reescrever Central de Ajuda. |
| **D5** | ✅ **Sem seguradora SUSEP no MVP** — adaptar/remover "seguro"; tema em análise dos fundadores. | Renomear p/ "proteção/garantia" ou remover na Central de Ajuda. |
| **E1** | ✅ Texto do **Contrato de Locação** aprovável com os elementos essenciais listados; aceite eletrônico válido com log. | Finalizar texto → ligar `rentalContractAcceptanceEnabled`. |
| **E2** | ✅ Risco de dano/perda **ao locatário** (salvo vício preexistente/força maior), **sem caução** no MVP (cláusula fornecida). | Inserir cláusula no contrato (item 6). |
| **E3** | ✅ **Art. 19 MCI**: ShareO não responde por conteúdo de terceiros salvo ordem judicial; adotar **notice-and-takedown voluntário** (botão Reportar, análise, remoção de ilícitos, logs). Cláusula fornecida. | Cláusula nos Termos + procedimento de remoção. |

**Pendentes (não destravados), atualizado 2026-08-24:** ~~B1 — FECHADO~~ (PJ constituída, contrato MP sem objeto com a adoção da Stripe, titularidade PJ da conta plataforma confirmada). B3 — **Contabilizei contratada** pra abertura da empresa + regime tributário, previsão **6 dias úteis (~13/08/2026)**; a empresa já foi aberta (CNPJ ativo 11/08), falta o **regime tributário** definido. C2 e C3 — **Raimundo Gomes da Silva nomeado responsável** (DPO para C3) pelo período de MVP e primeiro ano de atividade; formalização de DPAs (C2) e assinatura do RIPD (C3) ainda pendentes de execução.
