# Briefing Jurídico — ShareO (D4)

**Versão:** 2026-06-28 · **Para:** consultoria/advogado(a) responsável pelo parecer (D4).
**Propósito:** dossiê técnico-jurídico **standalone** do ShareO para subsidiar o parecer legal de go-live. Complementa o documento de cobrança [`docs/juridico/d4-cobranca-juridico.md`](d4-cobranca-juridico.md) (que traz a mensagem pronta de envio + as 8 questões-núcleo).

> ⚠️ Este material foi preparado pela equipe de produto/tecnologia para **descrever fielmente o modelo e identificar as áreas que dependem de análise jurídica**. Ele **não** substitui o parecer — pelo contrário, é o insumo para ele. Nenhuma afirmação aqui deve ser lida como conclusão legal.

---

## 1. Sumário executivo

- **O que é:** marketplace de **aluguel local de itens entre particulares** (C2C, com proprietários PF e PJ), lançamento nacional. Slogan "Use Mais. Possua Menos."
- **Estágio:** produto **tecnicamente pronto** e validado em ambiente de homologação (staging). O **único bloqueador de go-live é este parecer (D4)**.
- **O que se pede:** posição (ainda que preliminar) + prazo sobre **5 frentes** — pagamentos (Lei 12.865), fiscal, LGPD, CDC/Termos e PLD/FT (Lei 9.613) — além das áreas fundacionais mapeadas na §4.
- **Ponto mais sensível:** o **fluxo de dinheiro** (a plataforma recebe do locatário, retém 15% e repassa ao proprietário) e a **estrutura de recebimento** (hoje, em teste, via chave PIX pessoal de sócio — a substituir pela conta PJ oficial antes do go-live).

---

## 2. Modelo de negócio

| Aspecto | Descrição |
|---|---|
| **Partes** | (a) **Locatário** (aluga o item), (b) **Proprietário** (anuncia/loca; PF ou PJ), (c) **ShareO** (plataforma intermediadora). |
| **Objeto** | Contrato de **locação de bem móvel** entre particulares, intermediado pela plataforma. |
| **Receita da plataforma** | **Taxa de serviço de 15%** sobre o valor da locação (explícita na UI e nos Termos, não embutida no preço). |
| **Repasse** | Plataforma retém a taxa e **repassa o líquido ao proprietário** (janela de repasse semanal). |
| **Limites de risco (MVP)** | **Teto de R$ 500 por transação**; **sem caução**; verificação **KYB leve** para PJ. |
| **Meio de pagamento (MVP)** | **PIX centralizado na plataforma** (modelo *merchant of record*). Código de cartão (Stripe) preservado, porém oculto na UI. Em avaliação: migração para Mercado Pago (não altera as questões jurídicas). |

---

## 3. Os três fluxos (o essencial para a análise)

### 3.1 Fluxo de **dinheiro** (o de maior risco regulatório)
1. Locatário paga **100% do valor** da locação.
2. A plataforma **recebe o total**, **retém 15%** (sua receita) e **repassa o líquido** ao proprietário.
3. Hoje, na fase de teste em staging, o recebimento PIX está **temporariamente** apontado para a **chave PIX de pessoa física de um sócio** (atrás de chave de ativação, só para validação). **Antes do go-live**, será substituído pela **conta PJ oficial** ou por um **PSP licenciado** (Mercado Pago / Stripe Connect) que assuma o arranjo.

> **Pergunta central:** esse desenho (*merchant of record* recebendo de terceiros e repassando) **enquadra a ShareO como instituição/arranjo de pagamento** (Lei 12.865/2013) exigindo autorização do BACEN, ou há estrutura (subadquirência, conta-escrow de terceiro, uso de PSP licenciado) que afaste o enquadramento? E qual a **forma correta** da conta de recebimento oficial?

### 3.2 Fluxo de **dados pessoais** (LGPD)
Dados tratados, por categoria (detalhe técnico no Anexo, §8):
- **Identificação/cadastro:** nome, e-mail, telefone, cidade/UF, endereço.
- **Documentos:** **CPF** (PF) e **CNPJ** + dados do responsável legal (PJ) — armazenados **criptografados (AES-256-GCM)** com índice de unicidade por **HMAC-SHA256** (não há CPF/CNPJ em claro no banco).
- **Documentos de imagem:** bucket **privado** `id-docs` (verificação de identidade).
- **Transacionais/comportamentais:** reservas, avaliações (reviews), chat in-app.
- **Navegação/medição:** **Google Analytics 4** de primeira parte, com **IP anonimizado**, já em uso. **Não há banner de consentimento de cookies.** Para a campanha de divulgação pretende-se instalar o **Meta Pixel** — que, diferentemente do GA4, **compartilha dados de navegação com um terceiro (Meta) para uso publicitário do próprio terceiro**. O código já existe no repositório e está **inerte** (não carrega sem a variável de ambiente correspondente). Ver questão **#8** no §5.

