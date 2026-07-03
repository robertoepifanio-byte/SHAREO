# Meta: Re-transcrição rigorosa do app Android (s41, 2026-07-03)

## Contexto

O app mobile (`apps/mobile/`) foi redesenhado em 3 lotes (PRs #171–#173) sob a regra de
**transcrição literal** do site responsivo (CLAUDE.md, seção "App mobile — REGRA DE
TRANSCRIÇÃO LITERAL"). Os 3 lotes se autodeclararam completos, com tabela de auditoria
componente→arquivo-fonte e testes RNTL. **Essa auditoria deu falsa confiança.**

Ao testar em device físico real pela primeira vez (Moto G56 5G, via `adb`), encontramos
uma sequência de bugs que a auditoria original NUNCA pegou:

| Achado | Causa raiz | Por que a "auditoria" não pegou |
|---|---|---|
| App fechava ao logar | `accessibilityRole="tabbar"` — valor inválido no Android, mas presente no *union type* do RN | tsc não acusa (o tipo aceita); só aparece como crash nativo em device real |
| `getDevServer is not a function` | `metro.config.js` sem config de monorepo pnpm | Nunca rodou em device real, só nunca-testado |
| 5 dependências fantasma (`@expo/metro-runtime`, `whatwg-fetch`, `@babel/runtime`, `@react-navigation/native`, `@react-navigation/drawer`) | Nunca declaradas no `package.json` | `tsc`/`jest` passam sem elas (resolução via hoisting acidental do pnpm); só falha no bundle de produção real |
| "Rendered more hooks than during previous render" | `useMemo` depois de `return` condicional em `itens/[id].tsx` | tsc não pega Rules of Hooks; só quebra ao navegar com dado real |
| Ícones de categoria diferentes do site | Agente recriou em SVG de linha em vez de usar os PNGs reais que já existem em `public/icons/` | Ninguém comparou lado a lado com o site renderizado |
| Filtro de categoria e busca não funcionavam | Mobile mandava `q`/`category` (slug); a API espera `search`/`categoryId` (id real) | Ninguém leu o Zod schema real (`ListItemsQuerySchema`) nem testou a chamada |
| Home só tinha o hero — faltavam 6 seções inteiras | Agente do Lote 2 só leu a parte do `app/page.tsx` mencionada no protótipo, não o arquivo completo | Ninguém comparou contagem de seções entre site e app |
| `/sobre` → Unmatched Route | Link no menu para rota nunca criada | Ninguém rodou grep de todos os `href`/`router.push` contra os arquivos de rota reais |
| `/itens/novo` (Anunciar) — form bem mais simples que o site, faltam campos inteiros | Essa tela foi construída ANTES da regra de transcrição existir (Fase 5, PR #163) e nunca foi reconciliada com `components/items/ItemForm.tsx` | Nunca foi comparada campo a campo com o form real |

**Conclusão:** o padrão de falha é sempre o mesmo — **o agente leu o código-fonte e escreveu
algo parecido, mas nunca rodou o app de verdade nem comparou elemento a elemento.**

## Protocolo obrigatório (todo agente desta campanha segue TODOS os itens)

1. **Ler o arquivo-fonte COMPLETO, do início ao fim** — não parar na primeira seção que
   parecer relevante. Se o arquivo importa subcomponentes (`components/home/*`,
   `components/items/*` etc.), ler cada um também, por completo.
2. **Assets reais antes de recriar em SVG.** Antes de desenhar qualquer ícone/gráfico à
   mão, grep em `public/` procurando um PNG/imagem já existente para aquele propósito
   (ex.: `components/ui/CategoryIcon.tsx` usa PNG real; só cai pra SVG Lucide como
   fallback). Nunca redesenhar um ícone que já tem um asset de origem — copiar o arquivo.
3. **Nunca inventar nome de parâmetro de API.** Antes de qualquer `fetch`/`apiFetch` para
   uma rota `/api/...`, ler o *route handler* real (`app/api/.../route.ts`) e o schema Zod
   correspondente (`lib/validations/*.ts`) para confirmar nome exato e tipo de cada
   parâmetro. Nunca assumir por convenção.
4. **Rules of Hooks.** Todo hook (`useState`, `useMemo`, `useEffect`, `useCallback`,
   `useQuery` etc.) fica ANTES de qualquer `return` condicional no componente. Sem
   exceção — mesmo que o hook "pareça" não depender do dado que falta.
5. **`accessibilityRole` — só valores confirmados nativamente.** O union type do RN
   aceita mais valores do que o Android realmente suporta (ex.: `"tabbar"` está no tipo
   mas não existe no `ReactAccessibilityDelegate` nativo). Usar apenas valores já usados
   em outros componentes do app (`button`, `link`, `alert`, `none`, `menu`, `image`,
   `tablist`, `tab`, `search`, `radiogroup`, `radio`, `progressbar`, `list`, `header`,
   `checkbox`) ou confirmar contra
   `node_modules/react-native/Libraries/Components/View/ViewAccessibility.js` E contra
   `ReactAccessibilityDelegate.java` se houver dúvida — melhor ainda, testar no device.
6. **Dependências novas sempre via `npx expo install <pkg>`**, nunca editar
   `package.json` manualmente com uma versão chutada.
7. **Ao final do trabalho, rodar OBRIGATORIAMENTE, nesta ordem, e reportar os 4 resultados:**
   ```
   cd apps/mobile
   npx tsc --noEmit
   npx jest
   npx expo export:embed --eager --platform android --dev false --reset-cache
   grep -rhoE '(router\.push\(|router\.replace\(|href=)"[^"?]*' app components 2>/dev/null | sed -E 's/^(router\.push\(|router\.replace\(|href=)"//' | sort -u
   ```
   O último comando lista todo destino de navegação usado no código — cruzar manualmente
   contra `find app -iname "*.tsx" -not -name "_layout.tsx"` e confirmar que TODO destino
   (exceto grupos de rota como `/(auth)/x`, que resolvem igual) tem um arquivo real
   correspondente. Reportar explicitamente "N links cruzados, 0 quebrados" ou listar os
   quebrados e como foram tratados.
8. **Entregável não é "Fonte: X" — é uma tabela elemento-por-elemento.** Para cada
   tela/seção tocada, a descrição do PR precisa ter uma tabela: elemento do site (com
   citação de arquivo:linha) → elemento correspondente no app → status (idêntico / ajustado
   e por quê / não aplicável e por quê). "Transcrevi X" sem essa tabela não é aceito.
9. **Na dúvida entre inventar algo "razoável" e perguntar**, preferir deixar comentário
   `// TODO(revisão): <pergunta específica>` no código e listar a dúvida no PR, em vez de
   inventar comportamento. Já aconteceu 2× nesta campanha de agentes inventarem layout
   quando o site tinha a resposta certa a um grep de distância.

## Escopo desta rodada

| Frente | Telas/arquivos | Status |
|---|---|---|
| A — Anunciar | `apps/mobile/app/itens/novo.tsx` vs `components/items/ItemForm.tsx` (1150 linhas — form pré-transcrição, nunca reconciliado) | Delegado |
| B — Perfil/Auth | `favoritos.tsx`, `kyc.tsx`, `(tabs)/perfil.tsx`, `(auth)/register.tsx`, `(auth)/forgot-password.tsx` | Delegado |
| C — Chat/Reservas | `(tabs)/chat.tsx`, `(tabs)/mensagens.tsx`, `mensagens/[id].tsx`, `(tabs)/reservas.tsx`, `reservas/[id].tsx`, `reservas/checkout.tsx` | Delegado |

Já corrigido nesta sessão (fora do escopo de re-auditoria, mas sujeito a revisão se a
frente B/C encontrar algo relacionado): hooks de `itens/[id].tsx`, ícones de categoria
(`CategoryChip.tsx` + `CategoriasSection.tsx`), filtro/busca de `explorar.tsx`, `/sobre`,
Home completa (`(tabs)/index.tsx` + `components/home/*`), `metro.config.js`,
dependências fantasma, `BottomNav.tsx` accessibilityRole.
