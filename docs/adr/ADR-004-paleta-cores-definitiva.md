# ADR-004 — Paleta de Cores Definitiva do ShareO

**Status:** Aceito
**Data:** 2026-05-30
**Decisores:** Roberto Epifânio (Product Owner), Arquiteto ShareO
**Contexto relacionado:** ADR-001 (Auth), ADR-002 (Mapas), ADR-003 (Chat)

> Nota de numeração: o repositório possui uma pasta legada `/ADRs/` (PascalCase, root)
> com um `ADR-004-criptografia-documentos.md` pré-existente. Este novo ADR vive em
> `/docs/adr/` (kebab-case, conforme padrão do CLAUDE.md). A renumeração/realocação
> dos ADRs legados será tratada em ADR posterior de governança documental.

---

## Contexto

Foi identificada uma divergência crítica entre os artefatos de identidade do ShareO e a configuração de tema do app Next.js, gerando risco de inconsistência visual entre o que foi aprovado pelo Product Owner (protótipo + documento de identidade) e o que está efetivamente implementado em produção.

### Artefatos em conflito

| Artefato | Navy | CTA primário | Laranja | Fonte |
|---|---|---|---|---|
| `shareo-prototipo.html` (aprovado) | `#0D1B2A` | Laranja `#C05800` | `#F97316` / `#C05800` / `#9A4700` | Inter |
| Documento de Identidade Visual v1.0 | `#0D1B2A` | Laranja `#C05800` | `#F97316` (decorativo) | Inter |
| `tailwind.config.ts` (snapshot divergente) | `#003366` | Verde `#007B3C` | Ausente | Montserrat |

### Por que isso é um problema

1. **Quebra de identidade**: a marca ShareO é construída sobre o contraste navy + laranja desde o protótipo inicial. Trocar laranja por verde transforma a marca em algo visualmente indistinguível de competidores de economia verde/eco.
2. **Risco de retrabalho**: cada tela implementada com a paleta divergente precisará ser revisitada antes do go-live.
3. **Confusão semântica**: verde no ShareO tem semântica de *sucesso/eco/confirmação* — usá-lo como CTA primário sobrecarrega a cor e elimina o sinal de feedback positivo.
4. **Acessibilidade não auditada**: o snapshot divergente não documentou ratios WCAG, enquanto a paleta do protótipo já foi validada para WCAG 2.1 AA.
5. **Tipografia errada**: Montserrat não consta em nenhum artefato de identidade — Inter é a fonte oficial.

### Decisão prévia explicitamente registrada no backlog

A sugestão de adotar verde `#2ECC71` como cor de ação foi **formalmente rejeitada** pelo Product Owner. Esta decisão consolida e formaliza arquiteturalmente essa rejeição.

---

## Decisão

Adotamos como **paleta única e definitiva do ShareO** os tokens abaixo. Toda implementação (Tailwind, CSS-in-JS, SVGs, e-mails transacionais, materiais de marketing) deve referenciá-los — nenhum hex literal fora desta tabela é permitido em código de produção.

### Tabela canônica de tokens

| Token | Hex | Ratio WCAG (sobre branco / sobre navy) | Uso permitido | Uso proibido |
|---|---|---|---|---|
| `navy` | `#0D1B2A` | 18.1 : 1 sobre branco | Header, footer, textos de título, ícones em fundo claro, gradiente do hero | — |
| `orange.DEFAULT` | `#F97316` | 2.97 : 1 sobre branco (FALHA AA) | **Decorativo apenas**: fills de SVG, ilustrações, badges sem texto, ícones grandes (≥ 24px) sobre branco | **NUNCA** texto sobre branco. **NUNCA** botão com texto branco. |
| `orange.cta` | `#C05800` | 4.47 : 1 sobre branco (AA ✓) | **Único laranja permitido em botões CTA com texto branco**. Estado default de botões primários. | Texto pequeno (<14px) sobre branco. |
| `orange.link` | `#9A4700` | 6.50 : 1 sobre branco (AA ✓ / AAA para texto grande) | **Único laranja permitido em texto/link** sobre fundo branco ou off-white. Links inline, breadcrumbs ativos, números destacados. | Fundos largos. |
| `orange.hover` | `#A34700` | 5.85 : 1 sobre branco (AA ✓) | Estado `:hover` e `:focus` de `orange.cta`. | Estado default. |
| `orange.light` | `#FFF7ED` | — (fundo) | Backgrounds sutis: chips ativos, alertas informativos laranja, hover de category chips. Texto sobre este fundo deve usar `orange.link` ou `navy`. | Texto. |
| `green` (`#22C55E`) | `#22C55E` | 2.42 : 1 sobre branco (FALHA AA) | **Restrito a semântica de sucesso, eco e confirmação**: ícone de check em toasts de sucesso, badge "Disponível", indicador de devolução OK, selo "Eco-friendly", borda de estado selecionado positivo. | **NUNCA como CTA primário.** Nunca como cor de ação genérica. Nunca como texto em fundo branco. |
| `green.dark` | `#15803D` | 5.93 : 1 sobre branco (AA ✓) | Texto verde sobre branco (ex.: "+12% este mês" em KPIs, valor de receita). Fundo de toast de sucesso (`success.bg`). | CTA primário. |
| `green.light` | `#DCFCE7` | — (fundo) | Background de badges/toasts de sucesso. Texto sobre este fundo: `green.dark`. | Texto. |
| `off-white` | `#F8FAFC` | — (fundo) | Background de página, seções alternadas, hover sutil de cards. | Texto. |
| `surface` | `#FFFFFF` | — (fundo) | Cards, modais, dropdowns, inputs. | — |
| `text.primary` | `#0F172A` | 19.3 : 1 sobre branco | Texto principal (body, parágrafos, labels). | Sobre navy (use `surface`). |
| `text.muted` | `#64748B` | 4.66 : 1 sobre branco (AA ✓) | Texto secundário, captions, metadados, placeholders. | Texto crítico (use `text.primary`). |
| `border` | `#E2E8F0` | — | Bordas de inputs, dividers, contorno de cards. | — |
| `error` | `#EF4444` | 3.76 : 1 sobre branco | Ícone de erro, borda de campo inválido, badge "Cancelado". | Texto pequeno (use `error.dark`). |
| `error.dark` | `#DC2626` | 4.83 : 1 sobre branco (AA ✓) | Texto de mensagem de erro, link "Excluir conta". | — |