> **Pergunta central:** o tratamento atende à **minimização** e às bases legais adequadas? Há obrigação adicional além do que já fizemos (Encarregado designado, consentimento versionado, exclusão art. 18, portabilidade art. 20)? Há **transferência internacional** relevante a formalizar (banco em sa-east-1, mas subprocessadores de e-mail/erro/mapas nos EUA — ver Anexo)?

### 3.3 Fluxo da **locação** (civil/consumerista)
1. Proprietário anuncia o item (preço diário/semanal/mensal, condição, localização).
2. Locatário reserva e paga; combina retirada; o **endereço exato só é revelado ao locatário após o pagamento confirmado**.
3. Retirada (com código de retirada), uso, e **devolução** (fluxo "em andamento" → confirmação do proprietário).
4. Avaliações mútuas; disputas tratadas por painel administrativo.

> **Pergunta central:** qual o **regime de responsabilidade da plataforma** (CDC) perante o locatário por vício/defeito/dano do item de terceiro? Como alocar contratualmente o **risco de dano/perda** entre as três partes (sobretudo sem caução)? O **direito de arrependimento** (art. 49 CDC) se aplica a aluguel contratado online?

---

## 4. Mapa de competências jurídicas necessárias

### 🔴 Núcleo crítico (bloqueadores de go-live)
| Área | Foco no ShareO |
|---|---|
| **Regulatório de meios de pagamento** (Lei 12.865/2013 + regulação BACEN/PIX) | Enquadramento do *merchant of record*; necessidade de autorização vs. uso de PSP licenciado; conta de recebimento oficial; split/escrow/repasse. |
| **PLD/FT** (Lei 9.613/1998 + COAF) | A plataforma é "sujeito obrigado"? Nível de KYC/KYB, monitoramento de transações, comunicação ao COAF. |
| **Direito do Consumidor** (CDC – Lei 8.078/1990) | Responsabilidade da plataforma; redação dos Termos (taxa/repasse/teto, aceite, arrependimento); cláusulas abusivas. |
| **LGPD** (Lei 13.709/2018) | Minimização, bases legais, DPO/RIPD, retenção, transferência internacional, dados de documentos. |
| **Tributário / Fiscal** | Tributação da taxa de 15% (ISS/PIS/COFINS); emissão de NF; valor em trânsito vs. receita; PF que aufere renda × PJ; responsabilidade tributária. |

### 🟡 Fundacional (contratos e estrutura)
| Área | Foco no ShareO |
|---|---|
| **Civil / Contratos** (CC, locação de coisas – arts. 565+) | Contrato locador↔locatário; responsabilidade por dano/perda; ausência de caução; multas/atrasos. |
| **Direito Digital / Marco Civil** (Lei 12.965/2014) | Responsabilidade do provedor por conteúdo de terceiros; Termos de Uso e Política de Privacidade; guarda de logs. |
| **Empresarial / Societário** | Estrutura da PJ que recebe pagamentos; contratos com fornecedores (PSP, infra). |

### 🟢 Complementar
| Área | Foco no ShareO |
|---|---|
| **Propriedade Intelectual / Marcas** | Registro da marca "ShareO" (INPI); licença sobre conteúdo de usuário (fotos). |
| **Seguros & Responsabilidade civil** | Seguro/garantia para danos ao item; cláusulas de limitação de responsabilidade. |

**Perfil sugerido:** uma banca multidisciplinar **ou** advogado(a) de **Direito Digital/Fintech** (cobre pagamentos + LGPD + consumidor + digital) **+ apoio pontual** de **tributarista**, **especialista em regulação BACEN** e **civilista/contratualista**. O gargalo provável é o **regulatório de pagamentos** — mitigável terceirizando o arranjo a um PSP licenciado.

---

## 5. Perguntas para o parecer

As **8 questões-núcleo** (formato pronto de envio) estão em [`docs/juridico/d4-cobranca-juridico.md` §2](d4-cobranca-juridico.md). As **5 originais**, em resumo:

1. **Lei 12.865/2013** — *merchant of record* com repasse via PIX exige autorização BACEN / enquadra como instituição de pagamento? Estrutura alternativa?
2. **Fiscal** — tributos sobre a taxa de 15%; NF por repasse/transação; valor em trânsito vs. receita.
3. **LGPD** — CPF/chave PIX/dados bancários criptografados atendem à minimização? DPO/RIPD obrigatórios?
4. **CDC / Termos** — a redação atual (taxa/repasse/teto/aceite/arrependimento) basta?
5. **PLD/FT** — PIX centralizado torna a ShareO sujeito obrigado? Qual programa (KYC/KYB, monitoramento, COAF)?

