# Transferência Internacional de Dados Pessoais — ShareO
## Subprocessadores e Mecanismos de Adequação (LGPD art. 33)

> **RASCUNHO — pendente de revisão do DPO/advogada (D4); nao e documento final.**
> Este rascunho foi elaborado pela equipe de produto/tecnologia como insumo para o parecer juridico (D4). Nao substitui a formalizacao legal das transferencias internacionais. A versao final deve ser validada e assinada pela Encarregada (DPO) e pela assessoria juridica responsavel.

**Versao do rascunho:** 2026-06-28
**Preparado por:** Equipe de Produto — ShareO
**Base legal de referencia:** LGPD art. 33 (transferencia internacional de dados pessoais)

---

## 1. Contexto

O ShareO armazena seus dados primarios (banco de dados PostgreSQL e objetos de storage) no Brasil, na regiao `sa-east-1` (Supabase). Contudo, a operacao da plataforma envolve subprocessadores localizados fora do territorio nacional, principalmente nos Estados Unidos, para funcoes especializadas de infraestrutura, comunicacao e monitoramento.

A LGPD (art. 33) permite a transferencia internacional de dados pessoais apenas quando:
- o pais de destino oferece grau de protecao adequado reconhecido pela ANPD (art. 33 I); ou
- o controlador adota garantias suficientes, como **clausulas contratuais padrao** ou **normas corporativas globais** aprovadas pela ANPD (art. 33 II); ou
- uma das hipoteses excepcionais do art. 33 III a IX se aplica.

> **Nota para o DPO:** a ANPD ainda nao publicou lista de paises adequados nem aprovou clausulas contratuais padrao proprias. O mecanismo mais pratico disponivel hoje e a adocao de **DPAs (Data Processing Agreements)** nos modelos das proprias empresas receptoras (alinhados com clausulas padrao internacionais — ex.: SCCs da UE adaptadas), combinado com a hipotese do art. 33 II c (contratos com clausulas especificas de protecao). A advogada deve confirmar o mecanismo mais robusto disponivel no cenario regulatorio atual da ANPD.

---

## 2. Inventario de Subprocessadores

### 2.1 Tabela geral

| Subprocessador | Funcao na plataforma | Regiao / Sede | Dados pessoais transmitidos | Necessidade | Mecanismo de adequacao a formalizar |
|---|---|---|---|---|---|
| **Supabase** | Banco de dados PostgreSQL + Supabase Storage (buckets de imagens e documentos) + Supabase Realtime (chat) | **Brasil (sa-east-1)** — sede EUA (San Francisco) | Todos os dados pessoais da plataforma (cadastro, transacoes, mensagens, documentos) | Essencial — infraestrutura central | Dados **em repouso no Brasil** (sa-east-1); verificar se a sede EUA implica transferencia internacional para fins de LGPD; assinar DPA disponivel em supabase.com/privacy |
| **Vercel** | Hospedagem e execucao do codigo da aplicacao (Next.js API Routes, renderizacao SSR) | EUA (San Francisco) — edge global | Dados de requisicoes processados em runtime (incluindo dados pessoais em transito entre cliente e API) | Essencial — infraestrutura de hosting | DPA disponivel em vercel.com/legal/dpa; clausulas SCCs da UE incluidas; assinar e arquivar |
| **Resend** | Envio de e-mails transacionais (confirmacoes de reserva, notificacoes, recuperacao de senha) | EUA | Nome e e-mail dos destinatarios; assunto e corpo do e-mail (pode conter dados da reserva) | Essencial para comunicacao com usuarios | DPA disponivel em resend.com; clausulas SCCs; assinar e arquivar |
| **Sentry** | Monitoramento de erros e excecoes da aplicacao | EUA (San Francisco) | Stacktraces, contexto da requisicao (com filtro de PII ativo — nenhum dado pessoal identificavel deveria constar) | Importante — qualidade e confiabilidade | DPA disponivel em sentry.io/legal/dpa; clausulas SCCs; assinar e arquivar; manter e auditar filtro de PII |
| **Mapbox** | Geocoding de enderecos (conversao de CEP/logradouro em coordenadas lat/lng) | EUA (San Francisco) | Texto do endereco informado pelo usuario (sem identificadores pessoais diretamente vinculados na requisicao) | Essencial para funcao de busca por proximidade | Termos de Servico Mapbox incluem clausulas de processamento de dados; verificar disponibilidade de DPA especifico; avaliar minimizacao (geocoding pode ser feito com CEP apenas) |

