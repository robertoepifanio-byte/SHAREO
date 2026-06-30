# RASCUNHO — Reescrita da Central de Ajuda: Stripe → Mercado Pago

> **RASCUNHO GATED — nao publicar.** Este documento mapeia, trecho a trecho, as alteracoes necessarias em `app/ajuda/page.tsx` para refletir o modelo de pagamentos via Mercado Pago (PSP licenciado, Modelo B/split). Aplicar ao codigo somente apos: parecer FORMAL recebido e validado + contrato MP assinado + conta PJ ativa + Termos/Politica publicados + checklist 100%. Ver [`checklist-conformidade-juridica.md`](checklist-conformidade-juridica.md), itens 1 e 9.

**Data:** 2026-06-30 (s41)
**Base:** [`parecer-juridico-revisado-mp.md`](parecer-juridico-revisado-mp.md) + auditoria da Central de Ajuda (item 9 do checklist) + pagina atual `app/ajuda/page.tsx`.

---

## Como usar este documento

Para cada item abaixo a estrutura e:

- **Localizacao:** constante ou objeto no arquivo `app/ajuda/page.tsx` que contem o texto.
- **Texto atual:** transcricao exata (ou trecho significativo) da string presente no codigo.
- **Texto proposto:** rascunho revisado pronto para a advogada ler.
- **Justificativa:** fundamento juridico curto.
- **Status:** CONSULTAR ADVOGADA / DECISAO DE NEGOCIO / CORRECAO FACTUAL.

---

## Item 1 — "pagar via cartao pelo app — cartao via Stripe" (7 trechos)

O texto atual menciona "Stripe" em 7 pontos diferentes. Todos devem ser reescritos para "Mercado Pago".

### 1A — LOCATARIO_STEPS step 5, campo `desc`

**Localizacao:** `LOCATARIO_STEPS`, step 5, campo `desc` (~linha 49 de `app/ajuda/page.tsx`).

**Texto atual:**
> "O pagamento e feito por cartao de credito (Visa, Mastercard, Elo, Amex) via Stripe — seus dados de cartao nunca passam pelos servidores do ShareO. O valor maximo por locacao e R$ 500. O dinheiro fica retido na plataforma e so e repassado ao proprietario apos a devolucao confirmada."

**Texto proposto:**
> "O pagamento e feito pelo Mercado Pago — instituicao de pagamento licenciada pelo Banco Central do Brasil. Voce sera redirecionado para o ambiente seguro do Mercado Pago para inserir seus dados de pagamento. Seus dados de cartao nunca passam pelos servidores do ShareO. O valor maximo por locacao e R$ 500. O valor e mantido em custodia pelo Mercado Pago e so repassado ao proprietario apos a confirmacao da devolucao."

**Justificativa:** citar processador desatualizado gera risco de propaganda enganosa (CDC art. 30/37). A custodia e do PSP, nao da plataforma (Modelo B; ADR-026).

**Status:** CORRECAO FACTUAL — submeter a advogada para validar a expressao "em custodia pelo Mercado Pago" em face do contrato a ser assinado com o MP.

---

### 1B — Secao "locatario", FAQ "Como funciona o pagamento?"

**Localizacao:** `SECTIONS`, id `"locatario"`, FAQ "Como funciona o pagamento?".

**Texto atual:**
> "Quando ele aceitar, voce recebe o aviso e pode clicar em 'Pagar agora'. O pagamento e feito com cartao via Stripe. O dinheiro fica retido e so e liberado ao proprietario apos a confirmacao da retirada do item."

**Texto proposto:**
> "Quando ele aceitar, voce recebe o aviso e pode clicar em 'Pagar agora'. O pagamento e processado pelo Mercado Pago. O valor fica em custodia do Mercado Pago e so e repassado ao proprietario apos a confirmacao da devolucao do item."

**Justificativa:** idem 1A.

**Status:** CORRECAO FACTUAL.

---

### 1C — Secao "pagamento", FAQ "Como funciona o pagamento do locatario?"

