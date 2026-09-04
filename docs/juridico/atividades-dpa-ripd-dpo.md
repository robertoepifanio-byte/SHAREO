# Plano de Atividades — DPAs, Transferência Internacional, RIPD e DPO

**Projeto:** ShareO — Marketplace de economia circular
**Data:** 2026-07-01 · **Sessão:** s41
**Origem:** parecer jurídico **FORMAL** do D4 (revisado com Mercado Pago como PSP) — itens **C2** (DPAs / transferência internacional) e **C3** (RIPD + DPO formal) da pauta de decisões jurídicas.
**Status geral:** 🟡 **em análise** — únicas pendências de LGPD que faltam para fechar o checklist de conformidade (além de B3 tributarista).

> ⚠️ **Gated D4.** Nada aqui é atividade de produção. São entregas de **governança/documentação**.
> **Publicação da Política revisada só ocorre no go-live.**
>
> 🕓 **Este arquivo é de 01/07/2026 e envelheceu por fora.** O Mercado Pago citado abaixo foi
> **descartado em 24/08** (B1 fechado, PSP é a **Stripe**), **B3 fechou em 03/09** (Simples Nacional),
> e a seção **C2 foi reenquadrada em 03/09** — ver `dpa-apuracao-2026-09-03.md`. O inventário da
> tabela 2.1 e os textos de §1 ainda descrevem o mundo anterior; leia-os com essa ressalva.

---

## 1. Contexto e por que isso importa

O parecer FORMAL confirma que os **pilares técnicos de LGPD já estão prontos** (DPO designado tecnicamente, criptografia AES-256-GCM em CPF/CNPJ, direitos do titular via `DELETE`/`export`, minimização). O que falta é **formalizar a governança de dados**:

1. **DPAs / cláusulas-padrão** com os subprocessadores que ficam **fora do Brasil** — exigência do **art. 33 da LGPD** (transferência internacional de dados pessoais).
2. **RIPD** (Relatório de Impacto à Proteção de Dados Pessoais) — **rascunho pronto** (`docs/juridico/rascunho-ripd.md`), falta **validação + assinatura do DPO** e **arquivamento formal**.
3. **Designação formal do DPO/Encarregado** — hoje configurado **tecnicamente** (`privacidade@shareo.com.br`), falta o **ato formal** (nomeação + publicação no site + registro interno).

Nenhum desses itens depende do texto final do parecer nem de código novo — depende de **decisão dos fundadores + revisão da advogada/DPO**.

---

## 2. C2 — DPAs e Transferência Internacional de Dados (art. 33 LGPD)

