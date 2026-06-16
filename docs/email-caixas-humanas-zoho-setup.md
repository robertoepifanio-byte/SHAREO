# Implantação das caixas humanas — Zoho Mail Free

> **Decisão dos fundadores (2026-06-15):** as caixas humanas (`suporte@`, `privacidade@`, `seguranca@`) ficam no **Zoho Mail Free (R$0)** no 1º ano; migra para plano pago quando o faturamento justificar.
>
> **O e-mail transacional do app (`noreply@`) continua no Resend, já no ar — nada disso muda.** Este roteiro é só para as caixas que **humanos** leem e respondem.

---

## Visão geral

| | |
|---|---|
| **Provedor** | Zoho Mail — Forever Free Plan |
| **Custo** | R$0 (até 5 usuários, 5 GB/usuário, 1 domínio) |
| **Domínio** | `shareo.com.br` (DNS na GoDaddy) |
| **Caixas a criar** | `suporte@`, `privacidade@`, `seguranca@` (usuários **reais** — cada um envia/recebe como si) |
| **Acesso** | ⚠️ **Só webmail** (`mail.zoho.com`) **+ app mobile Zoho**. Sem IMAP/POP/SMTP no Free (cliente desktop como Outlook só na migração paga). |
| **Anexos** | até 25 MB |

**Por que usuários separados (e não aliases):** o Free dá 5 usuários, então criamos os 3 endereços como caixas reais — cada uma já envia "como" o próprio endereço, sem a limitação de "send-as por alias". Sobram 2 slots para o futuro (`contato@`, etc.).

---

## PARTE 1 — Checklist do cadastro no Zoho (ação dos fundadores)

> Precisa de login no Zoho — feito pelos fundadores. O agente não executa esta parte.

- [ ] **1. Criar a conta.** Acesse **zoho.com/mail** → página de preços (`zoho.com/mail/zohomail-pricing.html`) → role até **"Forever Free Plan"** (fica no rodapé da página) → **Sign Up**.
      *Dica: o Zoho empurra os planos pagos; o gratuito está embaixo de tudo.*
- [ ] **2. Escolher "Sign up with a domain I already own"** (NÃO "comprar um domínio novo").
- [ ] **3. Informar o domínio** `shareo.com.br`.
- [ ] **4. Definir a caixa principal/admin.** Recomendado: **`suporte@shareo.com.br`** como conta administradora (é a de maior uso). Guarde a senha.
- [ ] **5. Verificar a posse do domínio.** O Zoho mostra um valor único de verificação (método **TXT** é o mais fácil). Copie esse valor → adicione na GoDaddy (ver Parte 2, registro **V**) → volte ao Zoho e clique **Verify**.
- [ ] **6. Criar os outros usuários:** `privacidade@shareo.com.br` e `seguranca@shareo.com.br` (cada um com senha). *(o `suporte@` já foi criado no passo 4.)*
- [ ] **7. Configurar o recebimento (MX).** O Zoho exibe os registros MX → adicione na GoDaddy (Parte 2, registros **MX**).
- [ ] **8. Ativar o DKIM.** No **Admin Console do Zoho** → *Email Configuration → DKIM* → adicione um seletor (use **`zmail`**) → o Zoho gera o valor → adicione na GoDaddy (Parte 2, registro **DKIM**) → volte ao Zoho e **Verify**.
- [ ] **9. (Opcional) Inbox único.** Para uma pessoa só atender tudo: nas contas `privacidade@` e `seguranca@`, configurar **encaminhamento → `suporte@`**; e em `suporte@` adicionar as duas como **"Send Mail As"** (o Zoho pede uma confirmação por e-mail de cada). Assim, dá para responder como qualquer uma sem trocar de login.
- [ ] **10. (Opcional) `noreply@`.** Criar `noreply@shareo.com.br` como **alias** de `suporte@` (pega respostas acidentais aos e-mails automáticos do app). Não usa slot de usuário.
- [ ] **11. Testar** (ver Parte 3).

---

## PARTE 2 — Folha de DNS para a GoDaddy

> GoDaddy → **Meus Produtos → Domínios → `shareo.com.br` → DNS / Gerenciar DNS → Adicionar**.
> (Mesma tela onde foi criado o registro `A staging`.)

### ✅ Registros a ADICIONAR

