# Transferência Internacional de Dados Pessoais — ShareO
## Subprocessadores e Mecanismos de Adequação (LGPD art. 33)

> **RASCUNHO — pendente de revisão do DPO/advogada (D4); nao e documento final.**
> Este rascunho foi elaborado pela equipe de produto/tecnologia como insumo para o parecer juridico (D4). Nao substitui a formalizacao legal das transferencias internacionais. A versao final deve ser validada e assinada pela Encarregada (DPO) e pela assessoria juridica responsavel.

> ⚠️ **REVISADO EM 2026-09-03 — a classificação anterior estava INVERTIDA.** O
> inventário descrevia a Stripe como "código preservado, oculto na UI", risco
> "Baixa (inativo)", e o Mercado Pago como "em avaliação". Desde 24/08/2026 o
> Mercado Pago foi **descartado e removido do código**, e a **Stripe é o PSP
> ativo** — o subprocessador que recebe os dados mais sensíveis da plataforma.
> Ver [`ressalva-psp-stripe-2026-09-03.md`](ressalva-psp-stripe-2026-09-03.md).

**Versao do rascunho:** 2026-06-28 · **revisao do PSP:** 2026-09-03
**Preparado por:** Equipe de Produto — ShareO
**Base legal de referencia:** LGPD art. 33 (transferencia internacional de dados pessoais)

---

## 1. Contexto

O ShareO armazena seus dados primarios (banco de dados PostgreSQL e objetos de storage) no Brasil, na regiao `sa-east-1` (Supabase). Contudo, a operacao da plataforma envolve subprocessadores localizados fora do territorio nacional, principalmente nos Estados Unidos, para funcoes especializadas de infraestrutura, comunicacao e monitoramento.

A LGPD (art. 33) permite a transferencia internacional de dados pessoais apenas quando:
- o pais de destino oferece grau de protecao adequado reconhecido pela ANPD (art. 33 I); ou
- o controlador adota garantias suficientes, como **clausulas contratuais padrao** ou **normas corporativas globais** aprovadas pela ANPD (art. 33 II); ou
- uma das hipoteses excepcionais do art. 33 III a IX se aplica.

> **Nota para o DPO — atualizada em 03/09/2026.** A **Resolução CD/ANPD nº 19, de 23/08/2024**
> aprovou as **Cláusulas-Padrão Contratuais (CPC)** brasileiras, de adoção **integral e sem
> modificação**, e o prazo de adequação **encerrou em 23/08/2025**. Desde então, cláusula contratual
> só ampara o art. 33 se for a CPC da ANPD ou cláusula específica previamente aprovada por ela —
> **SCC da União Europeia sozinha não basta**. Não há decisão de adequação para os EUA.
> Apuração por fornecedor: [`dpa-apuracao-2026-09-03.md`](dpa-apuracao-2026-09-03.md).

---

## 2. Inventario de Subprocessadores

### 2.1 Tabela geral

