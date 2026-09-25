# Roteiro — smoke de 15 passos do dia D0

**Criado em:** 24/09/2026 (D-7), sobre o commit `839e7176` · Base: a jornada do 1º usuário do `docs/checklist-go-live-2026-10-01.md` (Produto, item 22 do Anexo, e itens 1, 2, 6, 10, 12 e 19) · Quando: **D-2 (29/09) completo**; **D0 (01/10) às 08h BRT, passos 1 a 4** (regra do próprio item 22).

> **Estado: NÃO ENSAIADO.** Este roteiro nunca foi executado em produção (o E2E de CI roda só no staging e usa rotas de teste que em produção respondem 404). Toda expectativa abaixo vem de leitura de código ou do checklist; **o que a produção de fato responde só o D-2 mostra.**
>
> **Sobre a origem dos passos.** O texto do item 22 do checklist está **cortado na fonte** (termina em "CNPJ e…"): só os passos 1 e 2 estão completos lá. Os passos 3 a 15 foram **derivados por mim do código** (rotas e guardas citadas em cada passo) e da jornada pedida (visitar, cadastrar, verificar e-mail, anunciar, reservar, pagar, devolver, avaliar); por isso são **NÃO ENSAIADO** até o D-2. Confira-os contra o checklist quando alguém completar aquele item.
>
> Referências como "Prod 2", "Seg 6", "Infra 4" e "Pag 4" são itens do Anexo do `docs/checklist-go-live-2026-10-01.md` (Produto, Segurança, Infra e Pagamentos).
>
> Este roteiro não repete as sondas de saúde (estão em `docs/checklist-dia-d0.md`, P1 a P6), nem o roteiro de dinheiro em teste (`docs/guias/roteiro-teste-stripe-ponta-a-ponta.md`), nem o plano de reverter (`docs/runbook-rollback-deploy.md`).

---

## 0. Regras do smoke

1. **Tudo que o smoke cria leva `[TESTE D0]`** no nome, no título, na descrição e na observação da reserva. É o único marcador que permite achar e apagar depois (seção 3). Nome de conta: mínimo 3 caracteres, então `[TESTE D0] Locador` serve.
2. **Dois atores mais um observador.** **A** = locador (anuncia e confirma). **B** = locatário (reserva, paga e devolve). **Admin** = superadmin de produção, só observando (`/admin/reservas`, `/admin/financeiro/repasses`).
3. **Uma pessoa da equipe por conta, com CPF válido dela.** O cadastro de pessoa física exige CPF válido (`RegisterSchema`) e `cpfHash` é único: o CPF fica preso à conta de teste até ela ser excluída. Quem for abrir conta real depois deve excluir a de teste antes. **Não escreva e-mails, CPFs nem telefones neste arquivo: o repositório é público.**
4. **E-mails em provedores diferentes** (Gmail, Outlook, iCloud) para provar entrega e cabeçalhos (item 12 do Produto). Cada cadastro gasta cota do Resend (plano Free: 100/dia, checklist Infra 4).
5. **Nunca use `/api/test/mark-booking-paid` para "passar" o passo 11.** Em produção ela deve responder **404** (kill-switch `E2E_BYPASS_DISABLED`). Se responder outra coisa, pare: é achado de segurança.
6. **Nunca telefone real de terceiro no checkout.** A Stripe Link intercepta o pagamento; use "Pagar sem a Link". Já houve reserva real acidental (`docs/guias/roteiro-teste-stripe-ponta-a-ponta.md`).
7. **Confira o ambiente antes de qualquer consulta ao banco:** produção é o ref que começa com `jdxd…`; staging é `zythy…`. Nenhum script de staging roda contra produção.
8. **Registre o estado da cobrança antes do passo 1** (campo da seção 4). O passo 11 muda conforme ele.

Marcadores usados abaixo: **[CÓDIGO]** arquivo lido neste commit; **[CHECKLIST]** registro do checklist principal, não refeito.

---

## 1. Os 15 passos

### Bloco 1: o site e o cadastro (sempre)

