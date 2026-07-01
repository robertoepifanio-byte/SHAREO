# Copy de pagamento — texto para validação jurídica

**Data:** 2026-06-30 · **Para:** advogada da ShareO · **Referência:** item 4.1 da pauta de go-live (`pauta-revisao-fundadores-s41.md`).

**Contexto:** com a decisão de contratar o **Mercado Pago** como PSP (Modelo B / split — a ShareO deixa de ser *merchant of record*), toda a copy de pagamento foi reescrita de "Stripe/plataforma" para "Mercado Pago". Este documento reúne **os textos que carregam afirmações jurídicas sensíveis**, para revisão antes da publicação.

> 🔒 **Nada abaixo está publicado em produção.** A Central de Ajuda está em **staging** com o Mercado Pago **desligado** (flag OFF; staging ainda roda PIX manual). Os textos de Termos/Política são **rascunhos**. A publicação em produção só ocorre no go-live (contrato MP assinado + conta PJ ativa + flag ligada). Pedimos a validação da redação para já deixá-la pronta.

---

## Bloco 1 — Termos de Uso e Política de Privacidade (rascunho a ser publicado)

Fonte: `docs/draft-clausulas-mp-termos-privacidade.md`. **É o texto de maior peso jurídico** (vai para `/termos` e `/privacidade`).

### Termos §6 — Pagamentos e Taxa de Serviço
> Os pagamentos são processados por **instituição de pagamento terceirizada e licenciada pelo Banco Central — o Mercado Pago (Mercado Pago Instituição de Pagamento Ltda.)**, responsável pelo processamento, pela divisão (*split*) e pelo repasse dos valores. **O ShareO não retém nem custodia o valor devido ao locador.** Sobre o valor da locação, o ShareO cobra uma **taxa de serviço de {feePct}%**, e o valor restante é destinado ao locador. O **repasse ao locador é realizado pelo Mercado Pago**, semanalmente, referente às locações concluídas. Cada transação está sujeita a um limite de {maxPorTransacao}. Para receber pagamentos, o locador deve **conectar uma conta Mercado Pago** à sua conta ShareO.

### Termos §6.1 — Processamento por terceiro + responsabilidade solidária
> Os pagamentos são processados pelo **Mercado Pago**, na qualidade de prestador de serviço de pagamento. A disponibilidade, as regras e eventuais tarifas do meio de pagamento sujeitam-se aos termos do Mercado Pago. **Esta terceirização não exclui a responsabilidade da ShareO perante o consumidor**: nos termos do Código de Defesa do Consumidor, a ShareO responde **solidariamente** no que lhe couber quanto aos serviços de intermediação que presta.

### Política de Privacidade §4 — Compartilhamento de dados
> Podemos compartilhar dados com: **o Mercado Pago, instituição de pagamento responsável por processar pagamentos, dividir (*split*) e repassar valores, atuando como operador de dados financeiros** (nome, identificação e dados necessários à transação); autoridades públicas (quando exigido por lei); prestadores de serviço de infraestrutura tecnológica (hospedagem, e-mail, analytics), sempre sob acordo de confidencialidade.

### Política de Privacidade §4.1 — Mercado Pago como operador
> Os pagamentos das locações são processados pelo **Mercado Pago**, que atua como **operador** de dados pessoais financeiros estritamente necessários à transação (identificação das partes, valor, meio de pagamento). O tratamento por esse operador rege-se também pela política de privacidade do Mercado Pago. A ShareO permanece como **controladora** dos dados que coleta para a intermediação.

---

## Bloco 2 — Central de Ajuda (`/ajuda`)

Fonte: `app/ajuda/page.tsx`. Texto de apoio ao usuário (não é cláusula), mas repete as mesmas afirmações e também precisa estar correto.

### Pagamento do locatário
> O pagamento é processado pelo Mercado Pago — **instituição de pagamento licenciada pelo Banco Central do Brasil**. Você é direcionado para o ambiente seguro do Mercado Pago para inserir seus dados de pagamento. Seus dados de cartão nunca passam pelos servidores do ShareO. O valor máximo por locação é R$ 500. **O valor fica em custódia do Mercado Pago** e só é repassado ao proprietário após a confirmação da devolução.

### Proteção do dinheiro
> O pagamento não vai diretamente ao proprietário no ato do pagamento — **o valor fica em custódia do Mercado Pago (nosso parceiro de pagamentos, licenciado pelo Banco Central)** até a confirmação da entrega. Se algo der errado antes da entrega ser confirmada, o valor pode ser reembolsado conforme a política de cancelamento.

### "O ShareO é regulamentado?"
> O ShareO opera como marketplace de locação de bens móveis, seguindo as normas do Código Civil, CDC e LGPD. Os pagamentos são processados pelo Mercado Pago (**Mercado Pago Instituição de Pagamento Ltda.**), instituição de pagamento **autorizada e licenciada pelo Banco Central do Brasil (BACEN)**, certificada pelos padrões de segurança **PCI-DSS**. A ShareO **responde solidariamente** pelos serviços de intermediação que presta, nos termos do Código de Defesa do Consumidor.

### "Meus dados / LGPD"
> …Os dados necessários para processar pagamentos são **compartilhados com o Mercado Pago (nosso parceiro de pagamentos, que atua como operador de dados financeiros)**. Dados mínimos são transmitidos a outros prestadores de infraestrutura (hospedagem, e-mail transacional e monitoramento de erros), sempre sob acordo de confidencialidade. **Não vendemos seus dados pessoais.** Consulte nossa Política de Privacidade para a lista completa.

*(A afirmação "custódia do Mercado Pago" se repete em ~8 trechos da Central de Ajuda; validada aqui uma vez, aplica-se a todos.)*

---

## Pontos específicos a confirmar

| # | Afirmação | O que validar |
|---|---|---|
| 1 | **"Valor fica em custódia do Mercado Pago"** | O termo "custódia" é juridicamente adequado para o modelo de split? Ou usar "retido pelo Mercado Pago" / "sob processamento do Mercado Pago"? |
| 2 | **"O ShareO não retém nem custodia o valor devido ao locador"** (Termos §6) | Coerente com o Modelo B/split confirmado no parecer (a ShareO não é *merchant of record*)? |
| 3 | **"Instituição de pagamento autorizada e licenciada pelo Banco Central"** + nome **"Mercado Pago Instituição de Pagamento Ltda."** | Confirmar a denominação jurídica exata e o enquadramento correto (evitar afirmação imprecisa sobre o BACEN). |
| 4 | **Responsabilidade solidária** (CDC) | A redação está no ponto (sem ampliar nem excluir direitos do CDC)? Alinhada à cláusula de limitação de responsabilidade (§8). |
| 5 | **"Certificada pelos padrões de segurança PCI-DSS"** | Manter a menção? É atribuível ao Mercado Pago, não à ShareO. |
| 6 | **Mercado Pago como "operador de dados financeiros"** + correção de "nunca compartilhamos com terceiros" | Redação da Política adequada à LGPD (controlador × operador, transparência)? |

---

## Observações

- A **cláusula de conteúdo de terceiros (art. 19 MCI)** foi tratada à parte (decisão 4.3 — reescrita como faculdade futura); não faz parte desta validação de copy de pagamento.
- Placeholders `{feePct}` e `{maxPorTransacao}` são preenchidos em tempo de execução (`getPlatformFeeRate()` = 15% e teto de R$ 500) — não são texto fixo.

---

**Retorno esperado:** aprovação da redação como está, ou os ajustes de texto que a advogada julgar necessários, para então prepararmos a publicação no go-live.
