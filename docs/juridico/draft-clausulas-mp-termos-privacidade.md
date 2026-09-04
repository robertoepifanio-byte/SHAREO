> ⚫ **DOCUMENTO HISTÓRICO — não usar como está.** Foi escrito com o **Mercado Pago** como PSP. Em 24/08/2026 o MP foi descartado e removido do código; o PSP é a **Stripe** ([`ADR-028`](../adr/ADR-028-reversao-stripe-connect.md)).
>
> **O que já foi resolvido sem este rascunho (03/09/2026):** as páginas publicadas **já nomeiam a Stripe** e ganharam a **seção 4.1 — Transferência Internacional de Dados**, que informa ao titular que parte dos dados vai para o exterior, quem recebe e para quê. Nenhum texto publicado menciona o Mercado Pago.
>
> **O que este rascunho ainda precisaria virar, e por que não virou:** as cláusulas sobre o PSP dependem de duas respostas que estão com a advogada — o **mecanismo do art. 33** (a Política hoje declara o fato da transferência, mas não afirma mecanismo que não foi firmado) e a **custódia do valor** na conta da plataforma. Reescrevê-las antes disso produziria texto para refazer. Ver [`ressalva-psp-stripe-2026-09-03.md`](ressalva-psp-stripe-2026-09-03.md).
>
> As menções ao Mercado Pago abaixo ficam **de propósito**: o documento registra o desenho anterior, e apagá-las tornaria impossível comparar o que mudou.

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

As clausulas exigidas pelo checklist item 4 — politica de arrependimento (art. 49 CDC), limitacao de responsabilidade sem afastar o CDC, e politica de cancelamento/devolucao — estao detalhadas em **[`draft-clausulas-cdc.md`](draft-clausulas-cdc.md)**.

### A.5 Nova clausula — Conteudo de terceiros e art. 19 do Marco Civil da Internet

**Referencia de decisao: E3 (aprovado pelos fundadores/juridico em 2026-06-30; REESCRITO em 2026-06-30 — ver decisao 4.3 abaixo)**

Acrescentar como nova secao dos Termos de Uso (posicao sugerida: apos a secao de Condutas Proibidas ou como secao propria "Conteudo de Terceiros"):

> **[W]. Conteudo de Terceiros e Responsabilidade Civil**
>
> A ShareO nao se responsabiliza pelo conteudo publicado por terceiros na plataforma, incluindo anuncios, avaliacoes e mensagens, respondendo apenas nos termos do art. 19 da Lei n. 12.965/2014 (Marco Civil da Internet), mediante ordem judicial especifica. Sem prejuizo disso, a ShareO **podera disponibilizar canais de denuncia** e remover voluntariamente conteudos que violem a lei ou os presentes Termos, a seu exclusivo criterio.
>
> **[W].1. Procedimento de aviso e retirada (quando disponivel).** Caso a ShareO disponibilize um canal de denuncia, o procedimento de aviso e retirada (notice-and-takedown) observara: (a) qualquer usuario podera reportar conteudo potencialmente ilegal ou violador destes Termos pelos canais entao disponibilizados pela ShareO; (b) a equipe de compliance analisara o conteudo reportado e podera removê-lo voluntariamente quando a violacao for manifesta; (c) a ShareO registrara as denuncias recebidas e as acoes tomadas; (d) ordens judiciais especificas de remocao sao cumpridas imediatamente, nos termos do art. 19 do Marco Civil da Internet. **Independentemente da existencia de canal de denuncia, a ShareO cumpre prontamente ordens judiciais especificas de remocao de conteudo.**

#### Notas de implementacao (E3)

- ✅ **DECISAO 4.3 (2026-06-30): REESCREVER (opcao b).** A clausula foi reformulada para **faculdade futura** ("**podera** disponibilizar canais de denuncia"; procedimento [W].1 condicionado a "quando disponivel") — **nao afirma mais** um canal de denuncia existente. Isso **elimina o risco CDC art. 30** (nao ha promessa de funcionalidade inexistente). O cumprimento de ordem judicial de remocao segue afirmado de forma incondicional (isso ja e verdade e nao depende de canal).
  - ⚠️ **A redacao mudou** em relacao ao texto verbatim aprovado pelos fundadores ("mantem canal de denuncia" → "podera disponibilizar canais de denuncia") → **confirmar a nova redacao com a advogada** (deve ser trivial: enfraquece uma obrigacao, nao cria risco).
- 🔭 **Canal de denuncia de conteudo = roadmap pos-go-live (H2), NAO pre-requisito dos Termos.** Verificacao original (2026-06-30): nao existe canal de denuncia de CONTEUDO hoje — o unico componente proximo e `components/booking/ReportProblemForm.tsx` (disputa de RESERVA, nao moderacao de anuncio/avaliacao/mensagem), sem rota de API de report nem model de moderacao. Quando for construido: botao "Reportar" nas entidades (anuncio/avaliacao/chat) + model dedicado (ex.: `ContentReport`) + fluxo de takedown. Registrar como item de backlog H2.
- O art. 19 MCI exige "ordem judicial especifica" para responsabilizacao por conteudo de terceiros — a clausula nao expande esse limiar, o que e correto.
- **CONSULTAR ADVOGADA:** confirmar se a responsabilidade por anuncios falsos (itens que nao existem ou foram roubados) se encaixa no art. 19 MCI ou se ha fundamento de responsabilidade objetiva pelo CDC pelo fato do servico.

