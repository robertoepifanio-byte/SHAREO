# Pauta de revisão com os fundadores

**Data:** 2026-06-30 (s41) · **Contexto:** após as respostas dos fundadores/jurídico à pauta de go-live. Este documento lista **o que ainda precisa de decisão ou ação** para destravar a produção, separado por responsável.

> 🔒 **Bloqueador absoluto de produção continua sendo o D4.** Nada abaixo coloca o ShareO no ar antes do contrato com o Mercado Pago + conta PJ + Termos/Política publicados + checklist 100%.

---

## 1. O que já está feito (apenas ciência — não exige decisão)

- ✅ **Parecer jurídico FORMAL** recebido e registrado (Mercado Pago como PSP — ShareO deixa de ser *merchant of record*).
- ✅ **16 das 17 respostas** da pauta jurídica registradas e implementadas em rascunho/flag-OFF.
- ✅ **Mesclado em produção do código (staging):** conformidade técnica — retenção legal (*legal hold*), logs de acesso (Marco Civil art. 15) e expurgos LGPD, todos **atrás de flag desligada** (zero efeito até serem ligados no go-live).
- ✅ **Rascunhos prontos** de Termos, Política de Privacidade, cláusulas CDC, RIPD e consentimento de biometria — aguardando revisão da advogada.

---

## 2. Bloqueador de go-live — AÇÃO DOS FUNDADORES

| Item | O que falta | Quem |
|---|---|---|
| **B1 — Contrato Mercado Pago + conta PJ** 🔒 | Assinatura do contrato com o Mercado Pago pela PJ da ShareO **e** ativação da conta PJ de recebimento. Processo "em andamento" — **confirmar o prazo.** Sem isso não há credenciais de produção do MP nem repasse real. | Fundadores |

> **Esta é a única condição de go-live ainda totalmente em aberto.** As demais já têm caminho.

---

## 3. Pendências jurídicas com terceiros (não bloqueiam o código, mas o go-live)

| Item | Situação | Próximo passo |
|---|---|---|
| **B3 — Parecer de tributarista** | Sem parecer formal ainda. Define ISS/PIS/COFINS sobre a taxa de 15% e o regime da PJ (Simples / Lucro Presumido / Real). | Contratar/consultar tributarista. |
| **C2 — Transferência internacional (DPAs)** | "Em análise". Assinar cláusulas-padrão com os subprocessadores nos EUA (Resend, Sentry, Mapbox, Vercel) + incluir o Mercado Pago como operador. | Formalizar (art. 33 LGPD). |
| **C3 — RIPD + DPO formal** | "Em análise". A Encarregada (DPO) precisa revisar, completar e **assinar** o RIPD; designação formal do DPO documentada. | DPO/jurídico. |

---

## 4. Decisões de produto / conteúdo a aprovar

### 4.1 Central de Ajuda — copy de pagamento (Mercado Pago)
A Central de Ajuda foi reescrita de Stripe → Mercado Pago (modelo de split). **Aprovar a redação antes de publicar.** Pontos que a advogada pediu para confirmar:
- A expressão **"valor fica em custódia do Mercado Pago"** (verificar no contrato MP).
- **"Mercado Pago — instituição de pagamento licenciada pelo Banco Central"** + o nome jurídico exato (Mercado Pago Instituição de Pagamento Ltda.).
- A redação de **responsabilidade solidária** da ShareO (CDC).

> ℹ️ **Sobre o ambiente:** a nova copy já foi mesclada e está em **staging** (ambiente de teste, sem consumidores reais e com o Mercado Pago desligado — flag OFF; o staging ainda roda PIX manual). Isso **não** configura propaganda enganosa: não há oferta a consumidor em staging. O **CDC art. 30/37 só passa a valer no go-live de produção**, quando a página fica pública para consumidores reais — e aí o texto precisa bater com o fluxo ativo (Mercado Pago ligado). Como a produção só sobe depois do contrato MP + flag ON, a copy já estará correta nesse momento. **Pré-requisitos antes de tornar a página pública em produção:** (a) aval de redação da advogada; (b) Mercado Pago ligado (flag ON).