**Passo 1. Saúde (técnico).**
Sondas **P1 a P6 verdes** conforme a seção 3 de `docs/checklist-dia-d0.md` (o esperado de cada uma mora lá; se acabaram de rodar no mesmo bloco, não as repita) e `GET /api/stats`.
*Esperado (o que este passo acrescenta):* `/api/stats` traz `data.itemCount` = 0 (antes do smoke; conta só itens `AVAILABLE`, aprovados e não excluídos, e o endpoint guarda cache de 60 s) [CÓDIGO: `app/api/stats/route.ts`; CHECKLIST].
*Se falhar:* categorias ≠ 6 (P2) = ninguém consegue anunciar (Seg 4 do checklist). `health` ≠ 200 (P1) = `docs/runbook-rollback-deploy.md`, árvore A.

**Passo 2. Visitar em 375 px (Roberto).**
Abra `/`, `/termos`, `/politicas`, `/privacidade`, `/ajuda`, `/ganhar`, `/itens` em 375 px. Confira também `/robots.txt`.
*Esperado:* **sem** o selo "Pré-lançamento", **sem** a FAQ "Ainda não" e **sem** o depoimento fictício de `/ganhar`; razão social e CNPJ nas três páginas legais; `robots.txt` = `Disallow: /` enquanto o `noindex` estiver ligado (o `flags.noindex` do P1 tem de dizer o mesmo).
*O que ainda reprova hoje* está nos itens Prod 2 e 6 do checklist principal (D-4 e D-2), que são quem mantém essa lista. O selo "Pré-lançamento" também está em `components/home/PrelaunchBadge.tsx` e `app/pilotos/page.tsx`, que o Prod 6 não cita.

**Passo 3. Cadastrar o locador A (Roberto ou quem for A).**
Em `/cadastro`: nome `[TESTE D0] Locador`, e-mail da equipe, senha com 8+ caracteres, uma maiúscula e um número, CPF válido, cidade e UF, aceite dos termos. Ao enviar, o site leva a `/bem-vindo`.
*Esperado:* conta criada; o servidor dispara o e-mail de verificação (`app/api/auth/register/route.ts`).
*Guarda:* o cadastro tem limite de 5 por minuto por IP; repetir rápido pode dar 429, sobretudo se o Upstash estiver degradado (`flags.upstash` do P1).

**Passo 4. Verificar o e-mail de A.**
*Esperado:* o e-mail chega na **caixa de entrada** (não no spam), em poucos minutos; cabeçalho (Gmail: "Mostrar original") com **SPF, DKIM e DMARC = pass**; o link do botão começa com `https://app.shareo.com.br` e **não** com `shareo-rouge.vercel.app` (o fallback de `lib/app-url.ts` cai no staging quando `AUTH_URL` falta). Ao clicar: `/verify-email?success=1`, "E-mail confirmado!".
*Se o link expirou:* a tela diz "Link expirado" e leva a `/perfil/seguranca` para reenviar.
*Repita* com um provedor diferente para o B (passo 8): Gmail, Outlook e iCloud, um por conta ou por rodada.

**Passo 5. Completar A: cadastro, endereço e recebimento.**
- Complete o cadastro se o site pedir (`/cadastro/completar`). **Sem cadastro completo A não anuncia** (`app/api/items/route.ts` checa `profileCompletedAt`).
- Cadastre o **endereço** em `/perfil/endereco`. Sem ele, o passo 10 devolve 422 `OWNER_ADDRESS_REQUIRED`.
- Cadastre a **conta de recebimento** em `/perfil/recebimentos` (PIX manual, ou Connect se `stripeConnectEnabled` e a chave Stripe estiverem ativos). **Sem ela, o passo 14 não cria repasse** e só há um `console.warn` (`lib/payout.ts`).

### Bloco 2: anunciar e achar

**Passo 6. A anuncia um item.**
Em `/itens/novo`: título `[TESTE D0] Furadeira de teste` (5+ caracteres), descrição com `[TESTE D0]` (20+), **uma das 6 categorias**, preço **R$ 1,00 por dia** (o mínimo aceito: 100 centavos, `lib/validations/items.ts`), valor estimado do item (obrigatório; teto de R$ 1.000, `MAX_ITEM_VALUE_CENTS`), endereço com latitude e longitude, uma foto.
*Esperado:* o item aparece em `/meus-anuncios` e em `/itens`.
*Se a categoria não abre no formulário:* o seed de categorias não rodou em produção (Prod 1).

