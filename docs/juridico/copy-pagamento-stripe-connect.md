# Copy de pagamento (Stripe Connect) — texto para validação jurídica

**Data:** 2026-08-20 · **Para:** advogada da ShareO · **Substitui:** [`copy-pagamento-validacao-juridica.md`](copy-pagamento-validacao-juridica.md) (escrito para o Mercado Pago, **obsoleto** desde a [ADR-028](../adr/ADR-028-reversao-stripe-connect.md), 19/08/2026).

**Contexto:** a decisão do sócio majoritário reverteu o PSP de Mercado Pago para **Stripe Connect** (ADR-028). Toda a copy de pagamento da Central de Ajuda (`/ajuda`) e das Políticas (`/politicas`) foi reescrita de "Mercado Pago" para "Stripe" e alinhada ao que o código **de fato executa hoje**, não ao desenho-alvo da ADR.

> 🔒 **Nada abaixo está publicado em produção.** As páginas estão em **staging**. O go-live segue bloqueado pelo D4 e, adicionalmente, pela pendência jurídica específica do desenho Stripe Connect registrada na própria ADR-028 ("Riscos / Pendências"). Pedimos a validação da redação para deixá-la pronta.

---

## ⚠️ Mudança material em relação ao que já foi validado para o Mercado Pago

O parecer D4 validou o afastamento do enquadramento como arranjo de pagamento (Lei 12.865/2013) **para o desenho do Mercado Pago Modelo B**, em que o dinheiro do locatário ia direto para a conta do proprietário via split do PSP. A frase-chave aprovada era:

> "O ShareO **não retém nem custodia** o valor devido ao locador."

**Essa frase não descreve o que o código faz hoje.** A implementação escolhida foi *separate charges and transfers* (ADR-028, "Riscos/Pendências"): a cobrança do locatário é feita **na conta da plataforma na Stripe**, e o `Transfer` dos 85% para o proprietário só é criado depois, no cron de repasse, quando a reserva fica elegível. Ou seja: **o valor transita pela conta ShareO na Stripe durante a janela de retenção.**

Por isso, toda a copy nova **evita** afirmar tanto "custódia do PSP" quanto "a ShareO não custodia". O texto publicado diz apenas que o valor **fica retido** e quando é liberado — descrição factual, sem qualificar juridicamente quem detém o valor.

**Ponto nº 1 a validar:** essa mudança de mecânica altera a conclusão do parecer sobre a Lei 12.865? Se sim, é decisão de engenharia reverter para *destination charge* (dinheiro nunca entra na conta ShareO) — ainda possível, mas é retrabalho que precisa ser decidido antes do go-live.

---

## Bloco 1 — Políticas (`/politicas`)

### Nova cláusula §1.7 — Pagamentos e Taxa de Serviço (não existia; a página não descrevia o modelo)
> Os pagamentos das locações são processados pela **Stripe**, provedor de pagamentos contratado pelo ShareO, responsável pelo processamento da cobrança e pelo repasse ao Locador. Sobre o valor da locação, o ShareO cobra uma **taxa de serviço de {feePct}**, devida pelo Locatário e exibida no resumo antes da confirmação do pagamento; o valor restante é destinado ao Locador. Nesta versão da plataforma, o checkout aceita **cartão de crédito à vista, sem parcelamento**, e cada locação está sujeita ao limite de **{maxPorTransacao} por transação**. O valor pago é **retido** e não é repassado ao Locador no ato do pagamento: o repasse torna-se elegível **{janelaRepasse} após a confirmação da devolução** do item, prazo que cobre a janela de abertura de disputa, e fica suspenso enquanto houver disputa em análise. Para receber, o Locador deve cadastrar seus dados de recebimento em Meu Perfil → Recebimentos. Não há exigência de caução nesta versão.

### §2.3 — Compartilhamento de dados (atualizado)
> Seus dados podem ser compartilhados com: **Stripe** (processamento dos pagamentos, verificação dos dados do Locador e repasse dos valores, atuando como **operador de dados financeiros** — sujeito à Política de Privacidade da Stripe Inc.); Supabase; Resend; Sentry; Mapbox; Google Analytics 4. Não vendemos dados pessoais a terceiros.

### §2.1 — Dados coletados (atualizado)
> …**dados financeiros** (dados bancários e de verificação informados ao provedor de pagamentos para recebimento de repasses, chave PIX para recebimento, histórico de transações)…

### §4.3 — Processamento do reembolso (atualizado)
> Reembolsos são processados pela Stripe para o mesmo método de pagamento utilizado na reserva. Como o checkout aceita, nesta versão, apenas cartão de crédito, o crédito aparece na fatura do cartão do Locatário no prazo praticado pelo banco ou operadora — geralmente de 5 a 10 dias úteis, podendo cair na fatura seguinte conforme a data de fechamento. O ShareO não reterá taxa de serviço sobre o valor reembolsado.