### 4.2 Boleto no checkout — DECISÃO
Hoje o checkout do Mercado Pago ofereceria **cartão + Pix + boleto** (não há restrição de método). O boleto compensa em 1–3 dias úteis — incompatível com a confirmação da locação em 24h.
- **Opção 1 (recomendada):** excluir boleto → checkout fica **cartão + Pix** (é o que a FAQ já descreve).
- **Opção 2:** aceitar boleto → ajustar a FAQ e o fluxo para esperar a compensação.

### 4.3 Canal de denúncia de conteúdo (Marco Civil art. 19) — DECISÃO
A cláusula de Termos aprovada (E3) promete um **"canal de denúncia"** de anúncios/avaliações/mensagens. **Esse canal não existe no produto hoje** (só há disputa de reserva). Decidir:
- **Construir** o canal de denúncia + remoção (botão "Reportar" + moderação) antes de publicar a cláusula; **ou**
- **Reescrever** a cláusula como faculdade futura ("poderá disponibilizar") até o canal existir.

### 4.4 Selfie de verificação = biometria (LGPD art. 11) — DECISÃO
O jurídico confirmou que a selfie do KYC é **dado biométrico sensível** e exige **consentimento específico e destacado** (separado dos Termos). Decisões necessárias:
- Aprovar o **texto de consentimento** (rascunho pronto).
- Definir o **modo de lançamento**: "shadow" (registra sem bloquear) antes do D4 × bloqueio obrigatório (recusa sem consentimento) depois do D4.

### 4.5 Seguro — confirmação
Os fundadores informaram que **não há parceria com seguradora SUSEP no MVP**. A menção a "seguro opcional 1%" já foi **removida** da Central de Ajuda. Confirmar se o tema do seguro segue em análise (sem prazo) ou se há decisão.

---

## 5. Cláusulas jurídicas a validar com a advogada (textos já redigidos)

Os textos abaixo já estão rascunhados e prontos para a advogada revisar/aprovar antes de entrarem nos Termos/Política publicados:

| Ref. | Cláusula | Onde entra |
|---|---|---|
| **D3** | Limitação de responsabilidade **sem excluir** o CDC nem a responsabilidade solidária | Termos, Seção 8 |
| **E2** | Responsabilidade por dano/perda do item alocada ao locatário (sem caução) | Contrato de locação / Termos |
| **E3** | Conteúdo de terceiros (art. 19) + notice-and-takedown | Termos (ver decisão 4.3) |
| **C4** | Mercado Pago como operador + correção de "nunca compartilhamos com terceiros" | Política de Privacidade |

**Perguntas abertas registradas para a advogada** (do refinamento dos rascunhos):
1. SLA de reembolso/estorno do Mercado Pago — confirmar no contrato.
2. Unificar nomenclatura "LOCADOR/LOCATÁRIO" × "proprietário/locatário".
3. Incluir a **Supabase** na lista de subprocessadores da Política?
4. Anúncio falso/roubado: cai no art. 19 (exige ordem judicial) ou responsabilidade objetiva (CDC)?
5. Limitação de responsabilidade ao valor da locação é válida no marketplace brasileiro?

---

## 6. Decisão operacional (para o Roberto, não para os fundadores)

- **Central de Ajuda (#129):** ✅ **já mesclada** (em staging, com o Mercado Pago desligado). Falta apenas o aval de redação da advogada antes de a página ficar pública em produção (go-live).
- **Mesclar o PR de rascunhos jurídicos (#131)?** É seguro — só adiciona arquivos em `docs/`, nada é publicado. Recomendado para versionar.

---

*Resumo: a produção depende, em ordem, de (1) contrato MP + conta PJ [fundadores]; (2) tributarista, DPAs e RIPD/DPO [terceiros/jurídico]; (3) aprovação das copys e cláusulas [advogada/fundadores]. O código e os rascunhos já estão prontos e seguros, atrás de flags desligadas.*