**Localizacao:** `SECTIONS`, id `"pagamento"`, FAQ "Como funciona o pagamento do locatario?".

**Texto atual:**
> "O locatario paga com cartao de credito via Stripe — a mesma tecnologia usada por grandes empresas no mundo todo. Seus dados de cartao nunca passam pelos servidores do ShareO. O valor e cobrado a vista (sem parcelamento na versao atual) e fica retido ate a devolucao confirmada."

**Texto proposto:**
> "O locatario paga pelo Checkout do Mercado Pago — instituicao de pagamento licenciada pelo Banco Central, usada por milhoes de empresas no Brasil. O pagamento e processado com seguranca no ambiente do Mercado Pago; seus dados de cartao nunca passam pelos servidores do ShareO. O valor e cobrado a vista. Apos o pagamento, o valor fica em custodia do Mercado Pago ate a confirmacao da devolucao."

**Justificativa:** idem 1A.

**Status:** CORRECAO FACTUAL — mesma nota sobre custodia.

---

### 1D — Secao "pagamento", FAQ "Quais bandeiras de cartao sao aceitas?"

**Localizacao:** `SECTIONS`, id `"pagamento"`, FAQ "Quais bandeiras de cartao sao aceitas?".

**Texto atual:**
> "Sao aceitos cartoes de credito Visa, Mastercard, Elo e American Express. O parcelamento nao esta disponivel na versao atual — o valor total e cobrado a vista. O valor maximo por locacao e R$ 500."

**Texto proposto:**
> "O Mercado Pago aceita as principais bandeiras de cartao de credito e debito (Visa, Mastercard, Elo, Hipercard, American Express), alem de Pix. As modalidades disponiveis sao exibidas no Checkout do Mercado Pago no momento do pagamento. O valor maximo por locacao e R$ 500."

**Justificativa:** correcao factual; as opcoes concretas dependem do contrato firmado com o MP.

**Status:** DECISAO DE NEGOCIO — confirmar quais modalidades serao habilitadas e a lista exata de bandeiras na documentacao do contrato MP antes de publicar.

---

### 1E — Secao "pagamento", FAQ "Como o pagamento funciona no ShareO?"

**Localizacao:** `SECTIONS`, id `"pagamento"`, FAQ "Como o pagamento funciona no ShareO?".

**Texto atual:**
> "O locatario paga via cartao pelo app — o dinheiro fica retido na plataforma. (...) Isso garante seguranca para os dois lados."

**Texto proposto:**
> "O locatario paga pelo Checkout do Mercado Pago. O valor fica em custodia do Mercado Pago ate a confirmacao da devolucao. Somente apos a devolucao confirmada o Mercado Pago processa o repasse ao locador, descontando automaticamente a taxa de servico da ShareO ({feePct}%). Isso garante seguranca para os dois lados."

**Justificativa:** Modelo B — a ShareO nao e intermediaria financeira; a custodia e do PSP.

**Status:** CORRECAO FACTUAL.

---

### 1F — Secao "pagamento", FAQ "Como a ShareO protege contra fraudes?"

**Localizacao:** `SECTIONS`, id `"pagamento"`, FAQ "Como a ShareO protege contra fraudes?".

**Texto atual:**
> "...analise de risco nas transacoes via Stripe, limite de tentativas de pagamento..."

**Texto proposto:**
> "...analise antifraude do Mercado Pago integrada ao fluxo de pagamento, limite de tentativas..."

**Justificativa:** correcao factual — antifraude de cartao passa a ser responsabilidade do PSP.

**Status:** CORRECAO FACTUAL.

---

### 1G — Secao "legal", FAQ "O ShareO e regulamentado?"

**Localizacao:** `SECTIONS`, id `"legal"`, FAQ "O ShareO e regulamentado?".

**Texto atual:**
> "As transacoes sao processadas via Stripe, que opera sob regulamentacao do Banco Central e das normas PCI-DSS para seguranca de cartoes."

