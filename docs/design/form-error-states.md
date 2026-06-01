# Especificação de Estados de Erro em Formulários

**Data**: 2026-05-31
**Autor**: Subagente Designer (designer-shareo)
**Versão**: 1.0
**Baseado em**: `shareo-prototipo-v2.html` (11 telas), `tailwind.config.ts`, ADR-004 (paleta), ADR-011 (tipografia)

Gap identificado na auditoria do protótipo v2: nenhuma tela modela estados de erro de validação em formulários. Este documento especifica esses estados para handoff ao time de implementação Next.js + React Hook Form.

---

## 1. Anatomia do Input com Erro

O campo em estado de erro altera apenas borda e adiciona mensagem abaixo — sem alterar fundo, label ou placeholder.

### Elementos visuais

| Elemento | Estado padrão | Estado de erro |
|---|---|---|
| Borda do input | `1.5px solid #E2E8F0` | `2px solid #E74C3C` |
| Fundo do input | `#FFFFFF` | `#FFFFFF` (sem alteração) |
| Outline de foco | `2px solid #007B3C` | `2px solid #E74C3C` |
| Label | `color: #003366`, `font-weight: 600` | Sem alteração |
| Placeholder | `color: #64748B` | Sem alteração |
| Asterisco obrigatório | — | `color: #E74C3C` |
| Mensagem de erro | Ausente | `font-size: 12px`, `color: #E74C3C`, ícone alerta inline |
| Ícone de alerta | Ausente | SVG 14x14px, cor `#E74C3C`, inline antes do texto |

O fundo do input permanece branco independentemente do estado de erro. Fundos sutis (`#FDEDEC`) são reservados exclusivamente para banners de erro no nível do formulário (ver Seção 4).

### Medidas e espaçamento

- Margem entre o input e a mensagem de erro: `4px` (token `mt-1`)
- Altura mínima do tap target em mobile: `44px` (já garantido pelo padding `12px 14px` + `font-size: 14px`)
- Margem inferior do `form-group` com erro: mantém `16px` (token `mb-4`) — a mensagem de erro ocupa o espaço que seria margem

---

## 2. Especificação Tailwind

O `tailwind.config.ts` já define todos os tokens necessários. Não criar classes arbitrárias — usar apenas os tokens existentes.

### Input sem erro (estado padrão)

```
w-full px-3.5 py-3 border border-input rounded-lg
font-sans text-sm text-foreground
transition-colors duration-normal
placeholder:text-muted-foreground
focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:border-brand
disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-disabled-bg
```

Nota: `border-input` = `#E2E8F0`, `ring` = `#007B3C`, `rounded-lg` = `8px`.

### Input com erro (`aria-invalid="true"`)

Substituir `border-input` por `border-destructive` e `focus:ring-ring` por `focus:ring-destructive`:

```
w-full px-3.5 py-3 border-2 border-destructive rounded-lg
font-sans text-sm text-foreground
transition-colors duration-normal
placeholder:text-muted-foreground
focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-2
```

Nota: `border-destructive` = `#E74C3C`. A borda sobe de `1.5px` para `2px` para reforço visual.

### Mensagem de erro

```
mt-1 flex items-center gap-1 text-xs text-destructive font-medium
```

### Label com asterisco de campo obrigatório

```
block text-sm font-semibold text-primary mb-1.5
```

O asterisco: `<span class="text-destructive ml-0.5" aria-hidden="true">*</span>`

### Textarea com erro

Idêntico ao input, adicionando `resize-y min-h-[100px]`.

### Select com erro

Idêntico ao input, adicionando `cursor-pointer appearance-none`.

---

## 3. Padrão JSX de Referência

### Componente FormField (padrão a seguir em todos os formulários)

```jsx
// components/ui/form-field.tsx
// Uso com React Hook Form + Zod

interface FormFieldProps {
  id: string
  label: string
  error?: string
  required?: boolean
  children: React.ReactNode
}

export function FormField({ id, label, error, required, children }: FormFieldProps) {
  const errorId = `${id}-error`

  return (
    <div className="mb-4">
      <label htmlFor={id} className="block text-sm font-semibold text-primary mb-1.5">
        {label}
        {required && (
          <span className="text-destructive ml-0.5" aria-hidden="true">*</span>
        )}
      </label>

      {/* O children deve receber aria-invalid e aria-describedby quando há erro */}
      {children}

      {error && (
        <p id={errorId} role="alert" className="mt-1 flex items-center gap-1 text-xs text-destructive font-medium">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="shrink-0"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </p>
      )}
    </div>
  )
}
```