### 2.2 Subprocessadores em avaliacao ou planejados

| Subprocessador | Funcao prevista | Regiao | Status | Observacao |
|---|---|---|---|---|
| **Mercado Pago** | PSP para pagamentos (substituira PIX manual) | Brasil | Em avaliacao — aguarda decisao dos fundadores | Processamento predominantemente no Brasil; verificar clausulas de subcontratacao do MP |
| **Stripe** | Processamento de cartao de credito (codigo preservado, oculto na UI ate dez/2026) | EUA | Inativo na UI | Assinar DPA antes de reativar |
| **Zenvia** | Envio de SMS para verificacao de celular (OTP) | Brasil | Planejado (primeira reserva) | Verificar se ha transferencia internacional nos servicos de SMS |

---

## 3. Analise por Subprocessador

### 3.1 Supabase

**Dados em repouso:** armazenados na regiao `sa-east-1` (Sao Paulo), dentro do territorio nacional. Para fins de armazenamento fisico, nao ha transferencia internacional.

**Dados em transito e acesso logico:** a sede da Supabase Inc. e nos EUA, o que pode implicar acesso logico a dados por pessoal ou sistemas fora do Brasil (ex.: suporte, operacoes). Verificar com a advogada se o acesso logico pela empresa controladora estrangeira configura "transferencia" nos termos da LGPD.

**Acao necessaria:** assinar o DPA da Supabase (disponivel em supabase.com/privacy) e registrar no RIPD.

### 3.2 Vercel

**Modelo de processamento:** o codigo da aplicacao (Next.js) e executado na infraestrutura da Vercel, que utiliza servidores edge globalmente distribuidos. Dados pessoais em transito (ex.: corpo de requisicoes API) podem ser processados fora do Brasil.

**Acao necessaria:** assinar o DPA da Vercel (vercel.com/legal/dpa), que inclui SCCs da UE como mecanismo de transferencia. Avaliar com a advogada se as SCCs da UE sao aceitaveis como garantia para fins da LGPD art. 33 II c, na ausencia de clausulas brasileiras aprovadas pela ANPD.

### 3.3 Resend

**Dados transmitidos:** nome e endereço de e-mail do destinatario; conteudo do e-mail transacional (que pode incluir nome da locacao, valores e datas). O volume de PII e limitado ao minimo necessario para a entrega do e-mail.

**Acao necessaria:** assinar o DPA da Resend. Revisar os templates de e-mail para garantir minimizacao: incluir apenas os dados estritamente necessarios para a comunicacao (ex.: evitar incluir CPF ou dados financeiros sensiveis no corpo do e-mail).

### 3.4 Sentry

**Dados transmitidos:** por design, nenhum dado pessoal identificavel deveria ser incluido nos eventos enviados ao Sentry (filtro de PII ativo). Na pratica, o risco existe se um erro ocorrer em um contexto que contenha dados de usuario (ex.: mensagem de erro com e-mail ou ID de usuario).

**Acao necessaria:** assinar o DPA da Sentry. Auditar regularmente os eventos recentes no painel Sentry para verificar que o filtro esta funcionando. Considerar habilitar o "scrubbing" automatico de PII nas configuracoes do projeto Sentry.

### 3.5 Mapbox

**Dados transmitidos:** texto do endereco (logradouro, cidade, estado, CEP) para geocoding. A requisicao ao Mapbox Geocoding API e feita server-side (sem token de usuario vinculado na chamada), o que limita a associacao com identidade do usuario pela Mapbox.

