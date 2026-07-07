# /shareo-transcrever-tela

**Nome do skill:** Transcrição literal de tela site → app mobile

**Uso:** `/shareo-transcrever-tela <tela ou rota do site>` (ex.: `/shareo-transcrever-tela /perfil/documentos`)

Você vai implementar (ou corrigir) uma tela em `apps/mobile/` **transcrevendo** o site responsivo em 375px. Esta skill existe porque o fundador rejeitou 2 protótipos que "adaptaram" o design e o padrão se repetiu em ~15 correções — a regra é **copiar, nunca inventar** (CLAUDE.md, regra de 2026-07-02).

## Processo obrigatório (nesta ordem)

### 1. Localizar e LER o JSX-fonte antes de escrever qualquer linha
- Identifique TODOS os arquivos do site que compõem a tela: página em `app/**/page.tsx`, componentes privados `_*.tsx`, `components/layout/AppHeader.tsx`, `BottomNav.tsx`, `MobileMenu.tsx`, etc.
- Leia o JSX inteiro de cada um. Anote verbatim: rótulos, textos, ordem dos elementos, ícones (SVG exato), cores (tokens), espaçamentos, estados (loading/erro/vazio).
- Se a tela consome API, anote o endpoint e o shape da resposta usados pelo site.
- Confira no protótipo aprovado se a tela existe: `docs/design/mobile-app-prototipo-v1.html` + rastreabilidade em `docs/design/mobile-app-handoff.md`.

### 2. Transcrever
- Tokens de cor/tipografia SEMPRE via `apps/mobile/lib/theme.tsx` (transcritos de `app/globals.css`) — nunca hex hardcoded. Dark mode vem de graça pelos tokens (MOB-BL3).
- **Todo arquivo novo/alterado começa com `// Fonte: <arquivo(s) do site transcrito(s)>`.**
- Rótulos e textos são copiados byte a byte (incluindo acentos, maiúsculas, pontuação).
- Na dúvida entre "padrão nativo" e "copiar o site mobile": **copiar o site**.
- O site é sub-WCAG em alguns pontos (badges, verde claro) — **paridade vale mais que "corrigir"**; não melhore contraste/estilo por conta própria.

### 3. Autenticação e API
- Rotas de API consumidas pelo app usam Bearer token: o handler do site precisa usar `resolveUserId` (não `auth()` cookie-only) — padrão sistêmico já corrigido 8×. Se a rota for cookie-only, corrija o handler junto (admin permanece cookie-only).

### 4. Testes
- Teste RNTL fixando os **rótulos exatos** transcritos (rótulo inventado = CI quebra). Use `jest-expo`.
- `npx tsc --noEmit` **não basta**: `babel-preset-expo` quebra com coisas que o tsc aceita (ex.: `declare` em campo de classe). Valide bundlando de verdade (`npx expo export` ou smoke no Metro) antes de declarar pronto.

### 5. PR
- A descrição do PR inclui a **tabela de auditoria componente/tela → arquivo-fonte**:

| Elemento no app | Arquivo-fonte no site | Verbatim? |
|---|---|---|
| ... | ... | ✅ |

### 6. Verificação (gate de "resolvido")
- NUNCA reporte a tela como concluída com base só em código/tsc. Evidência mínima: teste RNTL verde + bundle Metro ok; ideal: screenshot no device/emulador.
- Se a tela substitui um redirect para o site (`Linking.openURL` em `apps/mobile/app/(tabs)/perfil.tsx` e afins), **remova o redirect** e confirme que a rota nativa é usada — "tela criada mas redirect mantido" já causou retrabalho repetido.

## Gotchas conhecidos (memória do projeto)
- Token `navy` do tema mobile é congelado no light; flip dark = `#1E4D80`.
- Categoria "Eletrodomésticos" tem slug `casa-jardim` (renomeada — não "corrigir" o slug).
- Verde claro `#59C686` nunca com texto branco.
- Tap targets ≥ 44×44px (`min-h-11` no site → equivalente RN).
- Device de teste é o celular pessoal do fundador — cuidado com automação que dispara notificações/reservas reais.
