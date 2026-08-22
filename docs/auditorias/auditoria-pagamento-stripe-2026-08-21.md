# Auditoria — o que ainda contradiz o pagamento só-cartão (Stripe Connect)

**Data:** 21/08/2026 · **Método:** painel de 5 especialistas em paralelo, cada achado submetido a um verificador adversarial que reabriu o arquivo citado.

**Resultado:** 34 achados brutos → **5 refutados** na verificação → 29 confirmados, que se consolidam em **24 pontos distintos** (os eixos convergiram nos mesmos lugares por caminhos diferentes). **17** marcados como bloqueadores de go-live.

> ⚠️ Auditoria **read-only**. Nada foi alterado.

## A leitura de fundo

Três padrões explicam quase tudo:

1. **A Ajuda do app mobile ficou no PSP anterior.** 8 dos 24 pontos estão em `apps/mobile/app/ajuda.tsx` — a tela inteira ainda descreve Mercado Pago, Pix, Amex/Elo/Hipercard e repasse semanal. O site já foi corrigido em 20/08; o app não. Além do erro factual, isso viola a regra de transcrição literal do fundador (o app deve espelhar o site).

2. **Existem promessas contratuais que o código nunca cumpriu** — e não são de pagamento só. Estorno automático, repasse semanal às segundas, teto de R$ 1.000, prazos de disputa. Estão em **Termos e Políticas**, documentos de adesão: no CDC, oferta vinculante (art. 30).

3. **Os dois documentos legais se contradizem entre si.** `/politicas` já usa a redação correta do repasse; `/termos` ficou para trás. Prazo de disputa: Ajuda diz 3 dias úteis, Políticas diz 5.

---

## Parte 1 — Exige DECISÃO antes de corrigir (8 pontos)

Aqui não dá para "ajustar a copy": há duas versões da verdade, e é preciso escolher **qual delas passa a valer** — mudar o texto ou mudar o código. É decisão de produto e jurídica, não de redação.

#### `app/politicas/page.tsx:335` — 🔴 bloqueador

**§4.3 Políticas: promete reembolso automático via Stripe em 5–10 dias úteis — não existe refunds.create no código**

- **Diz hoje:** Reembolsos são processados pela Stripe para o mesmo método de pagamento utilizado na reserva. Como o checkout aceita, nesta versão, apenas cartão de crédito, o crédito aparece na fatura do cartão do Locatário no prazo praticado pelo banco ou operadora — geralmente de 5 a 10 dias úteis, podendo cair na fatura seguinte conforme a data de fechamento.
- **Deveria dizer:** O reembolso é calculado automaticamente pela plataforma conforme a antecedência do cancelamento, e executado manualmente pela equipe ShareO via Stripe Dashboard. O crédito no cartão depende do processamento manual e pode levar mais tempo do que o praticado por reembolsos automáticos.
- **Risco:** Jurídico (CDC art. 30 + 49): promessa de automatismo e prazo fixo que não existe no código. Não há nenhuma chamada a stripe.refunds.create() em qualquer arquivo do repositório — o cancelamento apenas grava refundAmount e refundPercent no banco; a devolução ao cartão exige ação humana no Stripe Dashboard. Usuário que não receber em 10 dias úteis terá base para chargeback, elevando a taxa de disputas da conta Stripe e podendo levar a restrição da conta.
- Severidade **alto** · categoria `promessa-nao-cumprida, copy-desalinhada` · confirmado por 4 eixo(s): ajuda-politicas, copy-ui, docs-adr-backlog, promessas-vs-codigo

#### `app/termos/page.tsx:74` — 🔴 bloqueador

**Termos prometem repasse 'semanalmente, às segundas-feiras' — cron é diário**

