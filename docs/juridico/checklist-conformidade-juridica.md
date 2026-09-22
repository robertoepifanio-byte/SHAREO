# Checklist de Conformidade Jurídica — ShareO

**Atualizado:** 2026-09-22 · **Fonte:** **parecer jurídico FORMAL** do D4 ([`parecer-juridico-revisado-mp.md`](parecer-juridico-revisado-mp.md)) — ⚠️ escrito com o **Mercado Pago** como PSP — + resposta de 21/09 sobre a Stripe ([`parecer-lei-12865-2026-09-21.md`](parecer-lei-12865-2026-09-21.md)) + dossiê [`briefing-juridico-d4.md`](briefing-juridico-d4.md) + revisão da Central de Ajuda (s41).

> 📌 **Duas consultas acionadas em 03/09/2026:**
> **(a)** ✅ **respondida em 10/09** — chamado na **Contabilizei** sobre o tratamento dos 85% no Simples Nacional, resposta completa em [`retorno-contabilizei-tributacao-2026-09-10.md`](retorno-contabilizei-tributacao-2026-09-10.md) (roteiro original: [`roteiro-contabilizei-simples-nacional-2026-09-03.md`](roteiro-contabilizei-simples-nacional-2026-09-03.md));
> **(b)** ✅ **respondida em 21/09** — custódia do valor e Lei 12.865, pela advogada que apoia Raimundo neste momento inicial (confirmado por ele em 22/09) — ver [`parecer-lei-12865-2026-09-21.md`](parecer-lei-12865-2026-09-21.md).

> ✅ **Parecer FORMAL recebido** (condição 1 das 4 de go-live cumprida). ✅ **Ressalva do PSP — resolvida em 21/09:** a ShareO **não precisa de autorização do Banco Central**, desde que os Termos descrevam a operação como intermediação (texto pronto em [`parecer-lei-12865-2026-09-21.md`](parecer-lei-12865-2026-09-21.md)). ⚠️ **Go-live ainda NÃO liberado.** Das quatro condições, três estão cumpridas (parecer, PSP + conta PJ, conteúdo de Termos/Política aprovado); falta o **checklist 100%** — hoje **C2 (fornecedores sem cláusula da ANPD)** e **C3 (RIPD assinado pelo Encarregado em 21/09; falta confirmar a resposta da advogada e arquivar formalmente)**. Até o sign-off completo, **nenhuma atividade de produção** (regra absoluta). Este checklist **rastreia** os ajustes exigidos; não os declara cumpridos juridicamente.

> Legenda: ✅ **pronto** (no produto/código) · 🟡 **parcial / verificar** · 🔨 **trabalho novo** · 🔵 **decisão de negócio/jurídico** (fora do código)

---

## 1. Pagamentos (Lei 12.865/2013 · BACEN)
- ✅ Migrar recebimento para **PSP licenciado/regulado** — **o PSP é a STRIPE desde 24/08/2026** ([ADR-028](../adr/ADR-028-reversao-stripe-connect.md)); o Mercado Pago foi descartado e removido do código.
- ✅ Formalizar **contrato com o PSP** — **CUMPRIDA em 24/08/2026** com a Stripe. **Condição 2 de go-live.**
- ✅ **Enquadramento como instituição de pagamento — respondido em 21/09/2026.** A ShareO **não precisa de autorização do Banco Central**: quem gerencia conta de pagamento é a Stripe; a ShareO intermedeia e retém só a comissão. Condicionado a os Termos deixarem explícito que o dinheiro pertence ao proprietário desde o início — texto pronto em [`parecer-lei-12865-2026-09-21.md`](parecer-lei-12865-2026-09-21.md).
- 🔨 **Aplicar a nova redação da seção 6 dos Termos** (intermediação/pagamento) e a nova seção 7 (PLD/FT) — texto entregue, não implementado. Ver [`parecer-lei-12865-2026-09-21.md`](parecer-lei-12865-2026-09-21.md).
- 🔵 **Conta de recebimento = PJ da ShareO** (nunca pessoal) — societário. **Cumprida** (conta Stripe no CNPJ 68.512.556/0001-09).

