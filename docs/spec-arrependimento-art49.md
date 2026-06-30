# SPEC — Implementacao do Direito de Arrependimento (CDC art. 49)

> **Spec gated — nao implementar antes do go-live.** Esta especificacao descreve o comportamento FUTURO da funcionalidade de arrependimento. Nenhum codigo deve ser escrito nem alterado com base neste documento antes que: (a) o parecer juridico D4 esteja formalizado, (b) o texto da clausula de arrependimento seja aprovado pela advogada (ver [`draft-clausulas-cdc.md`](draft-clausulas-cdc.md) Clausula B1) e (c) a flag `withdrawalRightEnabled` seja ligada explicitamente em `PlatformConfig`. Este documento e especificacao — nenhuma linha de codigo aqui deve ser entendida como implementacao real.

**Data:** 2026-06-30 (s41)
**Base:** CDC art. 49 + checklist item 4 ([`checklist-conformidade-juridica.md`](checklist-conformidade-juridica.md)) + parecer D4 ([`parecer-juridico-revisado-mp.md`](parecer-juridico-revisado-mp.md)) + clausulas [`draft-clausulas-cdc.md`](draft-clausulas-cdc.md).

---

## 1. O que e a funcionalidade

O CDC art. 49 garante ao consumidor pessoa fisica o direito de se arrepender de contratos celebrados fora do estabelecimento comercial (incluindo contratos eletronicos) no prazo de 7 dias corridos. Para o ShareO, isso significa que um locatario PF que confirme uma reserva online e ainda nao tenha retirado o item pode cancelar a reserva dentro de 7 dias da confirmacao e receber reembolso integral, sem nenhuma penalidade.

---

## 2. Escopo: quais estados de reserva permitem o arrependimento

O direito de arrependimento do art. 49 se aplica quando:

| Condicao | Valor esperado |
|---|---|
| Tipo de usuario | Locatario pessoa fisica (campo `userType === "PF"`) |
| Status da reserva | `PENDING` ou `CONFIRMED` (reserva nao iniciada) |
| Item ainda nao retirado | `booking.status !== "ACTIVE"` e `booking.pickedUpAt === null` |
| Prazo desde a confirmacao | Menos de 7 dias corridos desde `booking.createdAt` (ou `booking.confirmedAt`, a definir — ver Secao 4) |

O direito de arrependimento **NAO se aplica** quando:
- O item ja foi retirado (`booking.status === "ACTIVE"` ou `booking.pickedUpAt !== null`).
- O locatario e pessoa juridica (PJ).
- Ja se passaram mais de 7 dias corridos desde a data a ser definida (ver Secao 4).

Quando o arrependimento nao e mais cabivel, aplicam-se as regras normais de cancelamento (ver `getCancellationConfig()` e a clausula B3 de [`draft-clausulas-cdc.md`](draft-clausulas-cdc.md)).

---

## 3. Janela de 7 dias vs. data de retirada

Ha duas interpretacoes possiveis do prazo do art. 49 que a advogada deve confirmar:

**Interpretacao A — prazo a partir da confirmacao da reserva:**
O prazo de 7 dias corre a partir de `booking.createdAt` ou `booking.confirmedAt`. O locatario pode se arrepender ate 7 dias apos confirmar a reserva, independentemente de quando seria a retirada.

- Implicacao: se a retirada esta agendada para daqui a 10 dias, o locatario tem 7 dias para se arrepender (a partir da confirmacao), mas pode cancelar graciosamente tambem depois disso pelas regras normais.
- Problema: se o locatario confirmar a reserva hoje para uma retirada em 5 dias, o prazo de arrependimento (7 dias) pode se estender alem da data de retirada — neste caso, a janela efetiva de arrependimento e limitada pela data de retirada.

**Interpretacao B — prazo a partir do inicio do servico (retirada):**
O prazo so comecaria a contar quando o servico comeca a ser prestado (retirada do item). Antes da retirada, qualquer cancelamento seria gracioso (politica normal).

> CONSULTAR ADVOGADA: qual interpretacao e mais adequada para contratos de locacao de bens moveis online? A Interpretacao A e mais conservadora e favoravel ao consumidor — recomendada para minimizar risco de autuacao pelo Procon.

**Sugestao de implementacao para a spec:**
Adotar a **Interpretacao A** por seguranca: o prazo de 7 dias e contado a partir de `booking.confirmedAt`. A janela efetiva de arrependimento e o minimo entre:
- `booking.confirmedAt + 7 dias corridos`
- `booking.startDate` (data de retirada, se ainda nao ocorreu)

Isso garante que o locatario nunca perca o direito de arrependimento antes da retirada, mas tambem que o direito nao se aplica apos a retirada.

---

## 4. Como o reembolso funciona no split do Mercado Pago