**Passo 7. Achar no mapa e ver o item.**
Busque por `[TESTE D0]` em `/itens` e abra `/itens?view=map`.
*Esperado:* o item aparece no resultado e o pin aparece no mapa (restrição de URL do token Mapbox, Infra 18: se a restrição não inclui `app.shareo.com.br`, o mapa fica em branco). A página do item mostra a calculadora (`_PriceCalc`) com 1 diária = R$ 1,00.

**Passo 8. Cadastrar e verificar o locatário B.**
Repita os passos 3 a 5 com outra pessoa: `[TESTE D0] Locatário`, CPF distinto, outro provedor de e-mail. B **não precisa** de endereço de retirada nem de conta de recebimento.
*Teste negativo (guarda que morde):* **antes** de B verificar o e-mail, tente reservar. Esperado: 403 `EMAIL_NOT_VERIFIED`, "Confirme seu e-mail antes de realizar uma reserva." Depois de verificar, sem completar o cadastro: 403 `REGISTRATION_INCOMPLETE`, "Complete seu cadastro para alugar." [CÓDIGO: `app/api/bookings/route.ts`].

### Bloco 3: reservar

**Passo 9. B pede a reserva.**
Na página do item, 1 diária. Preencha a observação com `[TESTE D0]`.
*Esperado:* reserva `PENDING`; **A recebe uma notificação dentro do app** (`BOOKING_REQUEST`), mas **não recebe e-mail** de nova solicitação (lacuna conhecida, Prod 10). Confirme que o aviso apareceu no painel de A.

**Passo 10. A confirma.**
*Esperado:* reserva `CONFIRMED`; B passa a ver "Pagar agora". O código de retirada de 6 dígitos (`pickupToken`) é gerado na confirmação, mas **B só o vê depois de `PAID`** (`app/reservas/[id]/page.tsx`). Sem endereço de A, a confirmação dá 422 `OWNER_ADDRESS_REQUIRED` (passo 5).
*O contrato eletrônico* só entra se `rentalContractAcceptanceEnabled` estiver ligado (em produção está desligado, [CHECKLIST]).

### Bloco 4: pagar (depende do gate de cobrança)

**Passo 11. B paga, conforme o estado da cobrança.**

