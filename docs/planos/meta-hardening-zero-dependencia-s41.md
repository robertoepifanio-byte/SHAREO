# META — Sprint de Endurecimento Zero-Dependência (s41)

**Estabelecida:** 2026-07-01 · **Sessão:** s41
**Contexto:** enquanto o go-live está travado por dependências externas (contrato Mercado Pago + conta PJ, parecer de tributarista, DPAs, RIPD/DPO formal, conta Play Store), há trabalho de **qualidade, robustez e conformidade** que pode avançar **agora** sobre o que **já existe** — sem esperar ninguém e sem inventar nada.

---

## 🎯 Objetivo

Elevar a **qualidade, segurança, acessibilidade e robustez** do produto atual (web + mobile + backend), **sem criar funcionalidades novas** e **sem quebrar nada que funcione**.

## 🚫 Regras invioláveis (valem para TODOS os especialistas)

1. **NÃO criar funcionalidade nova.** Nenhuma tela, endpoint, fluxo ou capacidade nova voltada ao usuário. Correção ≠ funcionalidade.
2. **NÃO quebrar o que já funciona.** `tsc` + `lint` + testes **verdes antes e depois**. Comportamento observável **inalterado**, exceto correção declarada de bug. Flags que estão **OFF permanecem OFF**.
3. **Qualquer necessidade de funcionalidade nova OU risco de quebra → NÃO fazer.** Reportar e **incluir no backlog** (`docs/backlog-atividades-priorizadas.md`) para análise dos fundadores. Na dúvida entre "corrigir" e "criar", trata-se como criação → backlog.
4. **Zero dependência externa.** Nada que dependa de contrato MP, advogada, tributarista, DPO, conta Play, credenciais de terceiros ou decisão de negócio pendente.
5. **Nada de produção** (gated D4). Sem deploy live, sem Supabase prod, sem ativar flags.
6. **PRs pequenos e revisáveis por domínio.** Um PR coeso por frente; descrição lista o que mudou e por que é seguro. **O diff será revisado antes de mesclar** (lição P19: agente pode introduzir regressão).

---

## ✅ Escopo IN — desenvolver agora

- Correção de **bugs** confirmados.
- **Hardening de segurança** de código já existente (ex.: `logAccess()` fire-and-forget → `after()` antes de qualquer flag ligar).
- **Acessibilidade (WCAG AA)** em telas **existentes** (contraste, foco, aria, tap targets) — sem redesenho.
- **Cobertura de testes** (unit/E2E) de código já existente.
- **DRY / deduplicação / tech-debt** sem mudar comportamento.
- **Hygiene de config/CI** (ex.: ruído de jest em worktrees, `eas.json` `appVersionSource`, warnings de build).
- **Correção de copy desalinhada** com decisões já tomadas (ex.: mobile "Caução"/"Pagamento seguro via ShareO"; `API_URL` mobile apontando para deploy que dá 401).
- **Alinhamento de documentação** (STATUS, backlog, ADRs) com o estado real.
- **Performance** (Core Web Vitals) sem alterar funcionalidade.

## ⛔ Escopo OUT — não fazer, mandar ao backlog

- Mobile: **reservar+pagar**, **anunciar**, **KYC/biometria**, mapa, favoritos (funcionalidades novas — ver `docs/planos/plano-mobile-lojas.md`).
- **Canal de denúncia art. 19** (roadmap H2).
- **Arrependimento art. 49** (`withdrawalRightEnabled`), **política PLD**, finalização do **contrato de locação** — decididos, mas são capacidades novas / dependem de texto jurídico → backlog.
- Qualquer item **flag-gated que adicione capacidade** nova.
- Qualquer coisa que dependa de **D4 / Mercado Pago / terceiros**.

---

## 👥 Atribuições por especialista

| Especialista | Frente | Entregável |
|---|---|---|
| **fullstack-dev-shareo** | Correções seguras conhecidas: `logAccess()`→`after()`; mobile `API_URL`→staging + `eas.json` `appVersionSource`; copy mobile (caução/custódia). Bugs seguros que encontrar. | PR(s) por domínio + backlog do que for arriscado |
| **qa-shareo** | Lacunas de teste (unit/E2E) de código existente + auditoria a11y em telas existentes (aplicar só correções seguras) | PR de testes/a11y + backlog |
| **seguranca-shareo** | Auditoria OWASP/LGPD do código existente → lista priorizada de correções **sem dependência/sem feature** + o que exige análise | Relatório read-only |
| **arquiteto-shareo** | Auditoria DRY/dedup/tech-debt (sem mudar comportamento) → lista de refatores seguros + o que exige análise | Relatório read-only |
| **designer-shareo** | Auditoria de UI/a11y/consistência em telas existentes (sem redesenho) → achados priorizados | Relatório read-only |

Consolidação (dedup dos achados, aplicação dos fixes seguros dos relatórios read-only, escrita do backlog) fica comigo.

---

*Fonte da verdade desta meta. Ver `docs/STATUS.md`, `docs/backlog-atividades-priorizadas.md`, `docs/juridico/checklist-conformidade-juridica.md`.*
