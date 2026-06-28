# D4 — Material de cobrança do parecer jurídico

**Atualizado:** 2026-06-23 · **Status:** consulta aberta ~2026-06-09 → **~14 dias** sem retorno formal.
**Para:** fundadores encaminharem ao escritório/advogado responsável.
**Contexto interno:** D4 é o **único bloqueador** de go-live em produção do ShareO. Tudo o mais (código, infraestrutura, validação em staging) está pronto e aguardando este parecer.

---

## 1. Mensagem pronta para enviar ao advogado

> **Assunto: Parecer ShareO — modelo de pagamentos (merchant of record / PIX) — pendência de go-live**
>
> Prezado(a) [nome],
>
> Retomamos a consulta aberta em [data]. O ShareO é um marketplace de **aluguel de itens entre particulares**: o locatário paga, a plataforma retém uma **taxa de serviço de 15%** e **repassa o restante ao proprietário do item**. No MVP, o recebimento é feito por **PIX centralizado na plataforma** (modelo *merchant of record*), com **teto de R$ 500 por transação** e **sem caução**.
>
> O produto está **tecnicamente pronto para lançamento** e a decisão de entrar em produção depende **exclusivamente** do seu parecer sobre os 5 pontos abaixo. Poderia nos retornar uma posição (ainda que preliminar) e um **prazo estimado** para o parecer completo?
>
> **Pontos para parecer:**
>
> 1. **Lei 12.865/2013 (arranjos de pagamento):** o modelo *merchant of record* — em que a plataforma recebe 100% do valor do locatário e repassa ao proprietário — exige **autorização/registro junto ao Banco Central** ou enquadra a empresa como instituição de pagamento? Há estrutura alternativa (ex.: subadquirência/uso de gateway/conta-escrow de terceiro) que evite esse enquadramento?
> 2. **Obrigações fiscais:** incidência de **PIS/COFINS/ISS** sobre a taxa de serviço de 15%? Há obrigação de **emissão de nota fiscal** a cada repasse ou a cada transação? Qual o tratamento do valor que apenas "transita" (repasse ao proprietário) vs. a receita efetiva (a taxa)?
> 3. **LGPD:** o tratamento de **CPF, chave PIX e dados bancários** — armazenados **criptografados (AES-256)** e com índice por HMAC — atende ao princípio da **minimização**? Há obrigação de **DPO/Encarregado** formal (já designamos `privacidade@shareo.com.br`) e de outras medidas (RIPD, política específica)?
> 4. **CDC / Termos de Serviço:** a cobrança da **taxa de 15% retida antes do repasse**, o **repasse semanal** e o **teto de R$ 500** já constam dos Termos. A redação atual é suficiente sob o **Código de Defesa do Consumidor** (destaque, aceite, direito de arrependimento) ou exige cláusulas/forma de aceite adicionais?
> 5. **PLD/FT (Lei 9.613/1998):** o modelo de **PIX centralizado** torna o ShareO **"sujeito obrigado"** à prevenção à lavagem de dinheiro? Em caso afirmativo, qual **programa** é exigido — nível de **KYC/KYB**, monitoramento de transações, comunicação ao **COAF**? (Hoje fazemos verificação leve de CNPJ na Receita + declaração de responsável; precisamos saber se isso é suficiente ou se há piso regulatório.)
>
> Observação relevante para os pontos 1, 2 e 5: **durante a fase de validação em staging**, o recebimento PIX está temporariamente configurado em **conta de pessoa física de um dos sócios** (apenas teste, atrás de chave de ativação). **Antes do go-live** isso será substituído pela **conta PJ oficial** da plataforma — gostaríamos da sua orientação sobre a forma correta dessa estrutura.
>
> Ficamos à disposição para uma call de 30 min se ajudar a acelerar. Agradecemos o retorno.
>
> Atenciosamente,
> [nome] — ShareO

---

## 2. As 5 questões (versão de referência)

| # | Tema | Pergunta-núcleo |
|---|---|---|
| 1 | **Lei 12.865/2013** | *Merchant of record* com repasse via PIX exige autorização do Banco Central / enquadra como instituição de pagamento? |
| 2 | **Fiscal** | PIS/COFINS/ISS sobre a taxa de 15%? Nota fiscal por repasse? Tratamento do valor em trânsito vs. receita. |
| 3 | **LGPD** | CPF/chave PIX/dados bancários criptografados atendem à minimização? Obrigação de DPO/RIPD? |
| 4 | **CDC / Termos** | A redação atual da taxa/repasse/teto basta sob o CDC (destaque/aceite/arrependimento)? |
| 5 | **PLD/FT (Lei 9.613/1998)** | PIX centralizado torna o ShareO sujeito obrigado? Qual nível de KYC/KYB, monitoramento e COAF? |

---

## 3. Dados do modelo (para o advogado)

- **Negócio:** marketplace de aluguel local de itens entre particulares (C2C), lançamento nacional.
- **Fluxo de dinheiro:** locatário paga o total → plataforma **retém 15%** → **repassa o líquido** ao proprietário (repasse **semanal**, às segundas).
- **Meio de pagamento (MVP):** **PIX** centralizado na plataforma (*merchant of record*). Código de cartão (Stripe) preservado, mas oculto na UI. (Em avaliação: migração para Mercado Pago — não altera as questões jurídicas.)
- **Limites de risco já adotados:** **teto de R$ 500/transação**, **sem caução**, retenção de dados por 5 anos (CTN art. 173).

---

## 4. O que já está pronto do nosso lado (mitigações)

Para o advogado entender que a parte técnica não é o gargalo:

- **Taxa de 15% explícita** na interface e nos Termos (não embutida no preço).
- **Termos de Serviço** já detalham taxa, repasse semanal e teto de R$ 500.
- **LGPD — pilares técnicos implementados:** Encarregado designado (`privacidade@shareo.com.br`), consentimento versionado, **portabilidade** (exportação de dados — art. 20), **eliminação/anonimização** (exclusão de conta — art. 18), **criptografia AES-256** de dados sensíveis.
- **KYB leve de PJ:** verificação de CNPJ na Receita + declaração de responsável legal (piso defensável, independente do parecer).
- **Informe de IR** meramente informativo, com aviso de ausência de validade legal.

---

## 5. O que está bloqueado até o retorno (impacto da demora)

- Criação do ambiente de **produção** (Supabase/Upstash/Resend de produção — já agendado para 1ª semana de julho/2026, mas **não ativável** sem o parecer).
- **Ativação real de pagamentos** e troca do PIX de teste pela **conta PJ oficial**.
- **DNS/domínio** de produção (`shareo.com.br`).
- **Captação de usuários reais** e início da operação comercial.
- **Tag de release `v1.x`** (go-live).

> Cada semana de atraso adia o início da operação e a validação comercial do MVP, que já está 100% pronto em staging.

---

## 6. Acompanhamento

- Cobrança automatizada local já roda diariamente às 9h (`cobranca-juridico-d4`).
- **Quando o parecer chegar:** registrar o desfecho em `docs/STATUS.md` + memória D4 e **desativar** a cobrança automatizada.
- Sugestão: se não houver retorno em **3–5 dias úteis** após este envio, propor uma **call curta** (item 1 da mensagem) para destravar.
