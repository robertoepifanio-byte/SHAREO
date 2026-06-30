# RASCUNHO — Clausulas CDC: Arrependimento, Cancelamento/Devolucao e Limitacao de Responsabilidade

> **RASCUNHO GATED — nao publicar.** Insumo para a advogada revisar antes de aplicar nos Termos de Uso (`app/termos/page.tsx`). Publicar somente apos: parecer FORMAL validado + contrato MP assinado + conta PJ ativa + checklist 100%. Complementa [`draft-clausulas-mp-termos-privacidade.md`](draft-clausulas-mp-termos-privacidade.md).

**Data:** 2026-06-30 (s41)
**Base:** checklist item 4 ([`checklist-conformidade-juridica.md`](checklist-conformidade-juridica.md)) + parecer revisado ([`parecer-juridico-revisado-mp.md`](parecer-juridico-revisado-mp.md)) + texto atual `app/termos/page.tsx`.

---

## Clausula B1 — Politica de Arrependimento (CDC art. 49)

### Contexto legal

O art. 49 do CDC garante ao consumidor o direito de arrependimento em contratos celebrados fora do estabelecimento comercial (incluindo contratos eletronicos), no prazo de **7 dias corridos** contados da assinatura ou do recebimento do produto/servico. Para servicos de locacao de bens moveis contratados online, o prazo corre da **confirmacao da reserva pelo locatario** (contratacao) — e nao da retirada fisica do item. O exercicio do direito **antes da retirada** nao implica nenhum onus ao consumidor.

> CONSULTAR ADVOGADA: confirmar se o "recebimento do servico" para fins do art. 49 equivale ao momento da confirmacao da reserva ou ao inicio da locacao (retirada do item), e se ha jurisprudencia relevante de Procon/TJSP sobre contratos de locacao de bens moveis online.

### Texto proposto da clausula

> **[X]. Direito de Arrependimento (art. 49 do CDC)**
>
> O locatario que contratar a locacao de um item pela plataforma ShareO pelo meio eletronico tem o direito de se arrepender e cancelar a reserva no prazo de **7 (sete) dias corridos** contados da data de confirmacao da reserva, desde que o **item ainda nao tenha sido retirado fisicamente**.
>
> **[X].1.** O exercicio do direito de arrependimento dentro do prazo de 7 dias e **antes da retirada do item** assegura ao locatario o **reembolso integral** do valor pago, sem nenhuma penalidade ou taxa de cancelamento.
>
> **[X].2.** Caso o locatario exerca o direito de arrependimento **apos a retirada fisica do item** — ou seja, apos o inicio efetivo da locacao —, aplicam-se as regras de cancelamento da Politica de Cancelamento e Devolucao (Clausula [Y] abaixo), e o reembolso integral nao e garantido.
>
> **[X].3.** O arrependimento deve ser comunicado pelo locatario atraves do botao 'Cancelar reserva' na pagina da reserva ou por e-mail para suporte@shareo.com.br. O valor sera estornado para o mesmo metodo de pagamento original no prazo de ate [prazo a confirmar com o Mercado Pago] apos a confirmacao do cancelamento.
>
> **[X].4.** Este direito aplica-se a locatarios pessoas fisicas. Para pessoas juridicas, aplicam-se as disposicoes contratuais acordadas.

### Notas de implementacao

- O botao "Cancelar reserva" ja existe no produto para reservas com status `PENDING` e `CONFIRMED` (ver fluxo de cancelamento atual). Para o art. 49, e necessario garantir que o sistema permita cancelamento nos primeiros 7 dias corridos apos a confirmacao, **independentemente do status**, desde que a retirada nao tenha ocorrido (`booking.status` != `ACTIVE`).
- O prazo de estorno depende do Mercado Pago. Confirmar os SLAs de reembolso no contrato com o MP antes de publicar o prazo concreto na clausula [X].3.
- Considerar implementar flag `withdrawalRightEnabled` (default OFF, gated D4) para controlar o comportamento de cancelamento de 7 dias no sistema. Ver spec separada em [`spec-arrependimento-art49.md`](spec-arrependimento-art49.md).

