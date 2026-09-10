# Retorno da Contabilizei — Tributação (2026-09-10)

**Chamado:** 29468012 · **Analista:** Ana V. (Contabilizei, contador oficial da ShareO) · **Recebido:** 2026-09-10, 10:09 BRT
**Responde a:** [`roteiro-contabilizei-simples-nacional-2026-09-03.md`](roteiro-contabilizei-simples-nacional-2026-09-03.md) — 6 perguntas enviadas em 03/09.

> Este documento fecha **B3** (regime tributário) com o detalhamento operacional que faltava. A tabela do checklist já marcava B3 como "fechado 03/09" com base numa confirmação preliminar ("regime = Simples Nacional"); este retorno é a resposta completa, com alíquota, anexo, NF e — o ponto que vira requisito de produto — o relatório mensal exigido.

---

## Situação confirmada

CNPJ `68.512.556/0001-09`, **Simples Nacional** desde 11/08/2026, sem faturamento até o momento. CNAE principal `7490-1/04` — confirmado como correto para o modelo de marketplace/intermediação descrito.

## 1 — Os 85% repassados compõem a receita bruta?

**Não.** Para o CNAE `7490-1/04` operando como marketplace/intermediário, a tributação no Simples incide **só sobre a comissão retida** (15%). Os 85% repassados ao proprietário são **valores de terceiros em trânsito**, fora da receita bruta da ShareO. Alinhado com a orientação da advogada (parecer FORMAL). Numa locação de R$100: receita bruta ShareO = R$15; é sobre esse valor que o DAS incide.

## 2 — Impacto no teto do Simples (R$4,8mi/ano)

O teto se refere ao **acumulado das comissões**, não ao volume transacionado. Para estourar o teto, o volume total de locações precisaria ser **~R$32 milhões/ano** (4,8mi ÷ 15%).

## 3 — Anexo e Fator R

CNAE `7490-1/04` é de anexo variável (Fator R = folha de pagamento 12m ÷ faturamento 12m):
- **Fator R ≥ 28%** → Anexo III, alíquota inicial **6%**.
- **Fator R < 28%** → Anexo V, alíquota inicial **15,5%**.

A Contabilizei já ativou o "motor do Fator R" e gerencia o pró-labore mês a mês (hoje R$100, padrão para empresa sem faturamento) para manter o enquadramento no Anexo III quando a receita começar. **Alíquota efetiva projetada: 6% sobre a comissão** (3,99% federal + 2,01% ISS) na primeira faixa.

## 4 — Documentação para sustentar que os 85% são trânsito (⚠️ requisito de produto)

Quatro peças, das quais a primeira é a que falta construir:

1. **🔨 Relatório de Intermediações (mensal, obrigatório)** — por transação: valor total da locação, valor repassado ao proprietário (85%), valor retido como comissão (15%). Enviado pela Central de Rotinas da plataforma Contabilizei. **Requisito para o sistema da ShareO** (texto da Ana): gerar automaticamente, no fechamento de cada mês, um relatório consolidado com data, identificação do proprietário (**CPF/nome**), valor total, valor do repasse e valor da comissão.
2. Comprovantes de transferência Stripe → proprietário (validam que o dinheiro saiu para o terceiro).
3. Termos de Uso explicitando que a ShareO é intermediadora, que o valor total pertence ao proprietário, e que a ShareO retém só a comissão.
4. Extratos da conta Stripe — como o dinheiro nunca passa por conta bancária da ShareO, os extratos Stripe fazem o papel de extrato bancário para conciliação. Envio mensal.

### 🔎 O que já existe no código vs. o que falta (apurado 10/09)

`app/api/admin/export/route.ts` (ADR-016) já exporta, por reserva: data, valor pago, comissão ShareO, valor proprietário, nome/e-mail do proprietário e do locatário, status de repasse — **cobre quase tudo** do item 1. **Falta:**
- **CPF do proprietário no export** — hoje só `name`/`email`; a Contabilizei pede CPF explicitamente (o modelo tem `User.cpfHash`/CPF criptografado, `lib/crypto.ts` — decidir se e como expor no export administrativo, dado que é dado sensível).
- **Fechamento mensal automático** — o export atual é sob demanda (admin escolhe período); a Ana pede um relatório que se gera "no fechamento de cada mês". Pode ser o mesmo endpoint chamado por um cron novo, ou geração+envio automático — decisão de produto, não trivial (envio de dado financeiro/pessoal por e-mail todo mês exige checar o destinatário e a base legal).

Registrado no backlog (`docs/backlog-atividades-priorizadas.md`) como item novo, sem implementação nesta sessão.

## 5 — Contra quem a NF dos 15% é emitida?

**Contra o proprietário do item** (quem remunera a ShareO pela intermediação), valor = comissão retida. Pode ser emitida por locação ou consolidada mensalmente por proprietário (mais prático, aceito, desde que a descrição detalhe período/operações). Emitida pela própria plataforma Contabilizei: CNAE `7490-1/04` + Item de Serviço **10.03** (agenciamento/corretagem/intermediação) automático. PF: exige CPF + endereço completo (regra SP).

## 6 — Obrigações acessórias com proprietários PF

- **Sem retenção de IR na fonte** sobre o repasse — o proprietário PF declara a renda no próprio IRPF (carnê-leão); responsabilidade dele.
- **Sem retenção de INSS** — não é relação de trabalho.
- **DIMOB não se aplica** — é para operações **imobiliárias**; a ShareO intermedia locação de itens/objetos, não imóveis. Reavaliar **se** a operação um dia incluir imóveis.
- **Relatório de Intermediações** (item 4) é o controle acessório principal, envio mensal obrigatório.

## Resumo prático

| Item | Valor |
|---|---|
| Receita bruta ShareO | Só os 15% (comissão) |
| Base de cálculo do DAS | Comissão retida |
| Alíquota projetada | 6% (Anexo III, Fator R ativo) |
| NF emitida contra | Proprietário do item (PF ou PJ) |
| Valor da NF | 15% da locação |
| Documento mensal obrigatório | Relatório de Intermediações + extrato Stripe |

Ver também [`checklist-conformidade-juridica.md`](checklist-conformidade-juridica.md) (linha B3) e [[project-d4-juridico]].
