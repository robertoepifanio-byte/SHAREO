# RASCUNHO — Clausulas de Termos de Uso e Politica de Privacidade (terceirizacao do pagamento ao Mercado Pago)

> **RASCUNHO GATED — nao publicar.** Insumo para a advogada revisar antes de aplicar em `app/termos/page.tsx` e `app/privacidade/page.tsx`. A publicacao so ocorre **apos** o parecer FORMAL ([`parecer-juridico-revisado-mp.md`](parecer-juridico-revisado-mp.md)) **e** o cumprimento das demais condicoes de go-live (contrato MP assinado + conta PJ ativa + checklist 100%). Nao confundir este arquivo com as paginas publicadas.

**Data:** 2026-06-30 (s41) · **Base:** parecer revisado (MP como PSP) + paginas atuais `/termos` e `/privacidade`.

> **Atualizacao s41 (2026-06-30):** adicionadas as clausulas CDC (arrependimento, limitacao de responsabilidade, cancelamento/devolucao) em documento separado [`draft-clausulas-cdc.md`](draft-clausulas-cdc.md). Adicionado redline do RIPD em [`redline-ripd-mp.md`](redline-ripd-mp.md). Este arquivo cobre as clausulas de Termos de Uso e Politica de Privacidade especificas ao MP.

---

## A. Termos de Uso (`app/termos/page.tsx`)

### A.1 Reescrever a Secao 6 — "Pagamentos e Taxa de Servico"

**Texto atual (resumo):** "Os pagamentos sao processados de forma segura **pela plataforma**, que intermedia o valor da locacao… o ShareO reten uma taxa de servico de {feePct}%…"

**Rascunho revisado** (informa o processamento por terceiro e o split; mantem a taxa lida de `getPlatformFeeRate()` e o teto `CHECKOUT_MAX_CENTS`, sem hardcode):

> **6. Pagamentos e Taxa de Servico**
> Os pagamentos sao processados por **instituicao de pagamento terceirizada e licenciada pelo Banco Central — o Mercado Pago (Mercado Pago Instituicao de Pagamento Ltda.)**, responsavel pelo processamento, pela divisao (*split*) e pelo repasse dos valores. O ShareO **nao retem nem custodia** o valor devido ao locador.
> Sobre o valor da locacao, o ShareO cobra uma **taxa de servico de {feePct}%**, e o valor restante e destinado ao locador. O **repasse ao locador e realizado pelo Mercado Pago**, semanalmente, referente as locacoes concluidas. Cada transacao esta sujeita a um limite de {maxPorTransacao}. A taxa de servico vigente e informada no momento da contratacao e pode ser alterada mediante atualizacao destes Termos.
> Para receber pagamentos, o locador deve **conectar uma conta Mercado Pago** a sua conta ShareO. Ao utilizar o servico de pagamento, voce tambem concorda com os termos e a politica de privacidade do Mercado Pago.

### A.2 Nova clausula — pagamento processado por terceiro + responsabilidade solidaria (CDC)

Acrescentar (pode ser dentro da Secao 6 ou nova secao 6.1):

> **6.1. Processamento por terceiro e responsabilidade.** Os pagamentos sao processados pelo **Mercado Pago**, na qualidade de prestador de servico de pagamento. A disponibilidade, as regras e eventuais tarifas do meio de pagamento sujeitam-se aos termos do Mercado Pago. **Esta terceirizacao nao exclui a responsabilidade da ShareO perante o consumidor**: nos termos do Codigo de Defesa do Consumidor, a ShareO responde **solidariamente** no que lhe couber quanto aos servicos de intermediacao que presta.

> **Nota juridica:** revisar para **nao** ampliar nem reduzir indevidamente a responsabilidade solidaria; alinhar com a futura clausula de **limitacao de responsabilidade** (Secao [Z]) — ver [`draft-clausulas-cdc.md`](draft-clausulas-cdc.md) Clausula B2 — sem afastar direitos do CDC. Item 4 do [`checklist-conformidade-juridica.md`](checklist-conformidade-juridica.md).

### A.3 Ajuste na Secao 7 — "Condutas Proibidas"

A vedacao a "tentar burlar o sistema de pagamento da plataforma" permanece valida; opcionalmente esclarecer "…o sistema de pagamento **operado pelo Mercado Pago**".

### A.4 Clausulas CDC adicionais (arrependimento, cancelamento, limitacao de responsabilidade)

As clausulas exigidas pelo checklist item 4 — politica de arrependimento (art. 49 CDC), limitacao de responsabilidade sem afastar o CDC, e politica de cancelamento/devolucao — estao detalhadas em:

**[`draft-clausulas-cdc.md`](draft-clausulas-cdc.md)**
- Clausula B1: Politica de Arrependimento (art. 49)
- Clausula B2: Limitacao de Responsabilidade (sem afastar CDC + responsabilidade solidaria)
- Clausula B3: Politica de Cancelamento e Devolucao