- **Diz hoje:** O repasse aos locadores é realizado semanalmente, às segundas-feiras, referente às locações concluídas.
- **Deveria dizer:** O repasse fica elegível após a janela de N dias configurada na plataforma e é processado diariamente pelo cron — sem vinculação a um dia fixo da semana.
- **Risco:** Jurídico (CDC art. 30): promessa de prazo explícito em contrato de adesão. O cron /api/cron/payout roda diariamente às 10h BRT sem qualquer lógica de dia-da-semana. Proprietário que não receber na segunda-feira seguinte tem base para contestação. Também contradiz a politicas/page.tsx §1.7 e ajuda/page.tsx, que usam getPayoutWindowDays() e não fixam dia.
- Severidade **alto** · categoria `promessa-nao-cumprida, copy-desalinhada` · confirmado por 3 eixo(s): ajuda-politicas, copy-ui, promessas-vs-codigo

#### `app/perfil/recebimentos/page.tsx:83` — 🔴 bloqueador

**/perfil/recebimentos — descrição do repasse com dia e frequência errados**

- **Diz hoje:** Linha 83: "O valor fica retido na plataforma até o repasse semanal (toda segunda-feira)." / Linha 208 (card 'Como funciona o repasse'): { title: 'Repasse semanal', desc: 'O valor fica retido até a próxima segunda-feira (feriado: primeiro dia útil seguinte).' }
- **Deveria dizer:** O valor fica retido até {payoutWindowDays} dias após a confirmação da devolução, data em que entra na fila do cron diário de repasse. Proprietários com Stripe Connect ativo recebem automaticamente; sem Connect, por repasse manual via PIX.
- **Risco:** Expectativa do usuário: página visitada por todo proprietário ao cadastrar PIX. Garante mentalmente que receberá na segunda-feira e pode tomar decisões financeiras baseado nessa data. O cron (app/api/cron/payout/route.ts) nunca verifica dia da semana — roda todo dia e libera quem atingiu eligibleAfter. Carga de suporte certa quando o proprietário não recebe na segunda esperada.
- Severidade **alto** · categoria `copy-desalinhada, promessa-nao-cumprida` · confirmado por 2 eixo(s): promessas-vs-codigo, copy-ui

#### `app/politicas/page.tsx:328` — 🔴 bloqueador

**§4.2 Politicas — cancelamento pelo locador promete reembolso integral, código aplica percentual por tempo**

- **Diz hoje:** "O cancelamento pelo Locador após a confirmação da reserva resulta em reembolso integral ao Locatário."
- **Deveria dizer:** Quando o proprietário cancela uma reserva confirmada, o reembolso ao locatário segue a mesma tabela de antecedência que qualquer cancelamento — ou implementar no código um bypass que force refundPercent=100 quando cancelledById === booking.ownerId.
- **Risco:** Jurídico/consumidor: app/api/bookings/[id]/route.ts:247-254 chama calcRefund(startDate, now, totalPrice, config) independentemente de quem cancela (isOwner não é passado). Se o proprietário cancelar com menos de 6h de antecedência — que está dentro do prazo de status CONFIRMED — calcRefund retorna latePercent (default 50%). O locatário recebe 50% mas a Política Pública promete 100%. Violação direta do CDC art. 49 e do próprio termo publicado em /politicas.
- Severidade **alto** · categoria `promessa-nao-cumprida` · confirmado por 1 eixo(s): promessas-vs-codigo

#### `app/perfil/repasses/page.tsx:76` — 🔴 bloqueador

**Repasses: subtítulo 'repasse semanal toda segunda-feira' na página de histórico**

- **Diz hoje:** "Histórico de repasses das suas locações. O valor fica retido na plataforma até o repasse semanal (toda segunda-feira)."
- **Deveria dizer:** "Histórico de repasses das suas locações. O valor fica disponível para repasse em até [N] dias após a confirmação da devolução — prazo configurado pela plataforma." (usar getPayoutWindowDays() em server component)
- **Risco:** Expectativa do usuário: locador que vê 'PENDING' em um repasse numa quarta-feira supõe que receberá na segunda seguinte. Se o cron já rodou e o payout foi processado para outro canal, o usuário abre ticket de suporte achando que houve falha. Agrava a confusão criada pelo mesmo texto em /recebimentos e /termos.
- Severidade **medio** · categoria `promessa-nao-cumprida, copy-desalinhada` · confirmado por 2 eixo(s): copy-ui, promessas-vs-codigo

