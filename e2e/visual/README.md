# Regressão Visual — ShareO

Testes de screenshot usando o recurso **nativo do Playwright** (`toHaveScreenshot`).
Não usa SaaS externo (Percy/Chromatic) — todas as imagens ficam locais no repositório.

## Por que Playwright nativo e não Percy/Chromatic?

| Critério | Playwright nativo | Percy/Chromatic |
|---|---|---|
| Custo | Gratuito | Plano pago acima do free tier |
| LGPD / privacidade | Screenshots ficam locais | Imagens sobem para servidores externos |
| Latência | Zero (arquivo local) | Round-trip de rede |
| Setup | Integrado ao Playwright existente | SDK adicional + conta SaaS |
| Desvantagem | Baseline por plataforma (ver abaixo) | Gerenciamento de baselines na nuvem |

Para um produto pré-lançamento, sensível a custo e a dados de usuários (LGPD), a
abordagem local é a escolha correta. Um SaaS pode ser avaliado pós-D4 se o time
crescer e a gestão de baselines entre plataformas se tornar gargalo.

## Estrutura

```
e2e/visual/
  visual-regression.spec.ts       ← spec com os testes
  README.md                        ← este arquivo
  visual-regression.spec.ts-snapshots/
    home-hero-1.png                ← baselines (commitadas no repo)
    home-simulador-1.png
    home-categorias-1.png
    home-full-1.png
    itens-header-1.png
    itens-full-1.png
    itens-empty-state-1.png
    login-form-1.png
    login-full-1.png
    ...                            ← sufixo -1 = project visual-desktop
    ...                            ← sufixo -2 = project visual-mobile
playwright.visual.config.ts        ← config isolada (NÃO altera e2e principal)
```

## Scripts

```bash
# Rodar os testes visuais contra baselines existentes
pnpm test:visual

# Gerar / atualizar baselines (necessário após mudanças visuais intencionais)
pnpm test:visual:update

# Rodar apenas um describe específico
pnpm test:visual -- --grep "Visual — Home"
```

## Importante: baselines são específicas de plataforma

O Playwright gera screenshots usando a engine de renderização do OS.
**Baselines geradas no Windows renderizam fontes de forma diferente do Linux.**

- Baselines commitadas neste repositório foram geradas em **Windows 11**.
- O CI principal (`ci.yml`) roda em **Linux (ubuntu-latest)**.
- Por isso, **o job visual NÃO está no gate obrigatório de CI** — ele rodaria com
  divergências de pixel e quebraria pipelines por diferenças de plataforma, não por
  regressões reais de UI.

### Follow-up: como gerar baselines Linux para uso no CI

Quando o time quiser adicionar regressão visual ao gate de CI, gere as baselines
usando o container oficial do Playwright no Linux:

```bash
# 1. Certifique-se de ter Docker instalado
# 2. Na raiz do projeto:
docker run --rm \
  -v "${PWD}:/work" \
  -w /work \
  mcr.microsoft.com/playwright:v1.52.0-jammy \
  pnpm test:visual:update

# 3. As novas baselines serão geradas em e2e/visual/...snapshots/
# 4. Commite as baselines Linux
# 5. Adicione o job ao ci.yml apontando para playwright.visual.config.ts
```

Nota: substitua `v1.52.0` pela versão do `@playwright/test` em uso (`pnpm list @playwright/test`).

## O que é mascarado (anti-flakiness)

### Home (/)
- `[role="list"][aria-label="Números da plataforma"]` — contadores dinâmicos do banco
  (itemCount, ownerCount, avgRating, cityItemCount)
- `#lista-vip p:last` — social proof count de leads (FounderLead do banco)
- `#lista-vip form` — formulário de captação (FounderCaptureForm)

### Listagem (/itens)
- `article` — cards de item inteiros (título, preço, imagem, localização — todos do banco)
- `[aria-live="polite"]` — contador "N anúncios encontrados"
- `.mapboxgl-map` — mapa Mapbox (tiles externos + pins dinâmicos)
- `main img` — imagens dos cards (URLs do Supabase Storage)

### Login (/login)
- `main > p:last` — `© 2026 ShareO` gerado com `new Date().getFullYear()`

## Quando atualizar as baselines

Execute `pnpm test:visual:update` quando:
- Uma mudança visual intencional foi feita (redesign, novo componente, ajuste de cor)
- O Design System foi atualizado (tokens, fontes, breakpoints)
- A versão do Chromium no `@playwright/test` foi atualizada (renderização pode mudar)

Depois de rodar o update, **revise as imagens geradas** antes de commitar —
o diff visual deve refletir exatamente o que mudou intencionalmente.