**Texto proposto:**
> "Os pagamentos sao processados pelo **Mercado Pago (Mercado Pago Instituicao de Pagamento Ltda.)**, instituicao de pagamento autorizada e licenciada pelo Banco Central do Brasil (BACEN), certificada pelos padroes de seguranca PCI-DSS. A ShareO responde solidariamente pelos servicos de intermediacao que presta, nos termos do Codigo de Defesa do Consumidor."

**Justificativa:** corrigir Stripe; registrar responsabilidade solidaria (CDC, Modelo B). Verificar o nome juridico completo do MP e a autorizacao BACEN especifica antes de publicar.

**Status:** CORRECAO FACTUAL + CONSULTAR ADVOGADA para validar "responde solidariamente" no contexto do contrato MP definitivo e verificar o nome juridico e autorizacao BACEN aplicavel.

---

## Item 2 — "dinheiro retido na plataforma" (6 ocorrencias)

Com o Modelo B (split), a custodia e do Mercado Pago, nao da ShareO. A plataforma nao retem o valor do locador. Afirmar o contrario pode configurar enquadramento indevido como instituicao de pagamento (Lei 12.865).

### 2A — LOCATARIO_STEPS step 5

Coberto no Item 1A acima. "O dinheiro fica retido na plataforma" → "O valor e mantido em custodia pelo Mercado Pago".

### 2B — Secao "locatario", FAQ "Como funciona o pagamento?"

Coberto no Item 1B. "O dinheiro fica retido" → "O valor fica em custodia do Mercado Pago".

### 2C — Secao "pagamento", FAQ "Meu dinheiro esta protegido?"

**Texto atual:**
> "O pagamento nao vai direto para o proprietario — ele fica retido na plataforma ate a confirmacao da entrega. Se algo der errado antes disso, o valor pode ser devolvido. Em caso de disputa, nossa equipe analisa o caso e decide o destino do pagamento."

**Texto proposto:**
> "O pagamento nao vai diretamente ao proprietario no ato do pagamento — o valor fica em custodia do Mercado Pago (nosso parceiro de pagamentos, licenciado pelo Banco Central) ate a confirmacao da entrega. Se algo der errado antes da entrega ser confirmada, o valor pode ser reembolsado conforme a politica de cancelamento. Em caso de disputa, a equipe ShareO analisa o caso e, conforme o resultado, aciona o Mercado Pago para o destino do valor."

**Justificativa:** Modelo B; papel do PSP deve ser reconhecido na explicacao de protecao.

**Status:** CORRECAO FACTUAL + CONSULTAR ADVOGADA para confirmar o processo real de reembolso junto ao MP antes de publicar (o contrato MP define os prazos e condicoes).

### 2D — Secao "locador", FAQ "Meu item esta protegido?"

**Texto atual:**
> "O valor fica retido na plataforma ate o repasse semanal (toda segunda-feira), o que protege ambas as partes contra contestacoes."

**Texto proposto:**
> "O valor fica em custodia do Mercado Pago ate o repasse semanal (toda segunda-feira), o que protege ambas as partes contra contestacoes."

**Status:** CORRECAO FACTUAL.

### 2E — LOCADOR_STEPS step 5

**Texto atual:**
> "A locacao entra em andamento; o valor e liberado para o repasse semanal somente apos a confirmacao da devolucao."

**Texto proposto:**
> "A locacao entra em andamento; o valor e mantido em custodia pelo Mercado Pago e so entra na fila de repasse semanal apos a confirmacao da devolucao."

**Status:** CORRECAO FACTUAL.

### 2F — Tabela de taxas, linha "Repasse ao locador"

**Texto atual:**
> "Repasse ao locador | Via PIX — valor liquido | Toda segunda-feira (feriado: 1 dia util seguinte)"

**Texto proposto:**
> "Repasse ao locador | Via Mercado Pago — valor liquido | Toda segunda-feira (feriado: 1 dia util seguinte)"

**Justificativa:** o repasse e executado pelo Mercado Pago via o mecanismo de payout do PSP; "PIX" pode ser o meio final, mas o executor e o MP.

