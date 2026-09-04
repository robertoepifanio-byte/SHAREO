# Apuração — DPA e transferência internacional (art. 33 LGPD)

**Data:** 2026-09-03 · **Autor:** equipe técnica · **Status:** insumo para a advogada/DPO
**Motivo:** o item "DPA da Stripe" estava no checklist de go-live como bloqueador sem dono.

> ## Conclusão
>
> 1. **A pendência da Stripe não existe.** O adendo dela já adota as Cláusulas-Padrão Contratuais da
>    ANPD; não há nada a assinar.
> 2. **No lugar dela apareceu algo pior.** As CPC são obrigatórias desde a Resolução 19/2024 e o
>    prazo venceu em **23/08/2025**. Medidos os sete fornecedores, **a Stripe é a única que as
>    adota**: Vercel, Resend, Sentry, Mapbox, Upstash e Google Analytics **não publicam CPC**, e o
>    Supabase depende de definir se há transferência. Estamos fora do prazo há mais de um ano.
> 3. **Há uma obrigação nossa, que não depende de ninguém:** publicar o documento da **Cláusula 14**.
>    Rascunho pronto em
>    [`clausula-14-transparencia-transferencia.md`](clausula-14-transparencia-transferencia.md).
>
> As decisões de §4 são da advogada. O item 3 pode andar hoje.

> **Este documento corrige uma premissa errada dos nossos próprios documentos.**
> `transferencia-internacional-dados.md` (28/06) e `atividades-dpa-ripd-dpo.md` (01/07) afirmavam que
> *"a ANPD ainda não aprovou cláusulas contratuais padrão"* e planejavam adotar SCC europeia como
> substituto. Deixou de ser verdade em 23/08/2024. Ambos foram corrigidos em 03/09/2026.

---

## 1. O que mudou no cenário regulatório

A **Resolução CD/ANPD nº 19, de 23/08/2024** aprovou o Regulamento de Transferência Internacional
e o texto das **Cláusulas-Padrão Contratuais (CPC)** brasileiras.

**Duas datas, um ano de distância — não confundir:**

| Data | O que é |
|---|---|
| **23/08/2024** | Publicação da Resolução 19/2024. As CPC passam a existir. |
| **23/08/2025** | **Fim do prazo de adequação.** É a data de conformidade — a que importa hoje. |

Três consequências que os nossos documentos não refletiam:

1. **As CPC são obrigatórias e inalteráveis.** Quem usa cláusulas contratuais como base do art. 33
   só está regular se adotar as CPC da ANPD **na íntegra, sem modificação** — ou se tiver cláusulas
   específicas previamente aprovadas pela ANPD.
2. **SCC europeia não serve mais como substituto.** Era o plano do nosso rascunho. Modelos
   estrangeiros precisam ser substituídos pelas CPC ou ter equivalência formalmente aprovada.
3. **O prazo encerrou há mais de um ano.**

Não há decisão de adequação da ANPD reconhecendo os EUA como país de proteção adequada.

---

## 2. Stripe — resolvido, e sem nada a assinar

**Apurado direto na fonte** — `stripe.com/en-br/legal/dta`, seção 11, última atualização
**18/11/2025**, consultada em 03/09/2026:

> "The Brazilian Standard Contractual Clauses ("Brazilian SCCs"), supplemented by this Data
> Transfers Addendum and adapted as set out in this Section, apply to the transfer of Personal Data
> subject to the Brazilian General Data Protection Law ("LGPD"), from Brazil to a third country or
> territory without an adequacy decision from the Brazilian National Data Protection Authority."

A Stripe publica os **dois módulos** da ANPD — Módulo 1 (controlador→controlador) e Módulo 2
(controlador→operador) — cada um declarando adotar "the standard contractual clauses approved by
the Brazilian National Data Protection Authority (ANPD)", com a Stripe, LLC como importadora.

**Não há o que assinar.** O DPA "forms part of your Stripe Services Agreement", e o adendo de
transferência é *incorporated by reference*, ativado pelo uso do serviço. O item estava resolvido
desde antes de entrar no checklist — o que faltava era alguém ter olhado.

### 2.1 Mas ele cria três obrigações nossas

No **Módulo 2** — o nosso caso quando a Stripe atua como operadora — a Cláusula 4.1 atribui ao
**exportador (ShareO)**, e não à Stripe, o dever de: **publicar o documento da Cláusula 14**,
**responder aos titulares** (Cláusula 15) e **comunicar incidentes de segurança** (Cláusula 16).

A Cláusula 14 exige documento público, **em português**, em linguagem simples, no nosso site,
cobrindo sete pontos — e o 14.2 permite integrá-lo à Política de Privacidade desde que "destacado e
de fácil acesso".

**Cobertura da seção 4.1 da Política**, publicada no PR #458 e hoje no ar em `/privacidade`. Ela
informa quem recebe, o que recebe, para quê, o que fica no Brasil, e oferece canal de contato:

| Cláusula 14.1 exige | A seção 4.1 cobre? |
|---|---|
| a) forma, **duração** e finalidade específica | ⚠️ parcial — falta duração |
| b) país de destino | ✅ |
| c) identificação e contatos da parte designada | ⚠️ parcial — falta a qualificação |
| d) uso compartilhado e finalidade | ✅ |
| e) responsabilidades dos agentes de tratamento | ❌ |
| f) direitos do titular, meios de exercício **e o direito de peticionar à ANPD** | ❌ |
| g) transferências subsequentes (onward) | ❌ |

A 4.1 foi escrita para **informar o fato** da transferência, e isso ela faz. Não foi escrita como
documento da Cláusula 14, e não cumpre a cláusula. Daí o rascunho separado.