| Subprocessador | Funcao na plataforma | Regiao / Sede | Dados pessoais transmitidos | Necessidade | Mecanismo de adequacao a formalizar |
|---|---|---|---|---|---|
| **Supabase** | Banco de dados PostgreSQL + Supabase Storage (buckets de imagens e documentos) + Supabase Realtime (chat) | **Brasil (sa-east-1)** — sede EUA (San Francisco) | Todos os dados pessoais da plataforma (cadastro, transacoes, mensagens, documentos) | Essencial — infraestrutura central | Dados **em repouso no Brasil** (sa-east-1). Questão em aberto: a sede nos EUA configura transferência? Se sim, **não há CPC da ANPD publicada** (apurado 03/09/2026) |
| **Vercel** | Hospedagem e execucao do codigo da aplicacao (Next.js API Routes, renderizacao SSR) | EUA (San Francisco) — edge global | Dados de requisicoes processados em runtime (incluindo dados pessoais em transito entre cliente e API) | Essencial — infraestrutura de hosting | ❌ **Sem CPC da ANPD** — o DPA traz só SCC da UE, insuficiente desde 23/08/2025 (apurado 03/09/2026) |
| **Resend** | Envio de e-mails transacionais (confirmacoes de reserva, notificacoes, recuperacao de senha) | EUA | Nome e e-mail dos destinatarios; assunto e corpo do e-mail (pode conter dados da reserva) | Essencial para comunicacao com usuarios | ❌ **Sem CPC da ANPD** — só SCC da UE (apurado 03/09/2026) |
| **Sentry** | Monitoramento de erros e excecoes da aplicacao | EUA (San Francisco) | Stacktraces, contexto da requisicao (com filtro de PII ativo — nenhum dado pessoal identificavel deveria constar) | Importante — qualidade e confiabilidade | ❌ **Sem CPC da ANPD** — só SCC da UE (apurado 03/09/2026); manter e auditar o filtro de PII |
| **Mapbox** | Geocoding de enderecos (conversao de CEP/logradouro em coordenadas lat/lng) | EUA (San Francisco) | Texto do endereco informado pelo usuario (sem identificadores pessoais diretamente vinculados na requisicao) | Essencial para funcao de busca por proximidade | Termos de Servico Mapbox incluem clausulas de processamento de dados; verificar disponibilidade de DPA especifico; avaliar minimizacao (geocoding pode ser feito com CEP apenas) |
| **Stripe** | **PSP — processamento de pagamentos, split e repasse aos proprietarios** | EUA (San Francisco) | Identificacao das duas partes da locacao, valores e datas; no onboarding de quem anuncia, **dados bancarios e verificacao de identidade** coletados dentro da propria Stripe | Essencial — nao ha pagamento sem PSP | ✅ **RESOLVIDO (apurado em 03/09/2026).** A Stripe adota as **CPC da ANPD** (Módulos 1 e 2) no adendo de transferência, incorporado por referência ao contrato — **nada a assinar**. Resta a obrigação da **Cláusula 14**, que é nossa |
| **Upstash** | Rate limiting (middleware e rotas administrativas) | EUA (global) | Endereco IP / identificador de sessao | Importante — protecao contra abuso | ⚠️ **Nunca verificado.** Constava do inventario de [`atividades-dpa-ripd-dpo.md`](atividades-dpa-ripd-dpo.md) e ficou **fora** da apuracao de 03/09 |
| **Google (Analytics 4)** | Analytics de uso | EUA | Dados de navegacao e uso da plataforma | Nao essencial — mediacao de produto | ⚠️ **Nunca verificado**, e **ja declarado ao publico** em `/politicas`. Ficou fora da apuracao de 03/09 |

### 2.2 Subprocessadores em avaliacao ou planejados

| Subprocessador | Funcao prevista | Regiao | Status | Observacao |
|---|---|---|---|---|
| **Zenvia** | Envio de SMS para verificacao de celular (OTP) | Brasil | Planejado (primeira reserva) | Verificar se ha transferencia internacional nos servicos de SMS |

---

## 3. Analise por Subprocessador

### 3.1 Supabase

**Dados em repouso:** armazenados na regiao `sa-east-1` (Sao Paulo), dentro do territorio nacional. Para fins de armazenamento fisico, nao ha transferencia internacional.

**Dados em transito e acesso logico:** a sede da Supabase Inc. e nos EUA, o que pode implicar acesso logico a dados por pessoal ou sistemas fora do Brasil (ex.: suporte, operacoes). Verificar com a advogada se o acesso logico pela empresa controladora estrangeira configura "transferencia" nos termos da LGPD.

**Acao necessaria (revista em 03/09/2026):** primeiro **definir com a advogada se há transferência** — os dados estão em repouso no Brasil. Se houver, o DPA da Supabase **não** traz as CPC da ANPD (apurado 03/09), e a decisão é a mesma da Vercel. Registrar o desfecho no RIPD.

### 3.2 Vercel

**Modelo de processamento:** o codigo da aplicacao (Next.js) e executado na infraestrutura da Vercel, que utiliza servidores edge globalmente distribuidos. Dados pessoais em transito (ex.: corpo de requisicoes API) podem ser processados fora do Brasil.

**Acao necessaria (revista em 03/09/2026):** o DPA da Vercel traz **SCC da UE, não as CPC da ANPD** — e SCC europeia deixou de bastar em 23/08/2025. Assiná-lo não regulariza a transferência. **Decisão da advogada:** trocar fornecedor, negociar adendo com as CPC, ou enquadrar em outra hipótese do art. 33.

### 3.3 Resend

**Dados transmitidos:** nome e endereço de e-mail do destinatario; conteudo do e-mail transacional (que pode incluir nome da locacao, valores e datas). O volume de PII e limitado ao minimo necessario para a entrega do e-mail.

**Acao necessaria (revista em 03/09/2026):** a Resend também **não publica as CPC da ANPD** — mesma decisão pendente da Vercel. Independentemente disso, revisar os templates de e-mail para garantir minimizacao: incluir apenas os dados estritamente necessarios para a comunicacao (ex.: evitar incluir CPF ou dados financeiros sensiveis no corpo do e-mail).

### 3.4 Sentry