#### `app/ajuda/page.tsx:173` — 🔴 bloqueador

**Prazo de disputa publicado como 48h mas código não fecha a janela — pode ser aberta até 7 dias**

- **Diz hoje:** "você pode abrir uma disputa na página da reserva enquanto ela estiver ativa ou em até 48 horas após a devolução"
- **Deveria dizer:** Na versão atual, disputas podem ser abertas enquanto o status da reserva for ACTIVE ou RETURNED — sem verificação de prazo de 48h. O prazo real encerra quando a reserva transita para COMPLETED (automático, após ~7 dias do status RETURNED). Corrigir o texto para refletir o comportamento real ou implementar a validação de 48h na rota app/api/bookings/[id]/route.ts (action 'open_dispute').
- **Risco:** Expectativa do proprietário: confia que após 48h a disputa não pode mais ser aberta e o repasse será liberado. Na prática, app/api/bookings/[id]/route.ts:140 permite open_dispute em status RETURNED sem checar tempo decorrido — um locatário pode abrir disputa no 6º dia após a devolução, travar o payout por mais tempo que o esperado. Mesma promessa está em app/politicas/page.tsx:289-291 ('48 horas após o evento que a originou').
- Severidade **medio** · categoria `promessa-nao-cumprida, copy-desalinhada` · confirmado por 2 eixo(s): promessas-vs-codigo, ajuda-politicas

#### `app/ajuda/page.tsx:169` — 🔴 bloqueador

**Ajuda: política de cancelamento promete reembolso sem mencionar que a execução é manual**

- **Diz hoje:** Linha 169: "Cancelando até X horas antes da retirada, o reembolso é integral; entre Xh e Yh antes, o reembolso é de Z%; com menos de Yh, de W%." / Linha 274: "O reembolso depende da antecedência em relação à data de retirada: até Xh antes, reembolso integral; entre Xh e Yh antes, Z% do valor pago; com menos de Yh, W%... Cancelamentos pelo proprietário devolvem o valor integral ao locatário."
- **Deveria dizer:** Adicionar em cada menção: 'O reembolso é calculado automaticamente pela plataforma e emitido manualmente pela equipe ShareO no Dashboard da Stripe. Entre em contato com suporte@shareo.com.br para acompanhar o processamento.' Os percentuais dinâmicos estão corretos; falta a ressalva sobre execução manual.
- **Risco:** Expectativa do usuário: a Central de Ajuda é o principal ponto de consulta antes de cancelar. Descrever apenas o percentual de reembolso sem avisar que o crédito depende de ação manual gera expectativa de crédito automático em dias — o que não ocorre. Combinado com a Política (achado 1), o usuário tem dois documentos diferentes prometendo automação inexistente.
- Severidade **medio** · categoria `promessa-nao-cumprida` · confirmado por 1 eixo(s): copy-ui

#### `app/ajuda/page.tsx:144`

**Tabela de taxas da Central de Ajuda declara teto de R$ 1.000 por item anunciado como regra de plataforma — não há validação no código**

- **Diz hoje:** { label: 'Valor máximo do bem anunciado', value: 'R$ 1.000 por item', when: 'Regra da fase inicial' } (tabela de taxas linha 144); 'a plataforma se destina a itens com valor estimado de até R$ 1.000... anúncios acima dele podem ser removidos na moderação' (FAQ linha 272)
- **Deveria dizer:** Remover o item da tabela de taxas (que cria aparência de controle automatizado) ou mover para uma nota de rodapé esclarecendo que o limite é aplicado por moderação humana, não verificado no cadastro.
- **Risco:** Expectativa do usuário: o próprio código da ajuda/page.tsx (linhas 141–143) contém o aviso '⚠️ Regra de negócio da fase inicial, NÃO validada em código hoje — lib/validations/items.ts só exige estimatedRetailPrice >= 0'. Proprietário anuncia item de R$ 2.000 sem qualquer bloqueio, item entra na busca, e locatários o veem — contradiz a regra publicada. Aumenta o trabalho de moderação manual não escalável.
- Severidade **baixo** · categoria `copy-desalinhada` · confirmado por 1 eixo(s): ajuda-politicas