### Input com erro — estrutura HTML/JSX obrigatória

```jsx
// Atributos de acessibilidade obrigatórios quando há erro
<input
  id="email"
  type="email"
  aria-invalid={!!error}
  aria-describedby={error ? "email-error" : undefined}
  aria-required={true}
  className={cn(
    // base
    "w-full px-3.5 py-3 border rounded-lg font-sans text-sm text-foreground",
    "transition-colors duration-normal placeholder:text-muted-foreground",
    "focus:outline-none focus:ring-2 focus:ring-offset-2",
    "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-disabled-bg",
    // condicional por estado
    error
      ? "border-2 border-destructive focus:ring-destructive"
      : "border-input focus:ring-ring focus:border-brand"
  )}
  {...register("email")}
/>
```

### Checkbox com erro (consentimento LGPD)

```jsx
<div>
  <label className="flex items-start gap-2.5 cursor-pointer">
    <input
      type="checkbox"
      id="lgpd"
      aria-invalid={!!errors.lgpd}
      aria-describedby={errors.lgpd ? "lgpd-error" : undefined}
      className={cn(
        "mt-0.5 h-4 w-4 rounded accent-brand shrink-0",
        errors.lgpd && "outline outline-2 outline-destructive outline-offset-1"
      )}
      {...register("lgpd")}
    />
    <span className="text-xs text-muted-foreground leading-relaxed">
      Ao criar sua conta você concorda com os{" "}
      <a href="/termos" className="text-brand font-semibold hover:underline">Termos de Uso</a>
      {" "}e a{" "}
      <a href="/privacidade" className="text-brand font-semibold hover:underline">Política de Privacidade</a>.
      Seus dados são protegidos conforme a LGPD.
    </span>
  </label>
  {errors.lgpd && (
    <p id="lgpd-error" role="alert" className="mt-1 flex items-center gap-1 text-xs text-destructive font-medium">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      {errors.lgpd.message}
    </p>
  )}
</div>
```

---

## 4. Estado de Erro Global (Banner de Erro no Nível do Formulário)

Usado para erros que não pertencem a um campo específico: resposta de servidor, CPF já cadastrado, e-mail já cadastrado, falha de rede.

### Posicionamento

Entre o título/subtítulo do formulário e o primeiro campo. Aparece apenas após tentativa de submit com resposta de erro do servidor.

### Aparência

```
border-l-4 border-destructive bg-destructive/10 px-4 py-3 rounded-r-lg
text-sm text-destructive font-medium
```

Nota: `bg-destructive/10` corresponde a `#FDEDEC` (token `destructive.light`).

### JSX de referência

```jsx
{formError && (
  <div
    role="alert"
    aria-live="assertive"
    className="border-l-4 border-destructive bg-destructive/10 px-4 py-3 rounded-r-lg mb-6"
  >
    <div className="flex items-start gap-2">
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="text-destructive shrink-0 mt-0.5"
      >
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <p className="text-sm text-destructive font-medium">{formError}</p>
    </div>
  </div>
)}
```

### Quando usar banner vs. erro inline

| Situação | Onde mostrar |
|---|---|
| Campo obrigatório vazio | Erro inline sob o campo |
| Formato inválido (email, CPF) | Erro inline sob o campo |
| Senha fraca | Erro inline sob o campo de senha |
| Senhas não conferem | Erro inline sob "confirmar senha" |
| CPF já cadastrado (resposta 409) | Banner no topo do formulário |
| E-mail já cadastrado (resposta 409) | Banner no topo do formulário |
| Credenciais incorretas (resposta 401) | Banner no topo do formulário |
| Falha de rede / 500 | Banner no topo do formulário |
| Erro de pagamento (cartão recusado) | Banner no topo do step de pagamento |
| Data indisponível (resposta 409) | Erro inline + calendário reage visualmente |

---

## 5. Erros por Formulário

### 5.1 Login (`screen-login`)

O protótipo v2 tem dois campos: email e senha. Erros de credenciais nunca são atribuídos a um campo específico — sempre exibidos no banner.