**Dados transmitidos:** por design, nenhum dado pessoal identificavel deveria ser incluido nos eventos enviados ao Sentry (filtro de PII ativo). Na pratica, o risco existe se um erro ocorrer em um contexto que contenha dados de usuario (ex.: mensagem de erro com e-mail ou ID de usuario).

**Acao necessaria (revista em 03/09/2026):** o Sentry também **não publica as CPC da ANPD** — mesma decisão pendente da Vercel. Independentemente disso, auditar regularmente os eventos recentes no painel Sentry para verificar que o filtro esta funcionando. Considerar habilitar o "scrubbing" automatico de PII nas configuracoes do projeto Sentry.

### 3.5 Mapbox

**Dados transmitidos:** texto do endereco (logradouro, cidade, estado, CEP) para geocoding. A requisicao ao Mapbox Geocoding API e feita server-side (sem token de usuario vinculado na chamada), o que limita a associacao com identidade do usuario pela Mapbox.

**Minimizacao possivel:** o geocoding pode ser executado com CEP apenas (obtido via ViaCEP, servico nacional), transmitindo apenas o CEP ao Mapbox e obtendo coordenadas genericas (centro do CEP, nao do logradouro exato). Avaliar se a precisao de geocoding por CEP e suficiente para a funcao de busca por proximidade — se for, reduz a PII transmitida ao exterior.

**Acao necessaria:** verificar disponibilidade de DPA especifico da Mapbox; se indisponivel, avaliar clausulas de processamento nos Termos de Servico. Considerar alternativa de geocoding nacional (ex.: ViaCEP + base de coordenadas por CEP) para eliminar a transferencia internacional nesse fluxo.

---

## 4. Mecanismos de Adequacao a Adotar

A tabela abaixo consolida as acoes prioritarias por subprocessador:

| Subprocessador | Mecanismo sugerido | Prioridade | Status atual |
|---|---|---|---|
| Supabase | Definir com a advogada se dados em repouso no Brasil (sa-east-1) com sede nos EUA configuram transferência. **Se configurarem, não há CPC da ANPD publicada** | Alta | Pendente — questão em aberto |
| Vercel | ❌ **Não publica CPC da ANPD** (só SCC da UE, insuficiente desde 23/08/2025). Decidir: trocar fornecedor, negociar adendo ou outra hipótese do art. 33 | **CRÍTICA** | Pendente — fora do prazo legal |
| Resend | ❌ **Não publica CPC da ANPD** — mesma decisão | **CRÍTICA** | Pendente — fora do prazo legal |
| Sentry | ❌ **Não publica CPC da ANPD** — mesma decisão. Manter e auditar o filtro de PII | **CRÍTICA** | Pendente — fora do prazo legal |
| Mapbox | Confirmar o contrato real — a apuração de 03/09 foi **inconclusiva** (a URL devolveu página institucional, não o contrato). Avaliar minimização via CEP-only | Media | Pendente — não medido |
| **Upstash** | Rate limiting (IP/identificador de sessão). **Nunca foi verificado** quanto a CPC — entrou no inventário de `atividades-dpa-ripd-dpo.md` e ficou fora da apuração de 03/09 | Alta | **Não medido** |
| **Google (GA4)** | Analytics. **Nunca foi verificado** quanto a CPC — e já está **declarado ao público** em `/politicas` | Alta | **Não medido** |
| **Stripe** | ✅ **Nada a assinar.** As CPC da ANPD já estão no adendo, incorporadas por referência. O que sobra é **nosso**: publicar o documento da **Cláusula 14** ([`clausula-14-transparencia-transferencia.md`](clausula-14-transparencia-transferencia.md)), responder titulares (Cl. 15) e comunicar incidentes (Cl. 16) | — | **Resolvido em 03/09/2026** |
| ~~Mercado Pago~~ | ~~Verificar clausulas~~ — **descartado em 24/08/2026**, removido do código. Sai do inventário. | — | Encerrado |

---

## 5. Fluxo de Dados Internacional — Diagrama Textual

```
Usuario (Brasil)
    |
    v
Next.js App [Vercel — EUA/edge]
    |
    +---> PostgreSQL + Storage [Supabase — sa-east-1, Brasil] (dados em repouso NO BRASIL)
    |
    +---> Geocoding de endereco ------> [Mapbox API — EUA] (texto do endereco)
    |
    +---> E-mail transacional --------> [Resend — EUA] (nome + e-mail + conteudo minimo)
    |
    +---> Monitoramento de erros -----> [Sentry — EUA] (stacktrace, sem PII identificavel)
    |
    +---> Chat real-time ------------> [Supabase Realtime — sa-east-1, Brasil]
    |
    +---> Pagamentos ----------------> [Stripe — EUA] (cobranca, split e repasse)
```

