# BUG — Confirmação de devolução

TÍTULO: [BookingActions / ReturnConditionForm] — Proprietário não tem ação disponível para confirmar recebimento do item no status ACTIVE

CRITICIDADE: Major

AMBIENTE:
- URL/Rota: /reservas/[id]
- Dispositivo: mobile e desktop (reproduzível em ambos)
- Breakpoint: 375px mobile / 1280px desktop
- Usuário: proprietário (isOwner = true)

---

## PASSOS PARA REPRODUZIR

1. Logar como proprietário de um item.
2. Acessar uma reserva com status "Em andamento" (ACTIVE) em /reservas/[id].
3. Rolar a página até a seção de ações.
4. Observar os botões disponíveis para o proprietário.

---

## COMPORTAMENTO OBSERVADO

No status ACTIVE, o componente `BookingActions` (`app/reservas/[id]/_BookingActions.tsx`, linha 63-66) exibe ao proprietário apenas:

- "Abrir disputa" (linha 74)

A ação `mark_returned` (linha 68) está restrita a `isBorrower`. Não existe nenhum botão, ícone ou instrução visível que permita ao **proprietário** confirmar que recebeu o item de volta. O proprietário também não recebe nenhuma orientação na UI de que deve aguardar o locatário iniciar a confirmação.

O componente `ReturnConditionForm` (`components/booking/ReturnConditionForm.tsx`), que permite ao proprietário avaliar o estado do item, só é exibido quando `status === "RETURNED"` — mas o proprietário não consegue entender como ou quando essa tela será alcançada.

---

## COMPORTAMENTO ESPERADO

Dois cenários aceitáveis:

**Opção A (fluxo atual — precisa de orientação):**
O locatário clica em "Confirmar devolução" → status muda para RETURNED → proprietário vê o `ReturnConditionForm`. Nesse caso, deve existir para o proprietário em status ACTIVE uma mensagem/banner explicando que ele deve aguardar o locatário confirmar a devolução pelo app. Hoje esse aviso não existe.

**Opção B (fluxo paralelo — confirmação bilateral):**
O proprietário também deve ter um botão "Confirmar recebimento" no status ACTIVE, similar ao `mark_returned` do locatário, para registrar que recebeu o item fisicamente. Isso exigiria uma nova action (ex.: `confirm_receipt`) e possivelmente um status intermediário ou flag `ownerConfirmedReturn`.

Em qualquer cenário, o proprietário precisa de uma via clara de confirmação ou de orientação de que está aguardando a ação do locatário.

---

## EVIDÊNCIA

Ausência de qualquer elemento de UI para o proprietário no status ACTIVE relacionado à devolução:

- `_BookingActions.tsx` linha 63-66: bloco `if (isOwner)` contempla apenas `PENDING` → `confirm` e `CONFIRMED` → `mark_active`. Nenhuma ação para ACTIVE.
- `_BookingActions.tsx` linha 67-69: bloco `if (isBorrower)` é o único que expõe `mark_returned`.
- `page.tsx` linha 351-355: `ReturnConditionForm` renderizado em `isOwner && status === "RETURNED"` — correto, mas inacessível sem passar por RETURNED, e o caminho para RETURNED depende exclusivamente do locatário.
- Nenhum banner ou texto informativo em `page.tsx` orienta o proprietário em status ACTIVE sobre o fluxo de devolução.

---

## FREQUÊNCIA

Sempre — reproduzível em qualquer reserva com status ACTIVE acessada pelo proprietário.

---

## CONTEXTO TÉCNICO ADICIONAL

- Arquivo principal da página: `app/reservas/[id]/page.tsx`
- Componente de ações: `app/reservas/[id]/_BookingActions.tsx`
- Formulário do proprietário pós-devolução: `components/booking/ReturnConditionForm.tsx`
- Checklist do locatário: `components/booking/ReturnChecklist.tsx`
- Status relevantes no schema Prisma: `ACTIVE` → `RETURNED` → `COMPLETED`
- A transição ACTIVE → RETURNED é feita pela action `mark_returned` via `PATCH /api/bookings/[id]`

---

_Reportado por: tester (relato verbal)_
_Documentado por: agente QA ShareO_
_Data: 2026-06-03_