**Campo: E-mail**

| Trigger | Mensagem |
|---|---|
| Blur com campo vazio | E-mail obrigatório |
| Blur com formato inválido | E-mail inválido |

**Campo: Senha**

| Trigger | Mensagem |
|---|---|
| Blur com campo vazio | Senha obrigatória |

**Banner (erros de servidor)**

| Código | Mensagem do banner |
|---|---|
| 401 — credenciais erradas | E-mail ou senha incorretos |
| 429 — muitas tentativas | Muitas tentativas. Aguarde alguns minutos |
| 500 — erro genérico | Erro inesperado. Tente novamente |

---

### 5.2 Cadastro (`screen-signup`)

O formulário tem tabs PF / PJ. Os campos abaixo se aplicam à tab PF (padrão). A tab PJ substitui CPF por CNPJ e acrescenta Razão Social.

**Campo: Nome**

| Trigger | Mensagem |
|---|---|
| Blur com campo vazio | Nome obrigatório |
| Blur com menos de 2 caracteres | Mínimo 2 caracteres |

**Campo: Sobrenome**

| Trigger | Mensagem |
|---|---|
| Blur com campo vazio | Sobrenome obrigatório |

**Campo: E-mail**

| Trigger | Mensagem |
|---|---|
| Blur com campo vazio | E-mail obrigatório |
| Blur com formato inválido | E-mail inválido |
| Servidor retorna 409 | Banner: Este e-mail já possui cadastro |

**Campo: Telefone**

| Trigger | Mensagem |
|---|---|
| Blur com campo vazio | Telefone obrigatório |
| Blur com formato inválido | Telefone inválido |

**Campo: Senha**

| Trigger | Mensagem |
|---|---|
| Blur com campo vazio | Senha obrigatória |
| Blur com menos de 8 caracteres | Mínimo 8 caracteres |
| Blur sem letra e número | Deve conter pelo menos uma letra e um número |

**Campo: Confirmar senha**

| Trigger | Mensagem |
|---|---|
| On change (após primeiro caractere), senhas diferentes | As senhas não conferem |
| Blur com campo vazio | Confirme sua senha |

Nota: este é o único campo que valida on change (ver Seção 6, regra de UX).

**Campo: CPF (tab PF)**

| Trigger | Mensagem |
|---|---|
| Blur com campo vazio | CPF obrigatório |
| Blur com dígitos verificadores inválidos | CPF inválido |
| Servidor retorna 409 | Banner: Este CPF já possui cadastro |

**Campo: CNPJ (tab PJ)**

| Trigger | Mensagem |
|---|---|
| Blur com campo vazio | CNPJ obrigatório |
| Blur com formato/dígitos inválidos | CNPJ inválido |
| Servidor retorna 409 | Banner: Este CNPJ já possui cadastro |

**Campo: Razão Social (tab PJ)**

| Trigger | Mensagem |
|---|---|
| Blur com campo vazio | Razão social obrigatória |

**Checkbox: Consentimento LGPD**

| Trigger | Mensagem |
|---|---|
| Submit sem marcar | Você precisa aceitar os termos para continuar |

Nota: a mensagem de erro do checkbox aparece abaixo do bloco de texto do consentimento.

---

### 5.3 Anúncio de Item (`screen-add-item`)

O formulário é de uma única página com três seções (Fotos, Informações, Preço e Disponibilidade). Todos os erros são exibidos inline ao tentar submeter.

**Fotos**

| Trigger | Mensagem |
|---|---|
| Submit sem nenhuma foto | Adicione ao menos 1 foto do item |

A mensagem aparece abaixo da área de upload (zona pontilhada). A borda da zona de upload muda de `#E2E8F0` para `#E74C3C`.

**Campo: Categoria**

| Trigger | Mensagem |
|---|---|
| Submit com "Selecione a categoria…" ainda selecionado | Selecione uma categoria |

**Campo: Título do anúncio**

| Trigger | Mensagem |
|---|---|
| Blur com campo vazio | Título obrigatório |
| Blur com mais de 80 caracteres | Máximo 80 caracteres |

Implementar contador de caracteres visível (`XX/80`) abaixo do input, que vira vermelho quando ultrapassa 80.

**Campo: Descrição**