---

## Parte 2 — Ajuda do app mobile (8 pontos, mesmo arquivo)

Correção mecânica: transcrever do site já corrigido. Nenhuma decisão nova.

#### `apps/mobile/app/ajuda.tsx:261` — 🔴 bloqueador

**Quais formas de pagamento são aceitas — cita Pix, Amex, Elo e Hipercard**

- **Diz hoje:** "O Mercado Pago aceita as principais bandeiras de cartão de crédito (Visa, Mastercard, Elo, Hipercard, American Express), além de Pix."
- **Deveria dizer:** "O ShareO aceita cartão de débito e crédito Visa e Mastercard. Pix não está disponível no momento. Outras bandeiras poderão ser adicionadas futuramente." — PSP é Stripe Connect, não Mercado Pago; Pix bloqueado pela Stripe por 60 dias de histórico live; Amex não aceita no BR; Elo e Hipercard sem suporte confirmado no Stripe.
- **Risco:** Jurídico + expectativa do usuário: o locatário vai ao checkout esperando pagar com Pix ou Amex e o método não existe — abandono de checkout, chargeback e reclamação no Procon/Reclame Aqui. Pix tem prazo regulatório indeterminado; prometer "aceita Pix" antes do go-live público viola o CDC (art. 37, oferta vinculante).
- Severidade **critico** · categoria `promessa-nao-cumprida` · confirmado por 1 eixo(s): emails-mobile

#### `apps/mobile/app/ajuda.tsx:584` — 🔴 bloqueador

**Tabela de taxas promete reembolso automático no cancelamento**

- **Diz hoje:** "Cancelamento com +24h de antecedência: Gratuito — Reembolso integral" e "Cancelamento com menos de 24h: 30% do valor da locação — Descontado do reembolso"
- **Deveria dizer:** Remover a palavra "reembolso" ou adicionar qualificador: "sujeito a análise manual" ou "processado pela equipe ShareO". Não existe refunds.create no código — o estorno é emitido manualmente no Dashboard da Stripe por uma pessoa.
- **Risco:** Jurídico + expectativa do usuário: o locatário cancela esperando estorno automático que nunca chega, abre disputa no banco (chargeback), aciona o Procon. Tabela é percebida como contratual. CDC art. 35 vincula a promessa de estorno integral.
- Severidade **alto** · categoria `promessa-nao-cumprida` · confirmado por 1 eixo(s): emails-mobile

#### `apps/mobile/app/ajuda.tsx:255` — 🔴 bloqueador

**FAQ "Meu dinheiro está protegido?" — "o valor pode ser reembolsado" implica processo automático**

- **Diz hoje:** "o valor fica em custódia do Mercado Pago [...] Se algo der errado antes da entrega ser confirmada, o valor pode ser reembolsado conforme a política de cancelamento."
- **Deveria dizer:** "o valor fica retido via Stripe até a confirmação da devolução. Em caso de cancelamento elegível, o estorno é solicitado ao Stripe pela equipe ShareO — o prazo de crédito depende da operadora do cartão (tipicamente 5–10 dias úteis)." PSP é Stripe; estorno é manual; prazo existe e deve ser comunicado.
- **Risco:** Expectativa do usuário + carga de suporte: "pode ser reembolsado" sem prazo gera tickets de "cadê meu dinheiro". Ausência de menção ao prazo da operadora causa frustração imediata pós-cancelamento.
- Severidade **alto** · categoria `promessa-nao-cumprida` · confirmado por 1 eixo(s): emails-mobile

