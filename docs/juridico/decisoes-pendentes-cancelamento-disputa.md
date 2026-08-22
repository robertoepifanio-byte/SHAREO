# Duas decisões pendentes — cancelamento pelo locador e prazos de disputa

**Contexto:** auditoria de pagamento de 21/08/2026 (o relatório completo entra no repositório junto com o PR da Central de Ajuda do app — `docs/auditorias/auditoria-pagamento-stripe-2026-08-21.md`). Das 5 decisões levantadas, três foram resolvidas em 22/08; estas duas dependem de definição com o Raimundo, porque as duas escolhem entre *mudar o texto* e *mudar o código*, em documentos contratuais publicados.

⚠️ **Restrição que afeta a Decisão A:** o código **não emite estorno**. `refunds.create` não existe no repositório — o reembolso é calculado e gravado, mas alguém precisa executá-lo no Dashboard da Stripe. Qualquer decisão sobre percentual de reembolso herda esse gargalo manual.

---

## Decisão A — cancelamento pelo locador devolve valor integral?

### O que está publicado

`app/politicas/page.tsx:328`, seção **4.2 Cancelamento pelo Locador**:

> O cancelamento pelo Locador após a confirmação da reserva resulta em reembolso integral ao Locatário.

E a Central de Ajuda repete: *"Cancelamentos pelo proprietário devolvem o valor integral ao locatário."*

### O que o código faz

`lib/cancellationPolicy.ts` → `calcRefund(startDate, canceledAt, totalPrice, cfg)`.

A função recebe **quatro** argumentos e **nenhum deles diz quem cancelou**. Ela olha só a antecedência:

| Antecedência | Reembolso |
|---|---|
| ≥ 24h antes da retirada | 100% |
| entre 24h e 6h | 70% |
| < 6h | 50% |

`app/api/bookings/[id]/route.ts` chama a mesma função para os dois lados.

**Consequência concreta:** se o locador cancelar 3 horas antes da retirada, o locatário — que não deu causa a nada — recebe **50%**. A política promete 100%.

### As opções

**(A1) Implementar a promessa.** `calcRefund` passa a receber quem cancelou; cancelamento pelo locador força 100%.
- Custo: baixo — um parâmetro e um ramo. Os testes de `cancellationPolicy` já existem.
- Efeito colateral: a ShareO absorve a taxa de serviço nesses casos, ou cobra do locador. **Isso precisa ser decidido junto** — hoje ninguém paga.

**(A2) Mudar o texto** para dizer que o reembolso segue as mesmas faixas, independentemente de quem cancela.
- Custo: quase zero.
- Problema: é uma piora real para o locatário, e num contrato de adesão. Difícil defender: o locatário é penalizado por decisão do outro lado.

### Recomendação

**A1.** A promessa é justa e barata de implementar. O ponto que exige decisão de vocês não é *se* implementa, é **quem arca com a taxa de serviço** quando o locador cancela.

---

## Decisão B — prazos de disputa

### O que está publicado, e onde se contradiz

| Documento | Prazo de análise |
|---|---|
| `app/ajuda/page.tsx:173` | *"em até **3 dias úteis**"* |
| `app/politicas/page.tsx:292` | *"decisão em até **5 dias úteis**"* |

**Dois documentos publicados dizem coisas diferentes.** Um deles está errado, e não dá para saber qual sem vocês definirem.

### O prazo de abertura não é aplicado

Os dois documentos dizem que a disputa pode ser aberta **até 48 horas** após o evento/devolução.

`app/api/bookings/[id]/route.ts:140`:

```
open_dispute: { requiredStatus: ["ACTIVE", "RETURNED"], allowedRole: "both", ... }
```

Só exige o **status**. Não há checagem de prazo nenhuma. E como a reserva fica em `RETURNED` até o locador confirmar o recebimento, a janela pode ficar aberta **indefinidamente** — bem além das 48h prometidas.

Isso interage com o repasse: o cron ignora reservas em `DISPUTED`, então uma disputa aberta tarde pode travar um repasse que já deveria ter saído.

### As opções

**(B1) Definir o prazo real de análise** — 3 ou 5 dias úteis — e alinhar os dois documentos.
- Considerar: o atendimento é de segunda a sexta, 09h–17h. 3 dias úteis é apertado para um caso que exige troca de mensagens com as duas partes.

**(B2) Aplicar a janela de 48h em código**, contando da confirmação da devolução.
- Custo: médio. Exige gravar o instante da devolução (já existe) e checar no `open_dispute`.
- Risco: fechar a janela cedo demais prejudica quem descobre o problema depois. Vale considerar contar do `confirm_return` e não do `mark_returned`.

**(B3) Mudar o texto** para não prometer prazo de abertura.
- Mais honesto que hoje, mas fragiliza a proteção do locador: sem prazo, uma disputa pode surgir meses depois.

### Recomendação

**B1 + B2**, nessa ordem. Primeiro alinhar os documentos (é contradição publicada, corrige rápido), depois implementar a janela.

Sobre o prazo: sugiro **5 dias úteis**, que é o que as Políticas — o documento contratual — já dizem, e é mais realista para o atendimento atual.

---

## O que já foi resolvido nesta leva

| Decisão | Resultado |
|---|---|
| Estorno | §4.3 reescrito: descreve o que a Stripe estabelece, sem prometer prazo que o ShareO não controla |
| Repasse | Texto alinhado ao código em **5 trechos** do site: Termos §6, perfil/recebimentos (2), perfil/repasses e a **homepage** (`components/home/Seguranca.tsx`). Políticas e Central de Ajuda já estavam corretos. Nenhuma menção a "segunda-feira" restou no site. |
| Teto de R$ 1.000 | Validado na criação (zod) **e** na edição, por regra de não-regressão na rota |

## Pendências que ficam — precisam de dono

**1. O código não emite estorno.** Repetido aqui de propósito: é a lacuna mais cara em aberto. Alinhar o texto não a fecha.

**2. O app mobile ainda promete o repasse semanal — 16 ocorrências.**

| Arquivo | Ocorrências |
|---|---|
| `apps/mobile/app/ajuda.tsx` | 10 |
| `apps/mobile/app/perfil/recebimentos.tsx` | 2 |
| `apps/mobile/app/perfil/repasses.tsx` | 1 |
| `apps/mobile/app/termos.tsx` | 1 |
| `apps/mobile/components/home/Seguranca.tsx` | 1 |
| `apps/mobile/lib/__tests__/screens-repasses.test.tsx` | 1 — **fixa a frase antiga como contrato de teste** |

As 10 de `ajuda.tsx` são resolvidas pelo PR da Central de Ajuda do app. As outras 6 continuam abertas. Não é retoque de texto: `termos.tsx` e `recebimentos.tsx` precisam ler a janela de repasse da API, e o `termos.tsx` ainda tem `MAX_POR_TRANSACAO = "R$ 500,00"` cravado.

**3. O teto de R$ 1.000 pode ser contornado omitindo o campo.** `estimatedRetailPrice` é opcional: publicar um item caro é só não preencher o valor. E `isApproved` nasce `true` (publicação direta), então nada põe esses anúncios numa fila de revisão. Fechar isso exige decidir se o campo vira obrigatório ou se itens sem valor/acima do teto entram em moderação — e quem revisa.

**4. O valor do teto conflita com a própria precificação do projeto.** A referência do `CLAUDE.md` (diária ≈ 3–5% do bem; eletrônicos R$ 100/dia) implica itens de R$ 2.000–3.300. E 59 dos 92 itens do staging já estão acima de R$ 1.000. O mecanismo está pronto; o **número** merece revisão antes do go-live.
