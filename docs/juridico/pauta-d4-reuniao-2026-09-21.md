# D4 — o que ainda impede abrir a ShareO ao público

**Pauta da reunião com Raimundo e a advogada** · 21 de setembro de 2026
**Preparado por:** Roberto Epifânio, com apoio da equipe técnica

> **✅ Atualização de 22/09/2026 — respostas recebidas.** As perguntas 1, 2, 3 e 9 da seção 7 tiveram resposta (parcial na 3) no dia seguinte à reunião, junto com a assinatura do RIPD pelo Encarregado. Detalhe completo em [`parecer-lei-12865-2026-09-21.md`](parecer-lei-12865-2026-09-21.md) — confirmado por Raimundo: é a advogada amiga que o apoia neste momento inicial, sem cobrar.

---

## 1. Em uma página

**O que é o D4.** É a consulta jurídica que decide se a ShareO pode receber pagamentos reais de usuários. Enquanto ela não fechar, a plataforma segue em teste: nenhum go-live público.

**Onde estamos.** O parecer jurídico formal chegou em 30/06/2026. Das quatro condições que ele impôs para o go-live, **três estão cumpridas** e **uma segue aberta**: o checklist de conformidade precisa estar 100%. Restam três frentes, mais uma questão nova:

| # | Frente | Em uma frase | Quem decide |
|---|---|---|---|
| A | **Pagamentos pela Stripe** | O dinheiro da locação passa pelo saldo da ShareO na Stripe antes do repasse. A parte tributária já foi respondida pela Contabilizei; falta a advogada avaliar o enquadramento legal. | Advogada |
| B | **Transferência internacional de dados** (Art. 33 da LGPD) | O prazo para adotar as cláusulas-padrão da ANPD venceu em 23/08/2025. Só 1 de 7 fornecedores está regular. | Advogada |
| C | **Segurança do painel de administração** | O painel era protegido só por senha. A verificação em duas etapas (2FA) para administradores foi **implementada** (PR #488, testes verdes) e **aguarda deploy e verificação em staging**. | Fundadores (decisão técnica) |
| D | **Encarregado (DPO) e RIPD** | Raimundo está nomeado, mas o relatório de impacto ainda não foi validado nem assinado. | Raimundo + advogada |
| E | **Novo, de 15/09: Google Tag Manager** | Foi instalado na landing `shareo.com.br`. A Política de Privacidade ainda não o menciona. | Advogada + fundadores |

**O que pedimos hoje:** respostas às perguntas da seção 7 e uma decisão sobre a ordem em que fechamos as frentes.

---

## 2. As quatro condições do parecer

| # | Condição | Estado | Observação |
|---|---|---|---|
| 1 | Parecer jurídico formal | ✅ Recebido em 30/06 | Falta a advogada confirmar o enquadramento dos pagamentos pela Stripe (frente A). |
| 2 | Contrato com o processador de pagamentos + conta em nome da empresa (PJ) | ✅ Cumprida em 24/08/2026 | Conta na Stripe no CNPJ 68.512.556/0001-09, o mesmo do Comprovante de Situação Cadastral. |
| 3 | Termos de Uso e Política de Privacidade revisados | ✅ Conteúdo aprovado | Só serão publicados no go-live. |
| 4 | Checklist de conformidade 100% cumprido | 🔴 **Aberta** | Faltam C2 (fornecedores estrangeiros) e C3 (RIPD/DPO), além da ressalva do processador. |

---

## 3. Frente A — Stripe: o dinheiro passa pela conta da ShareO

### Como funciona hoje

(detalhe completo em [`ressalva-psp-stripe-2026-09-03.md`](ressalva-psp-stripe-2026-09-03.md))

1. O locatário paga o valor **cheio** da locação com cartão.
2. O valor entra no **saldo da ShareO dentro da Stripe** (uma conta da Stripe em nome da ShareO, não uma conta bancária).
3. Três dias depois da devolução do item, a Stripe transfere **85%** ao proprietário.
4. Os **15%** ficam com a ShareO. É a receita dela.

O valor fica retido de propósito: é o que permite mediar uma disputa por dano antes de pagar o proprietário.

### O que a Contabilizei respondeu (10/09, chamado 29468012)

O roteiro enviado a ela já descrevia esse fluxo. Respostas:

| Pergunta | Resposta |
|---|---|
| Os 85% entram na receita bruta? | **Não.** O imposto incide só sobre a comissão de 15%. Os 85% são "valores de terceiros em trânsito". Numa locação de R$ 100, a receita é R$ 15. |
| Regime e alíquota | **Simples Nacional**, Anexo III, alíquota projetada de **6%** sobre a comissão. |
| Teto do Simples (R$ 4,8 mi) | Conta as **comissões**, não o volume. O volume precisaria chegar a ~R$ 32 mi/ano. |
| Nota fiscal | Emitida **contra o proprietário**, sobre os 15%. |
| Retenções | **Sem** retenção de IR nem de INSS. DIMOB não se aplica. |

Ela exige ainda um **Relatório de Intermediações** mensal (data, proprietário, valor total, repasse e comissão), que **já está implementado** e é gerado sozinho no dia 1º de cada mês.

**A parte tributária está resolvida.** Não há pergunta fiscal para a advogada.

### O que continua com a advogada

**Pergunta central:** com o valor cheio entrando no saldo da ShareO na Stripe por alguns dias, a ShareO precisa de autorização do Banco Central como instituição de pagamento (Lei 12.865/2013), ou o arranjo é apenas intermediação?

**Como isso se liga à resposta da Contabilizei.** Para o imposto, tratar os 85% como "valores de terceiros em trânsito" é o que nos favorece. Os documentos mensais que ela pede (relatório, comprovantes de transferência, extratos da Stripe no lugar de extrato bancário) registram por escrito essa mesma situação: dinheiro de terceiros no saldo da ShareO por alguns dias. A advogada deve avaliar a mesma situação sob a ótica da lei, sabendo o que a contabilidade já documenta.

**Por que é o ponto mais pesado:** é o único em que uma resposta negativa **mexeria no produto**. A alternativa técnica seria a Stripe pagar direto ao proprietário (*destination charge*), o que perde a retenção durante a disputa. Se isso acontecer, a Contabilizei também precisa ser avisada, porque o relatório e os extratos passam a ter outra origem.

**Um texto nosso a conferir.** A Contabilizei pediu que os Termos digam que a ShareO é intermediadora, que o valor total pertence ao proprietário e que ela retém só a comissão. A seção 6 dos Termos diz que a plataforma "intermedia o valor", "retém uma taxa de serviço" e "repassa o restante ao locador". **Não diz que o valor pertence ao locador** e não nomeia a Stripe. A redação basta, ou ajustamos? Depende da resposta à pergunta central.

### Uma pergunta conexa

**Prevenção à lavagem de dinheiro (Lei 9.613/1998):** a conclusão de que a ShareO não é sujeito obrigado se apoia em a Stripe assumir a verificação de identidade (KYC/KYB) e o monitoramento. A Stripe é estrangeira. A conclusão se mantém?

---

## 4. Frente B — Transferência internacional de dados (Art. 33 da LGPD)

### Em linguagem simples

A ShareO usa serviços de empresas estrangeiras (hospedagem, e-mail, mapas, pagamentos). Ao usá-los, dados de usuários brasileiros **saem do Brasil**. A LGPD só permite isso com uma base legal. A mais comum é um contrato com **cláusulas-padrão aprovadas pela ANPD**.

Em 23/08/2024 a ANPD publicou essas cláusulas (Resolução CD/ANPD nº 19/2024), e o prazo para adotá-las **encerrou em 23/08/2025**. Ou seja: **estamos fora do prazo há mais de um ano.** Não é exclusividade da ShareO, mas é uma exposição real.

Não dá para "assinar" as cláusulas: adota-se o texto **na íntegra e sem alteração**. Verificamos quem já o fez.

### Situação dos sete fornecedores

(medição completa, com metodologia e evidências, em [`dpa-apuracao-2026-09-03.md`](dpa-apuracao-2026-09-03.md))

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

O painel `/admin` permite ver dados de usuários, decidir disputas e mexer em valores. Até agora o acesso exigia **só e-mail e senha**, inclusive para um superadministrador na produção (de uso interno, mas com os mesmos dados). Se a senha de alguém vazasse, quem a obtivesse entrava sem barreira adicional.

Também não há uma "segunda barreira" no banco: a proteção depende de cada rota do sistema verificar quem está chamando. Se uma verificação for esquecida, o acesso fica liberado. Já encontramos e corrigimos casos assim (em 02/09, duas rotas administrativas ignoravam o tipo de administrador).

### O que foi feito (21/09)

Todo administrador, dos três papéis, passa a precisar de um **segundo fator**: além da senha, o código de 6 dígitos de um aplicativo autenticador no celular (Google Authenticator, Authy, 1Password ou similar).

- **Sem o segundo fator, o painel não abre.** O administrador que ainda não o cadastrou consegue entrar no site, mas é tratado como usuário comum em todo o sistema até cadastrar.
- **Perdeu o celular?** Cada administrador recebe 10 códigos de recuperação de uso único. Sem eles, outro superadministrador reinicia o 2FA dele (a ação é registrada no log de auditoria e encerra as sessões abertas).
- **Cada código vale uma vez**, e as tentativas erradas são limitadas.
- Os testes automatizados do painel continuam funcionando sem nenhum atalho que desligue a proteção.

**Estado honesto:** implementado no PR #488, com a suíte de testes e o CI verdes. **Ainda não foi verificado ao vivo**: o fluxo completo (QR code, código, login, recuperação) só pode ser exercitado no staging depois do deploy. Quando isso entrar, **todos os administradores precisarão entrar de novo e cadastrar o autenticador**; até lá o painel fica bloqueado para eles.

### Para a advogada

Não é pergunta jurídica, mas tem reflexo: a LGPD exige medidas técnicas de segurança adequadas aos dados tratados (art. 46), e o painel acessa documentos de identidade e dados financeiros. Com o 2FA, essa barreira deixa de depender só de senha. Sugerimos manter como **condição técnica de abertura ao público**, com a verificação em staging registrada antes do go-live. Não há pergunta a ela nesta frente.

---

## 6. Frentes D e E

### D — Encarregado (DPO) e RIPD

- **Raimundo Gomes da Silva** foi nomeado Encarregado em 04/08/2026, para o período de MVP e o primeiro ano.
- O **RIPD** (Relatório de Impacto à Proteção de Dados) existe como **rascunho** e está marcado "pendente de revisão do DPO e da advogada". Falta validar e assinar.
- O RIPD ainda precisa incorporar duas mudanças: a Stripe como processador de pagamentos (e o que isso significa em transferência internacional) e a **base legal da selfie**: decidiu-se que ela é dado biométrico sensível (art. 11) e exige consentimento específico, não interesse legítimo.

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

| # | Pergunta | Frente | Efeito se a resposta for negativa | Status |
|---|---|---|---|---|
| 1 | Com o valor cheio entrando no saldo da ShareO na Stripe por alguns dias, a ShareO precisa de autorização do Banco Central (Lei 12.865/2013) ou o arranjo é apenas intermediação? | A | **Mexe no produto**: migração para *destination charge* | ✅ **Respondido 21/09** — não precisa, condicionado à redação dos Termos. Ver [`parecer-lei-12865-2026-09-21.md`](parecer-lei-12865-2026-09-21.md) |
| 2 | A Contabilizei classificou os 85% como "valores de terceiros em trânsito". Essa qualificação é compatível com a resposta à pergunta 1? | A | Avisar a Contabilizei e rever o relatório mensal | ✅ **Respondido 21/09** — sim, o texto trata as duas conclusões como a mesma coisa |
| 3 | PLD/FT: a ShareO não ser sujeito obrigado, porque a Stripe assume o KYC e o monitoramento, se mantém sendo a Stripe estrangeira? | A | Exige política própria de monitoramento | 🟡 **Parcial** — veio o texto contratual de PLD/FT, mas não uma frase explícita confirmando o enquadramento |
| 4 | Vercel, Resend, Sentry, Mapbox e Upstash: negociar adendo, enquadrar em outra hipótese do art. 33 ou trocar? | B | Troca de fornecedor | ⏳ Sem resposta ainda |
| 5 | Supabase (dados em São Paulo, matriz nos EUA): há transferência internacional? | B | Mais um fornecedor irregular | ⏳ Sem resposta ainda |
| 6 | Os procedimentos das Cláusulas 15 e 16 (titulares e incidentes) estão adequados ou precisamos formalizá-los? | B | Documento e rotina novos | ⏳ Sem resposta ainda |
| 7 | GTM: o enquadramento no art. 33 e a atualização da seção 5.2 da Política. É necessário aviso de cookies/consentimento? | E | Desligar o GTM (é uma linha no código) ou ajustar a Política | ⏳ Sem resposta ainda |
| 8 | O RIPD, atualizado para a Stripe e para a selfie como dado sensível, pode ser assinado pelo Encarregado? | D | Fecha a condição C3 | ✅ **Assinado 21/09** pelo Encarregado — ver `rascunho-ripd.md`. Seção I do RIPD lista o que ainda falta |
| 9 | A seção 6 dos Termos diz que a plataforma "intermedia o valor" e "retém uma taxa", mas não diz que o valor pertence ao locador nem nomeia a Stripe. Isso basta, ou ajustamos como a Contabilizei pediu? | A | Nova redação (o conteúdo dos Termos já estava aprovado) | ✅ **Respondido 21/09** — texto novo entregue para a seção 6 (e uma seção 7 de PLD/FT), ainda não aplicado ao Termos publicados |

---

## 8. O que decidimos hoje

1. **Ordem de fechamento.** Sugestão: primeiro a pergunta 1 (única que pode mudar o produto), depois a frente B em paralelo com o RIPD.
2. **GTM:** manter ligado até o parecer ou desligar agora? Desligar é uma linha e reversível. Enquanto a Política não o mencionar, a exposição é a mesma do GA4.
3. **2FA para administradores:** já está implementado (PR #488). Falta aprovar o merge e o deploy, e verificar no staging. Depois do deploy, todos os administradores precisam cadastrar o autenticador.
4. **Quem responde à ANPD e aos titulares** nas Cláusulas 15 e 16, e com qual procedimento.

---

## 9. O que já está resolvido

- **Tributação** (B3): respondida pela Contabilizei em 10/09 — Simples Nacional, imposto só sobre a comissão de 15%, nota contra o proprietário. O relatório mensal que ela exige já está implementado.
- **Pessoa jurídica identificada** nos Termos, na Privacidade e nas Políticas (razão social, CNPJ e endereço da sede) desde 24/08.
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
