# Design Handoff — HelpButton

**Componente:** HelpButton  
**Versão:** 1.0  
**Data:** 2026-06-04  
**Design System:** ShareO DID v1.0  
**Autor:** Designer de Produto ShareO

---

## Contexto e Decisão de Design

O botão `?` substitui o item "Ajuda" do `UserDropdown` (desktop) e o link solto "Ajuda" no `MobileMenu`. O header já possui o `NotificationBell` à esquerda do avatar; o `HelpButton` fica entre o sino e o avatar (desktop), formando o grupo: `[sino] [?] [avatar]`.

**Diferenciação visual do sino:** o sino usa ícone SVG com badge numérico vermelho; o `?` usa caractere tipográfico em círculo com borda branca tracejada — forma diferente (círculo sólido vs. sino irregular) e ausência de badge evitam confusão.

**Mobile:** nenhum ícone extra no header. A ajuda aparece como seção fixa dentro do `MobileMenu`, logo após o bloco de navegação principal e antes de "Minha Conta".

---

## 1. HelpButton (botão `?` — desktop)

```
Componente: HelpButton
Variantes: default (usuário logado), guest (usuário deslogado)
Estados: default | hover | focus-visible | active | open (popover aberto)
```

### Tailwind classes (mobile 375px)
```
hidden
```
> Botão completamente oculto em mobile. A ajuda é surfaceada no MobileMenu.

### Tailwind classes (tablet md: 768px+)
```
hidden md:flex h-9 w-9 items-center justify-center
rounded-full
border-2 border-dashed border-white/50
text-white text-sm font-bold font-sans
bg-transparent
hover:bg-white/10 hover:border-white
active:bg-white/20
transition-colors duration-150
outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary
cursor-pointer
flex-shrink-0
```

### Tailwind classes (desktop lg: 1280px+)
```
(mesmas do md — tamanho fixo, não escala)
```

**Estado `open` (popover visível):**
```
bg-white/15 border-white border-solid
```
> Troca `border-dashed` por `border-solid` e aumenta o fill para sinalizar estado ativo.

### Tokens usados
| Token | Valor | Uso |
|---|---|---|
| `primary` | `#003366` | ring-offset-color |
| `white` | `#FFFFFF` | texto, borda, ring |
| `white/10` | rgba(255,255,255,0.10) | hover bg |
| `white/15` | rgba(255,255,255,0.15) | open bg |
| `white/20` | rgba(255,255,255,0.20) | active bg |
| `white/50` | rgba(255,255,255,0.50) | borda default |
| `font-sans` | Inter | label `?` |

### Acessibilidade
- `aria-label="Ajuda — tópicos frequentes"`
- `aria-haspopup="dialog"`
- `aria-expanded={open}`
- `aria-controls="help-popover"`
- Tap target: `h-9 w-9` = 36×36px — **abaixo de 44px**. Compensar com hit area via `::before` ou trocar para `h-11 w-11` (44×44px). **Recomendado: usar `h-11 w-11`** para conformidade WCAG 2.5.5.
- Teclado: `Enter`/`Space` abre popover; `Esc` fecha; `Tab` move foco para primeiro link interno.
- Cor `?` sobre `#003366` com `border-dashed white/50`: contraste do texto branco sobre navy = 14.7:1 ✅.

### Notas de implementação
- Posição no JSX de `AppHeader`: inserir `<HelpButton />` entre `<NotificationBell />` e `<div className="hidden md:block"><UserDropdown /></div>`.
- Remover `{ href: "/ajuda", label: "Ajuda", icon: "❓" }` do array `MENU_ITEMS` em `UserDropdown.tsx`.
- Componente deve ser `"use client"` (estado do popover). O `AppHeader` é Server Component — o `HelpButton` é uma folha interativa.

---

## 2. HelpPopover (popover desktop)

```
Componente: HelpPopover
Variantes: —
Estados: open | closed (não renderizado)
```

### Tailwind classes (posicionamento e container)
```
absolute right-0 top-12 z-[300]
w-72
rounded-2xl
border border-slate-200
bg-white
shadow-[0_8px_32px_rgba(0,0,0,0.14),0_2px_8px_rgba(0,0,0,0.08)]
overflow-hidden
```

> `top-12` = 48px abaixo do botão (gap de 4px do h-11 do botão + 1px borda). Ajustar com `top-[calc(100%+8px)]` para manter relação dinâmica.

### Header interno do popover
```
bg-[#003366] px-4 py-3
flex items-center gap-2
```

**Título:**
```
text-sm font-bold text-white font-display
```
Texto: `"Central de Ajuda"`

**Ícone decorativo (opcional):** `?` em branco, `text-base`, `opacity-70`.

**Link "Ver tudo":**
```
ml-auto text-xs text-white/70 hover:text-white underline underline-offset-2 transition-colors
```
Aponta para `/ajuda`.

### Lista de tópicos
```
py-2
```