Essas clausulas devem ser integradas aos Termos de Uso junto com as clausulas A.1 e A.2 acima, nas secoes correspondentes.

---

## B. Politica de Privacidade (`app/privacidade/page.tsx`)

### B.1 Secao 4 — "Compartilhamento de Dados": nomear o operador

**Texto atual:** "…parceiros de processamento de pagamento (para finalizar transacoes)…"

**Rascunho revisado:**

> Podemos compartilhar dados com: **o Mercado Pago, instituicao de pagamento responsavel por processar pagamentos, dividir (*split*) e repassar valores, atuando como operador de dados financeiros** (nome, identificacao e dados necessarios a transacao); autoridades publicas (quando exigido por lei); prestadores de servico de infraestrutura tecnologica (hospedagem, e-mail, analytics), sempre sob acordo de confidencialidade.

> **Nota:** alinhar com a frase "Nao vendemos seus dados" (manter) e com a Central de Ajuda — corrigir a afirmacao "nunca compartilhamos com terceiros" (item 5 de [`draft-ajuda-mp-rewrite.md`](draft-ajuda-mp-rewrite.md) e item 9 do checklist), que e imprecisa diante dos subprocessadores e do Mercado Pago.

### B.2 Nova subsecao — Mercado Pago como operador de dados financeiros

Acrescentar item dedicado (ex.: 4.1):

> **4.1. Processamento de pagamentos (Mercado Pago).** Os pagamentos das locacoes sao processados pelo **Mercado Pago**, que atua como **operador** de dados pessoais financeiros estritamente necessarios a transacao (identificacao das partes, valor, meio de pagamento). O tratamento por esse operador rege-se tambem pela politica de privacidade do Mercado Pago. A ShareO permanece como **controladora** dos dados que coleta para a intermediacao.

### B.3 RIPD

As edicoes concretas a fazer em [`rascunho-ripd.md`](rascunho-ripd.md) estao detalhadas em:

**[`redline-ripd-mp.md`](redline-ripd-mp.md)**

Resumo das edicoes:
- **Secao B (descricao):** corrigir "merchant of record" para refletir que a ShareO nao custodia valores; o arranjo e do PSP.
- **Secao B (finalidades):** atualizar "Intermediacao de locacao" para distinguir o tratamento de dados pela ShareO do tratamento pelo MP.
- **Secao C.6 (dados de pagamento):** atualizar de "PIX manual / chave do proprietario" para o fluxo via Mercado Pago (tokens OAuth cifrados, split). Adicionar os campos `mpAccessTokenEncrypted`, `mpRefreshTokenEncrypted`, `mpUserId`.
- **Secao D.1 (coleta):** atualizar para refletir que os dados de cartao do locatario vao direto ao MP (ShareO nao armazena) e que a ShareO armazena tokens OAuth do proprietario.
- **Secao D.2 (transmissao a terceiros):** incluir o Mercado Pago como operador de dados financeiros — entrada critica, ausente no RIPD atual.
- **Secao F (riscos):** adicionar risco de vazamento de tokens OAuth (F-01b).
- **Secao H (retencao):** adicionar nota sobre retencao e revogacao de tokens OAuth.

---

## C. Itens correlatos a tratar junto (nao bloqueiam este rascunho)

- **Central de Ajuda (`/ajuda`):** reescrita completa para Mercado Pago — ver [`draft-ajuda-mp-rewrite.md`](draft-ajuda-mp-rewrite.md).
- **Versao da politica:** ao publicar, **bumpar** `POLICY_UPDATED_AT` / `CONSENT_VERSION` em `lib/legal-config.ts` (reaceite dos usuarios).
- **Contrato de Locacao** (flag `rentalContractAcceptanceEnabled`, OFF) — texto separado, nao confundir com Termos.
- **Lista de subprocessadores:** ao publicar a Politica de Privacidade revisada, incluir lista completa (Mercado Pago, Mapbox, Resend, Sentry, Vercel) com nome, pais e finalidade — exigido pela LGPD art. 18 VII e pelo principio da transparencia (art. 6 VI).

> Rastreado em [`checklist-conformidade-juridica.md`](checklist-conformidade-juridica.md) (itens 1, 3, 4) e [`parecer-juridico-revisado-mp.md`](parecer-juridico-revisado-mp.md).
> Documentos relacionados (s41): [`draft-clausulas-cdc.md`](draft-clausulas-cdc.md) · [`redline-ripd-mp.md`](redline-ripd-mp.md) · [`draft-ajuda-mp-rewrite.md`](draft-ajuda-mp-rewrite.md) · [`spec-arrependimento-art49.md`](spec-arrependimento-art49.md).