---

## Bloco 2 — Central de Ajuda (`/ajuda`)

### Pagamento do locatário
> O pagamento é processado pela **Stripe**, o provedor de pagamentos do ShareO: você é direcionado para o ambiente seguro da Stripe para informar os dados do cartão, que nunca passam pelos servidores do ShareO. Nesta versão o checkout aceita **cartão de crédito à vista — sem parcelamento**. O valor máximo por locação é {maxPorTransacao}. O valor pago não vai direto ao proprietário: **fica retido até a confirmação da devolução** do item.

### Formas de pagamento aceitas
> Nesta versão, o checkout aceita **cartão de crédito à vista — sem parcelamento**. O valor máximo por locação é {maxPorTransacao}. As bandeiras disponíveis são exibidas no próprio Checkout da Stripe no momento do pagamento.

### Proteção do dinheiro
> O pagamento não vai diretamente ao proprietário no ato do pagamento — o valor **fica retido** até a devolução ser confirmada e a janela de disputa se encerrar. Se algo der errado antes disso, o valor pode ser reembolsado conforme a política de cancelamento. Em caso de disputa, o repasse é suspenso e a equipe ShareO analisa o caso antes de qualquer liberação.

### "O ShareO é regulamentado?"
> O ShareO opera como marketplace de locação de bens móveis, seguindo as normas do Código Civil, CDC e LGPD. Os pagamentos são processados pela **Stripe**, provedor de pagamentos que opera no Brasil e responde pelo processamento das cobranças e pelo repasse aos proprietários. A ShareO **responde solidariamente** pelos serviços de intermediação que presta, nos termos do Código de Defesa do Consumidor. Para dúvidas jurídicas específicas, consulte um advogado especializado.

**Diferença deliberada em relação à versão MP:** a versão anterior afirmava que o PSP era "instituição de pagamento autorizada e licenciada pelo Banco Central (BACEN), certificada PCI-DSS", com razão social. **Removemos essas afirmações** para a Stripe: não temos como sustentar, sem checagem, o enquadramento regulatório e a denominação jurídica da entidade Stripe que opera no Brasil. É o **ponto nº 2 a validar** (ver tabela).

---

## Pontos a confirmar

| # | Afirmação / decisão | O que validar |
|---|---|---|
| 1 | **O valor transita pela conta ShareO na Stripe** durante a retenção (*separate charges and transfers*) | O parecer D4 se sustenta com essa mecânica, ou exige *destination charge* (valor nunca entra na conta ShareO)? **Impacta engenharia** — decidir antes do go-live. |
| 2 | **Enquadramento e denominação da Stripe no Brasil** | Qual entidade contratamos e o que é correto afirmar publicamente? Podemos citar licenciamento/BACEN/PCI-DSS como se fazia com o MP, ou mantemos o texto neutro atual? |
| 3 | **"Retido" como termo** (substituiu "custódia") | Adequado, ou prefere outra formulação ("mantido em processamento", "não liberado ao Locador")? |
| 4 | **Responsabilidade solidária (CDC)** | Redação mantida da versão aprovada; confirmar que segue válida com a troca de PSP. |
| 5 | **Stripe como operador de dados + transferência internacional** | A Stripe Inc. é norte-americana. A Política menciona a Stripe, mas **não** trata de transferência internacional de dados (LGPD art. 33). Ver [`transferencia-internacional-dados.md`](transferencia-internacional-dados.md) — precisa entrar na Política antes do go-live? |
| 6 | **Alteração substancial dos documentos** | §1.8 dos Termos promete aviso prévio de 30 dias para alterações substanciais. Esta revisão muda pagamento, compartilhamento de dados e reembolso. Exige **bump de `CONSENT_VERSION`** (`lib/legal-config.ts`, hoje `v1.1`) e reaceite? Como nada está em produção e não há base de usuários reais, a hipótese é que **não** — confirmar. |
| 7 | **Data "Última atualização"** | Ajustada para 20/08/2026 em staging. Confirmar qual data publicar no go-live. |

---

## Divergências texto × código corrigidas nesta revisão

Todas as correções abaixo alinham o texto ao que o código executa. Os números **não são mais hardcoded**: vêm do `PlatformConfig` em tempo de execução (`lib/platform-config.ts`), então mudar a configuração muda as duas páginas junto.

