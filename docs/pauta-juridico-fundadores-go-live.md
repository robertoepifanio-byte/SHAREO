# Pauta única — decisões jurídicas/societárias para destravar o go-live

> **Para:** advogada da ShareO + fundadores. **De:** equipe de produto/tecnologia. **Data:** 2026-06-30 (s41).
>
> **Por que esta pauta existe:** o parecer FORMAL ([`parecer-juridico-revisado-mp.md`](parecer-juridico-revisado-mp.md)) confirmou o modelo (Mercado Pago como PSP). A engenharia já implementou o que **não** dependia de decisão externa (atrás de flag/draft, em staging, sem produção). O que falta para ligar cada peça são **decisões de negócio/jurídico** — não código. Cada item abaixo traz a **pergunta objetiva**, **o que ela destrava** e o **default técnico** que adotaremos se não houver orientação em contrário (o default **não** é opinião jurídica — é a hipótese de trabalho da engenharia, sujeita a confirmação).
>
> Itens marcados **🔒 condição de go-live** travam a produção até serem resolvidos.

---

## A. Decisões para LIGAR o que já está implementado (flags hoje OFF)

### A1. Prazos de retenção/expurgo de dados
**Pergunta:** confirmam os prazos **5 anos** (dados fiscais/transacionais — CTN art. 173) e **180 dias** (logs de acesso — piso do Marco Civil art. 15)? Há alguma categoria com prazo distinto exigido?
**Destrava:** ligar os 3 crons de expurgo (`purge-admin-logs`, `purge-consent-ips`, `purge-access-logs`), hoje OFF.
**Default técnico (confirmar):** 5 anos fiscal / 180 dias logs / 5 anos registros de consentimento. Ver [`rascunho-ripd.md`](rascunho-ripd.md) Seção H.

### A2. Escopo da guarda de logs (Marco Civil art. 15)
**Pergunta:** a guarda de registros de acesso deve cobrir **apenas rotas autenticadas** ou também acessos públicos/anônimos? Quais eventos mínimos (login, ações sensíveis, acesso a dados de terceiros)?
**Destrava:** ligar a flag `accessLogsEnabled` e integrar `logAccess()` no escopo certo (fiação já em andamento, frente P1).
**Default técnico (confirmar):** registrar rotas autenticadas + ações sensíveis; não logar navegação anônima.

### A3. Onde guardar os logs de acesso — Opção I × Opção II
**Pergunta:** preferem **Opção I** (Vercel Log Drain → Axiom/Better Stack/S3 — dados nos **EUA**, exige cláusula de transferência internacional) ou **Opção II** (tabela `access_logs` em **sa-east-1/Brasil**, sem transferência internacional)?
**Destrava:** definir a arquitetura final do art. 15. Ver [`retencao-logs-art15.md`](retencao-logs-art15.md).
**Default técnico (recomendado p/ H1):** **Opção II** (Brasil) — evita transferência internacional adicional e mantém os dados na mesma região do banco.

### A4. Trava de expurgo sob ordem judicial / litígio
**Pergunta:** confirmam que o expurgo automático deve ser **suspenso** para dados sob ordem judicial, litígio ou investigação em curso (retenção legal supera o prazo de minimização)? Há um processo para sinalizar esses casos?
**Destrava:** implementar a trava antes de ligar os crons (A1).
**Default técnico (confirmar):** sim — flag de "retenção legal" por registro que bloqueia o expurgo.

---

## B. Pagamentos, fiscal e societário

### B1. Contrato com o Mercado Pago + conta PJ 🔒 condição de go-live
**Pergunta:** qual o status/prazo da **assinatura do contrato com o Mercado Pago pela PJ da ShareO** e da **ativação da conta PJ** (recebimento)? A criação do app MP de **produção** depende de verificação de identidade da PJ — já iniciada?
**Destrava:** condição 2/4 do go-live; sem isso não há credenciais MP de produção nem repasse real.

### B2. Emissão de NF sobre a taxa de 15%
**Pergunta:** qual o **processo de emissão de nota fiscal** sobre a taxa de serviço (receita da ShareO)? Emissor/integração? Os 85% repassados ao locador são tratados contabilmente como **não-receita** (confirmar com a contabilidade)?
**Destrava:** conformidade fiscal do item 2 do checklist; eventual automação de NF.

### B3. Revisão de tributarista (ISS/PIS/COFINS)
**Pergunta:** há **parecer de tributarista** sobre a incidência de ISS/PIS/COFINS na taxa de 15% e sobre o tratamento do split via PSP? Regime tributário da PJ?
**Destrava:** fecha a face fiscal do parecer.

### B4. PLD/FT — sujeito obrigado e política mínima
**Pergunta:** com o PSP licenciado assumindo parte de KYC/KYB/monitoramento, a **ShareO é sujeito obrigado** pela Lei 9.613/1998? Qual o **conteúdo mínimo** da política de prevenção que devemos manter (monitoramento de transações suspeitas, comunicação ao COAF)?
**Destrava:** redação da política mínima de PLD/FT (item 5 do checklist).
**Já implementado:** KYB leve de PJ (CNPJ na Receita + declaração de responsável).

---

## C. LGPD

### C1. Selfie de verificação = dado biométrico? (art. 11)
**Pergunta:** a **selfie** coletada no KYC é **dado pessoal sensível/biométrico** (LGPD art. 11)? A base legal atual (art. 7º IX — interesse legítimo) é suficiente, ou exige **consentimento específico** (art. 11, II, "a") e/ou tratamento diferenciado?
**Destrava:** ajustar base legal, textos de consentimento e o RIPD (risco F-09). Ver [`auditoria-conformidade-tecnica-s40.md`](auditoria-conformidade-tecnica-s40.md).