**Status:** DECISAO DE NEGOCIO — confirmar o meio exato de repasse ao locador no contrato MP (Pix via MP, TED, ou credito em conta MP) antes de publicar.

---

## Item 3 — "regulamentado pelo Banco Central via Stripe"

Coberto integralmente nos Itens 1A, 1C, 1G e 2C. Sumario da correcao transversal:

- Substituir todas as mencoes a "regulamentado pelo Banco Central via Stripe" por "Mercado Pago, instituicao de pagamento licenciada pelo Banco Central do Brasil".
- Verificar a autorizacao especifica do MP aplicavel ao produto contratado antes de publicar.

**Status:** CORRECAO FACTUAL + CONSULTAR ADVOGADA.

---

## Item 4 — "exclusao em 15 dias conforme a LGPD" — imprecisao legal

**Localizacao:** `SECTIONS`, id `"conta"`, FAQ "Como excluo minha conta?".

**Texto atual:**
> "A exclusao remove todos os seus dados pessoais em ate 15 dias (conforme a LGPD). Reservas em andamento precisam ser finalizadas antes da exclusao. O historico de transacoes pode ser retido por ate 5 anos para fins legais e fiscais."

**Analise:**
O art. 18, paragrafo 3o, da LGPD nao fixa prazo de 15 dias para a exclusao efetiva de dados. O prazo de 15 dias corridos consta no art. 19 como prazo para o controlador RESPONDER a qualquer requisicao do titular (acesso, correcao, portabilidade ou eliminacao) — com possibilidade de prorrogacao justificada. Publicar "15 dias" como prazo de exclusao efetiva e impreciso e pode ser interpretado como oferta vinculante (CDC art. 30).

**Texto proposto:**
> "A exclusao anonimiza seus dados pessoais na plataforma imediatamente apos a solicitacao ser processada. Dados fiscais e transacionais podem ser retidos por ate 5 anos para cumprimento de obrigacoes legais (LGPD art. 7 II e CTN art. 173). Reservas em andamento precisam ser finalizadas antes da exclusao. Voce recebera confirmacao por e-mail em ate 15 dias corridos apos a solicitacao."

**Justificativa:** (a) distinguir prazo de resposta (15 dias — SLA interno alinhado ao art. 19) de prazo de exclusao efetiva (imediata no processamento tecnico); (b) manter a transparencia sobre retencao fiscal; (c) alinhar com o RIPD.

**Status:** CONSULTAR ADVOGADA — confirmar a redacao exata e o SLA de 15 dias como prazo de resposta/processamento. Verificar alinhamento com [`rascunho-ripd.md`](rascunho-ripd.md) Secao D.4 e G.

---

## Item 5 — "nunca compartilhamos com terceiros" — afirmacao incorreta

**Localizacao:** `SECTIONS`, id `"legal"`, FAQ "Meus dados estao protegidos? Como funciona a LGPD no ShareO?".

**Texto atual:**
> "Nunca compartilhamos seus dados com terceiros sem sua autorizacao explicita."

**Analise:**
A afirmacao e factualmente incorreta. O ShareO transmite dados para: Mercado Pago (dados financeiros e de identidade para o processamento — operador), Mapbox (endereco/CEP para geocoding), Resend (nome e e-mail para notificacoes transacionais), Sentry (logs de erros), Vercel (hospedagem). Todos sao "terceiros" mesmo que sejam subprocessadores operando sob instrucao da ShareO. Publicar afirmacao incorreta viola o principio da transparencia da LGPD (art. 6 VI) e pode configurar propaganda enganosa (CDC art. 37).