Cada item de tópico:
```
flex h-11 items-center gap-3 px-4
text-sm text-slate-700 font-sans font-medium
hover:bg-[#003366]/5 hover:text-[#003366]
focus-visible:bg-[#003366]/8 focus-visible:outline-none focus-visible:text-[#003366]
transition-colors duration-100
rounded-none
```

> `h-11` = 44px — satisfaz WCAG 2.5.5 ✅.

**Ícone do tópico:** `<span aria-hidden="true">` com emoji, `text-base`, `w-5 flex-shrink-0`.

**Seta indicadora (direita):**
```
ml-auto text-slate-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity
```
SVG chevron-right 12×12px ou caractere `›`.

### Divisor entre tópicos
Sem divisores. Separação visual apenas pelo `hover` background. Mantém visual limpo nos 8 itens.

### Footer do popover
```
border-t border-slate-100 px-4 py-2.5
text-xs text-slate-400 text-center
```
Texto: `"Não encontrou? Fale com o suporte →"` linkando `/ajuda#suporte`.

### Tokens usados
| Token | Valor | Uso |
|---|---|---|
| `#003366` | Navy | header bg, hover text, focus text |
| `#003366/5` | rgba(0,51,102,0.05) | hover bg dos links |
| `slate-200` | `#e2e8f0` | borda do popover |
| `slate-700` | `#334155` | texto dos links (repouso) |
| `slate-400` | `#94a3b8` | seta, footer text |
| `slate-100` | `#f1f5f9` | divisor footer |
| `white` | `#FFFFFF` | bg do popover |
| `font-display` | Montserrat | título header |
| `font-sans` | Inter | links e footer |
| `shadow-[...]` | custom | sombra elevada z-300 |

