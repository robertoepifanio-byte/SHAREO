# Cláusula 14 — Documento de Transparência (rascunho)

> 🟡 **Rascunho. Pendente de revisão do DPO e da advogada. Publicação bloqueada pelo D4** — a
> consulta jurídica que precede qualquer go-live. Redigido pela equipe técnica em 2026-09-03.

**O que é.** A Cláusula 14 das Cláusulas-Padrão Contratuais da ANPD (Resolução CD/ANPD nº 19/2024)
obriga o **exportador** a publicar, no próprio site e em português, um documento com sete
informações sobre a transferência internacional. No Módulo 2 do adendo da Stripe, a cláusula 4.1
marca `(X) Exporter ( ) Importer` — **a obrigação é nossa**. O item 14.2 permite integrá-lo à
Política de Privacidade, desde que destacado e de fácil acesso.

## ⚠️ Duas decisões antes de publicar

**1. Página própria (`/privacidade/transferencia-internacional`) ou seção destacada dentro de
`/privacidade`?** O 14.2 aceita as duas.

**2. Confirmar que NÃO declaramos mecanismo do art. 33.** O texto abaixo informa o fato da
transferência e não afirma qual mecanismo a ampara. A cláusula 14.1 não exige isso, e afirmá-lo
seria incorreto: hoje só a Stripe adota as CPC. Declarar antes de resolver os demais seria publicar
prova contra nós. Ver [`dpa-apuracao-2026-09-03.md`](dpa-apuracao-2026-09-03.md).

## Lacunas a fechar antes de publicar

| # | Lacuna | Quem fecha |
|---|---|---|
| 1 | **Retenção no Sentry** — §4 está com "(a confirmar)" à vista, de propósito | Técnico |
| 2 | **Razão social de Resend e Mapbox** — usamos o nome comercial; Stripe, Vercel e Sentry vieram do adendo | Técnico |
| 3 | ✅ **Fechada em 04/09/2026** — o Google Analytics saiu da tabela §3: nunca esteve ligado, e agora está travado no código | — |
| 4 | Preencher a data de "última atualização" e espelhar no app (`apps/mobile/`) | Dev |

**Rastreabilidade 14.1:** a→§3+§4 · b→§3 · c→§1 · d→§5 · e→§6 · f→§8 · g→§7

**Ao publicar, renderizar a identificação da PJ a partir de `LEGAL_ENTITY` (`lib/legal-config.ts`)
e o canal a partir de `DPO_EMAIL`** — não copiar o texto de §1, que já diverge da constante na
abreviação do logradouro. Há teste que protege as outras cópias; uma nova cópia manual nasce fora
dele.

---
---

# Transferência Internacional dos Seus Dados

**Última atualização:** _(preencher na publicação)_

Parte dos serviços que fazem o ShareO funcionar é operada por empresas sediadas fora do Brasil.
Isso significa que alguns dos seus dados saem do país para serem processados. Esta página explica
o que sai, para onde vai, por quê, por quanto tempo e quais são os seus direitos.

## 1. Quem somos

**SHAREO MARKETPLACE DE INTERMEDIACAO DE NEGOCIOS LTDA**
CNPJ 68.512.556/0001-09
Rua Pais Leme, 215, conj. 1713 — Pinheiros, São Paulo/SP, CEP 05424-150

Somos o **controlador** dos seus dados: nós decidimos o que é coletado e para quê.

**Encarregado pelo Tratamento de Dados Pessoais (DPO):** Raimundo Gomes da Silva —
privacidade@shareo.com.br

## 2. O que fica no Brasil

- o banco de dados da plataforma;
- os documentos e as fotos que você envia;
- as mensagens do chat.

Tudo isso fica armazenado em servidores na região de São Paulo.

## 3. O que é transferido, para onde e por quê

| Quem recebe | País | Para quê | O que recebe |
|---|---|---|---|
| **Stripe, LLC** | Estados Unidos | Processar os pagamentos e os repasses | Os dados da cobrança: quem alugou, quem anunciou, valores e datas. Se você anuncia itens, também seus dados bancários e documentos de identidade |
| **Vercel Inc.** | Estados Unidos | Hospedar e executar a plataforma | Os dados que você envia enquanto usa o site ou o app, no momento em que cada tela funciona |
| **Resend** | Estados Unidos | Enviar os e-mails da plataforma | Seu nome, seu e-mail e o conteúdo da mensagem enviada |
| **Functional Software, Inc. (Sentry)** | Estados Unidos | Monitorar falhas técnicas | Informações técnicas do erro, com filtro que remove dados pessoais |
| **Mapbox, Inc.** | Estados Unidos | Converter endereços em coordenadas no mapa | O endereço informado, sem o seu nome |
| **Upstash** | Estados Unidos | Proteger a plataforma contra uso abusivo | Seu endereço IP e um identificador da sessão |

**Como acontece:** de forma automática, por conexão criptografada, no momento em que você usa cada
recurso. Enviamos só o necessário, e nunca entregamos nossa base de dados a ninguém.

## 4. Por quanto tempo

Cada empresa fica com o dado só pelo tempo necessário:

- **Pagamentos:** enquanto a locação estiver em curso e durante o período de repasse ao
  proprietário. Depois, guardamos o registro da transação por **5 anos**, como exige a lei fiscal,
  sem o seu nome.
- **Hospedagem:** apenas durante o processamento da sua requisição.
- **E-mails:** no momento do envio.
- **Monitoramento de falhas:** _(prazo a confirmar antes da publicação)_.
- **Mapas e proteção contra abuso:** no momento da consulta.

Se você excluir sua conta, seus dados de identificação e os textos escritos por você são apagados
ou anonimizados imediatamente. **Documentos e imagens são removidos definitivamente, sem cópia em
backup.** As cópias de segurança do banco de dados são substituídas em até 7 dias.

## 5. Uso compartilhado

Os dados acima são compartilhados **exclusivamente** para as finalidades da tabela da seção 3.
**Não vendemos seus dados** e não os compartilhamos para publicidade de terceiros.

## 6. De quem é a responsabilidade

**ShareO:** decidimos o que é tratado e para quê, respondemos aos seus pedidos e comunicamos
incidentes de segurança. **Se um prestador falhar, quem responde a você somos nós.**

**As empresas que recebem os dados:** tratam os dados apenas conforme as nossas instruções e o
contrato, e mantêm as medidas de segurança acordadas.

## 7. Transferências subsequentes

Essas empresas podem usar fornecedores próprios — por exemplo, servidores em nuvem — sempre para a
mesma finalidade da seção 3 e com o mesmo dever de proteger seus dados. Nos pagamentos, a Stripe
também precisa informar bancos e órgãos reguladores: isso é exigência da lei.

## 8. Seus direitos

Você pode, a qualquer momento e sem custo:

- confirmar se tratamos seus dados e **acessá-los**;
- **corrigir** dados incompletos, inexatos ou desatualizados;
- pedir **anonimização, bloqueio ou exclusão** de dados desnecessários, excessivos ou tratados fora
  da lei;
- pedir a **portabilidade** dos seus dados;
- saber com quem compartilhamos seus dados;
- **revogar consentimento**, quando o tratamento se basear nele;
- obter **cópia das cláusulas contratuais** que regem estas transferências.

**Como exercer:** pelas configurações da sua conta ou por **privacidade@shareo.com.br**.
Respondemos em até 15 dias.

**Se não concordar com a nossa resposta** — ou se preferir não falar conosco — você pode reclamar
de nós diretamente à **ANPD (Autoridade Nacional de Proteção de Dados)**, em **gov.br/anpd**.
