# Art. 33 / CPC da ANPD — releitura dos fornecedores (23/09/2026)

Atualiza `dpa-apuracao-2026-09-03.md` (3 semanas depois). **Nada mudou a favor**: nenhum dos fornecedores irregulares passou a adotar as CPC brasileiras, e o **Google Tag Manager** (ligado na landing em 15/09) entra na lista. Decisão sobre o que fazer com cada um continua sendo **da advogada e dos fundadores** (RIPD, Seção I, pendência 1) — este documento só entrega os fatos e as opções para ela decidir.

## 1. O que a leitura de 23/09 achou

Método: baixado o texto integral de cada DPA e buscado "Brazil", "ANPD", "LGPD" e "Standard Contractual Clauses". Todos carregaram.

| Fornecedor | Documento (data) | CPC brasileiras? | Observação |
|---|---|---|---|
| **Stripe** | `stripe.com/en-br/legal/dta`, seção 11 (18/11/2025) | ✅ Sim, Módulos 1 e 2 | Regular (apuração de 03/09) |
| Vercel | `vercel.com/legal/dpa` (17/03/2026) | ❌ Não | Só SCC da UE, UK e Suíça; 0 menção a Brazil/ANPD/LGPD |
| Supabase | `supabase.com/legal/dpa` (versão 1, 01/08/2026) | ❌ Não | SCC da UE; cl. 4.4 prevê **aditivo se a autoridade local aprovar outro mecanismo** — é a porta para pedir |
| Resend (Plus Five Five, Inc.) | `resend.com/legal/dpa` (27/08/2026) | ❌ Não | SCC da UE e UK; cl. 6.6 admite "alternative arrangements" |
| Sentry | `sentry.io/legal/dpa/` (v5.1.0, 29/05/2024) | ❌ Não | "Alternative Transfer Solution" limitada a dado **europeu** |
| Mapbox | `mapbox.com/legal/dpa` (FAQ de 22/08/2023) | ❌ Não | Cita "LGPD (Brazil)" só numa lista de leis; sem CPC nem ANPD |
| Upstash | `upstash.com/static/trust/dpa.pdf` (abril/2025) | ❌ Não | SCC da UE, UK e DPF |
| **Google (GTM)** 🆕 | Ads Data Processing Terms v8.0 (30/05/2024) | ❌ Não | O GTM está nesta lista de serviços. O outro termo do Google, o *Processor Terms* v10 (07/05/2026), **tem** BR SCCs, mas a lista de serviços dele **não inclui** o GTM |

**Limite da apuração.** Uma página sem a cláusula prova que ela não está **publicada**, não que não exista aditivo **sob demanda**. A busca na web não achou nenhum. O caminho é pedir por escrito (seção 3).

## 2. Opções por fornecedor (para a advogada escolher)

Para cada um, as saídas são as mesmas quatro; a diferença é quanto custa cada uma.

| Saída | Como fica |
|---|---|
| **A. Pedir o aditivo com as CPC** | Carta ao fornecedor (seção 3). Custo baixo, resultado incerto; guardar a resposta no repositório da diligência |
| **B. Enquadrar em outra hipótese do art. 33** | Ex.: consentimento específico e em destaque (art. 33, VIII), ou outro inciso que a advogada considere aplicável. Peso: consentimento revogável para dado que o serviço não funciona sem |
| **C. Reduzir o que atravessa a fronteira** | Menos dado para o fornecedor. Decisão técnica, viável só onde o dado enviado é dispensável |
| **D. Trocar de fornecedor** | Para um que adote as CPC (ou hospede no Brasil) |

| Fornecedor | O que ele recebe (Política de Privacidade, seção 4.1) | Saída que parece mais barata | Custo/risco |
|---|---|---|---|
| Vercel | hospedagem e execução da aplicação; processa as requisições enquanto cada tela funciona | **A** (ou **B**) — trocar hospedagem é o item mais caro do projeto | Alto para trocar |
| Supabase | (não consta na lista da 4.1) banco e Storage **em repouso em sa-east-1**; matriz nos EUA | **A** pela cl. 4.4; a questão prévia é se acesso remoto de fora do Brasil é "transferência" — **pergunta para a advogada** | Baixo se A |
| Resend | nome, e-mail e conteúdo da mensagem, no momento do envio | **A**; alternativa **D** para provedor com região BR | Médio |
| Sentry | informação técnica da falha, com filtro que remove dado pessoal; 30 dias | **C** (revisar o filtro/máscara de PII do RIPD F-03) + **A** | Baixo |
| Mapbox | o endereço informado, sem o nome, no momento da consulta | **C** ou **A** | Médio (mapa é funcionalidade central) |
| Upstash | IP, id da conta, e-mail de login, dado público de CNPJ | **C** — avaliar se o e-mail de login precisa ir ao Upstash (a Política declara que vai); decisão técnica a confirmar | Baixo |
| Google (GTM) | IP e dados do navegador de quem abre a landing | **A não tem rota clara** (o termo que cobre o GTM não tem BR SCCs). Saídas realistas: **B** (consentimento antes de carregar o GTM) ou **desligar** `GTM_LIBERADO` (uma linha) | Baixo: é medição, e a origem do lead já é gravada no banco (`SignupSource`) |

**Recomendação técnica (não jurídica):** o GTM é o único destes que dá para **desligar sem perder funcionalidade**. Se a advogada não aceitar a declaração na Política como suficiente, desligar é o caminho mais curto para tirar um fornecedor da lista.

## 3. Carta-modelo ao fornecedor (para enviar pelo canal de DPA de cada um — **não enviada**)

> Subject: Request — ANPD Standard Contractual Clauses (Brazil) for our DPA
>
> Hello, we are ShareO, a Brazilian company (LGPD controller) using [service]. Since Resolution CD/ANPD No. 19/2024 (Aug/2024), international transfers of personal data under the LGPD must rely on the ANPD-approved Standard Contractual Clauses, adopted without modification; the adaptation period ended on 23 Aug 2025. Your current DPA, dated [date], covers only EU/UK/Swiss mechanisms.
>
> Could you tell us: (1) whether you offer, or plan to publish, an addendum incorporating the ANPD SCCs (Module 2, controller-to-processor); (2) the expected date; and (3) if not, which other transfer mechanism you consider valid for Brazilian data subjects.
>
> Thank you. — [name], ShareO

Quem envia: o Encarregado, pelo e-mail institucional. **Anexar a resposta ao dossiê do RIPD**; a falta de resposta também é registro.

## 4. O que fica em aberto

**Continuam 6 fornecedores sem CPC (5 + Google) e o Supabase em definição.** A pendência 1 do RIPD segue **bloqueadora de go-live** até a advogada escolher a saída de cada um. Perguntas para a advogada (as de número 1 e 4 já constam nas linhas 5 e 7 da tabela da §7 de `pauta-d4-reuniao-2026-09-21.md`):
1. Acesso remoto, de fora do Brasil, a dado hospedado em sa-east-1 (Supabase) configura transferência internacional?
2. Para quais fornecedores basta a saída **A** (pedir e guardar a resposta) enquanto se negocia, e por quanto tempo isso é defensável dado o prazo já vencido?
3. O consentimento específico (saída **B**) é aceitável para os fornecedores que a plataforma não dispensa?
4. A declaração do GTM na Política (feita em 23/09) basta, ou o GTM só carrega depois de consentimento?
