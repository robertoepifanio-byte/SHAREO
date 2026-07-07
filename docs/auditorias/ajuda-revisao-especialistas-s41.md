# Revisão da Central de Ajuda (`/ajuda`) — Relatório consolidado dos especialistas

**Sessão s41 · 2026-06-30 · read-only (nenhuma mudança aplicada).**
Arquivo revisado: `app/ajuda/page.tsx` (+ `components/ajuda/HelpSearch.tsx`).
Especialistas: `product-owner-shareo` (conteúdo), `designer-shareo` (UX/a11y), `seguranca-shareo` (conformidade).

> **Gating:** nenhuma mudança **voltada a pagamento ou com implicação jurídica** pode ser publicada antes do **parecer FORMAL do D4**. A taxa deve permanecer dinâmica via `getPlatformFeeRate()` (nunca hardcode). Não inventar funcionalidade.

---

## 🔴 BLOQUEADO PELO D4 — não publicar antes do sign-off formal

### A. Conteúdo de pagamento ainda descreve **Stripe** (modelo decidido é **Mercado Pago**)
Pontos a reescrever para MP (PIX/cartão/boleto), confirmados por PO **e** Segurança:

| Local | Texto atual (resumo) |
|---|---|
| `LOCATARIO_STEPS` passo 5 | "cartão de crédito … via Stripe" |
| FAQ locatário "Como funciona o pagamento?" | "com cartão via Stripe" |
| FAQ pagamento "Como o pagamento funciona no ShareO?" | "paga via cartão" (omite PIX/boleto) |
| FAQ pagamento "Como funciona o pagamento do locatário?" | "cartão de crédito via Stripe" |
| FAQ pagamento "Quais bandeiras de cartão são aceitas?" | pressupõe Stripe/cartão como único meio |
| FAQ pagamento "Como a ShareO protege contra fraudes?" | "análise de risco … via Stripe" |
| FAQ legal "O ShareO é regulamentado?" | "via Stripe, que opera sob regulamentação do Banco Central" |

> ⚠️ **Risco de propaganda enganosa (CDC art. 30/37):** divergência entre o que o usuário lê e o que o checkout faz. A FAQ legal mistura PSP + regulação BACEN — **redação tem de ser validada com a advogada** (toca a Lei 12.865, núcleo do D4).
> **Pendência de produto antes de reescrever as bandeiras:** confirmar com os fundadores quais bandeiras o app MP cadastrado realmente aceita (não assumir Amex/Hipercard).

### B. "Dinheiro fica retido **na plataforma**" — contradiz o Modelo B/split
6 ocorrências (passos + FAQs pagamento). No Modelo B os recursos passam pelo **PSP (Mercado Pago)**, não pela ShareO — afirmar custódia "na plataforma" é exatamente o risco da Lei 12.865 que motivou a escolha do split. **Reescrever** para refletir que a retenção/escrow é do PSP. (Segurança: CONSULTAR jurídico.)

### C. Passo 3 do locador "Cadastrar chave PIX" → "Conectar conta Mercado Pago (OAuth)"
O onboarding decidido é conexão MP via OAuth, não cadastro de chave PIX manual (legado temporário). **Depende do desacoplamento `PIX NOT NULL`** (hoje adiado para a remoção do legado) — sem ele, o guia divergiria do formulário real de `/perfil/recebimentos`.

---

## ⚖️ EXIGE JURÍDICO/DPO (mesmo após o D4) — achados novos da Segurança