### Acessibilidade
- `role="dialog"` no container do popover.
- `id="help-popover"` (referenciado pelo `aria-controls` do botão).
- `aria-label="Central de Ajuda"`.
- `aria-modal="false"` (não bloqueia foco do restante da página).
- Foco inicial: primeiro link da lista ao abrir (`autoFocus` no `<a>` ou `useEffect` com `ref.current?.focus()`).
- Fechar com `Esc`, clicar fora (mousedown listener), ou navegar para fora com Tab.
- Todos os links `<a>` com `href` âncora — navegação nativa, sem JS extra.
- Contraste texto `slate-700` (#334155) sobre branco: 10.7:1 ✅.
- Contraste hover text `#003366` sobre `#003366/5`: 13.2:1 ✅.

### Notas de implementação
- Usar `position: absolute` dentro de `<div className="relative">` que envolve `[HelpButton + HelpPopover]`.
- Popover fecha ao: clicar fora (mousedown document listener), pressionar `Esc`, navegar (`usePathname` effect — padrão igual ao `UserDropdown`).
- Animação de entrada: `transition-all duration-150 ease-out` com `data-state` open/closed e `opacity-0 scale-95` → `opacity-100 scale-100` (origin-top-right).
- Largura `w-72` (288px) cabe em qualquer viewport ≥ 768px sem overflow à direita com `right-0`.

---

## 3. HelpSection (bloco no MobileMenu)

```
Componente: HelpSection (bloco dentro de MobileMenu.tsx)
Variantes: logado | não-logado (aparece em ambos)
Estados: expandido (sempre — sem accordion no mobile)
```

### Posicionamento no MobileMenu

**Usuário logado:** inserir após o bloco `AUTH_LINKS` (Reservas, Mensagens, Dashboard) e antes do divisor que precede "Minha Conta". Substituir o link solto `<Link href="/ajuda">Ajuda</Link>` atual.

**Usuário não logado:** substituir o link solto `<Link href="/ajuda">Ajuda</Link>` na seção `!isLoggedIn`.

### Header da seção
```jsx
<li>
  <div className="flex h-11 items-center px-4 gap-2">
    <span className="text-xs font-bold text-white/50 uppercase tracking-wider font-sans">
      Ajuda Rápida
    </span>
    <Link
      href="/ajuda"
      className="ml-auto text-xs text-white/50 hover:text-white/80 transition-colors underline underline-offset-2"
    >
      Ver tudo
    </Link>
  </div>
</li>
```

### Tailwind classes dos links de tópico (mobile)
```
flex h-12 items-center gap-3 rounded-lg pl-6 pr-4
text-sm font-medium text-white/75
hover:bg-white/10 hover:text-white
transition-colors
```

> `h-12` = 48px — supera 44px mínimo ✅.

**Ícone:** `<span aria-hidden="true">` com emoji, `text-base`, `w-5 flex-shrink-0`.

**Label:** texto descritivo sem emoji no label (emoji separado no `<span>`).

### Divisores
```jsx
<li><div className="my-1 h-px bg-white/10" /></li>
```
Um divisor antes e um depois da seção, seguindo o padrão existente do MobileMenu.

### Array de tópicos (constante sugerida em MobileMenu.tsx)
```ts
const HELP_LINKS = [
  { href: "/ajuda#primeiros-passos", label: "Primeiros passos",  icon: "🚀" },
  { href: "/ajuda#locatario",        label: "Quero alugar",      icon: "🛒" },
  { href: "/ajuda#locador",          label: "Quero anunciar",    icon: "📦" },
  { href: "/ajuda#taxas-secao",      label: "Taxas",             icon: "🧾" },
  { href: "/ajuda#disputas",         label: "Disputas",          icon: "⚖️" },
  { href: "/ajuda#suporte",          label: "Suporte",           icon: "🎧" },
  { href: "/ajuda#pagamento",        label: "Pagamento",         icon: "🔒" },
  { href: "/ajuda#legal",            label: "Legal e Fiscal",    icon: "📋" },
]
```

### Tokens usados
| Token | Valor | Uso |
|---|---|---|
| `white/75` | rgba(255,255,255,0.75) | texto dos links (repouso) |
| `white/50` | rgba(255,255,255,0.50) | label da seção, "Ver tudo" |
| `white/10` | rgba(255,255,255,0.10) | hover bg |
| `white` | `#FFFFFF` | hover text |
| `font-sans` | Inter | todos os textos |
| `primary` | `#003366` | fundo herdado do MobileMenu |

### Acessibilidade
- Nenhum accordion — todos os 8 links visíveis diretamente (evita camada extra de interação em contexto de ajuda).
- Links `<a href>` com âncora: o browser rola à seção + fecha o menu via `usePathname` effect.
- Tap target `h-12` = 48px ✅ WCAG 2.5.5.
- Contraste `white/75` sobre `#003366`: branco com 75% opacity = ~`#BFD0DF` → contraste sobre navy ≈ 5.9:1 ✅.

### Notas de implementação
- Não criar novo componente isolado — inserir diretamente no JSX de `MobileMenu.tsx` como bloco `<li>` com sub-lista, seguindo o padrão já existente.
- Remover os links soltos `<Link href="/ajuda">Ajuda</Link>` das seções logado e não-logado existentes.
- A constante `HELP_LINKS` pode ser definida no topo de `MobileMenu.tsx`, ao lado de `NAV_LINKS`, `AUTH_LINKS` e `ACCOUNT_LINKS`.
- Links com âncora (`#`) funcionam diretamente com `<Link href="...">` do Next.js — não requer scroll imperativo.

---

## 4. Resumo de alterações nos arquivos existentes

| Arquivo | Ação |
|---|---|
| `components/layout/AppHeader.tsx` | Adicionar `<HelpButton />` entre `<NotificationBell />` e `<UserDropdown />` |
| `components/layout/UserDropdown.tsx` | Remover item `{ href: "/ajuda", label: "Ajuda", icon: "❓" }` do `MENU_ITEMS` |
| `components/layout/MobileMenu.tsx` | Substituir links soltos de Ajuda pela `HelpSection` com 8 tópicos |
| `components/layout/HelpButton.tsx` | **Criar** — Client Component com estado `open`, botão `?` + `HelpPopover` |

---

## 5. Especificação dos 8 tópicos (referência consolidada)

| # | Emoji | Label | Âncora |
|---|---|---|---|
| 1 | 🚀 | Primeiros passos | `/ajuda#primeiros-passos` |
| 2 | 🛒 | Quero alugar | `/ajuda#locatario` |
| 3 | 📦 | Quero anunciar | `/ajuda#locador` |
| 4 | 🧾 | Taxas | `/ajuda#taxas-secao` |
| 5 | ⚖️ | Disputas | `/ajuda#disputas` |
| 6 | 🎧 | Suporte | `/ajuda#suporte` |
| 7 | 🔒 | Pagamento | `/ajuda#pagamento` |
| 8 | 📋 | Legal e Fiscal | `/ajuda#legal` |

---

## 6. Checklist de implementação

- [ ] Criar `components/layout/HelpButton.tsx` (`"use client"`)
- [ ] Implementar `HelpPopover` como parte interna de `HelpButton.tsx`
- [ ] Adicionar `HELP_LINKS` e `HelpSection` JSX em `MobileMenu.tsx`
- [ ] Remover "Ajuda" de `UserDropdown.tsx` `MENU_ITEMS`
- [ ] Inserir `<HelpButton />` em `AppHeader.tsx` na posição correta
- [ ] Verificar tap targets: botão `?` deve ser `h-11 w-11` (44×44px)
- [ ] Verificar links do popover: `h-11` (44px) ✅
- [ ] Verificar links mobile: `h-12` (48px) ✅
- [ ] Testar fechar com Esc, clicar fora, navegar
- [ ] Testar foco inicial no primeiro link ao abrir popover
- [ ] Testar navegação por Tab dentro do popover (trap não necessário — `aria-modal="false"`)
- [ ] Verificar contrastes com ferramenta (Stark ou axe DevTools)
- [ ] Teste em 375px: garantir que `HelpButton` está `hidden`, seção aparece no MobileMenu
- [ ] Teste em 768px+: garantir que popover não vaza para fora do viewport à direita