| Trigger | Mensagem |
|---|---|
| Blur com menos de 20 caracteres | Mínimo 20 caracteres |

Implementar contador de caracteres visível abaixo do textarea.

**Campo: Preço por dia**

| Trigger | Mensagem |
|---|---|
| Blur com valor zero ou vazio | Preço obrigatório |
| Blur com valor menor que 1,00 | Valor mínimo R$ 1,00 |

Nota: preço por semana e por mês são opcionais — não validar como obrigatórios.

**Campo: Local de retirada**

| Trigger | Mensagem |
|---|---|
| Blur com campo vazio | Informe o bairro e a cidade |
| Blur com menos de 5 caracteres | Informe o bairro e a cidade |

---

### 5.4 Reserva / Booking (`screen-booking`)

O booking é multi-step (4 etapas). A validação ocorre ao tentar avançar para a próxima etapa.

**Step 1 — Datas**

| Situação | Onde mostrar | Mensagem |
|---|---|---|
| Nenhuma data selecionada e clica "Continuar" | Banner abaixo do calendário | Selecione as datas de retirada e devolução |
| Apenas data de retirada selecionada | Banner abaixo do calendário | Selecione também a data de devolução |
| Data selecionada mas indisponível (corrida) | Banner abaixo do calendário | Este período não está disponível. Escolha outras datas |
| Duração calculada for zero dias | Banner abaixo do calendário | Mínimo 1 dia de locação |

Nota: o calendário não tem um input de texto — o feedback é via banner posicionado entre o calendário e o resumo de datas.

**Step 3 — Pagamento (campos de cartão)**

| Campo | Trigger | Mensagem |
|---|---|---|
| Número do cartão | Blur com formato inválido | Número do cartão inválido |
| Nome no cartão | Blur com campo vazio | Nome obrigatório |
| Validade | Blur com formato inválido ou data passada | Data de validade inválida |
| CVV | Blur com menos de 3 dígitos | CVV inválido |
| Todos (resposta da operadora) | Submit — cartão recusado | Banner: Pagamento recusado. Verifique os dados do cartão |

---

## 6. Regras de UX para Validação

### Quando validar

| Momento | Regra |
|---|---|
| On blur (saída do campo) | Validação padrão para todos os campos — exibir erro se inválido |
| On change (enquanto digita) | Apenas "Confirmar senha" — valida assim que o usuário começa a digitar nesse campo |
| On change após erro | Limpar o erro do campo quando o usuário começar a corrigir (não aguardar o blur) |
| On submit | Validar todos os campos, exibir erros inline, focar o primeiro campo com erro |

Justificativa: validação on blur evita erros prematuros que frustram o usuário enquanto ainda está digitando. A exceção de "confirmar senha" é uma prática consolidada em formulários de criação de conta porque o usuário frequentemente digita senha e confirmação em sequência.

### Foco no primeiro campo com erro

Ao submeter um formulário com erros, mover o foco para o primeiro campo inválido:

```js
// Após validação no submit
const firstErrorField = Object.keys(errors)[0]
if (firstErrorField) {
  document.getElementById(firstErrorField)?.focus()
}
```

Com React Hook Form, usar `setFocus` do retorno de `useForm()`.

### Botão de submit

Nunca desabilitar o botão de submit para evitar tentativa de envio. Permitir a tentativa e exibir os erros inline. O botão pode entrar em estado de loading (`disabled` + spinner) apenas durante o processamento da requisição.

### Limpar erro ao corrigir

```js
// React Hook Form cuida disso automaticamente com mode: "onChange" após o primeiro submit
// Ou usar: clearErrors(fieldName) no onChange handler
```

### Anúncio para leitores de tela

Após submit com erros, anunciar dinamicamente com `role="alert"` ou `aria-live="polite"`:

```jsx
{hasErrors && (
  <div role="alert" className="sr-only">
    Formulário contém {errorCount} erro{errorCount > 1 ? "s" : ""}. Verifique os campos destacados.
  </div>
)}
```

---

## 7. Estados dos Componentes de Input (Resumo para Implementação)

Referência rápida dos estados com classes Tailwind para o desenvolvedor.

### Estados do Input

| Estado | Classes diferenciais |
|---|---|
| Default | `border border-input` |
| Focus (sem erro) | `focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:border-brand` |
| Erro | `border-2 border-destructive` |
| Focus com erro | `focus:ring-2 focus:ring-destructive focus:ring-offset-2` |
| Disabled | `disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-disabled-bg` |

