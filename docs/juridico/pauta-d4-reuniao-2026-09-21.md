# D4 — o que ainda impede abrir a ShareO ao público

**Pauta da reunião com Raimundo e a advogada** · 21 de setembro de 2026
**Preparado por:** Roberto Epifânio, com apoio da equipe técnica

---

## 1. Em uma página

**O que é o D4.** É a consulta jurídica que decide se a ShareO pode receber pagamentos reais de usuários. Enquanto ela não fechar, a plataforma segue em teste: nenhum go-live público.

**Onde estamos.** O parecer jurídico formal chegou em 30/06/2026. Das quatro condições que ele impôs para o go-live, **três estão cumpridas** e **uma segue aberta**: o checklist de conformidade precisa estar 100%. Restam três frentes, mais uma questão nova:

| # | Frente | Em uma frase | Quem decide |
|---|---|---|---|
| A | **Ressalva do PSP** | O parecer analisou o Mercado Pago. Hoje o processador de pagamentos é a Stripe, e o dinheiro passa pela conta da ShareO antes do repasse. | Advogada |
| B | **Transferência internacional de dados** (Art. 33 da LGPD) | O prazo para adotar as cláusulas-padrão da ANPD venceu em 23/08/2025. Só 1 de 7 fornecedores está regular. | Advogada |
| C | **Segurança do painel de administração** | Não existe verificação em duas etapas (MFA). Há um superadministrador em produção protegido só por senha. | Fundadores (decisão técnica) |
| D | **Encarregado (DPO) e RIPD** | Raimundo está nomeado, mas o relatório de impacto ainda não foi validado nem assinado. | Raimundo + advogada |
| E | **Novo, de 15/09: Google Tag Manager** | Foi instalado na landing `shareo.com.br`. A Política de Privacidade ainda não o menciona. | Advogada + fundadores |

**O que pedimos hoje:** respostas às perguntas da seção 7 e uma decisão sobre a ordem em que fechamos as frentes.

---

## 2. As quatro condições do parecer

| # | Condição | Estado | Observação |
|---|---|---|---|
| 1 | Parecer jurídico formal | ✅ Recebido, **com ressalva** | Foi escrito com o Mercado Pago como processador. Ver frente A. |
| 2 | Contrato com o processador de pagamentos + conta em nome da empresa (PJ) | ✅ Cumprida em 24/08/2026 | Conta na Stripe no CNPJ 68.512.556/0001-09, o mesmo do Comprovante de Situação Cadastral. |
| 3 | Termos de Uso e Política de Privacidade revisados | ✅ Conteúdo aprovado | Só serão publicados no go-live. |
| 4 | Checklist de conformidade 100% cumprido | 🔴 **Aberta** | Faltam C2 (fornecedores estrangeiros) e C3 (RIPD/DPO), além da ressalva do processador. |

---

## 3. Frente A — Ressalva do processador de pagamentos (Lei 12.865/2013)

### Em linguagem simples

O parecer disse que a ShareO **não precisa ser autorizada pelo Banco Central** como instituição de pagamento. O motivo era que a ShareO **não guardaria o dinheiro dos usuários**: o pagamento iria direto para o processador, que dividiria e repassaria ao proprietário.

Em agosto, a decisão mudou: o Mercado Pago foi descartado e a **Stripe** virou o processador (ADR-028). Ao conferir como a Stripe foi implementada, encontramos que o desenho é **diferente do que o parecer analisou**:

- o valor **cheio** da locação entra no **saldo da ShareO dentro da Stripe**;
- fica lá por alguns dias, até o repasse ao proprietário (liberado N dias após a devolução);
- só então sai a transferência de **85%** ao proprietário; os 15% ficam com a ShareO.

Não foi acidente: reter o valor até a devolução é o que permite mediar uma disputa. Mas é **factualmente diferente** do arranjo que o parecer validou.

### Para a advogada

O parecer de 30/06 afastou o enquadramento da Lei 12.865/2013 sobre a premissa de que a plataforma *não retém nem custodia* o valor devido ao locador. A implementação com a Stripe usa o modelo *separate charges and transfers*: a cobrança se completa na conta da plataforma e o *Transfer* ao locador ocorre depois, em cron de repasse. A taxa de 15% não é cobrada por `application_fee`; transfere-se apenas a parcela do locador, e o restante permanece.