**Fluxo de dados que PERMANECE NO BRASIL:** banco de dados, storage (incluindo os documentos de identidade em `id-docs`) e Realtime (chat) — todos em `sa-east-1`.

**Fluxo que SAI DO BRASIL:** **pagamentos (Stripe)**, processamento em runtime (Vercel), geocoding (Mapbox), e-mail (Resend) e erros (Sentry).

⚠️ **A linha de pagamentos mudou de lado.** No desenho anterior, com o Mercado Pago, os pagamentos permaneciam no Brasil. Com a Stripe eles passaram a sair — e levam junto os dados mais sensiveis do fluxo. Foi essa mudanca que reabriu o art. 33.

---

## 6. Recomendacoes e Proximos Passos

### 6.1 Acoes imediatas (antes do go-live)

1. **Decidir o que fazer com Vercel, Resend e Sentry** — nenhum dos três publica CPC da ANPD, e assinar o DPA deles (que traz SCC da UE) **não resolve** desde 23/08/2025. As opções são trocar de fornecedor, negociar adendo com as CPC, ou enquadrar em outra hipótese do art. 33. **Decisão da advogada.**

1-bis. **Medir Upstash e Google (GA4)** — ficaram fora da apuração de 03/09, mas estão no inventário como transferência para os EUA. Enquanto não medidos, o número "três fornecedores irregulares" é **piso**, não total.

2. **Verificar implicacoes do acesso logico da Supabase** — confirmar com a advogada se o fato de os dados estarem hospedados em sa-east-1 (Brasil) elimina a necessidade de clausulas adicionais ou se o acesso logico pela sede EUA configura transferencia para fins da LGPD.

3. **Avaliar minimizacao no Mapbox** — verificar se geocoding por CEP (sem logradouro completo) e suficiente para reduzir PII transmitida.

4. **Registrar todos os DPAs assinados no RIPD** (`docs/juridico/rascunho-ripd.md`, Secao F, risco F-06) como evidencia de adequacao.

### 6.2 Acoes de medio prazo

5. **Acompanhar publicacoes da ANPD** sobre a **lista de países com nível de proteção adequado**
   (art. 33 I) — ainda não existe, e uma decisão de adequação para os EUA dispensaria a discussão
   de cláusulas.

   ⛔ **O resto deste item foi removido em 03/09/2026.** Ele mandava "acompanhar a ANPD sobre
   cláusulas contratuais padrão próprias e, quando disponível, migrar" — as CPC saíram em
   **23/08/2024** e o prazo venceu em **23/08/2025**. Isso não é ação de médio prazo: está
   **vencido**, e migrou para o item 1 das ações imediatas.

6. **Incluir os subprocessadores na Politica de Privacidade** da plataforma (`/privacidade`), com descricao da funcao de cada um e dos mecanismos de protecao adotados (exigencia de transparencia — art. 9 LGPD).

7. **Rever a lista de subprocessadores** a cada mudanca de fornecedor ou adicao de nova ferramenta — qualquer novo servico externo deve passar por esta avaliacao antes de entrar em producao.

### 6.3 Monitoramento continuo

8. **Auditar o filtro de PII do Sentry** ao menos trimestralmente — revisar eventos recentes para confirmar ausencia de dados pessoais identificaveis.

9. **Monitorar atualizacoes nos DPAs dos fornecedores** — mudancas nos termos de processamento podem exigir nova avaliacao de adequacao.

---

## 7. Referencias Normativas

- LGPD (Lei 13.709/2018), art. 33 — Transferencia Internacional de Dados Pessoais
- LGPD art. 9 — Transparencia sobre o tratamento de dados
- LGPD art. 41 — Encarregado (DPO)
- LGPD art. 48 — Comunicacao de incidentes
- Marco Civil da Internet (Lei 12.965/2014), art. 15 — Retencao de registros de acesso
- Resolucao CD/ANPD no 02/2022 — Hipoteses de aplicacao da LGPD
- **Resolucao CD/ANPD no 19, de 23/08/2024** — Regulamento de Transferencia Internacional e **Clausulas-Padrao Contratuais (CPC)**. Adocao integral, sem modificacao; prazo de adequacao encerrado em **23/08/2025**. É a norma que rege este documento
- SCCs da Uniao Europeia (Commission Implementing Decision 2021/914) — referencia **estrangeira**; não satisfaz o art. 33 por si só desde 23/08/2025

---

*Documento preparado pela equipe de Produto/Tecnologia — ShareO Marketplace de Aluguel.*
*Versao para revisao juridica — nao publicar nem distribuir sem aprovacao do DPO.*