| # | Tipo | Nome / Host | Valor / Aponta para | Prioridade | TTL | Origem |
|---|---|---|---|---|---|---|
| **V** | TXT | `@` | `zoho-verification=zb……zmverify.zoho.com` | — | 1 hora | **copiar do wizard Zoho (passo 5)** |
| **MX1** | MX | `@` | `mx.zoho.com` | **10** | 1 hora | fixo |
| **MX2** | MX | `@` | `mx2.zoho.com` | **20** | 1 hora | fixo |
| **MX3** | MX | `@` | `mx3.zoho.com` | **50** | 1 hora | fixo |
| **SPF** | TXT | `@` | `v=spf1 include:zoho.com ~all` | — | 1 hora | fixo |
| **DKIM** | TXT | `zmail._domainkey` | `v=DKIM1; k=rsa; p=……` | — | 1 hora | **copiar do painel DKIM do Zoho (passo 8)** |

**Observações importantes:**
- Use **exatamente** os MX que o wizard do Zoho mostrar (podem variar por região; a região `zoho.com` usa os acima).
- **Só pode existir 1 registro SPF** (TXT começando com `v=spf1`) na raiz. A raiz hoje está **vazia de SPF**, então é só adicionar o do Zoho. Se já houvesse um, teria que **mesclar** os `include:` num só.
- O `zmail` é o seletor padrão do DKIM no Zoho; se você usar outro seletor, o Nome do registro muda para `<seletor>._domainkey`.

### 🟰 DMARC — já existe, **manter**
- O `_dmarc` já está como `v=DMARC1; p=quarantine; …`. **Deixe como está.**
- *(Opcional, durante a validação:* trocar temporariamente para `p=none`, conferir que tudo passa, e voltar para `p=quarantine`.)*

### ⛔ Registros a NÃO TOCAR (quebrariam o que já funciona)

| Registro | Para que serve | Não mexer porque |
|---|---|---|
| `resend._domainkey` (TXT) | DKIM do **Resend** | é o que assina o e-mail do app |
| `send` (MX) | Return-Path do **Resend** | bounce/entrega do app |
| `send` (TXT) | SPF do **Resend** (`include:amazonses.com`) | o SPF do Zoho na raiz **não conflita** com este — são domínios diferentes (`shareo.com.br` vs `send.shareo.com.br`) |
| `staging` (A → `76.76.21.21`) | **staging no Vercel** | derruba o site de staging |
| `@` (A → "WebsiteBuilder Site") | site placeholder da GoDaddy | é **web**, não e-mail; convive com o MX sem problema |

> **Por que o SPF do Zoho na raiz não atrapalha o Resend:** o app envia com `From: noreply@shareo.com.br`, mas o Resend valida pelo **DKIM próprio** (`resend._domainkey`) e usa **Return-Path no subdomínio `send.shareo.com.br`** (SPF dele fica lá). O SPF da raiz que adicionamos vale só para o que sai pelo Zoho (`@shareo.com.br`). Os dois passam no DMARC de forma independente.

---

## PARTE 3 — Validação (depois da propagação do DNS)

1. **Propagação:** alguns minutos a ~1 h. Conferir MX/TXT em [mxtoolbox.com](https://mxtoolbox.com/) (busca `MX:shareo.com.br`, `TXT:shareo.com.br`).
2. **Receber:** mande um e-mail de fora (ex.: seu Gmail) para `suporte@shareo.com.br` → deve cair na webmail do Zoho.
3. **Enviar:** responda pela webmail do Zoho → deve chegar na **caixa de entrada** do destinatário (não no spam).
4. **Autenticação:** envie de `suporte@shareo.com.br` para **[mail-tester.com](https://www.mail-tester.com/)** → meta **SPF: pass, DKIM: pass, DMARC: pass** (nota ~10/10).
5. Repita o teste de envio com `privacidade@` e `seguranca@`.

---

## Notas

- **Caixas que o produto exige** (motivo de cada uma):
  - `suporte@` — atendimento geral (ajuda, termos, políticas).
  - `privacidade@` — LGPD: exclusão de dados / opt-out da lista de fundadores. **Canal legalmente necessário.**
  - `seguranca@` — contato oficial do `security.txt` (reporte de vulnerabilidades).
- `admin@` / `financeiro@` / `operacional@` são **logins do painel admin do app**, não caixas de e-mail — não precisam ser criados no Zoho (a menos que se queira que e-mails automáticos do app cheguem a um humano).
- **Migração futura (quando faturar):** subir para um plano pago do Zoho (ou outro provedor) destrava **IMAP/POP/SMTP** (Outlook/Gmail desktop) e mais espaço. O domínio e os registros DNS continuam os mesmos — troca-se só o plano.
- Fonte dos limites do Free (consultado 2026-06-15): documentação e comunidade do Zoho Mail (Forever Free Plan: 5 usuários, 5 GB/usuário, 1 domínio, sem IMAP/POP/SMTP).