## 2. Fiscal / Tributário
- ✅ **Regime tributário definido e detalhado (10/09):** Simples Nacional, Anexo III/V por Fator R, alíquota projetada 6% sobre a comissão. Ver [`retorno-contabilizei-tributacao-2026-09-10.md`](retorno-contabilizei-tributacao-2026-09-10.md).
- ✅ Definição contábil: **85% repassado ao proprietário ≠ receita** da ShareO — confirmado pela Contabilizei, alinhado ao parecer.
- 🔨 **Emissão de NF** sobre a taxa de 15% — emitida contra o **proprietário**, pela própria plataforma Contabilizei (CNAE 7490-1/04 + item 10.03); mensal consolidada é aceita. Falta decidir automação (B2 do checklist abaixo).
- 🟡 Orientação fiscal a proprietários (PF declara IR / PJ emite NF própria) — hoje há **Informe de IR informativo** com disclaimer; formalizar orientação. Confirmado: **sem retenção de IR/INSS** pela ShareO, **DIMOB não se aplica** (só para operações imobiliárias).
- ✅ **Relatório mensal de intermediações** — requisito da Contabilizei, implementado 10/09 (ver B3 abaixo).

## 3. LGPD (Lei 13.709/2018)
- ✅ **DPO/Encarregado** designado + canal (`privacidade@shareo.com.br`, `lib/legal-config.ts`).
- 🟡 **Stripe como operador de dados financeiros** — **a Política já a nomeia, e ganhou a seção 4.1 de transferência internacional em 03/09** (o titular passou a ser informado de que os dados vão ao exterior). Falta o DPA e o mecanismo do art. 33. Substituiu o Mercado Pago, que constava no **RIP
- 🟡 **RIPD** (Relatório de Impacto) — **versão 2.0 assinada pelo Encarregado (Raimundo) em 21/09/2026** ([`rascunho-ripd.md`](rascunho-ripd.md)). ⚠️ Só a assinatura do Encarregado foi identificada no PDF recebido; o campo de "representante legal do controlador" não veio preenchido — confirmar se falta essa assinatura. Falta ainda: **arquivamento formal fora do repositório** (o PDF assinado não deve entrar no git, que é público) e as duas pendências que a própria seção I do RIPD lista como bloqueadoras do go-live (resposta da advogada sobre os fornecedores sem CPC e sobre o enquadramento do fluxo Stripe).
- 🔴 **Formalizar transferência internacional** (Stripe/Vercel/Resend/Sentry/Mapbox/Upstash — EUA) — **fora do prazo legal**. As **CPC da ANPD** (Res. 19/2024) venceram em **23/08/2025** e não se "assinam": adotam-se na íntegra. Medidos os sete fornecedores em 03/09: **só a Stripe adota as CPC**. Vercel, Resend, Sentry, Mapbox e Upstash **não publicam**; Supabase depende de definir se há transferência. O **Google Analytics saiu da conta em 04/09** — apurou-se que nunca esteve ligado. Falta ainda o **documento público da Cláusula 14**, obrigação nossa. Ver [`dpa-apuracao-2026-09-03.md`](dpa-apuracao-2026-09-03.md).
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
- 🟡 Definir se a ShareO é **sujeito obrigado** — resposta **B4 (30/06)**: **não é**, porque *"o PSP assume KYC/KYB/monitoramento"*. **Resposta de 21/09 traz o texto contratual de PLD/FT** (identificação de usuários, verificação pela Stripe, análise de transações, suspensão, comunicação a autoridades — [`parecer-lei-12865-2026-09-21.md`](parecer-lei-12865-2026-09-21.md)), mas **não confirma explicitamente** se a conclusão de "não sujeito obrigado" se mantém com a Stripe (estrangeira) no lugar do Mercado Pago (que era autorizado pelo BACEN diretamente). Pergunta ainda em aberto.
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
1. ✅ **Parecer jurídico FORMAL** — **recebido em 30/06** ([`parecer-juridico-revisado-mp.md`](parecer-juridico-revisado-mp.md)), escrito com o Mercado Pago como PSP. A ressalva de o PSP ter mudado para a **Stripe** (desde 24/08) foi respondida em **21/09/2026** pela advogada que apoia Raimundo — ver [`parecer-lei-12865-2026-09-21.md`](parecer-lei-12865-2026-09-21.md): a ShareO não precisa de autorização do Banco Central.
2. ✅ **Relação com o PSP formalizada + conta PJ ativa** — **CUMPRIDA em 2026-08-24.** Conta PJ ativa (CNPJ 68.512.556/0001-09, desde 11/08). O **contrato do Mercado Pago deixou de existir como pendência**: o MP foi descartado e a Stripe se formaliza por aceitação eletrônica no cadastro, sem instrumento assinado à parte. **Titularidade confirmada pelo fundador**: a conta plataforma (`acct_1TbiQR…`, "Shareo Marketplace") está no **CNPJ da PJ**, com endereço comercial idêntico ao do Comprovante de Situação Cadastral (Rua Pais Leme, 215, conj. 1713 — Pinheiros, São Paulo/SP, 05424-150). É essa titularidade que sustenta "a ShareO não é merchant of record".
3. ✅(conteúdo) **Termos de Uso e Política de Privacidade revisados** — **conteúdo APROVADO p/ publicação no go-live** (resposta D1); **publicar só no go-live**. **21/09/2026:** chegou texto novo para a seção 6 (intermediação/pagamento) e uma seção 7 nova (PLD/FT), com a frase que faltava — "a ShareO não adquire a propriedade dos valores destinados ao locador" — ver [`parecer-lei-12865-2026-09-21.md`](parecer-lei-12865-2026-09-21.md). **Ainda não aplicado ao texto publicado/aprovado**; fazer isso antes de considerar a condição 3 atualizada. A **identificação da PJ** (razão social + CNPJ + endereço da sede) está publicada em `/termos`, `/privacidade` e `/politicas` desde 24/08 — obrigação do CDC art. 44 e do Decreto 7.962/2013, art. 2º, I **cumprida**.
4. 🔨 **Checklist acima 100% cumprido.** ~~B3 tributarista~~ **fechado em 03/09 (Simples Nacional, via Contabilizei)**. **C3 (RIPD/DPO): RIPD assinado pelo Encarregado em 21/09/2026** — pendências que ainda bloqueiam o go-live na linha C3 da tabela abaixo. Resta **C2** (fornecedores sem CPC — ver [`dpa-apuracao-2026-09-03.md`](dpa-apuracao-2026-09-03.md)).

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
| **B3** | ✅ **FECHADO E DETALHADO (2026-09-10).** Simples Nacional, Anexo III/V por Fator R (alíquota projetada **6%** sobre a comissão), NF emitida contra o proprietário, sem retenção de IR/INSS, DIMOB não se aplica. Resposta completa da Contabilizei ao chamado 29468012 — ver [`retorno-contabilizei-tributacao-2026-09-10.md`](retorno-contabilizei-tributacao-2026-09-10.md). ✅ **Requisito de produto implementado no mesmo dia:** relatório mensal de intermediações (data/CPF-CNPJ/nome do proprietário/valor total/repasse/comissão) — `lib/financial-export.ts` (extraído de `app/api/admin/export/route.ts`, ADR-016) ganhou o documento do proprietário; `app/api/cron/intermediation-report/route.ts` fecha o mês anterior automaticamente e envia por e-mail (anexo CSV) a cada `ADMIN_FINANCEIRO`/`ADMIN_SUPERADMIN`, dia 1 de cada mês (`vercel.json`). | Contabilizei (execução) + Fundador Raimundo. |
| **B4** | ✅ ShareO **não é sujeito obrigado** (PSP assume KYC/KYB/monitoramento). Manter **política mínima** de PLD/FT: KYC/KYB básico (feito), monitoramento de suspeitas, canal de reporte, treinamento, logs de alertas 5a. Sem comunicação direta ao COAF. | Redigir política mínima. |
| **C1** | ✅ Selfie **É dado biométrico sensível (art. 11)** — interesse legítimo **insuficiente**; exige **consentimento específico e destacado** (art. 11 II "a"). | Ajustar base legal no RIPD (risco F-09), texto de consentimento separado dos Termos, segurança reforçada. |
| **C2** | 🔴 **Responsável nomeado (2026-08-04): Raimundo Gomes da Silva.** Reenquadrado em **03/09/2026** ([`dpa-apuracao-2026-09-03.md`](dpa-apuracao-2026-09-03.md)) — o pendente **não é** "assinar DPAs": **Stripe ✅** (adota as CPC da ANPD, nada a assinar) · **Vercel/Resend/Sentry/Mapbox/Upstash ❌** (sem CPC — decisão da **advogada**) · **GA4 ✅** (encerrado 04/09: nunca esteve ligado; Política corrigida e código travado) · **Supabase ❓** (definir se há transferência) · **Cláusula 14** 🔨 (rascunho pronto, obrigação nossa). | Decisões dos fornecedores: **advogada**. Cláusula 14 e medições: **equipe técnica**. Coordenação: Raimundo. |
| **C3** | ✅ **Assinado em 21/09/2026.** Raimundo Gomes da Silva (DPO) assinou o RIPD v2.0 ([`rascunho-ripd.md`](rascunho-ripd.md)). ⚠️ Só a assinatura do Encarregado foi identificada no PDF recebido — o campo do representante legal do controlador não veio preenchido; confirmar. O próprio RIPD (seção I) lista pendências que ainda bloqueiam o go-live (fornecedores sem CPC, enquadramento do fluxo Stripe, GTM, 2FA em staging, plano de incidentes). | Arquivar a via assinada fora do repositório + transformar as pendências da seção I em plano de ação. |
| **C4** | ✅ Incluir o **PSP como operador** na Política; corrigir "nunca compartilhamos com terceiros" → texto de compartilhamento controlado (redação fornecida). ⚠️ **O operador agora é a Stripe, não o MP (24/08/2026)** — e isso **não é troca de nome**: o MP é entidade brasileira, a Stripe é **estrangeira**, então o compartilhamento passa a configurar **transferência internacional de dados** (LGPD art. 33). Revisar `transferencia-internacional-dados.md` e o RIPD **antes** de publicar a Política. | Atualizar draft da Política + RIPD — **com o jurídico**, não por edição de texto. |
| **D1** 🔒 | ✅ Conteúdo revisado dos Termos/Política **aprovado p/ publicação no go-live**. | Publicar só no go-live (condição 3). |
| **D2** | ✅ Arrependimento **7 dias corridos, antes da retirada**. Reembolso pelo PSP: locatário recebe integral, ShareO **estorna os 15%**. Exceção: locação iniciada → só cancelamento. (PSP passou a ser a Stripe em 24/08/2026 — a regra de negócio não muda; muda o mecanismo de estorno.) | Implementar atrás da flag `withdrawalRightEnabled`. |
| **D3** | ✅ Limitação de responsabilidade **sem excluir** CDC nem solidária (redação da Seção 8 fornecida). | Finalizar Seção 8 dos Termos (draft). |
| **D4** | ✅ **NOVO SLA: 8h/4h; atendimento seg–sex 09:00–17:00** (substitui 4h/2h e "7 dias 8h–22h"). | Reescrever Central de Ajuda. |
| **D5** | ✅ **Sem seguradora SUSEP no MVP** — adaptar/remover "seguro"; tema em análise dos fundadores. | Renomear p/ "proteção/garantia" ou remover na Central de Ajuda. |
| **E1** | ✅ Texto do **Contrato de Locação** aprovável com os elementos essenciais listados; aceite eletrônico válido com log. | Finalizar texto → ligar `rentalContractAcceptanceEnabled`. |
| **E2** | ✅ Risco de dano/perda **ao locatário** (salvo vício preexistente/força maior), **sem caução** no MVP (cláusula fornecida). | Inserir cláusula no contrato (item 6). |
| **E3** | ✅ **Art. 19 MCI**: ShareO não responde por conteúdo de terceiros salvo ordem judicial; adotar **notice-and-takedown voluntário** (botão Reportar, análise, remoção de ilícitos, logs). Cláusula fornecida. | Cláusula nos Termos + procedimento de remoção. |

**Pendentes (não destravados), atualizado 2026-08-24:** ~~B1 — FECHADO~~ (PJ constituída, contrato MP sem objeto com a adoção da Stripe, titularidade PJ da conta plataforma confirmada). B3 — **Contabilizei contratada** pra abertura da empresa + regime tributário, previsão **6 dias úteis (~13/08/2026)**; a empresa já foi aberta (CNPJ ativo 11/08), falta o **regime tributário** definido. C2 e C3 — **Raimundo Gomes da Silva nomeado responsável** (DPO para C3) pelo período de MVP e primeiro ano de atividade; assinatura do RIPD (C3) pendente. **⚠️ A frase "formalização de DPAs (C2)" caiu em 03/09/2026** — ver a linha C2 da tabela acima e [`dpa-apuracao-2026-09-03.md`](dpa-apuracao-2026-09-03.md). **B3 foi fechado em 03/09** (Simples Nacional, via Contabilizei); o texto acima é de 24/08 e não reflete isso.