**Questões adicionais** (além das 5 acima — #6 e #7 vieram da revisão pré-go-live; **#8**, do preparo da campanha de divulgação, em 10/08):

6. **Civil — contrato de locação e risco sem caução** (Código Civil, locação de coisas — arts. 565+): qual a estrutura do **contrato de locação** entre locador e locatário (intermediado pela plataforma) e como **alocar contratualmente o risco de dano/perda** do item entre as três partes, considerando que o MVP **não exige caução**? Há cláusulas mínimas exigíveis?
7. **Marco Civil — responsabilidade do provedor** (Lei 12.965/2014, art. 19): qual o **regime de responsabilidade da plataforma** por conteúdo/anúncio de terceiros e por atos praticados entre usuários? Quais obrigações de **notificação/retirada** de conteúdo e de **guarda de logs** se aplicam?
8. **Cookies e tecnologias de publicidade** (LGPD arts. 7º e 9º): pretende-se veicular anúncios no Meta (Facebook/Instagram) e instalar o **Meta Pixel** para medir conversão. O pixel **compartilha dados de navegação do visitante com o Meta, para uso publicitário do próprio Meta** — não é analytics de primeira parte. Hoje o site roda apenas **GA4 com IP anonimizado** e **não possui banner de consentimento**. Perguntamos: **(a)** qual **base legal** sustenta o compartilhamento — consentimento (art. 7º, I) ou legítimo interesse (art. 7º, IX)?; **(b)** sendo consentimento, ele precisa ser **prévio e granular** (analytics separado de publicidade), e que exigências há quanto à **revogação**?; **(c)** o **GA4 já em uso** demanda o mesmo tratamento, ou a distinção entre analytics próprio e compartilhamento com terceiro altera a resposta?
    > A resposta a **(c)** define o escopo: se o GA4 também exigir consentimento, o banner deixa de ser requisito da campanha e passa a ser **pendência já existente**, independentemente de anunciarmos.

**Outras pendências fundacionais** (não exaustivas): registro da **marca "ShareO"** no INPI; necessidade de **seguro/garantia** para danos ao item e cláusula de limitação de responsabilidade.

---

## 6. Mitigações já implementadas (a parte técnica não é o gargalo)

- **Taxa de 15% explícita** na UI e nos Termos (não embutida no preço).
- **Termos de Serviço** detalham taxa, repasse semanal e teto de R$ 500.
- **LGPD — pilares técnicos:** Encarregado designado (`privacidade@shareo.com.br`), **consentimento versionado**, **portabilidade** (exportação — art. 20), **eliminação/anonimização** (exclusão de conta — art. 18), **criptografia AES-256-GCM** de dados sensíveis.
- **KYB leve de PJ:** verificação de CNPJ na Receita + declaração de responsável legal.
- **Limites de risco:** teto de R$ 500/transação, sem caução, retenção de dados por 5 anos (CTN art. 173).
- **Informe de IR** meramente informativo, com aviso explícito de ausência de validade legal.

---

## 7. O que está bloqueado até o parecer

- Criação do ambiente de **produção** (Supabase/Upstash/Resend de produção — agendado, **não ativável** sem o parecer).
- **Ativação real de pagamentos** e troca do PIX de teste pela **conta PJ oficial**.
- **DNS/domínio** de produção (`shareo.com.br`).
- Captação de usuários reais / início da operação comercial.
- **Tag de release `web-v1.x`** (go-live).

---

## 8. Anexo — ficha técnica

**Stack:** Next.js 15 (App Router) · PostgreSQL via Supabase (sa-east-1) · NextAuth (JWT) · pagamentos PIX (MVP) / Stripe (oculto) · e-mail Resend · mapas Mapbox.

**Dados pessoais — tratamento e segurança:**
- CPF/CNPJ e dados do responsável legal: **AES-256-GCM** + hash **HMAC-SHA256** para unicidade (sem dado em claro).
- Documentos de identidade: bucket **privado** (`id-docs`).
- Mascaramento de PII em logs/erros; sem PII em URLs/localStorage.

**Subprocessadores (transferência internacional a avaliar):**
| Fornecedor | Função | Região |
|---|---|---|
| Supabase | Banco + storage | **sa-east-1 (Brasil)** |
| Resend | E-mail transacional | EUA |
| Sentry | Monitoramento de erros (com filtro de PII) | EUA |
| Mapbox | Geocoding / mapas | EUA |
| Vercel | Hospedagem | EUA/global |
| (PSP a definir) | Pagamentos | Brasil |

**Retenção:** dados fiscais/transacionais por 5 anos (CTN art. 173); exclusão de conta com anonimização dos demais.

---

> **Próximo passo sugerido:** se não houver retorno em 3–5 dias úteis após o envio, propor uma **call de 30 min** (mensagem pronta em [`d4-cobranca-juridico.md`](d4-cobranca-juridico.md)) para destravar. Ao receber o parecer, registrar o desfecho em `docs/STATUS.md` + memória D4 e desativar a cobrança automatizada.
