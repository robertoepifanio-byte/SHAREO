# Parecer Jurídico (D4) — versão revisada com o Mercado Pago como PSP

> **Status: PARECER FORMAL** (assinado pela advogada da ShareO). Reflete a decisão dos fundadores de **terceirizar o arranjo de pagamentos** contratando o **Mercado Pago** como PSP licenciado pelo BACEN. Supera a leitura preliminar de *merchant of record*.
>
> ⚠️ **Parecer formal ≠ go-live liberado.** O próprio parecer condiciona a produção a: (1) este parecer FORMAL ✅; (2) **contrato com o Mercado Pago assinado + conta PJ ativa**; (3) **Termos de Uso e Política de Privacidade revisados e publicados**; (4) **checklist de conformidade 100%**. Enquanto (2)–(4) não estiverem cumpridos, **nenhuma atividade de produção** (regra absoluta — ver [`checklist-conformidade-juridica.md`](checklist-conformidade-juridica.md)).

**Data do registro:** 2026-06-30 (s41)
**Base:** dossiê [`briefing-juridico-d4.md`](briefing-juridico-d4.md) + decisão dos fundadores pelo Mercado Pago ([ADR-026](adr/ADR-026-pagamentos-mercado-pago-modelo-b.md)).
**Decisão de produto subjacente:** Mercado Pago, **Modelo B (split/marketplace)**, repasse semanal.

---

## Síntese

A advogada recomendou **terceirizar o pagamento e o recebimento**. Os fundadores decidiram contratar o **Mercado Pago** (já em teste no staging — ciclo E2E de split validado em sandbox, ver [[project-mercadopago-migration]]). Com o PSP licenciado assumindo o arranjo financeiro (split + repasse semanal), **a ShareO deixa de ser *merchant of record*** e o risco de enquadramento como instituição de pagamento (Lei 12.865/2013) **se reduz substancialmente**.

---

## Ajustes por área

### 1. Regulatório — Lei 12.865/2013 (arranjos de pagamento / BACEN)

A ShareO **não será *merchant of record***: utilizará o **Mercado Pago, instituição de pagamento licenciada pelo BACEN**. O **repasse semanal** é executado pelo Mercado Pago, **afastando** o risco de enquadramento da ShareO como instituição de pagamento.

> *Trecho do parecer:* "Os fundadores decidiram terceirizar o arranjo de pagamentos, contratando o Mercado Pago como PSP licenciado, responsável por split e repasse semanal dos valores."

**Reflexo operacional:** Modelo B (split/marketplace) — cada locador conecta conta Mercado Pago via OAuth; a taxa de 15% vira `marketplace_fee`; o valor do locador **não transita** pela ShareO. Ver [ADR-026](adr/ADR-026-pagamentos-mercado-pago-modelo-b.md).

### 2. Fiscal / Tributário

- **Mantida** a regra da **taxa de 15% como receita da ShareO**, com **emissão de NF**.
- O **fluxo operacional passa a ser registrado via Mercado Pago**, mas a **obrigação fiscal permanece da ShareO**.
- Os 85% repassados ao proprietário **não são receita** da plataforma.

### 3. LGPD (Lei 13.709/2018)

- **Sem alteração estrutural.**
- **Incluir o Mercado Pago como operador de dados financeiros** — deve constar no **RIPD** ([`rascunho-ripd.md`](rascunho-ripd.md)) e na **Política de Privacidade** (`/privacidade`).

### 4. Direito do Consumidor (CDC)

- Ainda que o pagamento seja processado pelo Mercado Pago, **a ShareO permanece responsável solidária** perante os consumidores.

### 5. PLD/FT (Lei 9.613/1998)

- **Parte** das obrigações de **KYC/KYB e monitoramento** passa a recair sobre o **Mercado Pago**.
- A ShareO deve **manter política mínima de prevenção** (PLD/FT).

### 6. Fundacional / Societário

- O **contrato com o Mercado Pago** deve ser firmado pela **PJ da ShareO**.
- **Incluir cláusula nos Termos de Uso** informando que **os pagamentos são processados por terceiro (Mercado Pago)**.

---

## Conclusão revisada (parecer)

> "O modelo é juridicamente viável e, com a contratação do Mercado Pago como PSP responsável pelo fluxo financeiro, o risco regulatório se reduz substancialmente. Recomenda-se formalizar contrato com o Mercado Pago, ajustar os Termos de Uso e a Política de Privacidade para refletir essa terceirização, e manter política mínima de PLD/FT."

---

## Pendências antes do go-live (do próprio parecer)

1. ✅ **Parecer FORMAL** — recebido (este documento).
2. 🔵 **Contrato com o Mercado Pago assinado + conta PJ ativa.**
3. 🔨 **Termos de Uso e Política de Privacidade revisados e publicados** — rascunhos em [`draft-clausulas-mp-termos-privacidade.md`](draft-clausulas-mp-termos-privacidade.md) (gated; **não publicar** antes da revisão final + condições 2/4).
4. 🔨 **Checklist de conformidade 100%** — [`checklist-conformidade-juridica.md`](checklist-conformidade-juridica.md).

> Relacionados: [ADR-026](adr/ADR-026-pagamentos-mercado-pago-modelo-b.md) · [`briefing-juridico-d4.md`](briefing-juridico-d4.md) · memórias [[project-d4-juridico]], [[project-mercadopago-migration]].
