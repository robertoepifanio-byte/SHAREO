> ⚫ **DOCUMENTO HISTÓRICO — 2026-08-24.** O fundador decidiu que o **Mercado Pago não será utilizado**; o PSP é a Stripe ([`ADR-028`](../adr/ADR-028-reversao-stripe-connect.md)). Este roteiro não deve ser executado.

# Roteiro de Teste — Pagamento com Mercado Pago (Staging)

> **Ambiente:** `https://staging.shareo.com.br` — é teste, **não é produção**. Nenhum dinheiro real é movimentado.
> **Tempo:** ~8 minutos.

---

## 🔴 A ÚNICA REGRA QUE IMPORTA

> # NUNCA faça login no Mercado Pago durante o teste.
> Quando chegar na tela do Mercado Pago, **pague como convidado** (sem entrar em conta nenhuma).
> Se aparecer um botão **"Entrar"**, **ignore** — procure o formulário de cartão ou "Continuar como convidado".

**Por quê?** O ambiente de teste do Mercado Pago trava se você logar em qualquer conta (seja a sua de verdade, seja uma de teste). Pagando como convidado, funciona de primeira.

Para garantir que não há login ativo: **faça tudo em uma janela anônima** (Ctrl+Shift+N no Chrome / Ctrl+Shift+P no Edge).

---

## 🔑 O que você vai usar

**1) Sua conta de teste no Shareo (para alugar):**

| E-mail | Senha |
|---|---|
| `teste_pf_01@demo.shareo.com.br` | `Teste@2026` |

> Se houver mais de um tester, cada um usa um número diferente: `teste_pf_02`, `teste_pf_03`… (mesma senha).

**2) O item de teste (já pronto para pagar com Mercado Pago):**

🔗 **`https://staging.shareo.com.br/itens/cmqvvv1wf000tkz04xwt8cbhh`**

**3) O cartão de teste (aprova sozinho):**

| Campo | Valor |
|---|---|
| Número | `5031 4332 1540 6351` |
| Validade | `11/30` |
| Código de segurança (CVV) | `123` |
| **Nome no cartão** | **`APRO`** ← exatamente assim, em maiúsculas. É isso que faz aprovar. |
| CPF | `123.456.789-09` |
| E-mail (se pedir) | qualquer um, ex.: `tester@teste.com` |

---

## ▶️ Passo a passo

### 1. Abrir em janela anônima e entrar
- Abra uma **janela anônima**.
- Vá em `https://staging.shareo.com.br` e faça login com `teste_pf_01@demo.shareo.com.br` / `Teste@2026`.

### 2. Alugar o item
- Abra o **item de teste** (link acima).
- Escolha as datas (ex.: 2 dias) e clique em **Alugar**.
- Pronto: a reserva foi criada e está **aguardando confirmação do dono**.

### 3. Aguardar a confirmação do dono
- O dono precisa **confirmar** a reserva antes do pagamento.
- 👉 **Avise o responsável pelo teste** para confirmar a sua reserva (ele faz isso pela conta do dono).
- Quando confirmada, sua reserva muda para **"Confirmada — aguardando pagamento"**.

### 4. Pagar
- Vá em **Atividade → Minhas reservas** e abra a sua reserva.
- Confira os valores (Total, Taxa Shareo 15%, valor do dono).
- Clique no botão verde **"Pagar com Mercado Pago"**.

### 5. Na tela do Mercado Pago — PAGUE COMO CONVIDADO
- ⚠️ **Não clique em "Entrar". Não digite e-mail/senha de conta.**
- Escolha **Cartão de crédito**.
- Preencha com o **cartão de teste** (tabela acima). Capriche no nome **`APRO`**.
- Confirme o pagamento.
- Deve aparecer **"Pagamento aprovado"** e você volta para o Shareo.

### 6. Conferir que deu certo ✅
Na sua reserva, confirme:
- Status: **Pago**
- Apareceu um **código de retirada** (6 números).

Se chegou aqui com tudo isso → **teste aprovado!** 🎉

---

## 🆘 Se algo der errado

**Apareceu "Uma das partes é de teste" ou pediu um código por e-mail:**
Isso só acontece se houve login no Mercado Pago. Faça assim:
1. Feche **todas** as abas do Mercado Pago.
2. Abra uma **nova janela anônima** e refaça do passo 1.
3. Na tela do MP, **não logue** — pague **como convidado**.

**"O locador ainda não conectou uma conta":**
Você abriu outro item. Use **somente o item de teste do link** deste guia.

**O botão "Pagar com Mercado Pago" não aparece:**
A reserva ainda não foi confirmada pelo dono (passo 3). Avise o responsável.

---

## 📝 O que anotar e reportar

- [ ] Consegui alugar? (sim/não)
- [ ] O dono confirmou e o botão "Pagar com Mercado Pago" apareceu? (sim/não)
- [ ] Os valores estavam certos (total, taxa 15%, valor do dono)? (sim/não)
- [ ] Paguei **como convidado** com o cartão de teste? (sim/não)
- [ ] Deu **"Pagamento aprovado"**? (sim/não — se não, qual mensagem? print)
- [ ] A reserva ficou **Paga** e mostrou o **código de retirada**? (sim/não)

📎 **Tire print de qualquer erro.**
**Enviar para:** WhatsApp **(84) 99662-2346** (com prints, se houver erro).

---

_Teste em ambiente de homologação (staging). Atualizado em 2026-06-30. Produção ainda não liberada._