**Texto proposto:**
> "Seguimos integralmente a Lei Geral de Protecao de Dados (LGPD — Lei 13.709/2018) e coletamos apenas os dados necessarios para o funcionamento da plataforma. Voce pode solicitar acesso, correcao, portabilidade ou exclusao dos seus dados a qualquer momento em 'Meu Perfil > Privacidade e dados'. Os dados necesarios para processar pagamentos sao compartilhados com o **Mercado Pago** (nosso parceiro de pagamentos, que atua como operador de dados financeiros). Dados minimos sao transmitidos a outros prestadores de infraestrutura (hospedagem, e-mail transacional e monitoramento de erros), sempre sob acordo de confidencialidade. Nao vendemos seus dados pessoais. Consulte nossa **Politica de Privacidade** para a lista completa."

**Justificativa:** transparencia LGPD (art. 6 VI + art. 18 VII); eliminar afirmacao falsa. A Politica de Privacidade revisada (ver [`draft-clausulas-mp-termos-privacidade.md`](draft-clausulas-mp-termos-privacidade.md) Secao B.1 e B.2) deve listar os subprocessadores nominalmente.

**Status:** CORRECAO OBRIGATORIA — submeter a advogada para validar a lista de subprocessadores declarada e a redacao da ressalva.

---

## Item 6 — "seguro opcional 1%" — confirmar parceiro SUSEP ou renomear "protecao"

**Localizacao:** `buildFeeTable()`, linha "Seguro opcional (locador)" + `SECTIONS`, id `"disputas"`, FAQ "O que acontece se meu item for extraviado?".

**Texto atual (tabela):**
> "Seguro opcional (locador) | 1% sobre o valor da locacao | Optativo — cobre extravio do item"

**Texto atual (FAQ):**
> "Proprietarios que optarem pelo **seguro da plataforma** (1% sobre o valor da locacao) tem o prejuizo coberto conforme as condicoes do plano."

**Analise:**
Comercializar "seguro" sem seguradora habilitada pela SUSEP e irregular (Decreto-Lei 73/1966, arts. 74 e 77). Se a ShareO nao tem parceria formalizada com seguradora SUSEP, o uso do termo "seguro" e a promessa de cobertura automatica sao irregulares e podem configurar propaganda enganosa (CDC art. 30/37).

**Opcao A — com seguradora SUSEP confirmada:**
Manter a linha, substituindo o texto para:
> "Protecao contra extravio (locador) | 1% sobre o valor da locacao | Optativo — seguro oferecido em parceria com [Nome da Seguradora SUSEP], sujeito as condicoes do plano."

**Opcao B — sem seguradora; remover ate parceria ser firmada:**
- Remover a linha da tabela de taxas.
- Substituir o trecho do FAQ de extravio por:
> "Em caso de furto ou extravio durante a locacao, abra uma disputa na plataforma e registre um boletim de ocorrencia (BO). A equipe ShareO analisa o caso. Uma solucao de protecao dedicada esta em desenvolvimento — em breve disponivel."

**Justificativa:** DL 73/66 — comercializar "seguro" sem SUSEP e irregular. Sem parceiro real, a promessa de cobertura configura publicidade enganosa (CDC art. 37).

**Status:** DECISAO DE NEGOCIO (fundadores) + CONSULTAR ADVOGADA (obrigatorio antes do go-live). Verificar se esta promessa e uma "promessa nao implementada" — ver [`promessas-nao-implementadas.md`](promessas-nao-implementadas.md). Enquanto nao houver parceiro SUSEP formalizado, recomenda-se Opcao B.

---

## Item 7 — SLAs publicados como oferta vinculante (CDC art. 30)

**Localizacao:** `SECTIONS`, id `"suporte"`, FAQs "Quais sao os canais de atendimento?" e "Qual e o prazo de resposta para cada tipo de solicitacao?".

**Texto atual:**
> "...respondemos em ate **4 horas uteis** (...) resposta em ate **2 horas** (...) Nosso horario e segunda a domingo, das **8h as 22h**."
> "Email: ate **4 horas uteis**. Disputas ativas: ate **3 dias uteis**. Revisao de disputa: ate **5 dias uteis**. Solicitacoes de exclusao de conta (LGPD): ate **15 dias**. Denuncias: ate **24 horas**."