#### `apps/mobile/app/ajuda.tsx:102` — 🔴 bloqueador

**Passo 3 do guia do locador — "Conectar sua conta Mercado Pago"**

- **Diz hoje:** "step: 3, icon: '💳', title: 'Conectar sua conta Mercado Pago', desc: 'Antes de receber qualquer pagamento, conecte sua conta Mercado Pago em Meu Perfil → Recebimentos. O repasse de cada locação é feito pelo Mercado Pago direto para a sua conta.'"
- **Deveria dizer:** Substituir por passo que descreva o onboarding real do Stripe Connect (conta conectada via Stripe Express). O Mercado Pago está dormente (flag OFF) e a tela Meu Perfil → Recebimentos hoje guia para Stripe, não MP.
- **Risco:** Expectativa do usuário: o proprietário vai ao perfil procurar um botão de "conectar Mercado Pago" que não existe — fica bloqueado de receber. Carga de suporte imediata no go-live.
- Severidade **alto** · categoria `copy-desalinhada` · confirmado por 1 eixo(s): emails-mobile

#### `apps/mobile/app/ajuda.tsx:253` — 🔴 bloqueador

**FAQ Pagamento e Segurança — descreve Checkout do Mercado Pago em todas as perguntas**

- **Diz hoje:** "O pagamento segue quatro etapas: [...] O locatário paga pelo Checkout do Mercado Pago — o valor fica em custódia do Mercado Pago. [...] o Mercado Pago processa o repasse ao proprietário toda segunda-feira"
- **Deveria dizer:** Substituir todas as referências ao Mercado Pago nesta seção por Stripe / Stripe Connect. O checkout real é Stripe Checkout Sessions com payment_method_types: ["card"].
- **Risco:** Jurídico + expectativa do usuário: o usuário lê a ajuda, vai ao checkout, vê "Stripe" e desconfia de golpe. Divergência entre copy e interface real gera desconfiança, abandono e reclamações.
- Severidade **alto** · categoria `copy-desalinhada` · confirmado por 1 eixo(s): emails-mobile

#### `apps/mobile/app/ajuda.tsx:70` — 🔴 bloqueador

**Passo 5 do guia do locatário — "pagamento processado pelo Mercado Pago"**

- **Diz hoje:** "O pagamento é processado pelo Mercado Pago — instituição de pagamento licenciada pelo Banco Central do Brasil. Você é direcionado para o ambiente seguro do Mercado Pago para inserir seus dados de pagamento."
- **Deveria dizer:** "O pagamento é processado pela Stripe — plataforma de pagamentos internacional usada por milhões de empresas. Você é direcionado para o ambiente seguro da Stripe para inserir seus dados de cartão."
- **Risco:** Expectativa do usuário: o locatário leu "Mercado Pago" no guia, vê a tela da Stripe no checkout e desconfia de phishing — abandona a transação ou contacta suporte. É o primeiro ponto de contato do usuário com o PSP real.
- Severidade **alto** · categoria `copy-desalinhada` · confirmado por 1 eixo(s): emails-mobile

#### `apps/mobile/app/ajuda.tsx:124` — 🔴 bloqueador

**Passo 7 do locador e FAQ "Quando recebo o pagamento" — repasse via Mercado Pago toda segunda-feira**

- **Diz hoje:** "o valor líquido entra na fila de repasse semanal e é repassado pelo Mercado Pago toda segunda-feira (feriado: primeiro dia útil seguinte) para a conta Mercado Pago conectada em Meu Perfil → Recebimentos."
- **Deveria dizer:** Substituir "Mercado Pago" por "Stripe" e "conta Mercado Pago" por "conta bancária conectada via Stripe Connect". A cadência semanal é a intenção do cron de payout, mas o mecanismo é o Stripe Transfers, não o Mercado Pago.
- **Risco:** Expectativa do usuário: o proprietário aguarda repasse da conta Mercado Pago que nunca chegará (conta não existe nesse PSP). Carga de suporte alta — "não recebi meu dinheiro" é o ticket mais crítico do marketplace.
- Severidade **alto** · categoria `copy-desalinhada` · confirmado por 1 eixo(s): emails-mobile