Com o Modelo B (split), o valor pago pelo locatario e dividido no momento do pagamento:
- `platformFeeAmount` (taxa ShareO, ex.: 15%) → conta da ShareO no MP
- `ownerNetAmount` (liquido do locador) → conta do locador no MP (via `marketplace_fee`)

O reembolso de arrependimento deve ser **integral** (CDC art. 49), ou seja, cobrir o valor total pago (`booking.totalPrice`). Isso implica:

- O Mercado Pago precisa suportar estorno total da transacao, incluindo o `marketplace_fee` ja alocado.
- A ShareO deve acionar o endpoint de reembolso do MP (`POST /v1/payments/{id}/refunds`) para o valor total.
- O locador nao deve ser prejudicado por um reembolso de arrependimento antes da retirada, ja que o item nao saiu de sua posse. O valor nao deve ter sido repassado ao locador neste ponto.

> CONSULTAR ADVOGADA + TIME TECNICO: confirmar com a documentacao do Mercado Pago se o reembolso integral de uma transacao com split e suportado e quais sao os prazos. Se o MP nao suportar reembolso total de transacoes com `marketplace_fee` ja processado, sera necessario um workaround (ex.: estorno parcial + credito manual).

**Recomendacao de fluxo:**

```
Locatario clica em "Cancelar reserva" (dentro da janela de arrependimento)
  → Sistema verifica: status != ACTIVE, pickedUpAt == null, dentro de 7 dias
  → Se elegivel para arrependimento: mostra mensagem "Voce tem direito ao reembolso integral (art. 49 CDC)"
  → Locatario confirma
  → Sistema chama API do Mercado Pago: reembolso total da transacao
  → booking.status = CANCELLED, booking.cancellationReason = "WITHDRAWAL_RIGHT_CDC49"
  → E-mail de confirmacao enviado ao locatario com prazo de estorno
  → E-mail de notificacao enviado ao locador (item nao alugado, sem prejuizo)
  → Nenhuma penalidade ao locatario
```

---

## 5. Sugestao de flag e padrao de implementacao

Seguindo o padrao de feature flags do projeto (ver `lib/platform-config.ts` e `getPlatformPixConfig`, `getRentalContractConfig`, `getMercadoPagoConfig`):

**Flag proposta:** `withdrawalRightEnabled` em `PlatformConfig`

- **Default: OFF** — com a flag desligada, o fluxo de cancelamento atual nao muda. O arrependimento do art. 49 so e ativado explicitamente.
- **Quando ligar:** somente apos (a) texto da clausula aprovado pela advogada, (b) contrato MP assinado confirmando suporte a reembolso total de transacoes com split, (c) SLA de estorno confirmado para exibir ao usuario.

**Comportamento com flag OFF:**
O fluxo de cancelamento atual permanece inalterado. O locatario ainda pode cancelar pelas regras atuais (gratuito com mais de 24h, taxa de 30% com menos de 24h).

**Comportamento com flag ON:**
O sistema adiciona a verificacao de elegibilidade para arrependimento no momento do cancelamento. Se elegivel, o locatario ve a opcao de exercer o direito de arrependimento com reembolso integral.

---

## 6. Itens fora do escopo desta spec

- Codigo de implementacao (nao e responsabilidade desta spec).
- Processo de reembolso para o caso de MP nao suportar estorno total de split (workaround tecnico a definir com o time).
- Arrependimento para locatarios PJ (nao se aplica — apenas PF e protegido pelo CDC art. 49).
- Extensao do prazo de arrependimento alem de 7 dias (a lei fixa o minimo; a ShareO pode oferecer prazo maior por opcao comercial, mas isso e decisao dos fundadores).

---

## 7. Perguntas para a advogada antes da implementacao

1. O prazo de 7 dias do art. 49 conta a partir da confirmacao da reserva (contratacao) ou do inicio do servico (retirada do item)?
2. O art. 49 se aplica a todos os contratos de locacao de bens moveis online, ou ha excecoes para contratos de curta duracao ou valores abaixo de determinado limite?
3. O reembolso integral exigido pelo art. 49 inclui eventuais tarifas cobradas pelo Mercado Pago ao locatario (quando aplicavel)?
4. A clausula de arrependimento precisa constar explicitamente nos Termos de Uso ou e suficiente sua publicacao na Central de Ajuda?
5. Quais sao as penalidades previstas por nao implementar o art. 49 (Procon, Senacon, acao individual)?

> Relacionado: [`draft-clausulas-cdc.md`](draft-clausulas-cdc.md) Clausula B1, [`checklist-conformidade-juridica.md`](checklist-conformidade-juridica.md) item 4, [`parecer-juridico-revisado-mp.md`](parecer-juridico-revisado-mp.md).