| # | Afirmação na página | Risco | Encaminhamento |
|---|---|---|---|
| 1 | "exclusão … em até **15 dias** (conforme a LGPD)" (l. 280, 307) | LGPD art. 18 §3º fala em prazo imediato; 15 dias é da resposta do art. 19. Vira SLA auditável pela ANPD. | DPO + alinhar com RIPD/expurgo (meta s40) |
| 2 | "**Nunca** compartilhamos seus dados com terceiros…" (l. 324) | Falso: há subprocessadores (Resend/Sentry/Mapbox/Vercel/Supabase + **Mercado Pago**), maioria nos EUA → transferência internacional (arts. 33–36). | DPO — reescrever + listar subprocessadores na Política |
| 3 | "**Seguro** opcional 1% … cobre extravio" (l. 116, 265) | Vender "seguro" sem seguradora SUSEP é irregular (DL 73/66). Pode ser **promessa não implementada**. | Jurídico + PO — confirmar parceiro SUSEP ou renomear "proteção"/remover |
| 4 | "Verificação … documento criptografado, nunca em tela ou logs" (l. 223) | Selfie+doc = **dado biométrico** (LGPD art. 5 II, sensível). Vira obrigação técnica auditável. | DPO/segurança — validar contra RIPD/implementação |
| 5 | Caução "estará disponível em versão futura" (l. 221) | Antecipa decisão de produto não garantida; caução em locação tem nuance no CC (D4 #6). | Jurídico (D4 #6) + PO — manter só o presente |
| 6 | SLAs publicados ("4h úteis", "2h", "3 dias úteis", "8h–22h 7 dias") | Viram oferta vinculante (CDC art. 30). | PO/ops — alinhar com capacidade real |
| 7 | Multa de atraso automática + cancelamento <24h = 30% | Cláusula penal — precisa estar nos **Termos** com a mesma redação (CDC art. 51). | Jurídico — espelhar nos Termos |
| 8 | "Pontos ShareO"/Indicação resgatáveis; "Informe de Rendimentos"; "PJ emite NF" | Pontos podem tocar Lei 5.768/71; confirmar features prometidas existem. | Jurídico/fiscal + PO |

---

## 🟢 SEGURO CORRIGIR JÁ — não toca pagamento nem jurídico (UX/a11y + inconsistências)

### Acessibilidade (designer — ALTA)
- **Accordions `<details>` nativos** sem `role`/`aria-expanded` confiável → trocar pelo **Radix Accordion** (shadcn já é dependência); resolve a página inteira + teclado.
- **Tap targets <44px:** botão "limpar busca" (`h-7 w-7`→`h-11 w-11`, 1 linha) e chips do hero (`py-2`→`py-3`).
- **Contraste** dos chips do hero (~3.5:1) → `bg-white/20` ou `bg-white text-primary`.
- `aria-live` está no botão condicional errado → mover para `<span class="sr-only">` sempre no DOM.
- Coluna "Quando" da tabela de taxas some no mobile (`hidden sm:table-cell`) sem fallback → empilhar como texto secundário ou card.

### Consistência / Design System (designer — MÉDIA)
- **Cores hardcoded fora dos tokens** nos `Callout` (sky/emerald/amber) e nas 5 cores de fundo das `SECTIONS` → **quebram no dark mode**; mapear para tokens (`bg-brand/10`, `bg-surface`, etc.).
- Hierarquia de headings (10+ `h2`, FAQs sem `h3`).
- Passos 6/7 do locador redundantes → fundir; adicionar fallback ao placeholder `LOCADOR_STEP6_EXAMPLE`.
- "Ver minhas reservas" leva visitante anônimo ao login → condicionar a `useSession` ou trocar o texto.

### Inconsistência interna de regra (PO + Segurança — corrigir já, não cita PSP)
- **"Pagamento liberado nesse exato momento"** (passo 5 locador, l. 92) contradiz o repasse semanal descrito nos passos 6/7 e nas FAQs. Fixar **uma única regra** (retido até devolução → fila → repasse na segunda). *Nota Segurança: há 3 versões diferentes na página — escolher uma.*
- Remover o detalhe técnico "**todo domingo à meia-noite** as operações são consolidadas" (vira promessa de SLA frágil).

### Baixo / cosmético (designer)
- Placeholder de busca longo trunca <480px; bug do triângulo duplo no Firefox (`summary::marker`); `scroll-mt-20`→`scroll-mt-24`; chip "Contato" ausente; ícones 💳 nos passos de pagamento.

---

## ✅ Já correto (preservar)
Taxa via `getPlatformFeeRate()` (nunca hardcode); repasse PIX toda segunda (feriado→1º dia útil); **sem caução** no MVP; teto R$500/transação e bem R$1.000; faixas de preço (3–5%/3×/15×); "anunciar é gratuito"; multa 1 diária/dia (valor, não a automaticidade).

---

## Próximos passos recomendados
1. **Agora (seguro):** abrir um PR só de **UX/a11y + inconsistência de regra de liberação** (seção 🟢) — não toca pagamento nem afirmações jurídicas. Maior impacto/menor esforço: Radix Accordion + tap targets + contraste + regra única de liberação.
2. **Levar ao D4 (advogada):** seções A/B/C de pagamento + os 8 itens jurídicos → anexar a `docs/juridico/checklist-conformidade-juridica.md`.
3. **Pós-D4:** reescrever todo o conteúdo de pagamento para Mercado Pago + ajustar prazos LGPD/SLAs conforme parecer.
4. **Antes da seção A (bandeiras):** confirmar com os fundadores as bandeiras habilitadas no app MP.