**Pergunta central:** com o valor transitando pelo saldo da ShareO na Stripe, a conclusão de 30/06 se mantém?

**Por que é o ponto mais pesado:** é o único em que uma resposta negativa **mexeria no produto**, não só nos textos. Uma alternativa técnica seria migrar para *destination charge*, em que o valor vai direto à conta do locador. Isso perderia a retenção durante a disputa, hoje essencial ao produto.

### O que continua de pé

- A terceirização do arranjo a um processador licenciado, que opera o fluxo e faz a verificação de identidade (KYC).
- Taxa de 15% destacada nos Termos e na interface, sem caução, teto de R$ 500 por transação, retenção fiscal de 5 anos.

### Duas perguntas conexas

- **Fiscal:** a Contabilizei respondeu em 10/09 (chamado 29468012). Regime: **Simples Nacional**. Os 85% repassados **não são receita** da ShareO. A nota fiscal é emitida contra o proprietário, sem retenção de IR/INSS, e o DIMOB não se aplica. Pergunta à advogada: alguma ressalva a essa conclusão dado que o valor cheio passa pela conta da plataforma?
- **Prevenção à lavagem de dinheiro (Lei 9.613/1998):** a resposta B4 disse que a ShareO não é sujeito obrigado porque *o processador assume KYC/KYB/monitoramento*. Essa conclusão depende de o processador ser instituição autorizada pelo Banco Central, o que o Mercado Pago era. **A Stripe é estrangeira.** A conclusão se mantém?

---

## 4. Frente B — Transferência internacional de dados (Art. 33 da LGPD)

### Em linguagem simples

A ShareO usa serviços de empresas estrangeiras (hospedagem, e-mail, mapas, pagamentos). Ao usá-los, dados de usuários brasileiros **saem do Brasil**. A LGPD só permite isso com uma base legal. A mais comum é um contrato com **cláusulas-padrão aprovadas pela ANPD**.

Em 23/08/2024 a ANPD publicou essas cláusulas (Resolução CD/ANPD nº 19/2024), e o prazo para adotá-las **encerrou em 23/08/2025**. Ou seja: **estamos fora do prazo há mais de um ano.** Não é exclusividade da ShareO, mas é uma exposição real.

Não dá para "assinar" as cláusulas: adota-se o texto **na íntegra e sem alteração**. Verificamos quem já o fez.

### Situação dos sete fornecedores

| Fornecedor | O que faz na ShareO | Adota as cláusulas da ANPD? |
|---|---|---|
| **Stripe** | Pagamentos e repasses, inclusive dados bancários e identidade do proprietário | ✅ **Sim.** Adendo de 18/11/2025, Módulos 1 e 2. **Nada a assinar.** |
| Vercel | Hospedagem do site | ❌ Não publica (só cláusulas europeias) |
| Resend | Envio de e-mails | ❌ Não publica |
| Sentry | Monitoramento de erros (30 dias de retenção) | ❌ Não publica |
| Mapbox | Mapas e geolocalização | ❌ Não publica (usa a cláusula europeia, Decisão 2021/914) |
| Upstash | Cache e limitação de acessos | ❌ Não publica, **com confiança menor**: a leitura do PDF não foi corroborada por segundo método |
| Supabase | Banco de dados e arquivos (fica em São Paulo) | ❓ Depende de definir se há transferência (ver abaixo) |

**Sobre o Supabase:** os dados ficam em repouso em `sa-east-1` (São Paulo). A dúvida não é onde estão, e sim se o **acesso lógico** pela matriz nos EUA configura transferência.

> **Limite desta apuração.** Foi feita lendo páginas públicas dos fornecedores em 03/09/2026, não os contratos assinados. Serve para orientar a decisão, **não substitui** a análise contratual da advogada e não deve ser citada como prova.

### O que já fizemos