Essas clausulas, mais as de arrependimento, cancelamento/devolucao e responsabilidade por dano/perda (B1–B4), devem ser integradas aos Termos de Uso junto com as clausulas A.1 e A.2 acima, nas secoes correspondentes — ver [`draft-clausulas-cdc.md`](draft-clausulas-cdc.md).

---

## B. Politica de Privacidade (`app/privacidade/page.tsx`)

**Referencia de decisao: C4 (aprovado pelos fundadores/juridico em 2026-06-30)**

### B.1 Secao 4 — "Compartilhamento de Dados": substituir afirmacao imprecisa e nomear operadores

**Texto atual (a substituir):** qualquer variacao de "nunca compartilhamos dados com terceiros" ou "parceiros de processamento de pagamento (para finalizar transacoes)" (identificar o trecho exato em `app/privacidade/page.tsx` antes de publicar).

**Rascunho revisado — texto aprovado (C4 — use VERBATIM):**

> Compartilhamos dados pessoais apenas com operadores e parceiros necessarios para a execucao dos servicos, incluindo o Mercado Pago para processamento de pagamentos, sempre sob contratos que garantem protecao e conformidade com a LGPD.

**Complemento descritivo recomendado** (sujeito a revisao juridica — detalha o texto verbatim acima):

> Os principais operadores e subprocessadores de dados da ShareO sao:
>
> | Operador/Subprocessador | Finalidade | Pais-sede |
> |---|---|---|
> | **Mercado Pago** (Mercado Pago Instituicao de Pagamento Ltda.) | Processamento de pagamentos, split e repasse ao locador — atua como operador de dados financeiros | Brasil |
> | **Resend** | Envio de e-mails transacionais (confirmacao, lembretes, notificacoes) | EUA |
> | **Sentry** | Monitoramento de erros da plataforma (pode processar dados tecnicos de sessao) | EUA |
> | **Mapbox** | Geocodificacao de enderecos de anuncios e exibicao de mapas | EUA |
> | **Vercel** | Hospedagem e execucao da aplicacao web | EUA |
>
> Para operadores sediados fora do Brasil, aplica-se a secao de Transferencia Internacional de Dados desta Politica.
>
> A ShareO **nao vende seus dados pessoais** a terceiros. O compartilhamento ocorre exclusivamente para viabilizar os servicos descritos acima.

> **Nota de implementacao:** a frase "nao vendemos seus dados" (manter — e correta) deve ser mantida; apenas a afirmacao "nunca compartilhamos com terceiros" e que precisa ser substituida pelo texto verbatim C4. Alinhar tambem com a Central de Ajuda (item 5 de [`draft-ajuda-mp-rewrite.md`](draft-ajuda-mp-rewrite.md) e item 9 do checklist).

### B.2 Nova subsecao — Mercado Pago como operador de dados financeiros (posicao sugerida: 4.1)

Acrescentar item dedicado imediatamente apos o texto de compartilhamento revisado (B.1):

> **4.1. Processamento de pagamentos (Mercado Pago).** Os pagamentos das locacoes sao processados pelo **Mercado Pago (Mercado Pago Instituicao de Pagamento Ltda.)**, que atua como **operador** de dados pessoais financeiros estritamente necessarios a transacao — incluindo identificacao das partes, valor, meio de pagamento e dados necessarios ao split e ao repasse ao locador. Os dados de cartao do locatario sao inseridos diretamente no ambiente do Mercado Pago; a ShareO **nao armazena dados de cartao**. A ShareO armazena tokens OAuth cifrados do locador para viabilizar o repasse automatico. O tratamento por esse operador rege-se tambem pela politica de privacidade do Mercado Pago, disponivel em mercadopago.com.br. A ShareO permanece como **controladora** dos dados que coleta para a intermediacao.

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
- **Lista de subprocessadores:** a lista completa (Mercado Pago, Mapbox, Resend, Sentry, Vercel) com nome, pais e finalidade ja consta do complemento descritivo da secao B.1 deste rascunho — exigido pela LGPD art. 18 VII e pelo principio da transparencia (art. 6 VI). Confirmar se a Supabase deve tambem ser listada (processa dados como banco de dados e storage).

> Rastreado em [`checklist-conformidade-juridica.md`](checklist-conformidade-juridica.md) (itens 1, 3, 4) e [`parecer-juridico-revisado-mp.md`](parecer-juridico-revisado-mp.md).
> Documentos relacionados (s41): [`draft-clausulas-cdc.md`](draft-clausulas-cdc.md) · [`redline-ripd-mp.md`](redline-ripd-mp.md) · [`draft-ajuda-mp-rewrite.md`](draft-ajuda-mp-rewrite.md) · [`spec-arrependimento-art49.md`](spec-arrependimento-art49.md).