---

## Clausula B2 — Limitacao de Responsabilidade da Plataforma (sem afastar CDC e sem excluir responsabilidade solidaria)

### Contexto legal

O CDC proibe clausulas que excluam totalmente a responsabilidade do fornecedor (art. 51 I). A ShareO, como intermediaria digital, responde solidariamente com o proprietario pelos servicos de intermediacao que presta (CDC art. 18 e art. 20 por analogia; parecer D4). A clausula de limitacao pode existir — desde que: (a) nao exclua direitos minimos do CDC; (b) nao afaste a responsabilidade solidaria que a lei impoe; (c) seja redigida com clareza para ser valida (art. 47 CDC — interpretacao mais favoravel ao consumidor).

> CONSULTAR ADVOGADA: validar os limites exatos da limitacao de responsabilidade admissivel no modelo de marketplace brasileiro, especialmente quanto a danos causados por proprietarios e a responsabilidade por falhas no pagamento via Mercado Pago.

### Texto proposto da clausula

> **[Z]. Responsabilidade da ShareO**
>
> **[Z].1. Intermediacao e responsabilidade solidaria.** A ShareO atua como plataforma de intermediacao entre locatarios e proprietarios de bens moveis. Nos termos do Codigo de Defesa do Consumidor, a ShareO e **responsavel solidaria** no que lhe couber pelos servicos de intermediacao que presta — o que inclui garantir o correto funcionamento da plataforma, o processamento dos pagamentos via parceiro autorizado (Mercado Pago), o canal de comunicacao entre as partes e o processo de resolucao de disputas.
>
> **[Z].2. Responsabilidade dos usuarios.** A responsabilidade pelo estado do item anunciado, pela veracidade das informacoes do anuncio, pela entrega e pelo recebimento do item no prazo e nas condicoes acordadas e do **proprietario**. A responsabilidade pelo uso adequado do item durante o periodo de locacao, pela devolucao no prazo e pelo pagamento das taxas aplicaveis e do **locatario**.
>
> **[Z].3. Limitacao proporcional.** Sem prejuizo das disposicoes do CDC, a responsabilidade da ShareO por danos diretos decorrentes de falhas nos servicos de intermediacao fica limitada ao valor total pago pelo locatario na locacao especifica em que o dano ocorreu. Essa limitacao nao se aplica em casos de dolo, culpa grave ou violacao de direitos fundamentais do consumidor.
>
> **[Z].4. Exclusoes.** A ShareO nao se responsabiliza por: (a) danos causados pelo proprietario ao locatario ou ao bem locado, ressalvada a responsabilidade solidaria acima; (b) danos decorrentes de uso incorreto do item pelo locatario; (c) falhas nos servicos do Mercado Pago nao causadas pela ShareO; (d) eventos de forca maior que impossibilitem a prestacao dos servicos.
>
> **[Z].5. Canal de reclamacao.** Em caso de problemas nao resolvidos pela plataforma, o consumidor pode acionar os canais de defesa do consumidor (Procon, e-Consumidor — consumidor.gov.br) e o Poder Judiciario.

### Notas de implementacao

- A clausula [Z].1 e mandatoria — nao pode ser removida ou enfraquecida sem nova consulta juridica.
- A clausula [Z].3 (limite ao valor da locacao) e admissivel como limitacao proporcional; verificar se a advogada considera valida no contexto especifico do marketplace.
- A clausula [Z].5 e exigida pela politica de atendimento ao consumidor da plataforma e reforca a clausula de SLA da Central de Ajuda.

---

## Clausula B3 — Politica de Cancelamento e Devolucao

### Contexto legal

A existencia de uma politica de cancelamento e devolucao clara e requisito do CDC (art. 6 III — direito a informacao) e evita que consumidores aleguem nao ter sido informados das condicoes. A politica deve ser consistente com o que o produto ja implementa e com os SLAs publicados na Central de Ajuda (que sao oferta vinculante — CDC art. 30).

### Texto proposto da clausula