#### `apps/mobile/app/ajuda.tsx:580` — 🔴 bloqueador

**Tabela de taxas — "Repasse ao locador: Via Mercado Pago — valor líquido"**

- **Diz hoje:** "{ label: 'Repasse ao locador', value: 'Via Mercado Pago — valor líquido', when: 'Toda segunda-feira (feriado: 1º dia útil seguinte)' }"
- **Deveria dizer:** "{ label: 'Repasse ao locador', value: 'Via Stripe Connect — valor líquido', when: 'Toda segunda-feira (feriado: 1º dia útil seguinte)' }"
- **Risco:** A tabela de taxas é a referência que usuários guardam (screenshot) para saber como e quando recebem. Nomear o PSP errado gera expectativa de conta Mercado Pago e tickets de suporte no dia do primeiro repasse real.
- Severidade **alto** · categoria `copy-desalinhada` · confirmado por 1 eixo(s): emails-mobile

---

## Parte 3 — Demais correções no site e documentos (8 pontos)

#### `docs/backlog-atividades-priorizadas.md:43` — 🔴 bloqueador

**Backlog afirma que #325 ligou Pix e boleto — #335 desligou os dois**

- **Diz hoje:** "Copy de pagamento desatualizada: checkout já aceita Pix e boleto … O #325 ligou payment_method_types: ['card', 'boleto', 'pix'] em app/api/payments/checkout/route.ts horas depois do #324 publicar a copy dizendo 'apenas cartão de crédito à vista'…"
- **Deveria dizer:** Boleto foi descartado pelos fundadores (nao aceita reembolso, incompativel com a politica de cancelamento) e Pix esta bloqueado pela Stripe ate ~60 dias de pagamentos processados em live — o #335 devolveu payment_method_types a ['card']. A copy publicada esta ALINHADA ao codigo; este item do backlog e que virou obsoleto e deve ser fechado, senao o proximo agente vai 'corrigir' a Ajuda de volta para Pix/boleto e reabrir o problema.
- **Risco:** Alto risco de regressao: o backlog e lido como to-do — como o item aparece com prioridade e diz para 'atualizar 6 arquivos', ha risco real de alguem reintroduzir 'aceitamos Pix e boleto' na Ajuda/Politicas, o que reabre o problema de oferta vinculante.
- Severidade **alto** · categoria `copy-desalinhada, codigo-morto` · confirmado por 2 eixo(s): docs-adr-backlog, ajuda-politicas

#### `CLAUDE.md:22`

**CLAUDE.md descreve pagamento como 'Stripe Checkout simples, Connect nao iniciado' — construcao ja esta no ar**

