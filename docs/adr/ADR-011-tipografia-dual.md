# ADR-011 — Tipografia Dual: Inter (UI) + Montserrat (Branding)

**Status:** Aceito  
**Data:** 2026-05-31  
**Decisores:** Roberto Epifânio, Designer ShareO

---

## Contexto

O protótipo v2 usava Montserrat como fonte única para toda a interface. Montserrat é uma fonte de display (inspirada em letreiros urbanos) — adequada para branding e títulos, mas menos otimizada para corpo de texto, formulários e navegação em telas pequenas (14–16px).

A sugestão de adotar Inter foi levantada durante a revisão do Documento de Identidade Visual (DID v1.0) e avaliada contra os requisitos de acessibilidade (WCAG 2.1 AA) e responsividade mobile-first.

---

## Decisão

Adotar estratégia de **tipografia dual**:

| Camada | Fonte | Pesos | Uso |
|---|---|---|---|
| Branding / Display | **Montserrat** | 600, 700, 800 | Headings (h1–h6), títulos de seção, logo, hero |
| Interface / UI | **Inter** | 400, 500, 600, 700 | Corpo de texto, labels, botões, formulários, menus, navegação |

**CSS aplicado:**
```css
body { font-family: 'Inter', Arial, sans-serif; }
h1, h2, h3, h4, h5, h6,
.section-title, .dash-section-title,
.hero h1, .logo-box, .back-title { font-family: 'Montserrat', sans-serif; }
```

**Fallback seguro:** Arial (sistema) garante que a interface seja utilizável mesmo sem carregamento do Google Fonts.

Georgia e Playfair Display foram descartadas — fontes editoriais incompatíveis com o estilo limpo, moderno e sustentável do ShareO.

---

## Razões

- **Inter** foi projetada especificamente para telas digitais: melhor legibilidade em 14–16px, espaçamento consistente, rendering superior em mobile
- **Montserrat** mantém a identidade visual da marca nos elementos de destaque (conforme DID v1.0)
- Redução de carga: Montserrat carrega apenas pesos 600/700/800 (display), Inter carrega 400–700 (UI)
- Melhora de contraste e legibilidade em formulários — alinhado com Opção 3 "Boa Legibilidade"

---

## Consequências

- O DID v1.0 deve ser atualizado para refletir a tipografia dual em sua próxima revisão
- Todos os novos componentes React/Next.js devem importar Inter via `next/font/google` e aplicar Montserrat apenas em headings
- O Tailwind config deve mapear: `fontFamily.sans = ['Inter', 'Arial']` e `fontFamily.display = ['Montserrat']`