> **O gate de cobrança existe desde `b17c1308` (#510)** [CÓDIGO]: com chave Stripe **live**, `POST /api/payments/checkout` só abre com `PlatformConfig.billingEnabled = "true"` (ausente = fechada); com `sk_test_` fica sempre aberto. O checkout também recusa (409 `OWNER_NOT_READY`) quando o proprietário não tem Connect `ACTIVE` nem PIX cadastrado. Nada disso foi exercitado em produção.

| Estado (campo da seção 4) | Como se reconhece | O que fazer e o que esperar |
|---|---|---|
| **Fechada** (chave live com `billingEnabled` ausente ou diferente de `"true"`, ou sem `STRIPE_SECRET_KEY`) | Clicar "Pagar agora" não abre a Stripe. | Pelo código, o checkout devolve **403 `BILLING_CLOSED`** ("Os pagamentos ainda não estão abertos. Nenhuma cobrança foi feita…"); NÃO ENSAIADO em produção. **Registre o que B vê na tela.** O botão "Pagar agora" continua visível com a cobrança fechada e mostra essa mensagem; se isso for inaceitável, é achado de produto (checklist, decisão 1). Se A não tiver recebimento, a resposta é 409 `OWNER_NOT_READY`. **Passos 12 a 15 não são executáveis** (retirada exige `PAID`: 402 `PAYMENT_REQUIRED`). Feche o ciclo cancelando a reserva (seção 3). |
| **Teste** (`sk_test_` em produção) | A sessão de checkout tem prefixo `cs_test_`. | Cartão `4242 4242 4242 4242`, validade futura, CVC qualquer, **por fora da Link**. Esperado: volta em `/reservas/sucesso`; a reserva vira `PAID` **pelo webhook**, não pela tela. Confira `paymentStatus`, `paidAt`, o código de retirada (agora visível para B) e `platformFeeAmount + ownerNetAmount = totalPrice`. |
| **Live** (`sk_live_`) | A sessão tem prefixo `cs_live_`. | **Só com instrução explícita e separada do Roberto** (CLAUDE.md; checklist, seção 6, D0), e só depois de ele ligar `billingEnabled` (sem isso o checkout dá 403 `BILLING_CLOSED`). Cobrança **real** de R$ 1,00, cartão real de pessoa da equipe. Comissão de 15% sobre 100 centavos = R$ 0,15 e R$ 0,85 ao proprietário (`calcSplit`); a tarifa da Stripe supera a comissão nesse valor, aceito de antemão (checklist, decisão 6). |

*Sempre:* `paymentStatus = PAID` só vale se veio do webhook. Em qualquer estado pago, confira a linha de `checkout.session.completed` no Dashboard da Stripe correspondente (teste ou live).

**Passo 12. Retirada com código (só se o passo 11 deu `PAID`).**
B mostra o código de 6 dígitos da reserva; A o informa na reserva.
*Esperado:* `ACTIVE`. Sem `PAID`, 402; sem código, 400 `TOKEN_REQUIRED`; código repetido, 409 `TOKEN_ALREADY_USED` [CÓDIGO: `mark_active`].

### Bloco 5: devolver, repassar e avaliar

**Passo 13. Devolução (só se o passo 12 deu `ACTIVE`).**
*Teste negativo primeiro:* B tenta iniciar a devolução **sem foto**. Esperado: a API responde 422 `RETURN_PHOTO_REQUIRED`, "Envie ao menos uma foto do estado do item antes de iniciar a devolução." (a tela pode barrar antes, com aviso próprio; a trava de verdade é a da API, `app/api/bookings/[id]/route.ts`). Depois B anexa uma foto do estado do item e inicia a devolução; A confirma.
*Esperado:* `COMPLETED`.

**Passo 14. Repasse ao proprietário (Admin).**
Em `/admin/financeiro/repasses`, procure o `Payout` da reserva `[TESTE D0]`.
*Esperado:* um `Payout` `PENDING` de **85 centavos** (R$ 0,85) com `eligibleAfter` = agora + `payoutWindowDays` (3 dias em produção, `/api/platform-config/public`). Se A **não** tinha conta de recebimento, o passo 11 já deve ter dado 409 `OWNER_NOT_READY` e o pagamento nem começa: registre como achado (Pag 4 do checklist). Se A tem só PIX (sem Connect `ACTIVE`), o `Payout` vai para `PROCESSING` quando o cron rodar e o financeiro paga na mão.
*Não aprove nem rejeite* esse `Payout` como se um PIX tivesse saído: "aprovar" grava `COMPLETED` sem provar que o dinheiro foi (`app/api/admin/payouts/[id]/route.ts`). Se A tiver Connect `ACTIVE` em live, o cron de 13:00 UTC do dia em que ele ficar elegível fará **um Transfer real**; avise o financeiro (seção 3).

**Passo 15. Avaliar.**
B avalia o **item** e o **proprietário**; A avalia o **locatário**. Só é possível em reserva `RETURNED` ou `COMPLETED` (422 `BOOKING_NOT_REVIEWABLE` antes) e cada tipo uma vez por autor [CÓDIGO: `app/api/bookings/[id]/reviews/route.ts`].
*Esperado:* as avaliações aparecem no perfil e na página do item.

---

## 2. Como ler o resultado

- **Passos 1 a 10 valem sempre.** Um deles vermelho é impeditivo para abrir (o funil "visitar, cadastrar, anunciar, reservar" está quebrado).
- **Passo 11** define o resto. Com a cobrança **fechada**, os passos 12 a 15 ficam "não executado (cobrança fechada)", **não** "aprovado". O smoke completo só se prova com cobrança em teste ou live.
- **D0 às 08h BRT:** repita os passos 1 e 2 e, com uma conta nova `[TESTE D0]`, os passos 3 e 4, para provar o e-mail no dia. Apague a conta em seguida.

---

## 3. Como apagar os dados do smoke

**Não existe script de limpeza para a produção**, e não deve ser improvisado um no dia. `scripts/limpar-lixo-teste-staging.ts` é do staging (escopos "Devolução E2E" e "ADR-028 TESTE"; não conhece `[TESTE D0]`) e **nunca** deve apontar para a produção (checklist, Prod 21). Ele é, porém, o **padrão a estender** num PR próprio, com revisão e trava de ref (`jdxd…` x `zythy…`): marcador na `borrowerNote`, modo seco por padrão e recusa se houver dependente financeiro; um marcador `[TESTE D0]` ali daria contagem e simulação antes de qualquer remoção. Até lá, o que dá para fazer é o que os próprios usuários fazem:

| O quê | Como | O que **permanece** |
|---|---|---|
| **Anúncio** `[TESTE D0]` | A, em `/meus-anuncios`, exclui o anúncio (`DELETE /api/items/{id}`). | Exclusão **lógica**: a linha fica com `deletedAt` e `status = DELETED`. Some da vitrine; `/api/stats` volta a `itemCount = 0` em até 60 s. Fotos continuam em `item-images`. |
| **Reserva** ainda `PENDING` ou `CONFIRMED` e **não paga** | Cancelar pela tela (`cancel`; `refundAmount` = 0 sem pagamento). | A reserva fica `CANCELLED` **e continua entrando no export mensal** de intermediações (`fetchFinancialRows` pega `COMPLETED` e `CANCELLED`). |
| **Reserva** `PAID`, `COMPLETED` ou com estorno | **Não há endpoint** para apagar: é registro de negócio. Se houver `PlatformTransaction` ou `Payout`, vale a retenção fiscal de 5 anos (ADR-017). | Fica. **Avise o financeiro e a Contabilizei** antes de 01/11: a reserva de outubro entra no relatório mensal (`cron/intermediation-report`, 1º dia do mês); o `[TESTE D0]` no título do item é o que a identifica. |
| **Contas A e B** | Cada dono, em `/perfil/dados`, usa "Excluir minha conta" (`DELETE /api/users/me`). Bloqueia com 409 `ACTIVE_BOOKING` se houver locação em andamento; cancela `PENDING` e `CONFIRMED`; zera `cpfHash` (o CPF fica livre). | A linha do usuário fica anonimizada (nome "Usuário removido", e-mail `removed-<id>@shareo.invalid`, `deletedAt`). Registros financeiros ficam (ADR-017). Avaliações perdem o comentário, mas a nota fica. |
| **Documento e selfie do KYC** (se o smoke enviou) | **A exclusão da conta erra o prefixo** e não os apaga (`id-docs.list(userId)` em vez de `id-docs/id-verification/<userId>`; Seg 6 do checklist). Apague à mão no Storage do Supabase de **produção**, em `id-docs/id-verification/<userId>/`, **enquanto esse item não estiver corrigido**. | Confira a listagem antes e depois. |
| **Fotos de reserva** | Nenhum caminho pela aplicação. Se quiser, remova por prefixo no Storage (`booking-photos`). | Ficam por padrão. |
| **E-mails enviados, eventos Stripe, notificações, logs** | Não se apagam. | Registre os IDs na ficha da seção 4. |

**Conferência final:** `GET /api/stats` com `itemCount` = 0 (espere 60 s); `/admin/reservas` sem reserva `[TESTE D0]` em andamento; anotar na ficha quais registros ficaram (reserva paga, `Payout`).

---

## 4. Ficha do smoke (preencher no dia)

**Data e hora:** ______ · **Commit em produção:** ______ · **Quem executou:** ______

**Estado da cobrança no início:** ( ) Fechada ( ) Teste ( ) Live · Chave verificada por: ______

| Passo | Resultado (OK / FALHOU / não executado) | Evidência (print, ID da reserva, sessão Stripe) | Observação |
|---|---|---|---|
| 1 Saúde |  |  |  |
| 2 Visitar em 375 px |  |  |  |
| 3 Cadastrar A |  |  |  |
| 4 Verificar e-mail A |  |  |  |
| 5 Completar A |  |  |  |
| 6 Anunciar |  |  |  |
| 7 Achar no mapa |  |  |  |
| 8 Cadastrar e verificar B |  |  |  |
| 9 Reservar |  |  |  |
| 10 Confirmar |  |  |  |
| 11 Pagar |  |  |  |
| 12 Retirada |  |  |  |
| 13 Devolução |  |  |  |
| 14 Repasse |  |  |  |
| 15 Avaliar |  |  |  |

**Registros que ficaram em produção (seção 3):** ______

**Achados novos** (vira item no checklist principal): ______