- **Diz hoje:** Linha 22: "Pagamentos | Stripe Checkout Sessions simples (Test mode, ativo no código hoje). PSP definitivo decidido: Stripe Connect (…ADR-028…, 2026-08-19) — construção ainda não iniciada." e linha 103: "PSP definitivo: Stripe Connect (ADR-028, 2026-08-19) — construção ainda não iniciada."
- **Deveria dizer:** Stripe Connect Express (Accounts v2, configuration recipient) esta implementado — onboarding, separate charges + transfers e reversao de Transfer em reembolso/disputa ja estao no codigo (#325/#326/#332/#335). Nada foi exercitado ponta a ponta em live e o go-live segue gated por D4, mas a construcao NAO e mais 'nao iniciada'. Distinguir 'implementado, aguardando verificacao/D4' de 'nao iniciado'.
- **Risco:** Carga de contexto para o proprio time e para agentes: qualquer decisao guiada pelo CLAUDE.md subestima o que existe (e o que ja pode quebrar). Ja induziu erro em revisoes anteriores.
- Severidade **alto** · categoria `copy-desalinhada` · confirmado por 1 eixo(s): docs-adr-backlog

#### `docs/adr/ADR-028-reversao-stripe-connect.md:116`

**ADR-028 ainda lista 'tarefa VENCIDA da Stripe' como primeiro passo de verificacao — foi resolvida em 21/08**

- **Diz hoje:** "1. Resolver a tarefa VENCIDA da conta Stripe. Em 20/08 o Dashboard exibe 'Vários recursos pausados — uma tarefa obrigatória está vencida', e Cartões aparece como 'Ação necessária' … Enquanto isso não fecha, nem cartão cobra — é o único item que impede qualquer pagamento, e por isso vem primeiro."
- **Deveria dizer:** Registrar que a tarefa foi resolvida em 21/08 (Cartoes habilitado no live) e mover a pendencia real que ficou: criar o Event Destination v2 e gravar STRIPE_CONNECT_WEBHOOK_SECRET no Vercel, mais o teste ponta a ponta com uma cobranca real. Nao repetir 'nem cartao cobra' quando ja cobra.
- **Risco:** ADR e a fonte da verdade da decisao — um agente que le 'nem cartao cobra' congela o proximo passo (webhook + teste live) esperando algo que nao existe mais.
- Severidade **medio** · categoria `copy-desalinhada, codigo-morto` · confirmado por 2 eixo(s): docs-adr-backlog, promessas-vs-codigo

#### `app/ganhar/page.tsx:61`

**Ganhar: 'recebe o valor líquido diretamente via PIX' — ignora Stripe Connect como via primária**

- **Diz hoje:** "Sim, uma taxa de serviço de X% sobre o valor da locação, cobrada do locatário. Você recebe o valor líquido diretamente via PIX, sem nenhuma mensalidade ou custo para anunciar."
- **Deveria dizer:** "Você recebe o valor líquido via depósito bancário automático pela Stripe (para quem cadastrou os dados bancários em Meu Perfil → Recebimentos) ou por repasse manual via PIX — sem mensalidade ou custo para anunciar."
- **Risco:** Expectativa do usuário: proprietário captado por esta página configura Stripe Connect e aguarda receber via PIX. Na prática, a Stripe deposita na conta bancária informada no onboarding. A confusão ocorre antes mesmo do primeiro repasse e pode levar o proprietário a achar que houve erro de pagamento.
- Severidade **medio** · categoria `copy-desalinhada` · confirmado por 1 eixo(s): copy-ui

#### `app/reservas/sucesso/page.tsx:171`

**Sucesso: 'Cancelamento gratuito até 24h' hardcoded — diverge de getCancellationConfig()**

- **Diz hoje:** "Cancelamento gratuito até 24h antes da data de retirada"
- **Deveria dizer:** Ler fullRefundHours de getCancellationConfig() no Server Component e renderizar dinamicamente: "Cancelamento com reembolso integral até {cancel.fullRefundHours}h antes da retirada".
- **Risco:** Expectativa do usuário: se o admin alterar fullRefundHours para 48h ou 12h na configuração da plataforma, este texto continua mostrando '24h' — criando discrepância entre o que o usuário leu ao pagar e a política que efetivamente se aplica ao cancelamento. Risco de contestação se o usuário perder o reembolso integral por confiar no prazo errado mostrado na tela de sucesso.
- Severidade **medio** · categoria `copy-desalinhada` · confirmado por 1 eixo(s): copy-ui

#### `docs/checklist-go-live.md:62` — 🔴 bloqueador

**Checklist de go-live ainda pede 'Decisao: Stripe live × Mercado Pago (A × B)'**

- **Diz hoje:** Linha 62: "🔵 ⬜ Decisão: Stripe live (+ KYC) × Mercado Pago (modelo A gateway × B marketplace) — ver docs/juridico/mercadopago-procedimentos-fundadores.md." E o cabecalho (linha 11): parecer D4 'revisado com o Mercado Pago como PSP'.
- **Deveria dizer:** A decisao esta fechada desde 19/08/2026 (ADR-028: Stripe Connect Express, separate charges and transfers). O item deve virar 'ligar o Stripe Connect em live' com sub-itens concretos (Event Destination + secret, primeira cobranca real, primeiro Transfer real) — e o cabecalho, atualizado para dizer que o parecer D4 precisa ser revalidado para o desenho Connect (o parecer atual valida o desenho MP, nao o Stripe Connect).
- **Risco:** Este e o documento que os fundadores usam para autorizar o go-live. Se ele mantiver Stripe×MP como decisao pendente, o D4 pode ser fechado em cima do parecer errado (MP) enquanto o codigo em producao e Connect — exatamente o gap que a propria ADR-028 marca como 'pendencia juridica nova, nao coberta pelo parecer existente'.
- Severidade **medio** · categoria `copy-desalinhada` · confirmado por 1 eixo(s): docs-adr-backlog

#### `app/ajuda/page.tsx:76`

**Ajuda e Políticas dizem 'cartão de crédito' — ADR-028 confirma que débito também é aceito com payment_method_types: ["card"]**

- **Diz hoje:** Nesta versão o checkout aceita cartão de crédito à vista — sem parcelamento. (ajuda passo 5, linha 76); 'nesta versão aceita cartão de crédito à vista (sem parcelamento)' (ajuda FAQ linha 167); 'o checkout aceita cartão de crédito à vista, sem parcelamento' (politicas §1.7 linha 148)
- **Deveria dizer:** Nesta versão o checkout aceita cartão de débito ou crédito à vista — sem parcelamento.
- **Risco:** Expectativa do usuário / conversão: ADR-028 linha 58 confirma que 'cartão de débito E crédito, à vista' está disponível e que ['card'] cobre os dois. Usuários com apenas cartão de débito podem abandonar o checkout por acreditar que não serão aceitos, reduzindo a taxa de conversão desde o primeiro dia de go-live.
- Severidade **baixo** · categoria `copy-desalinhada` · confirmado por 1 eixo(s): ajuda-politicas

#### `app/reservas/sucesso/page.tsx:172`

**Sucesso + Suporte + Item: 'Suporte disponível 7 dias por semana' contradiz 'segunda a sexta, 09h–17h'**

- **Diz hoje:** "Suporte ShareO disponível 7 dias por semana" (também em app/itens/[id]/page.tsx:627 e app/suporte/page.tsx:25)
- **Deveria dizer:** "Suporte ShareO disponível de segunda a sexta, das 09h às 17h" — alinhado com app/ajuda/page.tsx:308: 'Nosso horário de atendimento é segunda a sexta, das 09h às 17h.'
- **Risco:** Expectativa do usuário e carga de suporte: usuário que tem problema em uma reserva ativa no sábado aciona o 'suporte disponível 7 dias' e não recebe resposta. A decepção é maior do que se nenhum prazo fosse prometido. Três telas diferentes (sucesso, detalhe do item, página de suporte) reforçam a promessa incorreta.
- Severidade **baixo** · categoria `copy-desalinhada` · confirmado por 1 eixo(s): copy-ui

---

## O que NÃO foi apontado, e por quê

O verificador adversarial refutou 5 achados. O código do Mercado Pago em si **não** é dívida: está preservado de propósito (ADR-026 dormente, flag OFF) e não aparece ao usuário — só as menções em texto foram apontadas.

## Ordem sugerida

1. **Decidir** os 8 pontos da Parte 1 — sem isso, corrigir a copy é chutar qual versão vale.
2. **Ajuda do mobile** (Parte 2): maior volume, risco alto, zero ambiguidade — dá para fazer já.
3. **Parte 3**: docs internos e copy menor, sem bloqueio.

Publicação de qualquer texto legal segue **gated pelo D4**.