- **Cláusula 14 publicada** (04/09), na seção 4.1 da Política de Privacidade, no site e no app. Cobre duração, responsabilidades, transferências subsequentes e o **direito de reclamar à ANPD**. No Módulo 2 essa obrigação é do **exportador**, ou seja, nossa.
- **Google Analytics:** a Política o declarava como subprocessador, mas **ele nunca esteve ligado**. A declaração foi removida e o código trava a religação sem reescrever a Política.
- Nossos documentos internos afirmavam que a ANPD ainda não havia aprovado cláusulas-padrão. Estava errado desde 23/08/2024; foi corrigido em 03/09.

### Para a advogada — o que só a senhora pode decidir

Para **Vercel, Resend, Sentry, Mapbox e Upstash**, qual caminho seguir?

1. Negociar/solicitar adendo com as cláusulas da ANPD;
2. enquadrar em outra hipótese do art. 33 da LGPD;
3. trocar de fornecedor.

E, para o **Supabase**: há transferência internacional?

Ainda são nossas, e temos de confirmar como estão documentadas: as obrigações das Cláusulas **15** (responder aos titulares) e **16** (comunicar incidentes de segurança).

---

## 5. Frente C — Segurança do painel de administração

### Em linguagem simples

O painel `/admin` permite ver dados de usuários, decidir disputas e mexer em valores. Hoje o acesso exige **só e-mail e senha**. Não existe uma segunda etapa (código no celular, por exemplo). Existe um superadministrador na produção, que é de uso interno mas guarda os mesmos dados. Se a senha de alguém vazar, quem a obtiver entra sem barreira adicional.

Também não há uma "segunda barreira" no banco: a proteção depende de cada rota do sistema verificar quem está chamando. Se uma verificação for esquecida, o acesso fica liberado. Já encontramos e corrigimos casos assim (em 02/09, duas rotas administrativas ignoravam o tipo de administrador).

### Para a advogada

Não é pergunta jurídica, mas tem reflexo: a LGPD exige medidas técnicas de segurança adequadas aos dados tratados (art. 46), e o painel acessa documentos de identidade e dados financeiros. Sugerimos tratar como **condição técnica de abertura ao público**. A implementação é decisão dos fundadores.

---

## 6. Frentes D e E

### D — Encarregado (DPO) e RIPD

- **Raimundo Gomes da Silva** foi nomeado Encarregado em 04/08/2026, para o período de MVP e o primeiro ano.
- O **RIPD** (Relatório de Impacto à Proteção de Dados) existe como **rascunho** e está marcado "pendente de revisão do DPO e da advogada". Falta validar e assinar.
- O RIPD ainda precisa incorporar duas mudanças: a Stripe no lugar do Mercado Pago (e o que isso significa em transferência internacional) e a **base legal da selfie**: decidiu-se que ela é dado biométrico sensível (art. 11) e exige consentimento específico, não interesse legítimo.

### E — Google Tag Manager na landing (novo, 15/09)

O Google Tag Manager (container `GTM-5TQLGHFT`) foi instalado na landing `shareo.com.br` a pedido do marketing, informando-se que havia autorização dos fundadores e da assessoria jurídica. **Verificamos hoje: ele carrega no site publicado.**

Três pontos para a advogada:

1. **A Política de Privacidade não o menciona.** É o mesmo tipo de descompasso do Google Analytics, agora no sentido inverso: em vez de declarar o que não carrega, **deixamos de declarar o que carrega**.
2. O Google, como vimos, **não publica as cláusulas da ANPD** para esses produtos. O Google Tag Manager é ferramenta do Google, empresa dos EUA. A instalação **reabre a questão do art. 33** que havíamos fechado em 04/09 ao não usar medição de terceiros.
3. Se o marketing configurar dentro do GTM etiquetas que capturem dados do formulário (e-mail, telefone, CEP), isso passa a ser tratamento de dado pessoal por terceiro. Recomendamos exigir parecer **antes** de configurar esse gatilho.

Há também um risco operacional: quem tem permissão de "Publicar" no painel do GTM pode inserir qualquer script no site sem passar pelo código. É gestão de acesso, com dois fatores e poucas contas.

Ao lado do GTM, a origem de cada lead segue gravada no nosso banco, sem depender de terceiros.

---

## 7. Perguntas para a advogada

