# App mobile — REGRA DE TRANSCRIÇÃO LITERAL (fundador, 2026-07-02)

**Qualquer trabalho de UI/funcionalidade em `apps/mobile/` TRANSCREVE o site responsivo em 375px — nunca "adapta", "melhora" ou inventa.** O resultado final deve ser IGUAL ao site mobile. Regra criada após 2 rejeições do fundador a protótipos que reinterpretaram o design.

1. Rótulos, textos, ordem, ícones (SVG exato), cores e espaçamentos vêm **verbatim** dos componentes do site (`components/layout/AppHeader.tsx`, `BottomNav.tsx`, `MobileMenu.tsx`, `app/itens/page.tsx`, `app/(auth)/login`, `_PriceCalc.tsx`...). Ler o JSX-fonte ANTES de escrever qualquer tela.
2. Todo arquivo novo/alterado em `apps/mobile/` começa com `// Fonte: <arquivo(s) do site transcrito(s)>`.
3. PR mobile inclui tabela de auditoria componente/tela → arquivo-fonte na descrição.
4. Testes RNTL fixam os rótulos exatos (rótulo inventado = CI quebra).
5. Na dúvida entre "padrão nativo" e "copiar o site mobile": **copiar o site**.
6. **Todo componente do site com xará em `apps/mobile/components/` é comparado pelo `__tests__/unit/paridade-site-app.test.ts`** — texto visível do site que sumir no app quebra a CI. Divergência deliberada vai em `DIVERGENCIAS_CONHECIDAS` **com motivo escrito**; o teste reprova motivo curto e reprova exceção que já foi resolvida.

Spec visual aprovada: `docs/design/mobile-app-prototipo-v1.html` + `docs/design/mobile-app-handoff.md` (rastreabilidade frame→fonte). Fundação do design system do app: `apps/mobile/lib/theme.tsx` (tokens light/dark transcritos de `app/globals.css`) + `apps/mobile/components/ui|layout/`.

## Padrão de estilo: `StyleSheet` + `useTheme()`, não `className`

As classes Tailwind do site **não** se transcrevem para `className` no app. O padrão é ler o token equivalente do `lib/theme.tsx` e aplicá-lo via `StyleSheet`:

```tsx
const { tokens, mode } = useTheme()
<Text style={[s.sectionTitle, { color: tokens.navy }]}>Sobre o item</Text>
```

Medido em 2026-07-22: **58 arquivos** usam `StyleSheet.create` e **57** usam `useTheme()`, contra **5** com `className` — e 3 desses concentram 144 das 147 ocorrências (`app/perfil/editar|endereco|recebimentos.tsx`), que são a exceção divergente, não o modelo a copiar.

O NativeWind segue instalado e ligado (`babel.config.js` com `jsxImportSource: "nativewind"`, `metro.config.js` com `withNativeWind`) — não é config morta, mas escrever tela nova em `className` destoa de ~58 arquivos.

Para implementar/corrigir tela do app: usar `/shareo-transcrever-tela <rota>` (encapsula esta regra + gotchas). Device testing: `scripts/adb-device.sh` (resolve adb do winget + converte coordenadas ×1.2).