**Rascunho base já entregue:** `docs/juridico/transferencia-internacional-dados.md` (#116).

### 2.1 Inventário de subprocessadores

| Subprocessador | Finalidade | Dados tratados | Local | Ação necessária |
|---|---|---|---|---|
| **Mercado Pago** | Processamento de pagamento (PSP) | Dados financeiros, identificação | 🇧🇷 Brasil | DPA/contrato (é o **operador** — cruza com C4) |
| **Supabase** | Banco de dados + Storage | Todos os dados pessoais | 🇧🇷 sa-east-1 | DPA (mesmo em BR, formalizar operador) |
| **Vercel** | Hospedagem / execução | Logs, dados em trânsito | 🇺🇸 EUA | **Cláusulas-padrão (art. 33)** |
| **Resend** | E-mail transacional | Nome, e-mail | 🇺🇸 EUA | **Cláusulas-padrão (art. 33)** |
| **Sentry** | Monitoramento de erros | Metadados (PII mascarada) | 🇺🇸 EUA | **Cláusulas-padrão (art. 33)** |
| **Mapbox** | Mapas / geocoding | Endereço aproximado / coords | 🇺🇸 EUA | **Cláusulas-padrão (art. 33)** |
| **Upstash** | Rate limiting | IP / identificador de sessão | 🇺🇸 EUA (Global) | **Cláusulas-padrão (art. 33)** — confirmar região |
| ~~**Google** (Analytics)~~ | ~~analytics~~ | — | — | ✅ **Fora do inventário (04/09/2026)** — nunca esteve ligado; travado no código |
| **Google** (Sheets API) | Importação de itens PJ por planilha | Dados do anúncio | 🇺🇸 EUA | ⚠️ **Não medido** quanto a CPC — só o Analytics foi apurado em 04/09 |
| **Zenvia** | SMS OTP (verificação de celular) | Telefone | 🇧🇷 Brasil | DPA nacional |

### 2.2 Atividades

| # | Atividade | Responsável | Entregável | Dependência |
|---|---|---|---|---|
| C2.1 | Validar/atualizar o inventário de subprocessadores acima | DPO + Dev | Inventário assinado | — |
| C2.2 | ✅ **Feito em 03–04/09/2026** — medidos Stripe, Vercel, Supabase, Resend, Sentry, Mapbox e Upstash: **só a Stripe adota as CPC**. O GA4 foi medido e **saiu do inventário** (nunca esteve ligado). Ver `dpa-apuracao-2026-09-03.md` | Técnico | Apuração por fornecedor | C2.1 |
| C2.3 | Decidir o que fazer nos **cinco sem CPC** (Vercel, Resend, Sentry, Mapbox, Upstash): trocar fornecedor, negociar adendo, ou outra hipótese do art. 33. E definir se **Supabase** em sa-east-1 configura transferência | **Advogada** | Decisão por fornecedor | C2.2 |
| **C2.9** | ✅ **Fechado em 04/09/2026.** Não precisou desligar: o GA4 **nunca esteve ligado**. O que existia era `/politicas` declarando-o como subprocessador ativo — corrigido no site e no app — e um guard que dependia de env var, agora travado no código (`GA4_LIBERADO`) e coberto por teste | Técnico | Feito | C2.2 |
| **C2.10** | ✅ **Resolvido em 04/09/2026 sem ferramenta estrangeira.** A campanha não tem analytics de terceiro; a origem do lead passou a ser gravada no próprio banco (`SignupSource`, agora com YouTube e LinkedIn). Responde "qual canal traz cadastro" sem transferência internacional, sem cookie e sem depender da advogada | Técnico | Feito | C2.9 |
| C2.4 | Adotar as **CPC da ANPD** conforme a decisão de C2.3 — na íntegra, sem modificação (Res. 19/2024; prazo vencido em 23/08/2025) | Advogada + Fundador | CPC adotadas | C2.3 |
| **C2.7** | 🔨 **Publicar o documento da Cláusula 14** — rascunho pronto em `clausula-14-transparencia-transferencia.md`. **Não depende de terceiro nenhum**: é a única linha de C2 que pode andar hoje | Dev + DPO | Página publicada (gated D4) | — |
| **C2.8** | Formalizar o atendimento da **Cláusula 15** (direitos do titular) e da **Cláusula 16** (comunicação de incidente) — no Módulo 2 as duas são obrigação do **exportador**, não da Stripe | DPO | Procedimento escrito | — |
| C2.5 | Refletir o resultado na **Política de Privacidade** (seção de subprocessadores/transferência) | Dev (draft) | Texto revisado (gated go-live) | C2.4 |
| C2.6 | Preferência estrutural: manter dados sensíveis (CPF, KYC, financeiro) **em sa-east-1** sempre que possível (minimizar transferência) | Arquiteto | Nota de arquitetura | — |

**Prazo sugerido:** 2–3 semanas (depende do retorno dos fornecedores). **Não bloqueia** a assinatura do contrato MP.

---

## 3. C3 — RIPD e Designação Formal do DPO

**Rascunho base já entregue:** `docs/juridico/rascunho-ripd.md` (#116).

### 3.1 RIPD (Relatório de Impacto à Proteção de Dados)

| # | Atividade | Responsável | Entregável | Dependência |
|---|---|---|---|---|
| C3.1 | Revisar o rascunho do RIPD contra o modelo **atual** (Mercado Pago = **operador** de dados financeiros) | DPO + Advogada | RIPD revisado | — |
| C3.2 | Ajustar o **risco F-09** (selfie de KYC = dado biométrico sensível, art. 11) — base legal passa a **consentimento específico** (decisão C1) | DPO | Seção de risco atualizada | Decisão C1 (✅) |
| C3.3 | Incluir MP no RIPD (Seções B / D.2 / C.6) como operador | Dev (draft) | Draft atualizado | C3.1 |
| C3.4 | **Validar e assinar** o RIPD | DPO | RIPD assinado | C3.1–C3.3 |
| C3.5 | **Arquivar formalmente** o RIPD (registro interno + data + versão) | DPO | RIPD arquivado | C3.4 |

### 3.2 Designação formal do DPO/Encarregado

| # | Atividade | Responsável | Entregável | Dependência |
|---|---|---|---|---|
| C3.6 | Decidir **quem** é o DPO (interno × terceirizado/DPO-as-a-Service) | Fundadores | Decisão registrada | — |
| C3.7 | **Ato formal de nomeação** do Encarregado (LGPD art. 41) | Fundadores/Societário | Documento de nomeação | C3.6 |
| C3.8 | Publicar a identidade/canal do Encarregado no site (`/privacidade`) | Dev | Seção publicada (go-live) | C3.7 |
| C3.9 | Registrar o canal de atendimento ao titular (`privacidade@shareo.com.br` — **já configurado tecnicamente**) | ✅ Feito | — | — |

**Prazo sugerido:** 1–2 semanas após a definição de quem será o DPO.

---

## 4. Dependências, sequência e critério de conclusão

```
C1 (biometria, ✅) ─────────────► C3.2 (ajuste risco F-09)
                                        │
C2.1 inventário ──► C2.2 DPAs ──► C2.3 cláusulas EUA ──► C2.4 base legal ──► C2.5 Política
                                                                                  │
C3.6 quem é DPO ──► C3.7 nomeação ──► C3.8 publicação ─────────────────────────┐ │
                                                                               ▼ ▼
C3.1 revisar RIPD ──► C3.3 incluir MP ──► C3.4 assinar ──► C3.5 arquivar ──► [CHECKLIST C2/C3 = ✅]
```

**Critério de conclusão (fecha C2 e C3 do checklist de go-live):**
- ✅ Todos os DPAs/cláusulas-padrão assinados e arquivados.
- ✅ RIPD revisado, assinado pelo DPO e arquivado.
- ✅ DPO formalmente nomeado e publicado.
- ✅ Política de Privacidade com as seções de subprocessadores/transferência prontas (publicação no go-live).

Com C2 e C3 fechados, restam para o checklist 100%: **B1** (contrato MP — bloqueador principal) e **B3** (parecer do tributarista).

---

## 5. O que NÃO é necessário fazer

- ❌ Nenhuma alteração de código de produção — os mecanismos técnicos (criptografia, direitos do titular, logs art. 15 atrás de flag) **já existem**.
- ❌ Nenhuma publicação de Política revisada antes do go-live (condição 3, gated D4).
- ❌ Nenhuma ativação de flag (`accessLogsEnabled`, `biometricConsentRequired`) antes das decisões de retenção/consentimento estarem assinadas.

---

*Documento de trabalho — insumo para os fundadores, a advogada e o DPO. Gated D4. Ver `docs/juridico/checklist-conformidade-juridica.md` e `docs/juridico/parecer-juridico-revisado-mp.md`.*
