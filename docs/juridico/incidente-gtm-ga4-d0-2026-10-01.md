# Registro de incidente — GTM disparando ao GA4 e ao Google Ads no go-live (D0, 01/10/2026)

> **Para:** advogada / Encarregado (Raimundo).
> **De:** equipe técnica (ShareO).
> **Status:** incidente contido e corrigido em 01/10/2026; **aguarda parecer** sobre se e como o Google Tag Manager pode ser (re)ativado. Até o parecer, GTM está **desligado** no marketplace e na campanha.
> **Natureza:** transferência internacional de dados a terceiro (art. 33 da LGPD) não prevista na decisão interna vigente.

## 1. Resumo

No dia do go-live (01/10/2026), ao publicar o container do Google Tag Manager (`GTM-5TQLGHFT`) no marketplace, mediu-se que o container **enviou dados de navegação a dois destinos do Google** — Google Analytics 4 e Google Ads — durante a janela em que esteve no ar. Isso contraria a **decisão interna C2.9 (04/09/2026)**, que manteve toda medição de terceiro desligada no projeto por causa do risco do **art. 33 da LGPD** (transferência internacional sem hipótese legal fechada). O envio foi interrompido no mesmo dia e comprovou-se, por medição, que depois da correção **nenhuma requisição sai para o Google**.

## 2. Fatos medidos

| Item | Valor |
|---|---|
| Data | 01/10/2026 |
| Janela em que o container esteve no ar no marketplace | 13:57 – 14:47 UTC (≈ 50 min) |
| Container GTM | `GTM-5TQLGHFT` |
| Destino 1 (analytics) | Google Analytics 4 — propriedade `G-WSVD7LXNGQ` |
| Destino 2 (publicidade) | Google Ads (remarketing/conversão) — conta `18422537863` |
| Como foi medido | *Performance entries* do navegador (requisições de rede reais à `*.google-analytics.com` / `*.googleadservices.com`), não apenas erros de console |
| Correção | PR #549 — `GTM_LIBERADO = false` no marketplace |
| Prova pós-correção | Zero requisição aos domínios do Google após o #549 |

Observação importante: a **landing da campanha** (`apps/campanha`) já carregava **o mesmo container** desde 15/09/2026. Enquanto a campanha respondeu em domínio público, esteve sujeita ao mesmo envio. (Hoje a landing não é servida em domínio próprio — os domínios redirecionam 308 para `www` — mas o interruptor de código seguia ligado; ver seção 5.)

## 3. Por que isso é um incidente

- A decisão **C2.9 (04/09/2026)** manteve o GA4 desligado em todo o projeto (`GA4_LIBERADO = false`) justamente para não reabrir o **art. 33**: GA4 e Google Ads implicam transferência internacional de dados pessoais a um operador (Google) que **não adota as Cláusulas-Padrão Contratuais da ANPD** (Resolução CD/ANPD nº 19/2024; prazo de adequação vencido em 23/08/2025). Ver `art33-fornecedores-recheck-2026-09-23.md` e `dpa-apuracao-2026-09-03.md`.
- O GTM foi instalado na campanha em 15/09/2026 com autorização (marketing + fundador), **como medição adicional**, no entendimento de que o container só executaria o que estivesse publicado nele. O incidente mostra que o container **tinha tags de GA4 e Google Ads publicadas** e ativas — portanto o GTM, na prática, **ligou de novo o GA4** que a C2.9 havia desligado.
- A Política/Privacidade, no período, **não declarava** esse envio ao Google de forma alinhada ao que de fato ocorria (a declaração de GTM só foi acertada em 23/09; o envio a GA4/Ads nunca foi declarado como transferência internacional sob art. 33).

## 4. O que já foi feito

1. **#549 (01/10):** `GTM_LIBERADO = false` no marketplace — container deixou de carregar; medição confirma zero requisição ao Google.
2. **Este PR (29/10):** `GTM_LIBERADO = false` também na campanha (`apps/campanha`), fechando o risco latente de o mesmo container voltar a disparar se a landing recuperar um domínio. A campanha não é servida publicamente hoje, então a mudança é inócua no presente e preventiva para o futuro.
3. **Guarda de CI:** o teste `__tests__/unit/app/analytics-declaracao.test.ts` já reprova religar GA4/GTM sem alinhar os textos da Política — mas **não** substitui o parecer: ele cuida da *declaração*, não da *licitude* da transferência.

## 5. Estado atual do código (verificado em 29/10/2026)

| Onde | GA4 | GTM |
|---|---|---|
| Marketplace (`components/analytics/`) | `false` | `false` |
| Campanha (`apps/campanha/components/analytics/`) | `false` | `false` (após este PR; era `true`) |

## 6. Perguntas para o parecer

1. **Pode o GTM ser (re)ativado** no marketplace e/ou na campanha, dado que o container envia a GA4 (`G-WSVD7LXNGQ`) e ao Google Ads (`18422537863`) — ambos transferência internacional ao Google, que não adota as CPC da ANPD?
2. Se sim, **sob que condições**: container restrito a tags que **não** impliquem transferência internacional? Base legal do art. 33 enquadrável (ex.: consentimento específico e destacado no banner de cookies)? Declaração correspondente na Política e no RIPD?
3. O envio ocorrido na janela de ≈50 min (e o período anterior da campanha) **exige comunicação a titulares e/ou à ANPD** como incidente de tratamento, ou é dispensável pelo baixo volume/risco? Qual a recomendação formal?
4. Enquanto não houver parecer, confirma-se a conduta de **manter GA4 e GTM desligados** em todo o projeto?

## 7. Correção de registro anterior

Durante a apuração inicial afirmou-se, por engano, que "nenhum dado sai" com base **apenas em erros de console**. A medição por *performance entries* mostrou o contrário (havia requisições reais). Fica o registro de que a avaliação de envio de dados deve usar o painel de rede / *performance entries*, não o console.

---

**Relacionados:** `dpa-apuracao-2026-09-03.md`, `art33-fornecedores-recheck-2026-09-23.md`, `transferencia-internacional-dados.md`, `decisao-desbloqueio-d4-2026-09-24.md`, memórias `project-gtm-campanha-2026-09-15`, `project-ga4-nunca-existiu`, `project-art33-cpc-anpd`.