| # | Pergunta | Frente | Efeito se a resposta for negativa |
|---|---|---|---|
| 1 | Com o valor transitando pelo saldo da ShareO na Stripe, a conclusão do parecer sobre a Lei 12.865/2013 se mantém? | A | **Mexe no produto**: migração para *destination charge* |
| 2 | A separação 15% receita / 85% em trânsito se sustenta sob o Simples Nacional, dado o valor cheio na conta da plataforma? | A | Reflexo em imposto e limite de enquadramento |
| 3 | A conclusão de que a ShareO não é sujeito obrigado (PLD/FT) depende de o processador ser autorizado pelo Banco Central? | A | Exige política própria de monitoramento |
| 4 | Vercel, Resend, Sentry, Mapbox e Upstash: negociar adendo, enquadrar em outra hipótese do art. 33 ou trocar? | B | Troca de fornecedor |
| 5 | Supabase (dados em São Paulo, matriz nos EUA): há transferência internacional? | B | Mais um fornecedor irregular |
| 6 | Os procedimentos das Cláusulas 15 e 16 (titulares e incidentes) estão adequados ou precisamos formalizá-los? | B | Documento e rotina novos |
| 7 | GTM: o enquadramento no art. 33 e a atualização da seção 5.2 da Política. É necessário aviso de cookies/consentimento? | E | Desligar o GTM (é uma linha no código) ou ajustar a Política |
| 8 | O restante do parecer de 30/06 se aplica ao desenho com a Stripe, ou algum outro ponto precisa ser revisitado? | A | Revisão parcial do parecer |
| 9 | O RIPD, atualizado para a Stripe e para a selfie como dado sensível, pode ser assinado pelo Encarregado? | D | Fecha a condição C3 |

---

## 8. O que decidimos hoje

1. **Ordem de fechamento.** Sugestão: primeiro a pergunta 1 (única que pode mudar o produto), depois a frente B em paralelo com o RIPD.
2. **GTM:** manter ligado até o parecer ou desligar agora? Desligar é uma linha e reversível. Enquanto a Política não o mencionar, a exposição é a mesma do GA4.
3. **MFA para administradores:** entra antes do go-live? Recomendamos que sim.
4. **Quem responde à ANPD e aos titulares** nas Cláusulas 15 e 16, e com qual procedimento.

---

## 9. O que já está resolvido

- **Tributação** (B3): Simples Nacional, com relatório mensal de intermediações implementado em 10/09 (exigência da Contabilizei).
- **Pessoa jurídica identificada** nos Termos, na Privacidade e nas Políticas (razão social, CNPJ e endereço da sede) desde 24/08.
- **Nenhum texto publicado menciona o Mercado Pago**; o código dele foi removido.
- **Duas pendências que não existiam:** o "DPA da Stripe" (a Stripe já adota as cláusulas) e o Google Analytics (nunca esteve ligado).
- **Backup do banco:** existem 7 backups diários. Há um ponto aberto no Storage (fotos de reserva e documentos de identidade), que só é copiado por rotina manual.

---

## 10. Glossário

- **PSP** — processador de pagamentos (Stripe, hoje).
- **Custódia** — guardar o dinheiro de terceiros. É o que a Lei 12.865/2013 regula quando feito de forma habitual.
- **LGPD** — Lei Geral de Proteção de Dados.
- **ANPD** — Autoridade Nacional de Proteção de Dados.
- **Art. 33** — trata da transferência internacional de dados pessoais.
- **CPC / cláusulas-padrão** — texto contratual aprovado pela ANPD (Res. 19/2024), que deve ser adotado sem alteração.
- **RIPD** — Relatório de Impacto à Proteção de Dados.
- **DPO / Encarregado** — responsável pelo canal com titulares e com a ANPD.
- **MFA** — verificação em duas etapas.
- **KYC / KYB** — verificação de identidade de pessoas / empresas.
- **PLD/FT** — prevenção à lavagem de dinheiro e ao financiamento do terrorismo.
- **Operador / exportador** — o operador trata dados em nome de outro; o exportador é quem envia os dados ao exterior (aqui, a ShareO).

---

*Fontes internas:* `checklist-conformidade-juridica.md`, `ressalva-psp-stripe-2026-09-03.md`, `dpa-apuracao-2026-09-03.md`, `retorno-contabilizei-tributacao-2026-09-10.md`, `rascunho-ripd.md`. Estado do GTM conferido no site publicado em 21/09/2026.