### C2. Transferência internacional de dados (art. 33)
**Pergunta:** podem **assinar/formalizar** as cláusulas-padrão/DPAs com os subprocessadores nos EUA (**Resend, Sentry, Mapbox, Vercel**)? Acrescentar o **Mercado Pago** como operador na relação?
**Destrava:** conformidade do art. 33; remove a ressalva F-06. Ver [`transferencia-internacional-dados.md`](transferencia-internacional-dados.md).

### C3. Validação e assinatura do RIPD + designação formal do DPO
**Pergunta:** a **Encarregada (DPO)** pode **revisar, completar (CNPJ/endereço do controlador) e assinar** o RIPD? A designação formal do Encarregado está documentada internamente?
**Destrava:** transforma o rascunho do RIPD em documento formal (exigência do parecer e da Resolução CD/ANPD nº 02/2022).

### C4. MP como operador na Política de Privacidade
**Pergunta:** aprovam incluir o **Mercado Pago como operador de dados financeiros** na Política de Privacidade e corrigir a afirmação imprecisa "nunca compartilhamos com terceiros"?
**Destrava:** publicação da Política revisada (rascunho em [`draft-clausulas-mp-termos-privacidade.md`](draft-clausulas-mp-termos-privacidade.md)).

---

## D. CDC / Termos de Uso

### D1. Termos e Política revisados e publicados 🔒 condição de go-live
**Pergunta:** aprovam o conteúdo revisado (pagamento processado por terceiro/MP; responsabilidade **solidária** mantida; taxa via `getPlatformFeeRate()`) para **publicação** no go-live?
**Destrava:** condição 3/4 do go-live. Rascunhos prontos para revisão.

### D2. Política de arrependimento — art. 49 CDC
**Pergunta:** confirmam a regra **7 dias corridos, antes da retirada do item**, e a forma de reembolso no split do MP? Há exceções (ex.: locação já iniciada)?
**Destrava:** implementação atrás de flag (spec em [`spec-arrependimento-art49.md`](spec-arrependimento-art49.md)).

### D3. Limitação de responsabilidade + responsabilidade solidária
**Pergunta:** aprovam a cláusula de **limitação de responsabilidade** que **não exclui** as obrigações do CDC nem a **responsabilidade solidária** da plataforma?
**Destrava:** redação final da Seção 8 dos Termos.

### D4. SLAs publicados na Central de Ajuda
**Pergunta:** os SLAs hoje publicados (resposta em 4h/2h; atendimento "7 dias, 8h–22h") refletem a **capacidade real**? Viram **oferta vinculante** (CDC art. 30) — manter, ajustar ou remover?
**Destrava:** reescrita da Central de Ajuda alinhada à capacidade (item 9).

### D5. "Seguro opcional 1%"
**Pergunta:** existe **parceria com seguradora registrada na SUSEP**? Se não, oferecer "seguro" é irregular (DL 73/66) — devemos **renomear** para "proteção/garantia" ou **remover** até haver parceiro?
**Destrava:** corrige a Central de Ajuda e evita propaganda enganosa (CDC art. 30/37).

---

## E. Civil / responsabilidade do provedor

### E1. Texto do contrato de locação (aceite eletrônico)
**Pergunta:** podem **aprovar o texto** do Contrato de Locação de Bens Móveis (aceito eletronicamente por locador e locatário)? O mecanismo já existe atrás da flag `rentalContractAcceptanceEnabled` (OFF) — falta o texto definitivo.
**Destrava:** ligar o aceite de contrato com texto válido.

### E2. Alocação do risco de dano/perda sem caução (CC arts. 565+) — questão #6
**Pergunta:** confirmam a alocação do **risco de dano/perda ao locatário** (salvo vício preexistente), **sem caução** no MVP? Como redigir a cláusula para ser exequível?
**Destrava:** cláusula de responsabilidade por dano/perda (item 6 do checklist).

### E3. Responsabilidade do provedor por conteúdo de terceiros (Marco Civil art. 19) — questão #7
**Pergunta:** qual o regime de **responsabilidade da ShareO por conteúdo de terceiros** (anúncios, avaliações, mensagens) e qual a **política de notificação e retirada** a adotar?
**Destrava:** cláusula nos Termos + procedimento operacional de remoção.

---

## Resumo — o que cada bloco destrava

| Bloco | Natureza | Bloqueia go-live? |
|---|---|---|
| A (expurgo/logs) | Ligar flags já implementadas | Não (mas é conformidade) |
| B1 (contrato MP + PJ) | Externo | **🔒 Sim (condição 2/4)** |
| B2–B4 (fiscal/PLD) | Processo + parecer | Conformidade |
| C (LGPD) | Decisão + assinatura | Conformidade (RIPD/transferência) |
| D1 (Termos/Política publicar) | Aprovação + publicação | **🔒 Sim (condição 3/4)** |
| D2–D5 (CDC) | Redação + decisão de negócio | Conformidade (item 4 do checklist) |
| E (civil/provedor) | Redação + decisão | Conformidade (itens 6/7) |

> **Condições de go-live (lembrete):** (1) parecer FORMAL ✅ · (2) contrato MP + conta PJ 🔒 · (3) Termos/Política publicados 🔒 · (4) checklist 100%. Ver [`checklist-conformidade-juridica.md`](checklist-conformidade-juridica.md). **Nenhuma atividade de produção até as 4 estarem cumpridas.**