**Analise:**
O CDC art. 30 estabelece que informacao suficientemente precisa publicada na Central de Ajuda integra o contrato com o consumidor. SLAs publicados que nao sejam factualmente atingiveis geram direito de rescisao e indenizacao. Os prazos precisam: (a) refletir a capacidade operacional real; (b) ser espelhados nos Termos de Uso; (c) incluir ressalva para casos extraordinarios.

**Texto proposto — adicionar ressalva ao final do bloco de suporte:**
> "Os prazos indicados sao metas de atendimento em condicoes normais de operacao e podem ser impactados em situacoes extraordinarias de volume ou forca maior. Em caso de descumprimento nao justificado, entre em contato com suporte@shareo.com.br. Os prazos de atendimento estao descritos tambem em nossos **Termos de Uso**."

**Texto proposto — ajuste no FAQ de exclusao de conta (LGPD):**
Ver Item 4 acima — o prazo de "15 dias" ali ja e o prazo de resposta (art. 19), nao o de exclusao efetiva.

**Justificativa:** prevenir que SLAs impossiveis de cumprir sejam usados como base para reclamacoes junto ao Procon ou e-Consumidor.

**Status:** DECISAO DE NEGOCIO (confirmar prazos com o time de suporte) + CONSULTAR ADVOGADA para validar a ressalva e o alinhamento com os Termos de Uso.

---

## Resumo de acoes por prioridade

| Prioridade | Item | Natureza | Responsavel |
|---|---|---|---|
| P0 — Obrigatorio antes do go-live | Itens 1A–1G (Stripe → MP, 7 trechos) | Correcao factual | Dev (fullstack) apos advogada validar |
| P0 — Obrigatorio antes do go-live | Itens 2A–2F ("retido na plataforma" → custodia MP) | Correcao factual | Dev (fullstack) |
| P0 — Obrigatorio antes do go-live | Item 5 ("nunca compartilhamos") | Correcao obrigatoria LGPD | Dev (fullstack) apos advogada validar lista de subprocessadores |
| P0 — Decisao urgente | Item 6 ("seguro" sem SUSEP) | Decisao de negocio + juridico | Fundadores + advogada |
| P1 — Corrigir antes do go-live | Item 4 ("15 dias conforme LGPD") | Correcao legal | Dev (fullstack) apos advogada validar |
| P1 — Alinhar antes do go-live | Item 7 (SLAs como oferta vinculante) | Decisao de negocio + juridico | Fundadores + advogada + time de suporte |
| P1 — Alinhar antes do go-live | Item 3 (BACEN via Stripe) | Correcao factual | Coberto pelos Itens 1 e 2 |

---

## Nota de implementacao

Ao aplicar as correcoes em `app/ajuda/page.tsx`:

1. Nao editar o arquivo antes do go-live — editar = publicar no staging no proximo deploy.
2. Todos os textos estao em constantes no inicio do arquivo (`LOCATARIO_STEPS`, `LOCADOR_STEPS`, `SECTIONS`, `buildFeeTable`). A substituicao e cirurgica por constante.
3. Se a linha de "seguro" for removida (Opcao B do Item 6), deletar apenas a entrada correspondente no array de `buildFeeTable()`.
4. A taxa de servico e sempre lida de `getPlatformFeeRate()` — nunca hardcodar 15%.
5. Ao publicar: bumpar `CONSENT_VERSION` em `lib/legal-config.ts` para disparar reaceite dos usuarios (ver [`draft-clausulas-mp-termos-privacidade.md`](draft-clausulas-mp-termos-privacidade.md), Secao C).
6. O valor {feePct} nos textos propostos deve ser interpolado dinamicamente (ja e o padrao atual do arquivo).

> Rastreado em [`checklist-conformidade-juridica.md`](checklist-conformidade-juridica.md) item 9. Relacionado: [`draft-clausulas-mp-termos-privacidade.md`](draft-clausulas-mp-termos-privacidade.md), [`spec-arrependimento-art49.md`](spec-arrependimento-art49.md), [`docs-redline-ripd.md`](docs-redline-ripd.md).