| Afirmação publicada (antes) | O que o código faz | Onde |
|---|---|---|
| "Repasse toda segunda-feira (feriado: 1º dia útil seguinte)" | Cron **diário** (10h BRT); o repasse fica elegível **{janelaRepasse}** após a confirmação da devolução (`payoutWindowDays`, default 3) | `app/api/cron/payout/route.ts`, `app/api/bookings/[id]/route.ts` |
| "Aceita cartão, Pix, Elo, Hipercard, Amex" | Só **cartão** (`payment_method_types: ["card"]`). Pix e boleto são decisão da ADR-028 ainda **não implementada** | `app/api/payments/checkout/route.ts` |
| "Cancelamento grátis até 24h; **30% de taxa** abaixo disso" (Ajuda) e "72h → 100%, 24–72h → 50%, <24h → **0%**" (Políticas) — **contraditórios entre si e com o código** | **24h → 100% · 24–6h → 70% · <6h → 50%** | `lib/cancellationPolicy.ts` |
| "Multa de **1×** a diária por dia de atraso" | **1,5×** a diária (`lateFeeMultiplier`), cobrada por link de pagamento enviado por e-mail | `app/api/cron/reminders/route.ts` |
| "Proprietário tem **24 horas** para confirmar" | **48 horas** (`autoCancelOwnerHours`) | `app/api/cron/auto-cancel/route.ts` |
| "Conecte sua conta Mercado Pago para receber" | "Cadastrar dados bancários" pela **Stripe** (Connect Express); sem isso, repasse **manual via PIX** pela equipe financeira | `app/perfil/recebimentos/page.tsx`, `app/api/cron/payout/route.ts` |

**Relevância jurídica:** cada um desses textos é oferta vinculante (CDC art. 30) e o conjunto configurava risco de publicidade enganosa (art. 37) se publicado como estava.

### 🔴 Atenção: três delas não são "texto desatualizado" — são políticas decididas que o código nunca implementou

Ao rastrear a origem, ficou claro que **repasse semanal**, **multa de 1 diária** e **teto de R$ 1.000 por bem** foram **decisões registradas** (repasse semanal em `docs/STATUS.md` s24/PR #40, de 17/06/2026; as três em `docs/auditorias/ajuda-revisao-especialistas-s41.md` §"Fatos"), mas **o código nunca passou a executá-las**:

| Política decidida | O que o código faz hoje | Decisão necessária |
|---|---|---|
| Repasse **semanal, toda segunda-feira** (feriado → 1º dia útil) | Elegível **3 dias** após a devolução, cron **diário** às 10h BRT | Implementar o lote semanal no cron **ou** abandonar a política semanal |
| Multa de atraso = **1 diária** por dia | **1,5 diária** (`lateFeeMultiplier` = 150) | Ajustar a config para 100 **ou** assumir 1,5× como a regra |
| Bem anunciado **até R$ 1.000** | **Sem validação alguma** (`estimatedRetailPrice` só exige ≥ 0) | Implementar a validação **ou** tratar como regra de moderação |

**A copy publicada foi alinhada ao CÓDIGO**, não à política, porque descrever um comportamento que o sistema não executa é exatamente o risco do art. 37 do CDC. Para o teto do bem, o texto passou a dizer que é regra da fase inicial sujeita à moderação, em vez de afirmar que é "validado ao publicar o anúncio" — o que seria falso.

**Se a decisão for manter as políticas originais, o caminho é mudar o código primeiro e depois reverter estes três trechos** — não o contrário.

---

## Pendências conhecidas, **não** corrigidas aqui (decisão de negócio, não de código)

1. **Prazo de decisão de disputa diverge entre as páginas:** `/ajuda` promete **3 dias úteis**, `/politicas` §3.3 promete **5 dias úteis**. Nenhum dos dois é imposto por código. Qual é o SLA oficial?
2. **Janela de 48h para abrir disputa** (dita nas duas páginas) **não é validada pelo código** — hoje a disputa pode ser aberta enquanto a reserva estiver `ACTIVE` ou `RETURNED`. Na prática o limite efetivo é a janela de repasse ({janelaRepasse}). Alinhar texto e código.
3. **"Exclusão de dados em até 15 dias conforme a LGPD"** — imprecisão já registrada no item 9 do [`checklist-conformidade-juridica.md`](checklist-conformidade-juridica.md), ainda pendente.
4. **`/perfil/recebimentos` ainda exibe "Repasse semanal — próxima segunda-feira"** no bloco "Como funciona o repasse" (fora do escopo desta revisão de Ajuda/Políticas, mas com o mesmo erro).
5. **Pix e boleto**: a copy foi escrita para o estado atual (só cartão). Quando o checkout passar a aceitar Pix e boleto, é uma troca de frase nos três pontos marcados acima — não se antecipou a promessa, para não criar oferta vinculante de algo que ainda não existe.