**Minimizacao possivel:** o geocoding pode ser executado com CEP apenas (obtido via ViaCEP, servico nacional), transmitindo apenas o CEP ao Mapbox e obtendo coordenadas genericas (centro do CEP, nao do logradouro exato). Avaliar se a precisao de geocoding por CEP e suficiente para a funcao de busca por proximidade — se for, reduz a PII transmitida ao exterior.

**Acao necessaria:** verificar disponibilidade de DPA especifico da Mapbox; se indisponivel, avaliar clausulas de processamento nos Termos de Servico. Considerar alternativa de geocoding nacional (ex.: ViaCEP + base de coordenadas por CEP) para eliminar a transferencia internacional nesse fluxo.

---

## 4. Mecanismos de Adequacao a Adotar

A tabela abaixo consolida as acoes prioritarias por subprocessador:

| Subprocessador | Mecanismo sugerido | Prioridade | Status atual |
|---|---|---|---|
| Supabase | Assinar DPA Supabase + verificar implicacoes do acesso logico pela sede EUA | Alta | Pendente |
| Vercel | Assinar DPA Vercel (inclui SCCs da UE) | Alta | Pendente |
| Resend | Assinar DPA Resend | Alta | Pendente |
| Sentry | Assinar DPA Sentry + auditar filtro de PII | Alta | Pendente |
| Mapbox | Verificar DPA ou clausulas nos ToS; avaliar minimizacao via CEP-only | Media | Pendente |
| Mercado Pago | Verificar clausulas de processamento de dados e subcontratacao | Media | Aguarda decisao de negocio |
| Stripe | Assinar DPA Stripe antes de reativar na UI | Baixa (inativo) | Pendente |

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
    +---> Pagamentos (MVP) ----------> PIX manual (sem terceiro externo no fluxo atual)
    |
    +---> Pagamentos (producao) -----> [Mercado Pago — Brasil] (a confirmar)
```

**Fluxo de dados que PERMANECE NO BRASIL:** banco de dados, storage (incluindo `id-docs`), Realtime (chat), pagamentos PIX (MVP) e Mercado Pago (producao, se confirmado).

**Fluxo que SAI DO BRASIL:** processamento em runtime (Vercel), geocoding (Mapbox), e-mail (Resend), erros (Sentry).

---

## 6. Recomendacoes e Proximos Passos

### 6.1 Acoes imediatas (antes do go-live)

1. **Assinar DPAs** com Vercel, Resend e Sentry — estes sao os subprocessadores com maior volume de PII transmitida ao exterior. Os DPAs estao disponiveis nos sites das empresas e podem ser aceitos eletronicamente.

2. **Verificar implicacoes do acesso logico da Supabase** — confirmar com a advogada se o fato de os dados estarem hospedados em sa-east-1 (Brasil) elimina a necessidade de clausulas adicionais ou se o acesso logico pela sede EUA configura transferencia para fins da LGPD.

3. **Avaliar minimizacao no Mapbox** — verificar se geocoding por CEP (sem logradouro completo) e suficiente para reduzir PII transmitida.

4. **Registrar todos os DPAs assinados no RIPD** (`docs/juridico/rascunho-ripd.md`, Secao F, risco F-06) como evidencia de adequacao.

### 6.2 Acoes de medio prazo

5. **Acompanhar publicacoes da ANPD** sobre:
   - Lista de paises com nivel de protecao adequado (art. 33 I).
   - Clausulas contratuais padrao proprias (art. 33 II b).
   - Normas corporativas globais reconhecidas (art. 33 II c).
   
   Quando disponivel, migrar para o mecanismo brasileiro em vez de depender de SCCs da UE.

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
- SCCs da Uniao Europeia (Commission Implementing Decision 2021/914) — referencia para clausulas de transferencia internacional enquanto ANPD nao publica as proprias

---

*Documento preparado pela equipe de Produto/Tecnologia — ShareO Marketplace de Aluguel.*
*Versao para revisao juridica — nao publicar nem distribuir sem aprovacao do DPO.*
