# Backlog — Site: padrões de bug achados na validação do app mobile (2026-07-04)

**Contexto:** durante a validação em device do app Android (ver `docs/auditorias/validacao-manha-2026-07-04.md` e memória `project-mobile-validacao-features-2026-07`), um bug real foi encontrado e corrigido em `apps/mobile/app/reservas/[id].tsx` — a assinatura do contrato ficava presa em "pendente" mesmo já assinada no backend. Ao investigar a causa, o mesmo padrão de código (não o mesmo bug, mas o mesmo *anti-padrão*) apareceu em outros componentes do site. Este documento lista o que vale auditar/corrigir no site numa sessão dedicada.

## 🔴 Item 1 — Estado local "trava" no valor inicial e nunca resincroniza com a prop/API

### O que quebrou no mobile (já corrigido)

`apps/mobile/app/reservas/[id].tsx` tinha:

```ts
const [contractSigned, setContractSigned] = useState<boolean | null>(null)

useEffect(() => {
  if (data?.data && contractSigned === null) {
    setContractSigned(!!data.data.contractSignedAt)
  }
}, [data, contractSigned])
```

O guard `contractSigned === null` só deixa o efeito rodar **uma vez**. Se o cache do React Query entregar `contractSignedAt: null` no primeiro render após remontar a tela (ex.: usuário navega pra outro lugar e volta), o estado local trava em `false` para sempre — mesmo que uma nova resposta da API chegue depois com o valor correto. Reproduzido em staging: contrato assinado (confirmado via API, `contractSignedAt` preenchido), banner mobile continuava mostrando "Assinatura do contrato pendente" até o app ser recarregado por completo.

**Fix aplicado** (linhas 240-249): sempre que a API disser que está assinado, forçar `true` (idempotente, contrato nunca "desassina"); o guard de `null` só decide o valor inicial `false`.

### Onde o mesmo padrão aparece no site

| Arquivo | Linha | Código |
|---|---|---|
| `app/reservas/[id]/_ContractBanner.tsx` | 24 | `const [signed, setSigned] = useState(initialSigned)` |
| `app/reservas/[id]/_CheckInOut.tsx` | 17 | `const [photos, setPhotos] = useState<Photo[]>(initial)` |
| `app/reservas/[id]/_ReviewForm.tsx` | 92 | `const [done, setDone] = useState(!!existing)` |

Nos três, o estado local é semeado **uma única vez** a partir de uma prop (`initialSigned`/`initial`/`existing`) que vem do Server Component pai (fetch direto via Prisma). Se o mesmo componente React sobreviver a uma re-renderização com uma prop nova (sem desmontar), o estado local não acompanha — exatamente a mesma classe de bug do mobile.

### Por que pode não estar mordendo hoje (e como confirmar)

A página `/reservas/[id]` do site é Server Component — a cada **carregamento completo de página**, os dados vêm frescos do Prisma, e os três componentes acima remontam do zero com a prop correta. Isso é diferente do mobile, que usa TanStack Query com cache persistente entre navegações (a causa raiz de lá).

O risco no site é mais estreito, mas existe: o **Router Cache** do Next.js App Router guarda o payload RSC de segmentos já visitados por um tempo (client-side), então uma navegação "voltar" (não um reload manual) pode reidratar o componente sem refazer o fetch no servidor. Não foi reproduzido no site nesta sessão — é uma hipótese a verificar, não um bug confirmado.

**Roteiro de verificação sugerido para a próxima sessão:**
1. Assinar o contrato (ou marcar o checklist de devolução / enviar uma avaliação) numa reserva de teste no site.
2. Navegar para outra página via link (client-side, sem F5).
3. Voltar para a mesma reserva usando o botão "voltar" do navegador, dentro de ~30s, sem recarregar manualmente.
4. Conferir se o estado (contrato assinado / fotos / avaliação enviada) permanece correto ou "regride" visualmente para o estado anterior.

**Se reproduzir:** aplicar o mesmo padrão de fix do mobile — nunca deixar o estado local regredir quando o valor vindo da prop for "mais avançado" que o estado atual (ex.: `useEffect` que só seta `true`, nunca `false`, quando a prop já indicar conclusão).

## ℹ️ Descartado (não precisa ação) — registrado para não reinvestigar

Itens que pareciam candidatos a "bug corrigido no app que falta no site", mas na checagem do histórico de commits **já estavam corretos no site** (o mobile é que tinha o bug, copiando errado do site):

- **Cancelar reserva chamando endpoint inexistente** (`POST /api/bookings/:id/cancel` → 404) — bug era só no client mobile; o site sempre usou o endpoint certo (`_BookingActions.tsx`), que serviu de referência pro fix mobile (commit `2e6ebd1`).
- **`paymentStatus`/timestamps ausentes no detalhe da reserva** — o bug era em `GET /api/bookings/[id]` (rota usada só pelo mobile) não selecionar campos que a página do site já lê direto via Prisma. Rota já corrigida (commit `5984fa7`); o site nunca foi afetado.
- **Encoding corrompido "S�o Paulo"** (campo `city` do usuário Admin ShareO) — bug de **dado**, não de código; corrigido direto no banco de staging nesta sessão. Afeta site e app igualmente e já está resolvido para os dois — nenhuma ação de código necessária.