---

## 3. Os outros fornecedores — aqui está o problema real

**Método.** Baixamos o DPA público de cada um em 03/09/2026 e procuramos "Brazil" e "ANPD". Para
separar *cláusula ausente* de *página que não carregou*, contamos no mesmo texto duas expressões que
**têm** de aparecer num DPA ("standard contractual" e "processor"). Se o controle vem alto e o alvo
vem zero, a ausência é real.

| Fornecedor | Fonte consultada | Controle | "Brazil" / "ANPD" | Leitura |
|---|---|---|:---:|---|
| Vercel | vercel.com/legal/dpa | 15 / 34 | 0 / 0 | DPA presente, **sem cláusula brasileira** |
| Supabase | supabase.com/legal/dpa | 14 / 19 | 0 / 0 | idem |
| Resend | resend.com/legal/dpa | 9 / 17 | 0 / 0 | idem |
| Sentry | sentry.io/legal/dpa | 8 / 24 | 0 / 0 | idem |
| **Mapbox** | **PDF do Customer DPA, abril/2025** (a página `/legal/dpa` é só invólucro; o contrato é PDF) | **32 / 45** | **0 / 0** | **sem cláusula brasileira** — usa a SCC europeia (Decisão 2021/914, Módulo 2) |
| **Upstash** | **PDF do DPA** (`upstash.com/static/trust/dpa.pdf`) | ⚠️ ver nota | 0 / 0 | **sem cláusula brasileira** — só SCC da UE, IDTA do Reino Unido e Data Privacy Framework |
| **Google (GA4)** | `business.safety.google/adsdatatransfers` e `/adsprocessorterms` | 101 (processor) | 1 / 0 | **sem cláusula brasileira** — as transferências cobrem só EEA, Reino Unido e Suíça; "Brazil" aparece só na *definição* de LGPD |

⚠️ **Upstash — evidência de fonte única.** O texto do PDF foi lido na conversão automática, que
respondeu de forma específica (SCC da UE, IDTA, DPF). O segundo método de extração **não
corroborou** (o controle veio zero, sinal de que a extração produziu ruído, não texto). Confiança
menor que a dos demais; vale reconfirmar.

📌 **Google tem CPC brasileiras — mas em outro produto.** O Google Cloud publica as CPC da ANPD em
`cloud.google.com/sccs/br-c2p`. O Analytics não corre sob esses termos, e sim sob os do Ads, que não
as trazem. Não confundir os dois na conversa com a advogada.

⚠️ **Isto é a leitura de páginas públicas, não do contrato assinado.** Serve para orientar a
decisão e para saber onde olhar — **não substitui** a análise contratual da advogada, e não deve ser
citado como prova em parecer.

✅ **Cobertura fechada em 03/09/2026.** A primeira rodada mediu 5 fornecedores e deixou de fora
**Upstash** e **Google Analytics**, que constavam do inventário de `atividades-dpa-ripd-dpo.md`, além
de dar o **Mapbox** como inconclusivo. Os três foram medidos na mesma data — e nenhum deles tem CPC.
O número deixou de ser piso: **dos sete, só a Stripe está regular.**

**Supabase tem uma particularidade:** os dados ficam em repouso em `sa-east-1` (São Paulo). A
questão não é onde o dado mora, e sim se o acesso lógico pela matriz nos EUA configura
transferência. É pergunta para a advogada.

---

## 4. Decisões — nenhuma é nossa

| # | Questão | Quem decide | Gatilho |
|---|---|---|---|
| 1 | **Seis fornecedores sem CPC** (Vercel, Resend, Sentry, Mapbox, Upstash, GA4). Trocar de fornecedor, negociar adendo, ou enquadrar em outra hipótese do art. 33? | Advogada | Já cabe na conversa da Lei 12.865 que o Raimundo levou |
| 2 | Supabase em sa-east-1 com matriz nos EUA — há transferência internacional? | Advogada | Mesma conversa |
| 3 | **GA4 é o mais fácil de resolver sem advogada:** é o único não essencial da lista. Desligar elimina a transferência em vez de regularizá-la | Fundadores | Decisão de produto |
| 4 | Publicar o documento da Cláusula 14 (rascunho pronto) | DPO + advogada | Pode andar já |
| 5 | Reconfirmar o Upstash — evidência de fonte única | Técnico | Pode andar já |

---

## 5. Fontes

- [Resolução CD/ANPD nº 19/2024 — ANPD](https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-19-de-23-de-agosto-de-2024)
- [Transferência Internacional de Dados — ANPD](https://www.gov.br/anpd/pt-br/assuntos/assuntos-internacionais/transferencia-internacional-de-dados)
- [Fim do período de graça — Mayer Brown](https://www.mayerbrown.com/pt/insights/publications/2025/08/end-of-grace-period-implementation-of-brazils-standard-contractual-clauses-in-international-transfers-of-personal-data)
- [Prazo encerra em 23/08 — Lefosse](https://lefosse.com/noticias/alerta/transferencia-internacional-de-dados-prazo-para-adocao-das-clausulas-padrao-da-anpd-se-encerra-em-23-de-agosto/)
- [Stripe — Data Transfers Addendum](https://stripe.com/en-br/legal/dta) (seção 11, atualizado 18/11/2025)
- [Stripe — DPA](https://stripe.com/legal/dpa) e [FAQ](https://stripe.com/br/legal/dpa/faqs)
- [Google Cloud — CPC brasileiras](https://cloud.google.com/sccs/br-c2p) (exemplo de fornecedor que publicou as CPC)