### Regras arquiteturais inegociáveis

1. **`#F97316` é decorativo apenas.** Nenhum texto, nenhum botão com texto sobre `#F97316`. Apenas fills, ilustrações e ícones grandes.
2. **`orange.cta` (`#C05800`) e `orange.link` (`#9A4700`) são os únicos laranja permitidos em texto/botões.** Qualquer outro tom de laranja em produção é bug.
3. **Verde `#22C55E` nunca é CTA primário.** Verde sinaliza *sucesso, eco, confirmação* — sobrecarregar a cor destrói o sinal semântico.
4. **Navy `#0D1B2A` é a cor de header e textos escuros de título.** `#003366` está banido — qualquer ocorrência é dívida técnica a corrigir.
5. **Fonte oficial: Inter.** Montserrat está banido. Carregar via `next/font/google` com variável CSS `--font-inter`.
6. **Hex literais em código TSX/CSS são proibidos** fora de `tailwind.config.ts` e do design tokens file. Sempre referenciar via classe Tailwind (`text-orange-link`, `bg-navy`, `border-error`).
7. **Estados de hover/focus de CTA laranja usam `orange.hover` (`#A34700`)** — não escurecer dinamicamente via `filter: brightness()`.
8. **Toda PR que introduzir nova cor deve referenciar este ADR** e justificar a adição via emenda a este documento.

### Hierarquia visual de ação (resolve a confusão semântica)

| Tipo de ação | Cor | Token |
|---|---|---|
| CTA primário (alugar, criar anúncio, confirmar reserva) | Laranja | `orange.cta` |
| CTA secundário (cancelar, voltar, ações neutras) | Navy outline | `border-navy text-navy` |
| Ação destrutiva (excluir, remover) | Vermelho | `error.dark` |
| Confirmação de sucesso (badge, toast, check) | Verde | `green.dark` / `green` |
| Link inline / breadcrumb ativo | Laranja escuro | `orange.link` |

---

## Alternativas consideradas

### Opção A — Adotar a paleta do `tailwind.config.ts` divergente (navy `#003366` + verde `#007B3C` como CTA)

- **Prós**: Zero retrabalho em telas já implementadas com essa paleta.
- **Contras**:
  - Conflita com o protótipo aprovado e com o documento de identidade visual v1.0.
  - Elimina o laranja, descaracterizando a marca.
  - Sobrecarrega o verde, eliminando o sinal de "sucesso".
  - Foi explicitamente rejeitada pelo Product Owner.
- **Veredicto**: **Rejeitada.**

### Opção B — Substituir laranja por verde `#2ECC71` como CTA

- **Prós**: Verde reforça narrativa de economia circular/sustentabilidade.
- **Contras**:
  - Rejeitada formalmente pelo Product Owner (registro em backlog).
  - `#2ECC71` tem ratio 2.07:1 sobre branco — falha WCAG AA mesmo para texto grande.
  - Destrói a distintividade visual do ShareO no mercado.
- **Veredicto**: **Rejeitada.**

### Opção C — Manter laranja `#F97316` puro como CTA com texto branco

- **Prós**: Cor mais vibrante, alinhada à percepção de "laranja Shareo".
- **Contras**:
  - Ratio 2.97:1 sobre branco — **falha WCAG AA** para botões com texto branco.
  - Inviável para conformidade de acessibilidade (requisito não-negociável do produto).
- **Veredicto**: **Rejeitada por barreira de acessibilidade.**

### Opção D — Paleta do protótipo + alias acessível para CTA (`#C05800` e `#9A4700`) — **ESCOLHIDA**