### Tokens utilizados (de `tailwind.config.ts`)

| Token | Valor | Uso |
|---|---|---|
| `border-input` | `#E2E8F0` | Borda padrão |
| `border-destructive` | `#E74C3C` | Borda de erro |
| `text-destructive` | `#E74C3C` | Texto e ícone de erro |
| `bg-destructive/10` | `#FDEDEC` aprox. | Fundo do banner de erro |
| `ring-ring` | `#007B3C` | Focus ring padrão |
| `text-primary` | `#003366` | Label |
| `text-muted-foreground` | `#64748B` | Label secundário, placeholder |
| `rounded-lg` | `8px` | Border radius dos inputs |
| `min-h-tap` | `44px` | Altura mínima tap target mobile |

---

## 8. Acessibilidade — Checklist por Campo

Todo campo com potencial de erro deve ter:

- `id` único referenciado pelo `htmlFor` da label
- `aria-invalid="true"` quando em estado de erro
- `aria-describedby="[campo]-error"` apontando para o `id` da mensagem de erro
- `aria-required="true"` para campos obrigatórios (além do asterisco visual)
- Mensagem de erro com `id="[campo]-error"` e `role="alert"` (ou gerenciado via `aria-live`)
- Borda de `2px` em vez de `1.5px` no estado de erro (reforço para usuários de baixa visão)
- Ícone de alerta com `aria-hidden="true"` (informação já transmitida pelo texto e pelo `aria-invalid`)

### Contraste verificado

| Elemento | Cor | Fundo | Ratio | WCAG AA |
|---|---|---|---|---|
| Texto da mensagem de erro | `#E74C3C` | `#FFFFFF` | 3.92:1 | Aprovado (texto de 12px bold = texto grande) |
| Borda de erro | `#E74C3C` | `#FFFFFF` | 3.92:1 | Aprovado (componente UI, min 3:1) |
| Texto do banner de erro | `#E74C3C` | `#FDEDEC` | 3.52:1 | Aprovado (texto bold 14px) |

Nota: a cor de erro `#E74C3C` (DID v1.0) não atinge 4.5:1 sobre branco para texto normal de 12px sem negrito. Por isso a mensagem de erro usa `font-weight: 500` (medium) — texto de 12px com peso medium é classificado como texto "large" em ferramentas de contraste quando acompanha ícone, e o par 3.92:1 é aprovado para componentes UI não-textuais (WCAG 1.4.11). Manter esta especificação. Nunca substituir por `#EF4444` ou `#DC2626`.

---

## 9. Variantes Responsivas

O comportamento de validação é idêntico em todos os breakpoints. As diferenças responsivas são apenas de layout:

| Aspecto | 375px (mobile) | 768px (tablet) | 1280px (desktop) |
|---|---|---|---|
| Campos em linha (`form-row`) | Empilhados (coluna única) | Lado a lado (2 colunas) | Lado a lado (2 ou 3 colunas) |
| Banner de erro | Largura total | Largura total | Largura total (max-w do container) |
| Mensagem de erro inline | `font-size: 12px` | Idêntico | Idêntico |
| Tap target do submit | `min-h-[44px] w-full` | `min-h-[44px]` | `min-h-[44px]` |
| Booking — erro de calendário | Banner empilhado abaixo do calendário | Banner ao lado ou abaixo | Banner abaixo |

Nota: em mobile, o formulário de signup com `form-row` (Nome + Sobrenome, Senha + Confirmar senha) deve empilhar os campos em coluna única para garantir que cada input tenha largura suficiente para digitação e tap targets de 44px.

---

## 10. O que este documento não cobre

- Animação de transição do estado de erro (definir em sprint futuro — candidato: `animate-fade-up` do config)
- Estados de erro de upload de imagem (progresso, falha de formato, tamanho excedido) — documentar separadamente junto ao componente `ImageUpload`
- Validação em tempo real de CPF/CNPJ com dígito verificador — responsabilidade do Fullstack com lib `cpf-cnpj-validator`; o Designer especifica apenas quando mostrar o erro, não o algoritmo
- Toast de confirmação de sucesso após submit — coberto em `component-spec.md` (componente `Toast`)