> **[Y]. Politica de Cancelamento e Devolucao**
>
> **[Y].1. Cancelamento pelo locatario — antes da retirada.**
>
> | Momento do cancelamento | Reembolso |
> |---|---|
> | Dentro de 7 dias corridos da confirmacao e antes da retirada | **Integral** (direito de arrependimento — CDC art. 49) |
> | Mais de 24 horas antes da retirada | **Integral** (gratuito) |
> | Menos de 24 horas antes da retirada | **70%** do valor pago — 30% retidos a titulo de custo operacional |
>
> **[Y].2. Cancelamento pelo proprietario.**
> O proprietario pode cancelar uma reserva em status "Aguardando" ou "Confirmada". Cancelamentos frequentes pelo proprietario impactam sua visibilidade na plataforma e podem resultar em suspensao temporaria. Em caso de cancelamento pelo proprietario apos confirmacao, o locatario recebe reembolso integral.
>
> **[Y].3. Cancelamento automatico.**
> Se o proprietario nao confirmar ou recusar a solicitacao em ate 24 horas, a reserva e cancelada automaticamente e o locatario nao e cobrado.
>
> **[Y].4. Devolucao do item e prazo.**
> O item deve ser devolvido ate o mesmo horario da retirada no ultimo dia da locacao. Atrasos sujeitam o locatario a uma taxa equivalente a 1 (uma) diaria por dia extra de atraso, calculada automaticamente pela plataforma.
>
> **[Y].5. Devolucao com danos.**
> Se o item for devolvido com danos nao pre-existentes (documentados nas fotos de check-in), o proprietario deve selecionar 'Danificado' na tela de confirmacao de recebimento. Uma disputa sera aberta e o repasse ao proprietario ficara suspenso ate a resolucao pela equipe ShareO.
>
> **[Y].6. Estornos.**
> Estornos ao locatario sao processados pelo Mercado Pago para o mesmo metodo de pagamento original, nos prazos estabelecidos pelo Mercado Pago. A ShareO nao tem controle sobre os prazos de creditacao do estorno na conta do locatario.
>
> **[Y].7. Situacoes especiais.**
> Se o item nao estiver disponivel na data combinada por culpa do proprietario, o locatario tem direito a cancelamento com reembolso integral independentemente do prazo.

### Notas de implementacao

- Os valores de percentual de reembolso (70%/30%) estao configurados em `PlatformConfig` via `getCancellationConfig()` — confirmar que a clausula espelha os valores atuais. Se os valores mudarem na config, a clausula tambem precisa ser atualizada.
- A clausula [Y].6 deve referenciar o SLA real de estorno do Mercado Pago — confirmar no contrato MP antes de publicar.
- O prazo de 24h para cancelamento gratuito e o prazo de 24h para confirmacao pelo proprietario ja estao implementados no produto.
- A frase "cancelamento frequente pelo proprietario impacta visibilidade" ja e comunicada na Central de Ajuda — alinhar redacao.

---

## Relacao entre as clausulas e os Termos atuais

| Clausula proposta | Posicao sugerida nos Termos de Uso | Dependencia |
|---|---|---|
| B1 — Arrependimento | Nova secao [X], apos a secao de Pagamentos (atual Secao 6) | Depende de flag `withdrawalRightEnabled` — ligar apos aprovacao juridica |
| B2 — Limitacao de responsabilidade | Secao [Z], substituir ou complementar a secao atual de "Limitacao de Responsabilidade" | Nao depende de flag — pode ser incluida na revisao dos Termos pre-go-live |
| B3 — Cancelamento e devolucao | Secao [Y], substituir ou formalizar a politica de cancelamento atual | Deve espelhar os valores de `CancellationConfig` do banco |

> Relacionado: [`draft-clausulas-mp-termos-privacidade.md`](draft-clausulas-mp-termos-privacidade.md) (Secoes A e B), [`spec-arrependimento-art49.md`](spec-arrependimento-art49.md), [`checklist-conformidade-juridica.md`](checklist-conformidade-juridica.md) item 4.