- **Prós**:
  - Preserva integralmente a identidade visual aprovada.
  - Resolve o gap de acessibilidade do laranja com aliases WCAG-safe.
  - Mantém verde com semântica clara de sucesso/eco.
  - Já está parcialmente implementada no `tailwind.config.ts` (tokens `orange.cta`, `orange.link`).
  - Validada contra documento de identidade v1.0.
- **Contras**:
  - Requer auditoria de telas existentes que usem navy `#003366` ou verde como CTA.
  - Exige educação do time sobre quando usar cada alias laranja.
- **Veredicto**: **Aceita.**

---

## Consequências

### Positivas

- **Identidade consistente** entre protótipo, código de produção, e-mails transacionais e materiais de marketing.
- **Conformidade WCAG 2.1 AA garantida** em todos os tokens de texto e ação (4.47:1 mínimo).
- **Semântica preservada**: verde = sucesso/eco, laranja = ação, navy = estrutura. Cada cor com função clara reduz ambiguidade na UX.
- **Decisão arquitetural unilateral elimina bikeshedding**: futuras discussões sobre paleta apontam para este ADR.
- **Onboarding técnico mais rápido**: novos devs têm uma única fonte de verdade.
- **SEO/branding fortalecido**: marca laranja/navy é mais memorável que mais um app verde de economia circular.

### Negativas / Trade-offs

- **Dívida técnica imediata**: `tailwind.config.ts` precisa de auditoria final (já parcialmente migrado), e telas existentes que usem `#003366` ou verde como CTA precisarão de refactor.
- **Curva de aprendizagem**: devs precisam memorizar que `orange.DEFAULT` ≠ `orange.cta` ≠ `orange.link` e quando usar cada um. Mitigação: linter customizado para barrar hex literais.
- **Laranja CTA `#C05800` é menos vibrante** que o `#F97316` puro — sacrifício necessário para WCAG AA.
- **Risco de regressão visual** em telas refatoradas — requer revisão visual no Playwright + Percy/Chromatic.
- **E-mails transacionais e SVGs estáticos** precisam ser reauditados manualmente (não passam pelo Tailwind).

### Quando reavaliar esta decisão

- Se WCAG 3.0 (APCA) for adotado como padrão e os ratios mudarem significativamente.
- Se houver rebrand formal aprovado pelo PO com novo documento de identidade visual.
- Se pesquisa quantitativa com usuários (n ≥ 200) demonstrar que laranja CTA tem CTR significativamente inferior a alternativa testada.
- Se for adicionado modo escuro (dark mode), que exigirá tokens espelhados — registrar em ADR separado.

---

## Artefatos a atualizar

### Código (obrigatório — bloqueia próxima release)

- [ ] `tailwind.config.ts` — confirmar que `navy = #0D1B2A`, remover qualquer referência a `#003366` (atualmente em `ringColor.primary` e `accent.foreground`), confirmar fonte `var(--font-inter)`.
- [ ] `app/layout.tsx` (ou equivalente) — garantir carregamento de `Inter` via `next/font/google` com variável `--font-inter`.
- [ ] `app/globals.css` — sincronizar CSS vars (`--navy`, `--orange-cta`, `--orange-link`, `--green`) com a tabela canônica.
- [ ] Componentes em `components/` — remover hex literais, substituir por classes Tailwind tokenizadas.
- [ ] `public/` SVGs e logos — auditar fills laranja e navy.
- [ ] Templates de e-mail transacional (se já criados) — aplicar paleta canônica.

### Documentação

- [ ] `CLAUDE.md` — seção "Design System" já reflete navy `#0D1B2A`, laranja `#F97316`, verde `#22C55E`. Adicionar nota: *"Para uso em texto/CTA ver ADR-004 — não usar `#F97316` em texto."*
- [ ] `docs/component-spec.md` — referenciar este ADR na seção de cores.
- [ ] `docs/prototype-to-implementation.md` — registrar paridade da paleta com o protótipo.
- [ ] `README.md` — adicionar link para este ADR na seção de Design System.
- [ ] Storybook (quando criado) — documentar tokens com exemplos visuais.

### Governança

- [ ] Adicionar regra de ESLint/Stylelint para barrar hex literais fora de `tailwind.config.ts` e `globals.css`.
- [ ] Adicionar check de CI rodando `jest-axe` em snapshots de componentes para garantir contraste mínimo.
- [ ] Atualizar PR template com checkbox: *"Cores usadas referenciam tokens do tailwind.config.ts (ADR-004)?"*.
- [ ] Renumerar/realocar ADRs legados em `/ADRs/` para `/docs/adr/` em ADR de governança documental (próximo sprint).

### Validação

- [ ] Rodar Lighthouse + axe-core em staging após migração — meta: 0 issues de contraste.
- [ ] Auditoria visual lado-a-lado: `shareo-prototipo.html` vs. staging build em 375px, 768px, 1280px.
- [ ] Aprovação final do Product Owner em revisão visual antes do merge para `main`.
