# Roteiro de validação em device — manhã 2026-07-04

Ordenado por **quanto código novo cada passo exercita** (não por tela). Siga de cima
pra baixo. Legenda de status no `plano-validacao-app-android-pwa.md`.

Tudo abaixo é **JS puro** — recarrega via Metro, **não precisa de novo build EAS**.

---

## 0. Reconectar (peça ao Claude, ou faça)

1. Plugar o celular via USB.
2. `adb devices -l` → confirmar `device`.
3. `adb reverse tcp:8081 tcp:8081`
4. `cd apps/mobile && npx expo start --dev-client` (do worktree que está no `main` mais recente — hoje o Metro deve servir do **ShareO-main-test**, já atualizado).
5. Abrir o app ShareO no celular; se não conectar, sacudir → "Reload".

> **Importante:** o Metro tem que servir de um diretório no branch `main` (com os PRs #185–#188). Se abrir e não vir as features novas, o Metro está servindo de outro branch — peça ao Claude pra reiniciar do lugar certo.

---

## 1. 🔴 PRIORIDADE MÁXIMA — Fluxo de reserva ponta a ponta

**Já começamos ontem:** você criou a reserva da **Barraca de Camping** e o Claude (como dono admin) **aprovou** — ela está **CONFIRMED**. Continue daqui. Este fluxo exercita reserva + pagamento + código de retirada + CheckInOut + devolução + avaliação de uma vez.

Aba **Reservas → abrir a Barraca de Camping**:

- [ ] Status "Confirmada" aparece; **NÃO** deve haver botão "Pagar" errado antes… na verdade DEVE ter "Pagar reserva" agora (está confirmada e não paga). Toque em **Pagar reserva**.
- [ ] Abre o checkout do Mercado Pago. **(Pagamento real — decida se quer concluir; envolve PIX real da chave temporária do fundador.)** Se pagar:
  - [ ] Volta pra reserva → aparece **"🔑 Código de retirada"** (caixa verde) + **endereço de retirada** (caixa amarela). *Este era o bug crítico do `paymentStatus` — confirme que o botão "Pagar" sumiu.*
  - [ ] **ContractBanner** — se aparecer o banner de contrato, abrir modal, "Li e concordo".
  - [ ] **CheckInOut** — testar tirar/anexar foto de retirada (câmera/galeria).
  - [ ] Como locatário em ACTIVE: **ReturnChecklist** (4 checkboxes, mín. 3) → **Devolver**.
  - [ ] Como dono (peça ao Claude aprovar via API): **ReturnConditionForm** (Perfeito/Desgaste/Danos) → confirmar recebimento.
  - [ ] **ReviewForm** — 5 estrelas + comentário, enviar avaliação.
- [ ] **Cancelar** (em outra reserva PENDING, se tiver): o modal de **motivo** aparece, botão desabilitado sem texto, e cancela de verdade (era o bug do endpoint errado).

> As rotas de contrato/fotos/avaliação **davam 401** e foram destravadas no PR #188 (verificado por API). Se algo der 401 aqui, avise — é regressão.

---

## 2. 🟠 Detalhe do item — features novas (#185)

Abrir **Explorar → qualquer item**:

- [ ] **Calendário de disponibilidade** — grid de 2 meses; dias ocupados em vermelho, passados em cinza, hoje com borda verde. (Se der erro, tem botão "Tentar novamente".)
- [ ] **"Adicionar à locação"** (carrinho) — adicionar; tentar adicionar item de **outro dono** → deve recusar ("mesmo anunciante"); "Ver carrinho" abre no site.
- [ ] **Grid "Itens do mesmo anunciante"** — aparece (se o dono tiver outros itens), 2 colunas, mesmo ItemCard.
- [ ] **Grid "Você também pode gostar"** — aparece, sem repetir itens do grid acima.

---

## 3. 🟠 Editar anúncio nativo (#186)

Abrir um item **que é seu** (modo proprietário):

- [ ] Botão **"✏️ Editar anúncio"** agora abre uma **tela nativa** (antes abria o site).
- [ ] Campos vêm **pré-preenchidos** com os dados atuais.
- [ ] Alterar algo (ex.: preço/descrição) e salvar → volta e reflete a mudança.
- [ ] Apagar uma foto existente + adicionar nova.

---

## 4. 🟡 Restante dos ~40 itens 🔧 (por tela, ver plano detalhado)

Menor prioridade — mais "conferir paridade" do que caçar bug. Consulte a tabela por tela
em `plano-validacao-app-android-pwa.md`. Destaques que valem um olhar:

- **Home:** Simulador de Renda, Como funciona, depoimentos, "mais procurados", box de Segurança (conferir % da taxa).
- **Explorar:** busca, chips de categoria (filtro), Filtros (bottom sheet), ordenação.
- **Chat:** lida/não-lida (negrito), "Ver reserva", divisores de dia, "✓✓", templates.
- **Perfil:** stats (itens/aluguéis/nota) + avaliações recebidas.
- **Anunciar:** formulário completo (voltagem, requisitos, sugestão de preço).

---

## ⚠️ Achado da auditoria noturna (decisão sua) — painel "Solicitações pendentes"

Auditoria de shape (tipos do mobile × resposta real das APIs): **8 de 9 pares íntegros**
(o bug histórico `paymentStatus`/timestamps em `bookings/[id]` está remediado). **1 achado:**

- A tela de detalhe do item (`itens/[id]/index.tsx:60,863-885`) tem um painel **"Solicitações
  pendentes (N)"** para o proprietário, que lê `item.pendingBookings` — mas **nenhuma rota do
  backend retorna esse campo**, e o **site também não tem** esse painel na página de detalhe do
  item. Efeito: **nunca renderiza** no app (chega `undefined`; não crasha, guardado por `?.`).
- **Decisão sua** (não mexi):
  1. **Remover o painel** (recomendado por paridade — o site não tem isso no detalhe do item;
     é código morto que viola a regra de transcrição literal). Zero impacto visível.
  2. **Construir a feature** — estender `GET /api/items/[id]` p/ retornar `pendingBookings`
     (status PENDING, só p/ dono) + confirmar que o site quer isso no detalhe do item.
- Não é bloqueador de nada — só um recurso que aparenta existir no código mas está inerte.

## Como reportar (acelera o conserto)

Print + **qual tela** + **o que tocou** + **o que o site faz aí** (se souber). Se for tela
de erro: a 1ª linha do Call Stack que cita um arquivo de `apps/mobile/`.
